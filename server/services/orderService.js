/**
 * Order Service for E-commerce Order Management
 * Handles order creation, processing, and lifecycle management
 */

const mongoose = require('mongoose');
const Order = require('../models/Order');
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const Business = require('../models/Business');
const CustomerAccount = require('../models/CustomerAccount');
const { logger } = require('../config/logger');

class OrderService {
  
  /**
   * Create order from cart
   * @param {string} cartId - Cart ID
   * @param {Object} orderData - Order data
   * @param {string} customerId - Customer ID (optional)
   * @returns {Promise<Object>} Created order
   */
  static async createOrderFromCart(cartId, orderData, customerId = null) {
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
      // Get cart with populated products
      const cart = await Cart.findById(cartId).populate('items.product').session(session);
      if (!cart) {
        throw new Error('Cart not found');
      }
      
      if (cart.items.length === 0) {
        throw new Error('Cart is empty');
      }
      
      // Validate cart items
      const validation = await this.validateCartItems(cart);
      if (!validation.isValid) {
        throw new Error(`Cart validation failed: ${validation.issues.join(', ')}`);
      }
      
      // Get business details
      const business = await Business.findById(cart.businessId).session(session);
      if (!business) {
        throw new Error('Business not found');
      }
      
      // Prepare order items with seller info (multi-seller)
      const SellerInventory = require('../models/SellerInventory');
      const orderItems = [];
      const sellersSet = new Set();
      for (const item of cart.items) {
        // Find SellerInventory for this product (assume one seller per product per cart item)
        const sellerInventory = await SellerInventory.findOne({ product: item.product._id, price: item.price });
        let sellerId = null;
        if (sellerInventory) {
          sellerId = sellerInventory.seller;
          sellersSet.add(String(sellerId));
        }
        orderItems.push({
          product: item.product._id,
          seller: sellerId,
          productName: item.productName,
          productCode: item.productCode,
          price: item.price,
          quantity: item.quantity,
          subtotal: item.subtotal,
          productSnapshot: {
            category: item.product.category,
            description: item.product.description,
            image: item.product.primaryImage?.url,
            supplier: item.product.supplier
          }
        });
      }
      
      // Calculate totals
      const subtotal = cart.subtotal;
      const taxAmount = subtotal * cart.taxRate;
      const shippingAmount = this.calculateShipping(orderData, business);
      const discountAmount = await this.calculateDiscount(cart, orderData, business);
      const total = subtotal + taxAmount + shippingAmount - discountAmount;
      
      // Create order (with sellers array)
      const order = new Order({
        customerId: customerId,
        customerEmail: orderData.customerEmail,
        customerName: orderData.customerName,
        customerPhone: orderData.customerPhone,
        businessId: cart.businessId,
        tenantId: cart.tenantId,
        sellers: Array.from(sellersSet),
        items: orderItems,
        subtotal,
        taxAmount,
        taxRate: cart.taxRate,
        shippingAmount,
        discountAmount,
        total,
        currency: cart.currency,
        fulfillmentMethod: orderData.fulfillmentMethod,
        shippingAddress: orderData.shippingAddress,
        paymentMethod: orderData.paymentMethod,
        notes: orderData.notes,
        specialInstructions: orderData.specialInstructions,
        source: 'online'
      });
      
      await order.save({ session });
      
      // Update product stock
      for (const item of cart.items) {
        if (item.product.trackInventory) {
          await Product.findByIdAndUpdate(
            item.product._id,
            {
              $inc: {
                stock: -item.quantity,
                'analytics.sales': item.quantity,
                'analytics.revenue': item.subtotal
              },
              $set: { 'analytics.lastSold': new Date() }
            },
            { session }
          );
        }
      }
      
      // Update customer order history if customer exists
      if (customerId) {
        await CustomerAccount.findByIdAndUpdate(
          customerId,
          {
            $inc: { 
              'orderHistory.totalOrders': 1,
              'orderHistory.totalSpent': total
            },
            $set: { 'orderHistory.lastOrderDate': new Date() }
          },
          { session }
        );
      }
      
      // Update business analytics
      await Business.findByIdAndUpdate(
        cart.businessId,
        {
          $inc: {
            'analytics.orders': 1,
            'analytics.revenue': total
          },
          $set: { 'analytics.lastOrderDate': new Date() }
        },
        { session }
      );
      
      // Mark cart as converted
      cart.status = 'converted';
      await cart.save({ session });
      
      await session.commitTransaction();
      session.endSession();
      
      logger.info('Order created successfully', {
        orderId: order._id,
        orderNumber: order.orderNumber,
        customerId,
        businessId: cart.businessId,
        total
      });
      
      return order;
      
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      
      logger.error('Order creation failed', {
        error: error.message,
        cartId,
        customerId
      });
      
      throw error;
    }
  }
  
  /**
   * Get order by ID
   * @param {string} orderId - Order ID
   * @param {string} customerId - Customer ID (optional, for access control)
   * @returns {Promise<Object>} Order details
   */
  static async getOrder(orderId, customerId = null) {
    try {
      const query = { _id: orderId };
      if (customerId) {
        query.customerId = customerId;
      }
      
      const order = await Order.findOne(query)
        .populate('items.product', 'name images')
        .populate('businessId', 'name logo email phone address');
      
      if (!order) {
        throw new Error('Order not found');
      }
      
      return order;
      
    } catch (error) {
      logger.error('Failed to get order', {
        error: error.message,
        orderId,
        customerId
      });
      throw error;
    }
  }
  
  /**
   * Get orders for customer
   * @param {string} customerId - Customer ID
   * @param {Object} filters - Filter options
   * @param {Object} pagination - Pagination options
   * @returns {Promise<Object>} Orders list
   */
  static async getCustomerOrders(customerId, filters = {}, pagination = {}) {
    try {
      const { page = 1, limit = 20, sortBy = 'orderDate', sortOrder = 'desc' } = pagination;
      const skip = (page - 1) * limit;
      
      const query = { customerId };
      if (filters.status) query.status = filters.status;
      if (filters.dateFrom) query.orderDate = { $gte: new Date(filters.dateFrom) };
      if (filters.dateTo) {
        query.orderDate = { ...query.orderDate, $lte: new Date(filters.dateTo) };
      }
      
      const [orders, total] = await Promise.all([
        Order.find(query)
          .populate('businessId', 'name logo')
          .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        Order.countDocuments(query)
      ]);
      
      return {
        orders,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
      
    } catch (error) {
      logger.error('Failed to get customer orders', {
        error: error.message,
        customerId
      });
      throw error;
    }
  }
  
  /**
   * Get orders for business
   * @param {string} businessId - Business ID
   * @param {Object} filters - Filter options
   * @param {Object} pagination - Pagination options
   * @returns {Promise<Object>} Orders list
   */
  static async getBusinessOrders(businessId, filters = {}, pagination = {}) {
    try {
      const { page = 1, limit = 20, sortBy = 'orderDate', sortOrder = 'desc' } = pagination;
      const skip = (page - 1) * limit;
      
      const query = { businessId };
      if (filters.status) query.status = filters.status;
      if (filters.paymentStatus) query.paymentStatus = filters.paymentStatus;
      if (filters.fulfillmentMethod) query.fulfillmentMethod = filters.fulfillmentMethod;
      if (filters.dateFrom) query.orderDate = { $gte: new Date(filters.dateFrom) };
      if (filters.dateTo) {
        query.orderDate = { ...query.orderDate, $lte: new Date(filters.dateTo) };
      }
      
      const [orders, total] = await Promise.all([
        Order.find(query)
          .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        Order.countDocuments(query)
      ]);
      
      return {
        orders,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
      
    } catch (error) {
      logger.error('Failed to get business orders', {
        error: error.message,
        businessId
      });
      throw error;
    }
  }
  
  /**
   * Update order status
   * @param {string} orderId - Order ID
   * @param {string} newStatus - New status
   * @param {string} staffId - Staff ID making the update
   * @returns {Promise<Object>} Updated order
   */
  static async updateOrderStatus(orderId, newStatus, staffId = null) {
    try {
      const order = await Order.findById(orderId);
      if (!order) {
        throw new Error('Order not found');
      }
      
      const validStatuses = [
        'pending', 'confirmed', 'processing', 'shipped', 
        'delivered', 'completed', 'cancelled', 'refunded'
      ];
      
      if (!validStatuses.includes(newStatus)) {
        throw new Error('Invalid order status');
      }
      
      await order.updateStatus(newStatus, staffId);
      
      logger.info('Order status updated', {
        orderId,
        oldStatus: order.status,
        newStatus,
        staffId
      });
      
      return order;
      
    } catch (error) {
      logger.error('Failed to update order status', {
        error: error.message,
        orderId,
        newStatus,
        staffId
      });
      throw error;
    }
  }
  
  /**
   * Add tracking information to order
   * @param {string} orderId - Order ID
   * @param {string} trackingNumber - Tracking number
   * @param {string} carrier - Shipping carrier
   * @returns {Promise<Object>} Updated order
   */
  static async addTrackingInfo(orderId, trackingNumber, carrier) {
    try {
      const order = await Order.findById(orderId);
      if (!order) {
        throw new Error('Order not found');
      }
      
      await order.addTrackingInfo(trackingNumber, carrier);
      
      logger.info('Tracking info added to order', {
        orderId,
        trackingNumber,
        carrier
      });
      
      return order;
      
    } catch (error) {
      logger.error('Failed to add tracking info', {
        error: error.message,
        orderId,
        trackingNumber,
        carrier
      });
      throw error;
    }
  }
  
  /**
   * Validate cart items before order creation
   * @param {Object} cart - Cart object
   * @returns {Object} Validation result
   */
  static async validateCartItems(cart) {
    const issues = [];
    
    for (const item of cart.items) {
      if (!item.product) {
        issues.push(`Product ${item.productName} is no longer available`);
        continue;
      }
      
      if (!item.product.isPublished || item.product.status !== 'active') {
        issues.push(`Product ${item.productName} is no longer available`);
        continue;
      }
      
      if (item.product.trackInventory && item.product.stock < item.quantity) {
        issues.push(`Insufficient stock for ${item.productName}. Only ${item.product.stock} available.`);
      }
    }
    
    return {
      isValid: issues.length === 0,
      issues
    };
  }
  
  /**
   * Calculate shipping cost
   * @param {Object} orderData - Order data
   * @param {Object} business - Business object
   * @returns {number} Shipping cost
   */
  static calculateShipping(orderData, business) {
    // Simple shipping calculation - can be enhanced with complex rules
    if (orderData.fulfillmentMethod === 'pickup') {
      return 0;
    }
    
    if (!business.ecommerce.shippingEnabled) {
      return 0;
    }
    
    // Default shipping cost - this should be configurable per business
    return 10.00;
  }
  
  /**
   * Calculate discount amount
   * @param {Object} cart - Cart object
   * @param {Object} orderData - Order data
   * @param {Object} business - Business object
   * @returns {number} Discount amount
   */
  static async calculateDiscount(cart, orderData, business) {
    let discountAmount = 0;
    
    // Check for discount code if provided
    if (orderData.discountCode) {
      const discount = await this.validateDiscountCode(orderData.discountCode, cart, business);
      if (discount && discount.isValid) {
        if (discount.type === 'percentage') {
          discountAmount = cart.subtotal * (discount.value / 100);
        } else if (discount.type === 'fixed') {
          discountAmount = Math.min(discount.value, cart.subtotal);
        }
      }
    }
    
    // Apply other discount rules here if needed
    // For example, bulk discounts, membership discounts, etc.
    
    // Ensure discount doesn't exceed subtotal
    return Math.min(discountAmount, cart.subtotal);
  }
  
  /**
   * Validate discount code
   * @param {string} code - Discount code
   * @param {Object} cart - Cart object
   * @param {Object} business - Business object
   * @returns {Object} Discount details
   */
  static async validateDiscountCode(code, cart, business) {
    // This would normally check against a database of discount codes
    // For now, returning null as this requires a Discount model to be implemented
    // This is a placeholder that can be expanded later
    return null;
  }
}

module.exports = OrderService;
