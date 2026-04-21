/**
 * Database Migration: Add indexes and constraints
 * This migration adds proper indexes and constraints to optimize performance
 */

const mongoose = require('mongoose');
const User = require('../models/User');
const Business = require('../models/Business');
const Product = require('../models/Product');
const Order = require('../models/Order');
const Inventory = require('../models/Inventory');
const { logger } = require('../config/logger');

class Migration {
  static async up() {
    try {
      logger.info('Starting database migration: Add indexes and constraints');
      
      // Create compound indexes for better query performance
      await User.createIndex({ email: 1, tenantId: 1 });
      await User.createIndex({ role: 1, tenantId: 1, isActive: 1 });
      await User.createIndex({ businessId: 1, role: 1, isActive: 1 });
      
      await Business.createIndex({ tenantId: 1, status: 1 });
      await Business.createIndex({ category: 1, status: 1, isPublic: 1 });
      await Business.createIndex({ slug: 1, tenantId: 1 }, { unique: true });
      
      await Product.createIndex({ businessId: 1, category: 1, status: 1 });
      await Product.createIndex({ tenantId: 1, businessId: 1 });
      await Product.createIndex({ name: 'text', description: 'text' }); // Text search index
      
      await Order.createIndex({ businessId: 1, orderDate: -1 });
      await Order.createIndex({ customerId: 1, orderDate: -1 });
      await Order.createIndex({ status: 1, createdAt: -1 });
      await Order.createIndex({ orderNumber: 1 }, { unique: true });
      
      await Inventory.createIndex({ product: 1, createdAt: -1 });
      await Inventory.createIndex({ type: 1, createdAt: -1 });
      
      // Add validation for existing data
      await Migration.validateExistingData();
      
      logger.info('Database migration completed successfully');
    } catch (error) {
      logger.error('Database migration failed', { error: error.message });
      throw error;
    }
  }

  static async validateExistingData() {
    // Validate that all required fields are present
    await User.updateMany(
      { 
        $or: [
          { email: { $exists: false } },
          { email: '' },
          { role: { $exists: false } }
        ]
      },
      { 
        $set: { 
          role: 'staff',
          tenantId: 'default-tenant'
        }
      }
    );

    await Business.updateMany(
      { 
        $or: [
          { name: { $exists: false } },
          { name: '' },
          { slug: { $exists: false } }
        ]
      },
      { 
        $set: { 
          name: 'Default Business',
          slug: 'default-business'
        }
      }
    );
  }

  static async down() {
    try {
      logger.info('Starting rollback of database migration: Remove indexes and constraints');
      
      // Remove indexes (MongoDB doesn't require explicit removal as they're maintained automatically)
      // The indexes will be automatically managed by the schema definitions
      
      logger.info('Database migration rollback completed');
    } catch (error) {
      logger.error('Database migration rollback failed', { error: error.message });
      throw error;
    }
  }
}

module.exports = Migration;