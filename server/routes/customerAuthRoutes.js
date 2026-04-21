/**
 * Customer Authentication Routes
 * Handles customer registration, login, and account management
 */

const express = require('express');
const router = express.Router();
const CustomerAuthService = require('../services/customerAuthService');
const { body, validationResult } = require('express-validator');
const { logger } = require('../config/logger');

// Middleware for customer authentication
const requireCustomer = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({
      error: 'Authentication required',
      message: 'No token provided'
    });
  }

  try {
    const customer = await CustomerAuthService.verifyCustomerToken(token);
    req.customer = customer;
    next();
  } catch (error) {
    return res.status(403).json({
      error: 'Authentication failed',
      message: error.message
    });
  }
};

// Validation middleware
const validateCustomerRegistration = [
  body('firstName')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('First name is required and must be less than 50 characters'),
  body('lastName')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Last name is required and must be less than 50 characters'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
  body('phone')
    .optional()
    .isMobilePhone()
    .withMessage('Valid phone number is required')
];

const validateCustomerLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
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
 * POST /api/customer-auth/register
 * Register a new customer account
 */
router.post('/register', validateCustomerRegistration, handleValidationErrors, async (req, res) => {
  try {
    const customerData = req.body;
    
    logger.info('Customer registration attempt', {
      email: customerData.email,
      ip: req.ip
    });
    
    const result = await CustomerAuthService.registerCustomer(customerData);
    
    res.status(201).json({
      success: true,
      message: 'Account created successfully. Please check your email to verify your account.',
      data: result.customer
    });
    
  } catch (error) {
    logger.error('Customer registration failed', {
      error: error.message,
      email: req.body.email,
      ip: req.ip
    });
    
    res.status(400).json({
      error: 'Registration failed',
      message: error.message
    });
  }
});

/**
 * POST /api/customer-auth/login
 * Customer login
 */
router.post('/login', validateCustomerLogin, handleValidationErrors, async (req, res) => {
  try {
    const { email, password } = req.body;
    
    logger.info('Customer login attempt', {
      email,
      ip: req.ip
    });
    
    const result = await CustomerAuthService.loginCustomer(email, password);
    
    res.json({
      success: true,
      message: 'Login successful',
      data: result
    });
    
  } catch (error) {
    logger.error('Customer login failed', {
      error: error.message,
      email: req.body.email,
      ip: req.ip
    });
    
    res.status(401).json({
      error: 'Login failed',
      message: error.message
    });
  }
});

/**
 * POST /api/customer-auth/verify-email
 * Verify customer email
 */
router.post('/verify-email', async (req, res) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({
        error: 'Verification token is required'
      });
    }
    
    const result = await CustomerAuthService.verifyCustomerEmail(token);
    
    res.json({
      success: true,
      message: 'Email verified successfully',
      data: result
    });
    
  } catch (error) {
    logger.error('Email verification failed', {
      error: error.message,
      token: req.body.token
    });
    
    res.status(400).json({
      error: 'Verification failed',
      message: error.message
    });
  }
});

/**
 * POST /api/customer-auth/forgot-password
 * Request password reset
 */
router.post('/forgot-password', [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required')
], handleValidationErrors, async (req, res) => {
  try {
    const { email } = req.body;
    
    const result = await CustomerAuthService.requestPasswordReset(email);
    
    res.json({
      success: true,
      message: result.message
    });
    
  } catch (error) {
    logger.error('Password reset request failed', {
      error: error.message,
      email: req.body.email
    });
    
    res.status(400).json({
      error: 'Password reset request failed',
      message: error.message
    });
  }
});

/**
 * POST /api/customer-auth/reset-password
 * Reset password with token
 */
router.post('/reset-password', [
  body('token')
    .notEmpty()
    .withMessage('Reset token is required'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters')
], handleValidationErrors, async (req, res) => {
  try {
    const { token, password } = req.body;
    
    const result = await CustomerAuthService.resetPassword(token, password);
    
    res.json({
      success: true,
      message: result.message
    });
    
  } catch (error) {
    logger.error('Password reset failed', {
      error: error.message,
      token: req.body.token
    });
    
    res.status(400).json({
      error: 'Password reset failed',
      message: error.message
    });
  }
});

/**
 * GET /api/customer-auth/profile
 * Get customer profile
 */
router.get('/profile', requireCustomer, async (req, res) => {
  try {
    const CustomerAccount = require('../models/CustomerAccount');
    const customer = await CustomerAccount.findById(req.customer.customerId)
      .select('-password -passwordResetToken -passwordResetExpires -verificationToken -verificationExpires');
    
    if (!customer) {
      return res.status(404).json({
        error: 'Customer not found'
      });
    }
    
    res.json({
      success: true,
      data: customer
    });
    
  } catch (error) {
    logger.error('Failed to get customer profile', {
      error: error.message,
      customerId: req.customer.customerId
    });
    
    res.status(500).json({
      error: 'Failed to get profile',
      message: error.message
    });
  }
});

/**
 * PUT /api/customer-auth/profile
 * Update customer profile
 */
router.put('/profile', requireCustomer, async (req, res) => {
  try {
    const updateData = req.body;
    
    const result = await CustomerAuthService.updateCustomerProfile(
      req.customer.customerId,
      updateData
    );
    
    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: result
    });
    
  } catch (error) {
    logger.error('Customer profile update failed', {
      error: error.message,
      customerId: req.customer.customerId
    });
    
    res.status(400).json({
      error: 'Profile update failed',
      message: error.message
    });
  }
});

/**
 * POST /api/customer-auth/change-password
 * Change customer password
 */
router.post('/change-password', requireCustomer, [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters')
], handleValidationErrors, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const CustomerAccount = require('../models/CustomerAccount');
    
    const customer = await CustomerAccount.findById(req.customer.customerId);
    if (!customer) {
      return res.status(404).json({
        error: 'Customer not found'
      });
    }
    
    // Verify current password
    const isCurrentPasswordValid = await customer.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        error: 'Current password is incorrect'
      });
    }
    
    // Update password
    customer.password = newPassword;
    await customer.save();
    
    logger.info('Customer password changed', {
      customerId: customer._id,
      email: customer.email
    });
    
    res.json({
      success: true,
      message: 'Password changed successfully'
    });
    
  } catch (error) {
    logger.error('Password change failed', {
      error: error.message,
      customerId: req.customer.customerId
    });
    
    res.status(400).json({
      error: 'Password change failed',
      message: error.message
    });
  }
});

module.exports = { router, requireCustomer };
