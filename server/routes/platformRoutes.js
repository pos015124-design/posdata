/**
 * Platform Routes for Super Admin Management
 * Handles platform-wide operations, settings, and analytics
 */

const express = require('express');
const router = express.Router();
const PlatformService = require('../services/platformService');
const { requireUser } = require('./middleware/auth');
const { body, validationResult } = require('express-validator');
const { logger } = require('../config/logger');

// Middleware to require super admin role
const requireSuperAdmin = async (req, res, next) => {
  if (!req.user || req.user.role !== 'super_admin') {
    return res.status(403).json({
      error: 'Access denied',
      message: 'Super admin access required'
    });
  }
  next();
};

/**
 * GET /api/platform/analytics
 * Get platform dashboard analytics (Super Admin only)
 */
router.get('/analytics', requireUser, requireSuperAdmin, async (req, res) => {
  try {
    const analytics = await PlatformService.getPlatformAnalytics();
    
    res.json({
      success: true,
      data: analytics
    });
    
  } catch (error) {
    logger.error('Failed to get platform analytics', {
      error: error.message,
      userId: req.user.userId
    });
    
    res.status(500).json({
      error: 'Failed to fetch analytics',
      message: error.message
    });
  }
});

/**
 * GET /api/platform/analytics/categories
 * Get business analytics by category (Super Admin only)
 */
router.get('/analytics/categories', requireUser, requireSuperAdmin, async (req, res) => {
  try {
    const analytics = await PlatformService.getBusinessAnalyticsByCategory();
    
    res.json({
      success: true,
      data: analytics
    });
    
  } catch (error) {
    logger.error('Failed to get category analytics', {
      error: error.message,
      userId: req.user.userId
    });
    
    res.status(500).json({
      error: 'Failed to fetch category analytics',
      message: error.message
    });
  }
});

/**
 * GET /api/platform/analytics/users
 * Get user analytics by role (Super Admin only)
 */
router.get('/analytics/users', requireUser, requireSuperAdmin, async (req, res) => {
  try {
    const analytics = await PlatformService.getUserAnalyticsByRole();
    
    res.json({
      success: true,
      data: analytics
    });
    
  } catch (error) {
    logger.error('Failed to get user analytics', {
      error: error.message,
      userId: req.user.userId
    });
    
    res.status(500).json({
      error: 'Failed to fetch user analytics',
      message: error.message
    });
  }
});

/**
 * GET /api/platform/analytics/revenue
 * Get revenue analytics over time (Super Admin only)
 */
router.get('/analytics/revenue', requireUser, requireSuperAdmin, async (req, res) => {
  try {
    const { period = '30d' } = req.query;
    const analytics = await PlatformService.getRevenueAnalytics(period);
    
    res.json({
      success: true,
      data: analytics
    });
    
  } catch (error) {
    logger.error('Failed to get revenue analytics', {
      error: error.message,
      userId: req.user.userId,
      period: req.query.period
    });
    
    res.status(500).json({
      error: 'Failed to fetch revenue analytics',
      message: error.message
    });
  }
});

/**
 * GET /api/platform/settings
 * Get platform settings (Super Admin only)
 */
router.get('/settings', requireUser, requireSuperAdmin, async (req, res) => {
  try {
    const settings = await PlatformService.getPlatformSettings();
    
    res.json({
      success: true,
      data: settings
    });
    
  } catch (error) {
    logger.error('Failed to get platform settings', {
      error: error.message,
      userId: req.user.userId
    });
    
    res.status(500).json({
      error: 'Failed to fetch settings',
      message: error.message
    });
  }
});

/**
 * PUT /api/platform/settings
 * Update platform settings (Super Admin only)
 */
router.put('/settings', requireUser, requireSuperAdmin, async (req, res) => {
  try {
    const updates = req.body;
    
    // Remove sensitive fields that shouldn't be updated
    delete updates._id;
    delete updates.createdAt;
    delete updates.lastModifiedBy;
    
    const settings = await PlatformService.updatePlatformSettings(updates, req.user.userId);
    
    res.json({
      success: true,
      message: 'Platform settings updated successfully',
      data: settings
    });
    
  } catch (error) {
    logger.error('Failed to update platform settings', {
      error: error.message,
      userId: req.user.userId
    });
    
    res.status(400).json({
      error: 'Failed to update settings',
      message: error.message
    });
  }
});

