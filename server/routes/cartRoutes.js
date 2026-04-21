/**
 * Cart Routes for Shopping Cart Management
 * Handles cart operations and item management
 */

const express = require('express');
const router = express.Router();
const CartService = require('../services/cartService');
const { requireCustomer } = require('./customerAuthRoutes');
const { body, validationResult } = require('express-validator');
const { logger } = require('../config/logger');

// Middleware to get session ID
const getSessionId = (req, res, next) => {
  // Get session ID from header, cookie, or generate one
  req.sessionId = req.headers['x-session-id'] || 
                  req.cookies?.sessionId || 
                  `guest_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  next();
};

// Optional customer middleware (doesn't require authentication)
const optionalCustomer = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (token) {
    try {
      const CustomerAuthService = require('../services/customerAuthService');
      const customer = await CustomerAuthService.verifyCustomerToken(token);
      req.customer = customer;
    } catch (error) {
      // Ignore authentication errors for optional middleware
    }
  }
  next();
};

// Validation middleware
const validateAddToCart = [
  body('productId')
    .isMongoId()
    .withMessage('Valid product ID is required'),
  body('quantity')
    .isInt({ min: 1, max: 100 })
    .withMessage('Quantity must be between 1 and 100'),
  body('businessId')
    .isMongoId()
    .withMessage('Valid business ID is required')
];

const validateUpdateCart = [
  body('productId')
    .isMongoId()
    .withMessage('Valid product ID is required'),
  body('quantity')
    .isInt({ min: 0, max: 100 })
    .withMessage('Quantity must be between 0 and 100'),
  body('businessId')
    .isMongoId()
    .withMessage('Valid business ID is required')
];

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    });
  }
  next();
};

/**
 * POST /api/cart/add
 * Add item to cart
 */
router.post('/add', getSessionId, optionalCustomer, validateAddToCart, handleValidationErrors, async (req, res) => {
  try {
    const { productId, quantity, businessId } = req.body;
    const customerId = req.customer?.customerId || null;
    
    const cart = await CartService.addToCart(
      req.sessionId,
      businessId,
      productId,
      quantity,
      customerId
    );
    
    res.json({
      success: true,
      message: 'Item added to cart',
      data: {
        cart: cart.summary,
        sessionId: req.sessionId
      }
    });
    
  } catch (error) {
    logger.error('Failed to add item to cart', {
      error: error.message,
      sessionId: req.sessionId,
      customerId: req.customer?.customerId,
      body: req.body
    });
    
    res.status(400).json({
      error: 'Failed to add item to cart',
      message: error.message
    });
  }
});

/**
 * PUT /api/cart/update
 * Update cart item quantity
 */
router.put('/update', getSessionId, optionalCustomer, validateUpdateCart, handleValidationErrors, async (req, res) => {
  try {
    const { productId, quantity, businessId } = req.body;
    const customerId = req.customer?.customerId || null;
    
    const cart = await CartService.updateCartItem(
      req.sessionId,
      businessId,
      productId,
      quantity,
      customerId
    );
    
    res.json({
      success: true,
      message: 'Cart updated',
      data: {
        cart: cart.summary,
        sessionId: req.sessionId
      }
    });
    
  } catch (error) {
    logger.error('Failed to update cart item', {
      error: error.message,
      sessionId: req.sessionId,
      customerId: req.customer?.customerId,
      body: req.body
    });
    
    res.status(400).json({
      error: 'Failed to update cart',
      message: error.message
    });
  }
});

/**
 * DELETE /api/cart/remove
 * Remove item from cart
 */
router.delete('/remove', getSessionId, optionalCustomer, [
  body('productId')
    .isMongoId()
    .withMessage('Valid product ID is required'),
  body('businessId')
    .isMongoId()
    .withMessage('Valid business ID is required')
], handleValidationErrors, async (req, res) => {
  try {
    const { productId, businessId } = req.body;
    const customerId = req.customer?.customerId || null;
    
    const cart = await CartService.removeFromCart(
      req.sessionId,
      businessId,
      productId,
      customerId
    );
    
    res.json({
      success: true,
      message: 'Item removed from cart',
      data: {
        cart: cart.summary,
        sessionId: req.sessionId
      }
    });
    
  } catch (error) {
    logger.error('Failed to remove item from cart', {
      error: error.message,
      sessionId: req.sessionId,
      customerId: req.customer?.customerId,
      body: req.body
    });
    
    res.status(400).json({
      error: 'Failed to remove item from cart',
      message: error.message
    });
  }
});

/**
 * GET /api/cart/:businessId
 * Get cart contents
 */
router.get('/:businessId', getSessionId, optionalCustomer, async (req, res) => {
  try {
    const { businessId } = req.params;
    const customerId = req.customer?.customerId || null;
    
    if (!businessId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        error: 'Invalid business ID'
      });
    }
    
    const cart = await CartService.getCart(
      req.sessionId,
      businessId,
      customerId
    );
    
    res.json({
      success: true,
      data: {
        cart,
        sessionId: req.sessionId
      }
    });
    
  } catch (error) {
    logger.error('Failed to get cart', {
      error: error.message,
      sessionId: req.sessionId,
      businessId: req.params.businessId,
      customerId: req.customer?.customerId
    });
    
    res.status(500).json({
      error: 'Failed to get cart',
      message: error.message
    });
  }
});

/**
 * DELETE /api/cart/clear/:businessId
 * Clear cart
 */
router.delete('/clear/:businessId', getSessionId, optionalCustomer, async (req, res) => {
  try {
    const { businessId } = req.params;
    const customerId = req.customer?.customerId || null;
    
    if (!businessId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        error: 'Invalid business ID'
      });
    }
    
    const cart = await CartService.clearCart(
      req.sessionId,
      businessId,
      customerId
    );
    
    res.json({
      success: true,
      message: 'Cart cleared',
      data: {
        cart: cart.summary,
        sessionId: req.sessionId
      }
    });
    
  } catch (error) {
    logger.error('Failed to clear cart', {
      error: error.message,
      sessionId: req.sessionId,
      businessId: req.params.businessId,
      customerId: req.customer?.customerId
    });
    
    res.status(500).json({
      error: 'Failed to clear cart',
      message: error.message
    });
  }
});

/**
 * POST /api/cart/merge
 * Merge guest cart with customer cart (requires authentication)
 */
router.post('/merge', getSessionId, requireCustomer, [
  body('businessId')
    .isMongoId()
    .withMessage('Valid business ID is required')
], handleValidationErrors, async (req, res) => {
  try {
    const { businessId } = req.body;
    const customerId = req.customer.customerId;
    
    const cart = await CartService.mergeGuestCart(
      req.sessionId,
      customerId,
      businessId
    );
    
    res.json({
      success: true,
      message: 'Cart merged successfully',
      data: {
        cart: cart.summary,
        sessionId: req.sessionId
      }
    });
    
  } catch (error) {
    logger.error('Failed to merge cart', {
      error: error.message,
      sessionId: req.sessionId,
      customerId: req.customer.customerId,
      businessId: req.body.businessId
    });
    
    res.status(500).json({
      error: 'Failed to merge cart',
      message: error.message
    });
  }
});

/**
 * GET /api/cart/validate/:cartId
 * Validate cart before checkout
 */
router.get('/validate/:cartId', async (req, res) => {
  try {
    const { cartId } = req.params;
    
    if (!cartId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        error: 'Invalid cart ID'
      });
    }
    
    const validation = await CartService.validateCart(cartId);
    
    res.json({
      success: true,
      data: validation
    });
    
  } catch (error) {
    logger.error('Failed to validate cart', {
      error: error.message,
      cartId: req.params.cartId
    });
    
    res.status(400).json({
      error: 'Failed to validate cart',
      message: error.message
    });
  }
});

module.exports = router;
