/**
 * Customer Authentication Service
 * Handles customer account registration, login, and management
 */

const jwt = require('jsonwebtoken');
const CustomerAccount = require('../models/CustomerAccount');
const { logger } = require('../config/logger');

class CustomerAuthService {
  
  /**
   * Register a new customer account
   * @param {Object} customerData - Customer registration data
   * @returns {Promise<Object>} Created customer account
   */
  static async registerCustomer(customerData) {
    try {
      // Check if customer already exists
      const existingCustomer = await CustomerAccount.findByEmail(customerData.email);
      if (existingCustomer) {
        throw new Error('Customer account already exists with this email');
      }
      
      // Create new customer account
      const customer = new CustomerAccount({
        firstName: customerData.firstName,
        lastName: customerData.lastName,
        email: customerData.email,
        phone: customerData.phone,
        password: customerData.password,
        dateOfBirth: customerData.dateOfBirth,
        gender: customerData.gender,
        preferences: {
          newsletter: customerData.newsletter || false,
          smsNotifications: customerData.smsNotifications || false,
          emailNotifications: customerData.emailNotifications !== false,
          language: customerData.language || 'en',
          currency: customerData.currency || 'USD'
        }
      });
      
      // Generate verification token
      const verificationToken = customer.generateVerificationToken();
      
      await customer.save();
      
      logger.info('Customer account created', {
        customerId: customer._id,
        email: customer.email
      });
      
      return {
        customer: {
          id: customer._id,
          email: customer.email,
          fullName: customer.fullName,
          isVerified: customer.isVerified
        },
        verificationToken
      };
      
    } catch (error) {
      logger.error('Customer registration failed', {
        error: error.message,
        email: customerData.email
      });
      throw error;
    }
  }
  
  /**
   * Authenticate customer login
   * @param {string} email - Customer email
   * @param {string} password - Customer password
   * @returns {Promise<Object>} Authentication result
   */
  static async loginCustomer(email, password) {
    try {
      // Find customer by email
      const customer = await CustomerAccount.findByEmail(email);
      if (!customer) {
        throw new Error('Invalid email or password');
      }
      
      // Check if account is active
      if (!customer.isActive) {
        throw new Error('Account is deactivated. Please contact support.');
      }
      
      // Check if account is locked
      if (customer.isAccountLocked()) {
        const timeRemaining = Math.ceil((customer.accountLockedUntil - new Date()) / 1000 / 60);
        throw new Error(`Account is locked. Try again in ${timeRemaining} minutes.`);
      }
      
      // Verify password
      const isPasswordValid = await customer.comparePassword(password);
      if (!isPasswordValid) {
        await customer.recordFailedLogin();
        throw new Error('Invalid email or password');
      }
      
      // Record successful login
      await customer.recordLogin();
      
      // Generate JWT token
      const token = jwt.sign(
        {
          customerId: customer._id,
          email: customer.email,
          type: 'customer'
        },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );
      
      logger.info('Customer login successful', {
        customerId: customer._id,
        email: customer.email
      });
      
      return {
        token,
        customer: {
          id: customer._id,
          email: customer.email,
          fullName: customer.fullName,
          isVerified: customer.isVerified,
          preferences: customer.preferences
        }
      };
      
    } catch (error) {
      logger.error('Customer login failed', {
        error: error.message,
        email
      });
      throw error;
    }
  }
  
  /**
   * Verify customer email
   * @param {string} token - Verification token
   * @returns {Promise<Object>} Verification result
   */
  static async verifyCustomerEmail(token) {
    try {
      const customer = await CustomerAccount.findOne({
        verificationToken: token,
        verificationExpires: { $gt: new Date() }
      });
      
      if (!customer) {
        throw new Error('Invalid or expired verification token');
      }
      
      customer.isVerified = true;
      customer.verificationToken = undefined;
      customer.verificationExpires = undefined;
      
      await customer.save();
      
      logger.info('Customer email verified', {
        customerId: customer._id,
        email: customer.email
      });
      
      return {
        customer: {
          id: customer._id,
          email: customer.email,
          fullName: customer.fullName,
          isVerified: customer.isVerified
        }
      };
      
    } catch (error) {
      logger.error('Email verification failed', {
        error: error.message,
        token
      });
      throw error;
    }
  }
  