/**
 * GET /api/platform/health
 * Get system health status (Super Admin only)
 */
router.get('/health', requireUser, requireSuperAdmin, async (req, res) => {
  try {
    const health = await PlatformService.getSystemHealth();
    
    res.json({
      success: true,
      data: health
    });
    
  } catch (error) {
    logger.error('Failed to get system health', {
      error: error.message,
      userId: req.user.userId
    });
    
    res.status(500).json({
      error: 'Failed to fetch system health',
      message: error.message
    });
  }
});

/**
 * GET /api/platform/storefront-health
 * Catalog visibility metrics (Super Admin only)
 */
router.get('/storefront-health', requireUser, requireSuperAdmin, async (req, res) => {
  try {
    const data = await PlatformService.getStorefrontHealth();
    res.json({
      success: true,
      data
    });
  } catch (error) {
    logger.error('Failed to get storefront health', {
      error: error.message,
      userId: req.user.userId
    });
    res.status(500).json({
      error: 'Failed to fetch storefront health',
      message: error.message
    });
  }
});

/**
 * GET /api/platform/activity
 * Get platform activity logs (Super Admin only)
 */
router.get('/activity', requireUser, requireSuperAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 50, type } = req.query;
    
    const filters = {};
    if (type) filters.type = type;
    
    const pagination = {
      page: parseInt(page),
      limit: parseInt(limit)
    };
    
    const logs = await PlatformService.getActivityLogs(filters, pagination);
    
    res.json({
      success: true,
      data: logs
    });
    
  } catch (error) {
    logger.error('Failed to get activity logs', {
      error: error.message,
      userId: req.user.userId
    });
    
    res.status(500).json({
      error: 'Failed to fetch activity logs',
      message: error.message
    });
  }
});

/**
 * POST /api/platform/admin
 * Create super admin user (Only if no super admin exists)
 */
router.post('/admin', [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters'),
  body('firstName')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('First name is required'),
  body('lastName')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Last name is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }
    
    const adminData = req.body;
    const admin = await PlatformService.createSuperAdmin(adminData);
    
    res.status(201).json({
      success: true,
      message: 'Super admin created successfully',
      data: admin
    });
    
  } catch (error) {
    logger.error('Failed to create super admin', {
      error: error.message,
      email: req.body.email
    });
    
    res.status(400).json({
      error: 'Failed to create super admin',
      message: error.message
    });
  }
});

/**
 * GET /api/platform/stats
 * Get quick platform statistics (Super Admin only)
 */
router.get('/stats', requireUser, requireSuperAdmin, async (req, res) => {
  try {
    const Business = require('../models/Business');
    const User = require('../models/User');
    const Order = require('../models/Order');
    
    const [
      totalBusinesses,
      activeBusinesses,
      pendingBusinesses,
      totalUsers,
      totalOrders,
      todayOrders
    ] = await Promise.all([
      Business.countDocuments(),
      Business.countDocuments({ status: 'active' }),
      Business.countDocuments({ status: 'pending' }),
      User.countDocuments({ role: { $ne: 'super_admin' } }),
      Order.countDocuments(),
      Order.countDocuments({
        createdAt: {
          $gte: new Date(new Date().setHours(0, 0, 0, 0))
        }
      })
    ]);
    
    res.json({
      success: true,
      data: {
        businesses: {
          total: totalBusinesses,
          active: activeBusinesses,
          pending: pendingBusinesses
        },
        users: {
          total: totalUsers
        },
        orders: {
          total: totalOrders,
          today: todayOrders
        }
      }
    });
    
  } catch (error) {
    logger.error('Failed to get platform stats', {
      error: error.message,
      userId: req.user.userId
    });
    
    res.status(500).json({
      error: 'Failed to fetch statistics',
      message: error.message
    });
  }
});

module.exports = router;
