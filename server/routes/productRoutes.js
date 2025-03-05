const express = require('express');
const router = express.Router();
const ProductService = require('../services/productService');
const { requireUser } = require('./middleware/auth');

// Get all products
router.get('/', requireUser, async (req, res) => {
  try {
    const products = await ProductService.getAllProducts();
    res.json({ products });
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get product by ID
router.get('/:id', requireUser, async (req, res) => {
  try {
    const product = await ProductService.getProductById(req.params.id);
    res.json({ product });
  } catch (error) {
    console.error('Error fetching product:', error);
    if (error.message === 'Product not found') {
      return res.status(404).json({ message: error.message });
    }
    res.status(500).json({ message: error.message });
  }
});

// Get product by barcode
router.get('/barcode/:barcode', requireUser, async (req, res) => {
  try {
    const product = await ProductService.getProductByBarcode(req.params.barcode);
    res.json({ product });
  } catch (error) {
    console.error('Error fetching product by barcode:', error);
    if (error.message === 'Product not found') {
      return res.status(404).json({ message: error.message });
    }
    res.status(500).json({ message: error.message });
  }
});

// Create a new product
router.post('/', requireUser, async (req, res) => {
  try {
    const product = await ProductService.createProduct(req.body);
    res.status(201).json({ 
      success: true,
      product 
    });
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(400).json({ message: error.message });
  }
});

// Update a product
router.put('/:id', requireUser, async (req, res) => {
  try {
    const product = await ProductService.updateProduct(req.params.id, req.body);
    res.json({ 
      success: true,
      product 
    });
  } catch (error) {
    console.error('Error updating product:', error);
    if (error.message === 'Product not found') {
      return res.status(404).json({ message: error.message });
    }
    res.status(400).json({ message: error.message });
  }
});

// Delete a product
router.delete('/:id', requireUser, async (req, res) => {
  try {
    await ProductService.deleteProduct(req.params.id);
    res.json({ 
      success: true,
      message: 'Product deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting product:', error);
    if (error.message === 'Product not found') {
      return res.status(404).json({ message: error.message });
    }
    res.status(500).json({ message: error.message });
  }
});

// Add to cart (this is a client-side operation in reality, but we'll mock it here)
router.post('/cart/add', requireUser, async (req, res) => {
  try {
    const { productId, quantity } = req.body;
    
    // Validate product exists
    await ProductService.getProductById(productId);
    
    // In a real implementation, this would add to a cart in a database or session
    res.json({
      success: true,
      cart: [
        { productId, quantity }
      ]
    });
  } catch (error) {
    console.error('Error adding to cart:', error);
    if (error.message === 'Product not found') {
      return res.status(404).json({ message: error.message });
    }
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;