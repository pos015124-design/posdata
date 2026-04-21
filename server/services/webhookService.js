/**
 * Webhook Service for Real-time Event Notifications
 * Provides webhook delivery with retry logic and failure handling
 */

const axios = require('axios');
const crypto = require('crypto');
const { logger } = require('../config/logger');
const { cacheService } = require('../config/cache');

class WebhookService {
  constructor() {
    this.webhooks = new Map();
    this.retryQueue = [];
    this.maxRetries = 3;
    this.retryDelay = 1000; // 1 second
    this.timeout = 10000; // 10 seconds
  }

  /**
   * Register webhook endpoint
   * @param {string} tenantId - Tenant identifier
   * @param {Object} webhookConfig - Webhook configuration
   */
  registerWebhook(tenantId, webhookConfig) {
    const { url, events, secret, enabled = true } = webhookConfig;
    
    this.webhooks.set(tenantId, {
      url,
      events: new Set(events),
      secret,
      enabled,
      registeredAt: new Date(),
      deliveryStats: {
        total: 0,
        successful: 0,
        failed: 0,
        lastDelivery: null,
        lastFailure: null
      }
    });

    logger.info('Webhook registered', {
      tenantId,
      url,
      events,
      enabled
    });
  }

  /**
   * Unregister webhook endpoint
   * @param {string} tenantId - Tenant identifier
   */
  unregisterWebhook(tenantId) {
    const removed = this.webhooks.delete(tenantId);
    
    if (removed) {
      logger.info('Webhook unregistered', { tenantId });
    }
    
    return removed;
  }

  /**
   * Send webhook notification
   * @param {string} tenantId - Tenant identifier
   * @param {string} event - Event type
   * @param {Object} data - Event data
   * @param {Object} options - Delivery options
   */
  async sendWebhook(tenantId, event, data, options = {}) {
    const webhook = this.webhooks.get(tenantId);
    
    if (!webhook || !webhook.enabled) {
      logger.debug('Webhook not configured or disabled', { tenantId, event });
      return false;
    }

    if (!webhook.events.has(event) && !webhook.events.has('*')) {
      logger.debug('Event not subscribed', { tenantId, event });
      return false;
    }

    const payload = {
      id: this.generateEventId(),
      event,
      tenantId,
      timestamp: new Date().toISOString(),
      data,
      version: '1.0'
    };

    const deliveryAttempt = {
      tenantId,
      webhook,
      payload,
      attempt: 0,
      maxRetries: options.maxRetries || this.maxRetries,
      delay: options.delay || this.retryDelay
    };

    return this.deliverWebhook(deliveryAttempt);
  }

