/**
 * Multi-Tenant Service for Organization-Level Data Isolation
 * Provides tenant management and data isolation capabilities.
 *
 * Data isolation is implemented via tenantId / businessId fields on every
 * document (single shared database). The legacy per-tenant MongoDB database
 * approach was removed — it created a separate DB + connection per tenant,
 * seeded demo products ("Sample Product") that no longer validate, and
 * contradicted the field-based isolation used everywhere else.
 */

const mongoose = require('mongoose');
const { logger } = require('../config/logger');
const { cacheService } = require('../config/cache');

class TenantService {

  /**
   * Create new tenant
   * @param {Object} tenantData - Tenant information
   * @returns {Promise<Object>} Created tenant
   */
  static async createTenant(tenantData) {
    try {
      const { name, domain, adminEmail, plan = 'basic' } = tenantData;
      const Tenant = mongoose.model('Tenant');

      // Reuse existing tenant for the same admin email if present
      const existingByEmail = await Tenant.findOne({ adminEmail }).lean();
      if (existingByEmail) {
        return {
          tenantId: existingByEmail.tenantId,
          name: existingByEmail.name,
          domain: existingByEmail.domain,
          plan: existingByEmail.plan,
          status: existingByEmail.status,
          createdAt: existingByEmail.createdAt
        };
      }

      // Ensure domain uniqueness
      const normalizedBaseDomain = (domain || name || 'tenant')
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
      let candidateDomain = normalizedBaseDomain || `tenant-${Date.now().toString(36)}`;
      let suffix = 1;
      while (await Tenant.findOne({ domain: candidateDomain }).lean()) {
        candidateDomain = `${normalizedBaseDomain}-${suffix++}`;
      }

      // Generate unique tenant ID
      const tenantId = this.generateTenantId(name);

      // Create tenant record in the shared database
      const tenant = new Tenant({
        tenantId,
        name,
        domain: candidateDomain,
        adminEmail,
        plan,
        status: 'active',
        createdAt: new Date(),
        settings: {
          maxUsers: plan === 'enterprise' ? 1000 : plan === 'professional' ? 100 : 10,
          maxProducts: plan === 'enterprise' ? 100000 : plan === 'professional' ? 10000 : 1000,
          features: this.getPlanFeatures(plan)
        }
      });

      await tenant.save();

      logger.info('Tenant created successfully', {
        tenantId,
        name,
        plan
      });

      return {
        tenantId,
        name,
        domain,
        plan,
        status: 'active',
        createdAt: tenant.createdAt
      };

    } catch (error) {
      logger.error('Failed to create tenant', { error: error.message, tenantData });
      throw new Error(`Tenant creation failed: ${error.message}`);
    }
  }

  /**
   * Get tenant information
   * @param {string} tenantId - Tenant identifier
   * @returns {Promise<Object>} Tenant information
   */
  static async getTenant(tenantId) {
    try {
      const cacheKey = `tenant:${tenantId}`;

      // Try cache first
      const cached = await cacheService.get(cacheKey);
      if (cached) {
        return cached;
      }

      const Tenant = mongoose.model('Tenant');
      const tenant = await Tenant.findOne({ tenantId }).lean();

      if (!tenant) {
        throw new Error('Tenant not found');
      }

      // Cache for 1 hour
      await cacheService.set(cacheKey, tenant, 3600);

      return tenant;

    } catch (error) {
      logger.error('Failed to get tenant', { error: error.message, tenantId });
      throw error;
    }
  }

  /**
   * Update tenant settings
   * @param {string} tenantId - Tenant identifier
   * @param {Object} updates - Settings to update
   * @returns {Promise<Object>} Updated tenant
   */
  static async updateTenant(tenantId, updates) {
    try {
      const Tenant = mongoose.model('Tenant');
      const tenant = await Tenant.findOneAndUpdate(
        { tenantId },
        { $set: updates, updatedAt: new Date() },
        { new: true }
      );

      if (!tenant) {
        throw new Error('Tenant not found');
      }

      // Clear cache
      await cacheService.del(`tenant:${tenantId}`);

      logger.info('Tenant updated', { tenantId, updates });

      return tenant;

    } catch (error) {
      logger.error('Failed to update tenant', { error: error.message, tenantId });
      throw error;
    }
  }

  /**
   * Get tenant usage statistics — counted from the shared database, scoped
   * by the tenantId field on each collection (field-based isolation).
   * @param {string} tenantId - Tenant identifier
   * @returns {Promise<Object>} Usage statistics
   */
  static async getTenantUsage(tenantId) {
    try {
      const User = mongoose.model('User');
      const Product = mongoose.model('Product');
      const Sale = mongoose.model('Sale');
      const Customer = mongoose.model('Customer');

      const [
        userCount,
        productCount,
        saleCount,
        customerCount
      ] = await Promise.all([
        User.countDocuments({ tenantId }),
        Product.countDocuments({ tenantId }),
        Sale.countDocuments({ tenantId }),
        Customer.countDocuments({ tenantId })
      ]);

      const usage = {
        users: userCount,
        products: productCount,
        sales: saleCount,
        customers: customerCount,
        lastUpdated: new Date().toISOString()
      };

      return usage;

    } catch (error) {
      logger.error('Failed to get tenant usage', { error: error.message, tenantId });
      throw error;
    }
  }

  /**
   * Generate unique tenant ID
   * @param {string} name - Tenant name
   * @returns {string} Unique tenant ID
   */
  static generateTenantId(name) {
    const sanitized = name.toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .substring(0, 10);

    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 5);

    return `${sanitized}_${timestamp}_${random}`;
  }

  /**
   * Get plan features
   * @param {string} plan - Plan name
   * @returns {Array} Plan features
   */
  static getPlanFeatures(plan) {
    const features = {
      basic: ['dashboard', 'sales', 'inventory', 'customers'],
      professional: ['dashboard', 'sales', 'inventory', 'customers', 'analytics', 'reports', 'staff'],
      enterprise: ['dashboard', 'sales', 'inventory', 'customers', 'analytics', 'reports', 'staff', 'api', 'webhooks', 'multistore']
    };

    return features[plan] || features.basic;
  }

  /**
   * Validate tenant access to feature
   * @param {string} tenantId - Tenant identifier
   * @param {string} feature - Feature name
   * @returns {Promise<boolean>} Access allowed
   */
  static async validateFeatureAccess(tenantId, feature) {
    try {
      const tenant = await this.getTenant(tenantId);
      return tenant.settings.features.includes(feature);
    } catch (error) {
      logger.error('Failed to validate feature access', {
        error: error.message,
        tenantId,
        feature
      });
      return false;
    }
  }
}

module.exports = TenantService;
