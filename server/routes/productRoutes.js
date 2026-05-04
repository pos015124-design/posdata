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

// Get all products with pagination and search (USER'S PRODUCTS ONLY)
router.get('/',
  requireUser,
  checkPermission('inventory'),
  paginationValidation,
  handleValidationErrors,
  paginationMiddleware,
  async (req, res) => {
    try {
      // Filter by logged-in user's products
      const result = await ProductService.getAllProducts(req.pagination, req.query, req.user.userId);

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

// Get global catalog (shared product definitions)
router.get('/catalog',
  requireUser,
  async (req, res) => {
    try {
      const products = await ProductService.getGlobalCatalog(req.query);
      
      res.json({
        success: true,
        products
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to fetch global catalog',
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
    const product = await ProductService.createProduct(req.body, req.user.userId);
    res.status(201).json({ 
      success: true,
      product 
    });
  } catch (error) {
    console.error('Error creating product:', error);
    
    // Handle duplicate key errors (E11000)
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern || {})[0];
      let message = 'Product already exists';
      
      if (field === 'code') {
        message = 'A product with this code already exists';
      } else if (field === 'barcode') {
        message = 'A product with this barcode already exists';
      } else if (field === 'userId_1_code_1') {
        message = 'A product with this code already exists';
      } else if (field === 'userId_1_barcode_1') {
        message = 'A product with this barcode already exists';
      }
      
      return res.status(400).json({ 
        message,
        field,
        code: 'DUPLICATE_PRODUCT'
      });
    }
    
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

// Clone a product from another seller into your own inventory
// POST /api/products/:id/clone
router.post('/:id/clone', requireUser, mongoIdValidation('id'), handleValidationErrors, async (req, res) => {
  try {
    const source = await ProductService.getProductById(req.params.id);
    if (!source) return res.status(404).json({ message: 'Product not found' });

    // Build clone data — new ownership, reset analytics, keep content
    const cloneData = {
      name: source.name,
      description: source.description,
      shortDescription: source.shortDescription,
      code: `${source.code}-${Date.now().toString(36)}`, // unique code
      barcode: '',
      price: source.price,
      compareAtPrice: source.compareAtPrice,
      purchasePrice: source.purchasePrice || 0,
      stock: 0,           // seller sets their own stock
      reorderPoint: source.reorderPoint,
      category: source.category,
      subcategory: source.subcategory,
      tags: source.tags || [],
      images: source.images || [],
      isPublished: false, // seller must explicitly publish
      isFeatured: false,
      isSponsored: false,
      clonedFrom: source._id,
      trackInventory: true,
      requiresShipping: source.requiresShipping
    };

    const product = await ProductService.createProduct(cloneData, req.user.userId);
    res.status(201).json({ success: true, product, message: 'Product cloned to your inventory' });
  } catch (error) {
    console.error('Error cloning product:', error);
    res.status(400).json({ message: error.message });
  }
});

// GET /api/products/catalog/public — browse all published products for cloning
router.get('/catalog/public', requireUser, async (req, res) => {
  try {
    const Product = require('../models/Product');
    const { search = '', category = '', page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const query = {
      isPublished: true,
      status: 'active',
      userId: { $ne: req.user.userId } // exclude own products
    };
    if (category) query.category = category;
    if (search) query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { category: { $regex: search, $options: 'i' } }
    ];

    const [products, total] = await Promise.all([
      Product.find(query).select('name code price images category description userId').skip(skip).limit(parseInt(limit)).lean(),
      Product.countDocuments(query)
    ]);

    res.json({ success: true, products, pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) } });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
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