/**
 * Cart Service for Shopping Cart Management
 * Handles cart operations, item management, and cart persistence
 */

const Cart = require('../models/Cart');
const Product = require('../models/Product');
const Business = require('../models/Business');
const { logger } = require('../config/logger');

class CartService {
  
  /**
   * Get or create cart for session/customer
   * @param {string} sessionId - Session ID
   * @param {string} businessId - Business ID
   * @param {string} customerId - Customer ID (optional)
   * @returns {Promise<Object>} Cart object
   */
  static async getOrCreateCart(sessionId, businessId, customerId = null) {
    try {
      // First try to find existing cart
      let cart;
      
      if (customerId) {
        cart = await Cart.findByCustomerAndBusiness(customerId, businessId);
      }
      
      if (!cart) {
        cart = await Cart.findBySessionAndBusiness(sessionId, businessId);
      }
      
      // Create new cart if none exists
      if (!cart) {
        const business = await Business.findById(businessId);
        if (!business) {
          throw new Error('Business not found');
        }
        
        cart = new Cart({
          sessionId,
          businessId,
          customerId,
          tenantId: business.tenantId,
          taxRate: business.ecommerce.taxRate || 0,
          currency: business.ecommerce.currency || 'USD'
        });
        
        await cart.save();
      }
      
      return cart;
      
    } catch (error) {
      logger.error('Failed to get or create cart', {
        error: error.message,
        sessionId,
        businessId,
        customerId
      });
      throw error;
    }
  }
  
  /**
   * Add item to cart
   * @param {string} sessionId - Session ID
   * @param {string} businessId - Business ID
   * @param {string} productId - Product ID
   * @param {number} quantity - Quantity to add
   * @param {string} customerId - Customer ID (optional)
   * @returns {Promise<Object>} Updated cart
   */
  static async addToCart(sessionId, businessId, productId, quantity = 1, customerId = null) {
    try {
      // Get product details
      const product = await Product.findById(productId);
      if (!product) {
        throw new Error('Product not found');
      }
      
      if (!product.isPublished || product.status !== 'active') {
        throw new Error('Product is not available');
      }
      
      // Check stock availability
      if (product.trackInventory && product.stock < quantity) {
        throw new Error(`Insufficient stock. Only ${product.stock} items available.`);
      }
      
      // Get or create cart
      const cart = await this.getOrCreateCart(sessionId, businessId, customerId);
      
      // Add item to cart
      await cart.addItem(product, quantity);
      
      logger.info('Item added to cart', {
        cartId: cart._id,
        productId,
        quantity,
        sessionId,
        customerId
      });
      
      return cart;
      
    } catch (error) {
      logger.error('Failed to add item to cart', {
        error: error.message,
        sessionId,
        businessId,
        productId,
        quantity
      });
      throw error;
    }
  }
  
  /**
   * Update cart item quantity
   * @param {string} sessionId - Session ID
   * @param {string} businessId - Business ID
   * @param {string} productId - Product ID
   * @param {number} quantity - New quantity
   * @param {string} customerId - Customer ID (optional)
   * @returns {Promise<Object>} Updated cart
   */
  static async updateCartItem(sessionId, businessId, productId, quantity, customerId = null) {
    try {
      const cart = await this.getOrCreateCart(sessionId, businessId, customerId);
      
      if (quantity <= 0) {
        await cart.removeItem(productId);
      } else {
        // Check stock availability
        const product = await Product.findById(productId);
        if (product && product.trackInventory && product.stock < quantity) {
          throw new Error(`Insufficient stock. Only ${product.stock} items available.`);
        }
        
        await cart.updateItemQuantity(productId, quantity);
      }
      
      logger.info('Cart item updated', {
        cartId: cart._id,
        productId,
        quantity,
        sessionId,
        customerId
      });
      
      return cart;
      
    } catch (error) {
      logger.error('Failed to update cart item', {
        error: error.message,
        sessionId,
        businessId,
        productId,
        quantity
      });
      throw error;
    }
  }
  
  /**
   * Remove item from cart
   * @param {string} sessionId - Session ID
   * @param {string} businessId - Business ID
   * @param {string} productId - Product ID
   * @param {string} customerId - Customer ID (optional)
   * @returns {Promise<Object>} Updated cart
   */
  static async removeFromCart(sessionId, businessId, productId, customerId = null) {
    try {
      const cart = await this.getOrCreateCart(sessionId, businessId, customerId);
      await cart.removeItem(productId);
      
      logger.info('Item removed from cart', {
        cartId: cart._id,
        productId,
        sessionId,
        customerId
      });
      
      return cart;
      
    } catch (error) {
      logger.error('Failed to remove item from cart', {
        error: error.message,
        sessionId,
        businessId,
        productId
      });
      throw error;
    }
  }
  
