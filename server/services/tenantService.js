/**
 * Multi-Tenant Service for Organization-Level Data Isolation
 * Provides tenant management and data isolation capabilities
 */

const mongoose = require('mongoose');
const { logger } = require('../config/logger');
const { cacheService } = require('../config/cache');

class TenantService {
  
  /**
   * Get tenant-specific database connection
   * @param {string} tenantId - Tenant identifier
   * @returns {mongoose.Connection} Tenant-specific connection
   */
  static getTenantConnection(tenantId) {
    if (!tenantId) {
      throw new Error('Tenant ID is required');
    }

    const connectionKey = `tenant_${tenantId}`;
    
    // Check if connection already exists
    if (mongoose.connections.find(conn => conn.name === connectionKey)) {
      return mongoose.connections.find(conn => conn.name === connectionKey);
    }

    // Create new tenant-specific connection
    const tenantDbName = `${process.env.DB_NAME || 'dukani'}_${tenantId}`;
    const connectionString = process.env.DATABASE_URL.replace(/\/[^\/]*$/, `/${tenantDbName}`);
    
    const connection = mongoose.createConnection(connectionString, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    connection.name = connectionKey;
    
    logger.info('Created tenant database connection', {
      tenantId,
      dbName: tenantDbName
    });

    return connection;
  }

  /**
   * Get tenant-specific model
   * @param {string} tenantId - Tenant identifier
   * @param {string} modelName - Model name
   * @param {mongoose.Schema} schema - Mongoose schema
   * @returns {mongoose.Model} Tenant-specific model
   */
  static getTenantModel(tenantId, modelName, schema) {
    const connection = this.getTenantConnection(tenantId);
    
    // Check if model already exists for this connection
    if (connection.models[modelName]) {
      return connection.models[modelName];
    }

    // Create and return new model
    return connection.model(modelName, schema);
  }

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
      
      // Create tenant record in main database
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

      // Initialize tenant database
      await this.initializeTenantDatabase(tenantId);

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
   * Initialize tenant database with default data
   * @param {string} tenantId - Tenant identifier
   */
  static async initializeTenantDatabase(tenantId) {
    try {
      const connection = this.getTenantConnection(tenantId);
      
      // Import all model schemas
      const Product = require('../models/Product');
      const Sale = require('../models/Sale');
      const Customer = require('../models/Customer');
      const Staff = require('../models/Staff');
      const User = require('../models/User');
      const Expense = require('../models/Expense');
      const Inventory = require('../models/Inventory');

      // Create tenant-specific models
      const TenantProduct = connection.model('Product', Product.schema);
      const TenantSale = connection.model('Sale', Sale.schema);
      const TenantCustomer = connection.model('Customer', Customer.schema);
      const TenantStaff = connection.model('Staff', Staff.schema);
      const TenantUser = connection.model('User', User.schema);
      const TenantExpense = connection.model('Expense', Expense.schema);
      const TenantInventory = connection.model('Inventory', Inventory.schema);

      // Create default categories
      await TenantProduct.create([
        {
          name: 'Sample Product',
          code: 'SAMPLE001',
          barcode: '1234567890123',
          price: 10.00,
          purchasePrice: 7.00,
          stock: 100,
          category: 'General',
          supplier: 'Default Supplier',
          reorderPoint: 10
        }
      ]);

      // Create default customer
      await TenantCustomer.create([
        {
          name: 'Walk-in Customer',
          type: 'cash',
          email: 'walkin@example.com'
        }
      ]);

      logger.info('Tenant database initialized', { tenantId });

    } catch (error) {
      logger.error('Failed to initialize tenant database', { 
        error: error.message, 
        tenantId 
      });
      throw error;
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
   * Get tenant usage statistics
   * @param {string} tenantId - Tenant identifier
   * @returns {Promise<Object>} Usage statistics
   */
  static async getTenantUsage(tenantId) {
    try {
      const connection = this.getTenantConnection(tenantId);
      
      const [
        userCount,
        productCount,
        saleCount,
        customerCount
      ] = await Promise.all([
        connection.model('User').countDocuments(),
        connection.model('Product').countDocuments(),
        connection.model('Sale').countDocuments(),
        connection.model('Customer').countDocuments()
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

  /**
   * Close tenant database connection
   * @param {string} tenantId - Tenant identifier
   */
  static async closeTenantConnection(tenantId) {
    const connectionKey = `tenant_${tenantId}`;
    const connection = mongoose.connections.find(conn => conn.name === connectionKey);
    
    if (connection) {
      await connection.close();
      logger.info('Tenant connection closed', { tenantId });
    }
  }
}

module.exports = TenantService;