  /**
   * Deliver webhook with retry logic
   * @param {Object} deliveryAttempt - Delivery attempt configuration
   */
  async deliverWebhook(deliveryAttempt) {
    const { tenantId, webhook, payload, attempt, maxRetries, delay } = deliveryAttempt;
    
    try {
      const signature = this.generateSignature(payload, webhook.secret);
      
      const response = await axios.post(webhook.url, payload, {
        timeout: this.timeout,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Dukani-Webhook/1.0',
          'X-Dukani-Event': payload.event,
          'X-Dukani-Signature': signature,
          'X-Dukani-Delivery': payload.id,
          'X-Dukani-Timestamp': payload.timestamp
        },
        validateStatus: (status) => status >= 200 && status < 300
      });

      // Success
      webhook.deliveryStats.total++;
      webhook.deliveryStats.successful++;
      webhook.deliveryStats.lastDelivery = new Date();

      logger.info('Webhook delivered successfully', {
        tenantId,
        event: payload.event,
        deliveryId: payload.id,
        attempt: attempt + 1,
        responseStatus: response.status,
        responseTime: response.headers['x-response-time']
      });

      return {
        success: true,
        deliveryId: payload.id,
        attempt: attempt + 1,
        responseStatus: response.status
      };

    } catch (error) {
      webhook.deliveryStats.total++;
      webhook.deliveryStats.failed++;
      webhook.deliveryStats.lastFailure = new Date();

      logger.error('Webhook delivery failed', {
        tenantId,
        event: payload.event,
        deliveryId: payload.id,
        attempt: attempt + 1,
        error: error.message,
        url: webhook.url
      });

      // Retry logic
      if (attempt < maxRetries) {
        const nextAttempt = {
          ...deliveryAttempt,
          attempt: attempt + 1
        };

        // Schedule retry with exponential backoff
        const retryDelay = delay * Math.pow(2, attempt);
        
        setTimeout(() => {
          this.deliverWebhook(nextAttempt);
        }, retryDelay);

        logger.info('Webhook retry scheduled', {
          tenantId,
          deliveryId: payload.id,
          nextAttempt: attempt + 2,
          retryDelay
        });

        return {
          success: false,
          deliveryId: payload.id,
          attempt: attempt + 1,
          retryScheduled: true,
          retryDelay
        };
      }

      // Max retries exceeded
      logger.error('Webhook delivery failed permanently', {
        tenantId,
        event: payload.event,
        deliveryId: payload.id,
        totalAttempts: attempt + 1,
        error: error.message
      });

      return {
        success: false,
        deliveryId: payload.id,
        attempt: attempt + 1,
        retryScheduled: false,
        error: error.message
      };
    }
  }

  /**
   * Send sale event webhook
   * @param {string} tenantId - Tenant identifier
   * @param {Object} saleData - Sale information
   */
  async sendSaleEvent(tenantId, saleData) {
    return this.sendWebhook(tenantId, 'sale.created', {
      saleId: saleData._id,
      total: saleData.total,
      paymentMethod: saleData.paymentMethod,
      items: saleData.items.map(item => ({
        productId: item.product,
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        total: item.total
      })),
      customer: saleData.customer,
      staff: saleData.staff,
      timestamp: saleData.createdAt
    });
  }

  /**
   * Send inventory event webhook
   * @param {string} tenantId - Tenant identifier
   * @param {Object} inventoryData - Inventory information
   */
  async sendInventoryEvent(tenantId, inventoryData) {
    return this.sendWebhook(tenantId, 'inventory.updated', {
      productId: inventoryData.product,
      type: inventoryData.type,
      quantity: inventoryData.quantity,
      reason: inventoryData.reason,
      staff: inventoryData.staff,
      timestamp: inventoryData.createdAt
    });
  }

  /**
   * Send low stock alert webhook
   * @param {string} tenantId - Tenant identifier
   * @param {Object} productData - Product information
   */
  async sendLowStockAlert(tenantId, productData) {
    return this.sendWebhook(tenantId, 'inventory.low_stock', {
      productId: productData._id,
      name: productData.name,
      currentStock: productData.stock,
      reorderPoint: productData.reorderPoint,
      category: productData.category,
      supplier: productData.supplier,
      severity: productData.stock === 0 ? 'critical' : 'warning'
    });
  }

  /**
   * Send customer event webhook
   * @param {string} tenantId - Tenant identifier
   * @param {string} eventType - Event type (created, updated)
   * @param {Object} customerData - Customer information
   */
  async sendCustomerEvent(tenantId, eventType, customerData) {
    return this.sendWebhook(tenantId, `customer.${eventType}`, {
      customerId: customerData._id,
      name: customerData.name,
      email: customerData.email,
      type: customerData.type,
      creditLimit: customerData.creditLimit,
      currentCredit: customerData.currentCredit
    });
  }

  /**
   * Get webhook statistics
   * @param {string} tenantId - Tenant identifier
   * @returns {Object} Webhook statistics
   */
  getWebhookStats(tenantId) {
    const webhook = this.webhooks.get(tenantId);
    
    if (!webhook) {
      return null;
    }

    return {
      url: webhook.url,
      events: Array.from(webhook.events),
      enabled: webhook.enabled,
      registeredAt: webhook.registeredAt,
      deliveryStats: webhook.deliveryStats,
      successRate: webhook.deliveryStats.total > 0 
        ? (webhook.deliveryStats.successful / webhook.deliveryStats.total * 100).toFixed(2)
        : 0
    };
  }

  /**
   * Get all webhook statistics
   * @returns {Object} All webhook statistics
   */
  getAllWebhookStats() {
    const stats = {};
    
    for (const [tenantId, webhook] of this.webhooks) {
      stats[tenantId] = this.getWebhookStats(tenantId);
    }
    
    return stats;
  }

  /**
   * Generate event ID
   * @returns {string} Unique event ID
   */
  generateEventId() {
    return `evt_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  /**
   * Generate webhook signature
   * @param {Object} payload - Webhook payload
   * @param {string} secret - Webhook secret
   * @returns {string} HMAC signature
   */
  generateSignature(payload, secret) {
    if (!secret) {
      return '';
    }

    const payloadString = JSON.stringify(payload);
    return crypto
      .createHmac('sha256', secret)
      .update(payloadString)
      .digest('hex');
  }

  /**
   * Verify webhook signature
   * @param {Object} payload - Webhook payload
   * @param {string} signature - Received signature
   * @param {string} secret - Webhook secret
   * @returns {boolean} Signature valid
   */
  verifySignature(payload, signature, secret) {
    const expectedSignature = this.generateSignature(payload, secret);
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  }

  /**
   * Test webhook endpoint
   * @param {string} url - Webhook URL
   * @param {string} secret - Webhook secret
   * @returns {Promise<Object>} Test result
   */
  async testWebhook(url, secret) {
    const testPayload = {
      id: this.generateEventId(),
      event: 'webhook.test',
      tenantId: 'test',
      timestamp: new Date().toISOString(),
      data: {
        message: 'This is a test webhook from Dukani System'
      },
      version: '1.0'
    };

    try {
      const signature = this.generateSignature(testPayload, secret);
      
      const response = await axios.post(url, testPayload, {
        timeout: this.timeout,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Dukani-Webhook/1.0',
          'X-Dukani-Event': testPayload.event,
          'X-Dukani-Signature': signature,
          'X-Dukani-Delivery': testPayload.id,
          'X-Dukani-Timestamp': testPayload.timestamp
        }
      });

      return {
        success: true,
        status: response.status,
        responseTime: response.headers['x-response-time'],
        message: 'Webhook test successful'
      };

    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Webhook test failed'
      };
    }
  }
}

// Create singleton instance
const webhookService = new WebhookService();

module.exports = webhookService;