  /**
   * Request password reset
   * @param {string} email - Customer email
   * @returns {Promise<Object>} Password reset result
   */
  static async requestPasswordReset(email) {
    try {
      const customer = await CustomerAccount.findByEmail(email);
      if (!customer) {
        // Don't reveal if email exists or not
        return { message: 'If the email exists, a reset link has been sent.' };
      }
      
      if (!customer.isActive) {
        throw new Error('Account is deactivated. Please contact support.');
      }
      
      const resetToken = customer.generatePasswordResetToken();
      await customer.save();
      
      logger.info('Password reset requested', {
        customerId: customer._id,
        email: customer.email
      });
      
      return {
        resetToken,
        message: 'Password reset link has been sent to your email.'
      };
      
    } catch (error) {
      logger.error('Password reset request failed', {
        error: error.message,
        email
      });
      throw error;
    }
  }
  
  /**
   * Reset customer password
   * @param {string} token - Reset token
   * @param {string} newPassword - New password
   * @returns {Promise<Object>} Reset result
   */
  static async resetPassword(token, newPassword) {
    try {
      const customer = await CustomerAccount.findOne({
        passwordResetToken: token,
        passwordResetExpires: { $gt: new Date() }
      });
      
      if (!customer) {
        throw new Error('Invalid or expired reset token');
      }
      
      customer.password = newPassword;
      customer.passwordResetToken = undefined;
      customer.passwordResetExpires = undefined;
      customer.failedLoginAttempts = 0;
      customer.accountLockedUntil = undefined;
      
      await customer.save();
      
      logger.info('Password reset successful', {
        customerId: customer._id,
        email: customer.email
      });
      
      return {
        message: 'Password has been reset successfully.'
      };
      
    } catch (error) {
      logger.error('Password reset failed', {
        error: error.message,
        token
      });
      throw error;
    }
  }
  
  /**
   * Update customer profile
   * @param {string} customerId - Customer ID
   * @param {Object} updateData - Update data
   * @returns {Promise<Object>} Updated customer
   */
  static async updateCustomerProfile(customerId, updateData) {
    try {
      const customer = await CustomerAccount.findById(customerId);
      if (!customer) {
        throw new Error('Customer not found');
      }
      
      // Remove sensitive fields that shouldn't be updated via this method
      delete updateData.password;
      delete updateData.isVerified;
      delete updateData.isActive;
      delete updateData.failedLoginAttempts;
      delete updateData.accountLockedUntil;
      
      Object.assign(customer, updateData);
      await customer.save();
      
      logger.info('Customer profile updated', {
        customerId: customer._id,
        updatedFields: Object.keys(updateData)
      });
      
      return {
        customer: {
          id: customer._id,
          email: customer.email,
          fullName: customer.fullName,
          phone: customer.phone,
          dateOfBirth: customer.dateOfBirth,
          gender: customer.gender,
          preferences: customer.preferences,
          isVerified: customer.isVerified
        }
      };
      
    } catch (error) {
      logger.error('Customer profile update failed', {
        error: error.message,
        customerId
      });
      throw error;
    }
  }
  
  /**
   * Verify customer JWT token
   * @param {string} token - JWT token
   * @returns {Promise<Object>} Customer data
   */
  static async verifyCustomerToken(token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      if (decoded.type !== 'customer') {
        throw new Error('Invalid token type');
      }
      
      const customer = await CustomerAccount.findById(decoded.customerId);
      if (!customer || !customer.isActive) {
        throw new Error('Customer not found or inactive');
      }
      
      return {
        customerId: customer._id,
        email: customer.email,
        fullName: customer.fullName,
        isVerified: customer.isVerified
      };
      
    } catch (error) {
      logger.error('Customer token verification failed', {
        error: error.message
      });
      throw error;
    }
  }
}

module.exports = CustomerAuthService;