  /**
   * Get cart contents
   * @param {string} sessionId - Session ID
   * @param {string} businessId - Business ID
   * @param {string} customerId - Customer ID (optional)
   * @returns {Promise<Object>} Cart with populated items
   */
  static async getCart(sessionId, businessId, customerId = null) {
    try {
      const cart = await this.getOrCreateCart(sessionId, businessId, customerId);
      
      // Populate product details for cart items
      await cart.populate('items.product', 'name price stock isPublished status images');
      
      // Filter out items for products that are no longer available
      const availableItems = cart.items.filter(item => 
        item.product && 
        item.product.isPublished && 
        item.product.status === 'active'
      );
      
      // Update cart if items were filtered out
      if (availableItems.length !== cart.items.length) {
        cart.items = availableItems;
        await cart.save();
      }
      
      return cart;
      
    } catch (error) {
      logger.error('Failed to get cart', {
        error: error.message,
        sessionId,
        businessId,
        customerId
      });
      throw error;
    }
  }
  
  /**
   * Clear cart
   * @param {string} sessionId - Session ID
   * @param {string} businessId - Business ID
   * @param {string} customerId - Customer ID (optional)
   * @returns {Promise<Object>} Empty cart
   */
  static async clearCart(sessionId, businessId, customerId = null) {
    try {
      const cart = await this.getOrCreateCart(sessionId, businessId, customerId);
      await cart.clearCart();
      
      logger.info('Cart cleared', {
        cartId: cart._id,
        sessionId,
        customerId
      });
      
      return cart;
      
    } catch (error) {
      logger.error('Failed to clear cart', {
        error: error.message,
        sessionId,
        businessId
      });
      throw error;
    }
  }
  
  /**
   * Merge guest cart with customer cart
   * @param {string} guestSessionId - Guest session ID
   * @param {string} customerId - Customer ID
   * @param {string} businessId - Business ID
   * @returns {Promise<Object>} Merged cart
   */
  static async mergeGuestCart(guestSessionId, customerId, businessId) {
    try {
      const guestCart = await Cart.findBySessionAndBusiness(guestSessionId, businessId);
      if (!guestCart || guestCart.items.length === 0) {
        return await this.getOrCreateCart(guestSessionId, businessId, customerId);
      }
      
      const customerCart = await this.getOrCreateCart(guestSessionId, businessId, customerId);
      
      // Merge items from guest cart
      for (const guestItem of guestCart.items) {
        const existingItemIndex = customerCart.items.findIndex(
          item => item.product.toString() === guestItem.product.toString()
        );
        
        if (existingItemIndex > -1) {
          // Update quantity if item already exists
          customerCart.items[existingItemIndex].quantity += guestItem.quantity;
        } else {
          // Add new item
          customerCart.items.push(guestItem);
        }
      }
      
      await customerCart.save();
      
      // Delete guest cart
      await Cart.findByIdAndDelete(guestCart._id);
      
      logger.info('Guest cart merged with customer cart', {
        guestCartId: guestCart._id,
        customerCartId: customerCart._id,
        customerId
      });
      
      return customerCart;
      
    } catch (error) {
      logger.error('Failed to merge guest cart', {
        error: error.message,
        guestSessionId,
        customerId,
        businessId
      });
      throw error;
    }
  }
  
  /**
   * Validate cart before checkout
   * @param {string} cartId - Cart ID
   * @returns {Promise<Object>} Validation result
   */
  static async validateCart(cartId) {
    try {
      const cart = await Cart.findById(cartId).populate('items.product');
      if (!cart) {
        throw new Error('Cart not found');
      }
      
      if (cart.items.length === 0) {
        throw new Error('Cart is empty');
      }
      
      const issues = [];
      
      // Check each item
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
        
        if (item.price !== item.product.price) {
          issues.push(`Price changed for ${item.productName}. Please review your cart.`);
        }
      }
      
      return {
        isValid: issues.length === 0,
        issues,
        cart
      };
      
    } catch (error) {
      logger.error('Failed to validate cart', {
        error: error.message,
        cartId
      });
      throw error;
    }
  }
  
  /**
   * Clean up expired carts
   * @returns {Promise<number>} Number of carts cleaned up
   */
  static async cleanupExpiredCarts() {
    try {
      const result = await Cart.cleanupExpiredCarts();
      
      logger.info('Expired carts cleaned up', {
        deletedCount: result.deletedCount
      });
      
      return result.deletedCount;
      
    } catch (error) {
      logger.error('Failed to cleanup expired carts', {
        error: error.message
      });
      throw error;
    }
  }
}

module.exports = CartService;
