/**
 * Order Routes for E-commerce Order Management
 * Handles order creation, tracking, and management
 */

const express = require('express');
const router = express.Router();
const OrderService = require('../services/orderService');
const { requireCustomer } = require('./customerAuthRoutes');
const { requireUser, requireBusinessAdmin } = require('./middleware/auth');
const { body, validationResult } = require('express-validator');
const { logger } = require('../config/logger');

// Optional customer middleware
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
const validateCreateOrder = [
  body('cartId')
    .isMongoId()
    .withMessage('Valid cart ID is required'),
  body('customerEmail')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid customer email is required'),
  body('customerName')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Customer name is required'),
  body('fulfillmentMethod')
    .isIn(['pickup', 'delivery', 'shipping'])
    .withMessage('Valid fulfillment method is required'),
  body('paymentMethod')
    .isIn(['cash', 'card', 'mobile', 'online', 'bank_transfer'])
    .withMessage('Valid payment method is required'),
  body('shippingAddress')
    .optional()
    .isObject()
    .withMessage('Shipping address must be an object'),
  body('shippingAddress.firstName')
    .if(body('fulfillmentMethod').equals('shipping'))
    .notEmpty()
    .withMessage('First name is required for shipping'),
  body('shippingAddress.lastName')
    .if(body('fulfillmentMethod').equals('shipping'))
    .notEmpty()
    .withMessage('Last name is required for shipping'),
  body('shippingAddress.street')
    .if(body('fulfillmentMethod').equals('shipping'))
    .notEmpty()
    .withMessage('Street address is required for shipping'),
  body('shippingAddress.city')
    .if(body('fulfillmentMethod').equals('shipping'))
    .notEmpty()
    .withMessage('City is required for shipping'),
  body('shippingAddress.state')
    .if(body('fulfillmentMethod').equals('shipping'))
    .notEmpty()
    .withMessage('State is required for shipping'),
  body('shippingAddress.zipCode')
    .if(body('fulfillmentMethod').equals('shipping'))
    .notEmpty()
    .withMessage('Zip code is required for shipping')
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
 * POST /api/orders
 * Create order from cart
 */
router.post('/', optionalCustomer, validateCreateOrder, handleValidationErrors, async (req, res) => {
  try {
    const orderData = req.body;
    const customerId = req.customer?.customerId || null;
    
    logger.info('Order creation attempt', {
      cartId: orderData.cartId,
      customerId,
      customerEmail: orderData.customerEmail,
      fulfillmentMethod: orderData.fulfillmentMethod
    });
    
    const order = await OrderService.createOrderFromCart(
      orderData.cartId,
      orderData,
      customerId
    );
    
    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data: {
        orderId: order._id,
        orderNumber: order.orderNumber,
        status: order.status,
        total: order.total,
        currency: order.currency
      }
    });
    
  } catch (error) {
    logger.error('Order creation failed', {
      error: error.message,
      cartId: req.body.cartId,
      customerId: req.customer?.customerId
    });
    
    res.status(400).json({
      error: 'Order creation failed',
      message: error.message
    });
  }
});

/**
 * GET /api/orders/:id
 * Get order details
 */
router.get('/:id', optionalCustomer, async (req, res) => {
  try {
    const { id } = req.params;
    const customerId = req.customer?.customerId || null;
    
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        error: 'Invalid order ID'
      });
    }
    
    const order = await OrderService.getOrder(id, customerId);
    
    res.json({
      success: true,
      data: order
    });
    
  } catch (error) {
    logger.error('Failed to get order', {
      error: error.message,
      orderId: req.params.id,
      customerId: req.customer?.customerId
    });
    
    res.status(404).json({
      error: 'Order not found',
      message: error.message
    });
  }
});

/**
 * GET /api/orders/customer/my-orders
 * Get customer's orders (requires authentication)
 */
router.get('/customer/my-orders', requireCustomer, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      status, 
      dateFrom, 
      dateTo,
      sortBy = 'orderDate',
      sortOrder = 'desc'
    } = req.query;
    
    const filters = {};
    if (status) filters.status = status;
    if (dateFrom) filters.dateFrom = dateFrom;
    if (dateTo) filters.dateTo = dateTo;
    
    const pagination = {
      page: parseInt(page),
      limit: parseInt(limit),
      sortBy,
      sortOrder
    };
    
    const result = await OrderService.getCustomerOrders(
      req.customer.customerId,
      filters,
      pagination
    );
    
    res.json({
      success: true,
      data: result
    });
    
  } catch (error) {
    logger.error('Failed to get customer orders', {
      error: error.message,
      customerId: req.customer.customerId
    });
    
    res.status(500).json({
      error: 'Failed to get orders',
      message: error.message
    });
  }
});

