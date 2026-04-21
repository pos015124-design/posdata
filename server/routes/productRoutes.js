const express = require('express');
const router = express.Router();
const ProductService = require('../services/productService');
const { requireUser, checkPermission } = require('./middleware/auth');
const {
  productValidation,
  mongoIdValidation,
  paginationValidation,
  handleValidationErrors
} = require('../middleware/validation');
const { paginationMiddleware } = require('../utils/pagination');
const { auditLogger } = require('../config/logger');

// Get all products with pagination and search
router.get('/',
  requireUser,
  checkPermission('inventory'),
  paginationValidation,
  handleValidationErrors,
  paginationMiddleware,
  async (req, res) => {
    try {
      const result = await ProductService.getAllProducts(req.pagination, req.query);

      // Log access for audit
      auditLogger.info('Products accessed', {
        action: 'VIEW_PRODUCTS',
        userId: req.user.userId,
        pagination: req.pagination,
        timestamp: new Date().toISOString()
      });

      res.json({
        success: true,
        products: result.data,
        pagination: result.pagination
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to fetch products',
        message: error.message
      });
    }
  }
);

// Get product by ID
router.get('/:id',
  requireUser,
  checkPermission('inventory'),
  mongoIdValidation('id'),
  handleValidationErrors,
  async (req, res) => {
    try {
      const product = await ProductService.getProductById(req.params.id);

      auditLogger.info('Product accessed', {
        action: 'VIEW_PRODUCT',
        userId: req.user.userId,
        productId: req.params.id,
        timestamp: new Date().toISOString()
      });

      res.json({
        success: true,
        product
      });
    } catch (error) {
      if (error.message === 'Product not found') {
        return res.status(404).json({
          error: 'Product not found',
          message: 'The requested product does not exist'
        });
      }
      res.status(500).json({
        error: 'Failed to fetch product',
        message: error.message
      });
    }
  }
);

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
router.post('/', requireUser, productValidation, handleValidationErrors, async (req, res) => {
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
router.put('/:id', requireUser, mongoIdValidation('id'), productValidation, handleValidationErrors, async (req, res) => {
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
router.delete('/:id', requireUser, mongoIdValidation('id'), handleValidationErrors, async (req, res) => {
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

// Get all sellers for a product (multi-seller marketplace)
const SellerInventory = require('../models/SellerInventory');
const Seller = require('../models/Seller');

// GET /api/products/:id/sellers - Get all sellers for a product
router.get('/:id/sellers', requireUser, async (req, res) => {
  try {
    const inventories = await SellerInventory.find({ product: req.params.id, isActive: true })
      .populate('seller');
    const sellers = inventories.map(inv => inv.seller);
    res.json({ sellers });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/products/by-seller/:sellerId - Get all products for a seller
router.get('/by-seller/:sellerId', requireUser, async (req, res) => {
  try {
    const inventories = await SellerInventory.find({ seller: req.params.sellerId, isActive: true })
      .populate('product');
    const products = inventories.map(inv => inv.product);
    res.json({ products });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;