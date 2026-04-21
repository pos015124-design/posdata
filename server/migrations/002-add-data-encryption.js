/**
 * Database Migration: Add data encryption for sensitive fields
 * This migration adds encryption for sensitive data like customer information
 */

const mongoose = require('mongoose');
const Customer = require('../models/Customer');
const CustomerAccount = require('../models/CustomerAccount');
const crypto = require('crypto');
const { logger } = require('../config/logger');

// Simple encryption utility (in production, use proper encryption libraries)
class DataEncryption {
  constructor() {
    this.algorithm = 'aes-256-cbc';
    this.key = process.env.DATA_ENCRYPTION_KEY || crypto.randomBytes(32);
    this.iv = process.env.DATA_ENCRYPTION_IV || crypto.randomBytes(16);
  }

  encrypt(text) {
    if (!text) return text;
    try {
      const cipher = crypto.createCipheriv(this.algorithm, this.key, this.iv);
      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      return encrypted;
    } catch (error) {
      logger.error('Encryption failed', { error: error.message, text: text ? '***' : null });
      return text; // Return original if encryption fails
    }
  }

  decrypt(text) {
    if (!text) return text;
    try {
      const decipher = crypto.createDecipheriv(this.algorithm, this.key, this.iv);
      let decrypted = decipher.update(text, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch (error) {
      logger.error('Decryption failed', { error: error.message, text: '***' });
      return text; // Return encrypted if decryption fails
    }
  }
}

class Migration {
  static async up() {
    try {
      logger.info('Starting database migration: Add data encryption for sensitive fields');
      
      const encryption = new DataEncryption();
      
      // Update Customer model to add encrypted fields
      // Note: In a real scenario, we would update the schema first, then migrate data
      
      // Encrypt existing customer sensitive data
      const customers = await Customer.find({});
      for (const customer of customers) {
        let updated = false;
        
        if (customer.phone && !customer.phone.includes('encrypted:')) {
          customer.phone = `encrypted:${encryption.encrypt(customer.phone)}`;
          updated = true;
        }
        
        if (customer.email && !customer.email.includes('encrypted:')) {
          customer.email = `encrypted:${encryption.encrypt(customer.email)}`;
          updated = true;
        }
        
        if (customer.address && typeof customer.address === 'string' && !customer.address.includes('encrypted:')) {
          customer.address = `encrypted:${encryption.encrypt(customer.address)}`;
          updated = true;
        }
        
        if (updated) {
          await customer.save();
        }
      }
      
      // Encrypt existing customer account sensitive data
      const customerAccounts = await CustomerAccount.find({});
      for (const account of customerAccounts) {
        let updated = false;
        
        if (account.phone && !account.phone.includes('encrypted:')) {
          account.phone = `encrypted:${encryption.encrypt(account.phone)}`;
          updated = true;
        }
        
        if (account.email && !account.email.includes('encrypted:')) {
          account.email = `encrypted:${encryption.encrypt(account.email)}`;
          updated = true;
        }
        
        if (account.creditLimit !== undefined && typeof account.creditLimit === 'number') {
          // No encryption needed for creditLimit as it's a number
          updated = false;
        }
        
        if (updated) {
          await account.save();
        }
      }
      
      logger.info('Data encryption migration completed successfully');
    } catch (error) {
      logger.error('Data encryption migration failed', { error: error.message });
      throw error;
    }
  }

  static async down() {
    try {
      logger.info('Starting rollback of data encryption migration');
      
      const encryption = new DataEncryption();
      
      // Decrypt customer data
      const customers = await Customer.find({});
      for (const customer of customers) {
        let updated = false;
        
        if (customer.phone && customer.phone.startsWith('encrypted:')) {
          customer.phone = encryption.decrypt(customer.phone.substring(10));
          updated = true;
        }
        
        if (customer.email && customer.email.startsWith('encrypted:')) {
          customer.email = encryption.decrypt(customer.email.substring(10));
          updated = true;
        }
        
        if (customer.address && typeof customer.address === 'string' && customer.address.startsWith('encrypted:')) {
          customer.address = encryption.decrypt(customer.address.substring(10));
          updated = true;
        }
        
        if (updated) {
          await customer.save();
        }
      }
      
      // Decrypt customer account data
      const customerAccounts = await CustomerAccount.find({});
      for (const account of customerAccounts) {
        let updated = false;
        
        if (account.phone && account.phone.startsWith('encrypted:')) {
          account.phone = encryption.decrypt(account.phone.substring(10));
          updated = true;
        }
        
        if (account.email && account.email.startsWith('encrypted:')) {
          account.email = encryption.decrypt(account.email.substring(10));
          updated = true;
        }
        
        if (updated) {
          await account.save();
        }
      }
      
      logger.info('Data encryption migration rollback completed');
    } catch (error) {
      logger.error('Data encryption migration rollback failed', { error: error.message });
      throw error;
    }
  }
}

module.exports = Migration;