/**
 * GET /api/orders/business/:businessId
 * Get business orders (requires business admin access)
 */
router.get('/business/:businessId', requireUser, requireBusinessAdmin, async (req, res) => {
  try {
    const { businessId } = req.params;
    const { 
      page = 1, 
      limit = 20, 
      status, 
      paymentStatus,
      fulfillmentMethod,
      dateFrom, 
      dateTo,
      sortBy = 'orderDate',
      sortOrder = 'desc'
    } = req.query;
    
    // Check if user has access to this business
    if (req.user.role !== 'super_admin' && req.user.businessId !== businessId) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You do not have access to this business orders'
      });
    }
    
    const filters = {};
    if (status) filters.status = status;
    if (paymentStatus) filters.paymentStatus = paymentStatus;
    if (fulfillmentMethod) filters.fulfillmentMethod = fulfillmentMethod;
    if (dateFrom) filters.dateFrom = dateFrom;
    if (dateTo) filters.dateTo = dateTo;
    
    const pagination = {
      page: parseInt(page),
      limit: parseInt(limit),
      sortBy,
      sortOrder
    };
    
    const result = await OrderService.getBusinessOrders(
      businessId,
      filters,
      pagination
    );
    
    res.json({
      success: true,
      data: result
    });
    
  } catch (error) {
    logger.error('Failed to get business orders', {
      error: error.message,
      businessId: req.params.businessId,
      userId: req.user.userId
    });
    
    res.status(500).json({
      error: 'Failed to get orders',
      message: error.message
    });
  }
});

/**
 * PUT /api/orders/:id/status
 * Update order status (requires business admin access)
 */
router.put('/:id/status', requireUser, requireBusinessAdmin, [
  body('status')
    .isIn(['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'completed', 'cancelled', 'refunded'])
    .withMessage('Valid status is required')
], handleValidationErrors, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    // Verify user has access to this order's business
    const order = await OrderService.getOrder(id);
    if (!order) {
      return res.status(404).json({
        error: 'Order not found'
      });
    }
    
    if (req.user.role !== 'super_admin' && order.businessId.toString() !== req.user.businessId.toString()) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You do not have access to update this order'
      });
    }
    
    const updatedOrder = await OrderService.updateOrderStatus(id, status, req.user.userId);
    
    res.json({
      success: true,
      message: 'Order status updated successfully',
      data: {
        orderId: order._id,
        orderNumber: order.orderNumber,
        status: order.status
      }
    });
    
  } catch (error) {
    logger.error('Failed to update order status', {
      error: error.message,
      orderId: req.params.id,
      newStatus: req.body.status,
      userId: req.user.userId
    });
    
    res.status(400).json({
      error: 'Failed to update order status',
      message: error.message
    });
  }
});

/**
 * PUT /api/orders/:id/tracking
 * Add tracking information (requires business admin access)
 */
router.put('/:id/tracking', requireUser, requireBusinessAdmin, [
  body('trackingNumber')
    .notEmpty()
    .withMessage('Tracking number is required'),
  body('carrier')
    .notEmpty()
    .withMessage('Carrier is required')
], handleValidationErrors, async (req, res) => {
  try {
    const { id } = req.params;
    const { trackingNumber, carrier } = req.body;
    
    // Verify user has access to this order's business
    const order = await OrderService.getOrder(id);
    if (!order) {
      return res.status(404).json({
        error: 'Order not found'
      });
    }
    
    if (req.user.role !== 'super_admin' && order.businessId.toString() !== req.user.businessId.toString()) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You do not have access to update this order'
      });
    }
    
    const updatedOrder = await OrderService.addTrackingInfo(id, trackingNumber, carrier);
    
    res.json({
      success: true,
      message: 'Tracking information added successfully',
      data: {
        orderId: order._id,
        orderNumber: order.orderNumber,
        trackingNumber: order.trackingNumber,
        carrier: order.shippingCarrier,
        status: order.status
      }
    });
    
  } catch (error) {
    logger.error('Failed to add tracking info', {
      error: error.message,
      orderId: req.params.id,
      trackingNumber: req.body.trackingNumber,
      userId: req.user.userId
    });
    
    res.status(400).json({
      error: 'Failed to add tracking information',
      message: error.message
    });
  }
});

module.exports = router;
