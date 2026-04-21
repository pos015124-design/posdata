/**
 * Business Routes for E-commerce Business Management
 * Handles business registration, approval, and management endpoints
 */

const express = require('express');
const router = express.Router();
const BusinessService = require('../services/businessService');
const { requireUser, requireAdmin } = require('./middleware/auth');
const { body, validationResult } = require('express-validator');
const { logger } = require('../config/logger');

// Validation middleware
const validateBusinessRegistration = [
  body('business.name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Business name must be between 2 and 100 characters'),
  body('business.email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  body('business.category')
    .isIn([
      'retail', 'restaurant', 'services', 'electronics', 'clothing', 
      'health', 'beauty', 'automotive', 'home-garden', 'sports',
      'books', 'toys', 'jewelry', 'grocery', 'other'
    ])
    .withMessage('Valid business category is required'),
  body('owner.email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid owner email is required'),
  body('owner.password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
  body('owner.firstName')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('First name is required'),
  body('owner.lastName')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Last name is required')
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
 * POST /api/business/register
 * Register a new business
 */
router.post('/register', validateBusinessRegistration, handleValidationErrors, async (req, res) => {
  try {
    const { business, owner } = req.body;
    logger.info('Business registration attempt', {
      businessName: business?.name,
      ownerEmail: owner?.email,
      ip: req.ip,
      body: req.body
    });
    const result = await BusinessService.registerBusiness(business, owner);
    res.status(201).json({
      success: true,
      message: 'Business registration submitted successfully. Awaiting admin approval.',
      data: result
    });
  } catch (error) {
    // Log full error stack and request body for debugging
    console.error('Business registration failed:', error);
    logger.error('Business registration failed', {
      error: error.message,
      stack: error.stack,
      ip: req.ip,
      body: req.body
    });
    res.status(400).json({
      error: 'Registration failed',
      message: error.message,
      details: error.stack
    });
  }
});

/**
 * GET /api/business/pending
 * Get pending business registrations (Admin only)
 */
router.get('/pending', requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    
    const result = await BusinessService.getAllBusinesses(
      { status: 'pending' },
      { page: parseInt(page), limit: parseInt(limit) }
    );
    
    res.json({
      success: true,
      data: result
    });
    
  } catch (error) {
    logger.error('Failed to get pending businesses', {
      error: error.message,
      userId: req.user.userId
    });
    
    res.status(500).json({
      error: 'Failed to fetch pending businesses',
      message: error.message
    });
  }
});

/**
 * POST /api/business/:id/approve
 * Approve a business registration (Admin only)
 */
router.post('/:id/approve', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    const business = await BusinessService.approveBusiness(id, req.user.userId);
    
    res.json({
      success: true,
      message: 'Business approved successfully',
      data: business
    });
    
  } catch (error) {
    logger.error('Business approval failed', {
      error: error.message,
      businessId: req.params.id,
      adminId: req.user.userId
    });
    
    res.status(400).json({
      error: 'Approval failed',
      message: error.message
    });
  }
});

/**
 * POST /api/business/:id/reject
 * Reject a business registration (Admin only)
 */
router.post('/:id/reject', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    
    if (!reason) {
      return res.status(400).json({
        error: 'Rejection reason is required'
      });
    }
    
    const business = await BusinessService.rejectBusiness(id, req.user.userId, reason);
    
    res.json({
      success: true,
      message: 'Business rejected successfully',
      data: business
    });
    
  } catch (error) {
    logger.error('Business rejection failed', {
      error: error.message,
      businessId: req.params.id,
      adminId: req.user.userId
    });
    
    res.status(400).json({
      error: 'Rejection failed',
      message: error.message
    });
  }
});

/**
 * GET /api/business/all
 * Get all businesses (Admin only)
 */
router.get('/all', requireAdmin, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      status, 
      category, 
      businessType, 
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;
    
    const filters = {};
    if (status) filters.status = status;
    if (category) filters.category = category;
    if (businessType) filters.businessType = businessType;
    if (search) filters.search = search;
    
    const pagination = {
      page: parseInt(page),
      limit: parseInt(limit),
      sortBy,
      sortOrder
    };
    
    const result = await BusinessService.getAllBusinesses(filters, pagination);
    
    res.json({
      success: true,
      data: result
    });
    
  } catch (error) {
    logger.error('Failed to get all businesses', {
      error: error.message,
      userId: req.user.userId
    });
    
    res.status(500).json({
      error: 'Failed to fetch businesses',
      message: error.message
    });
  }
});

/**
 * GET /api/business/public
 * Get public businesses (marketplace)
 */
router.get('/public', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      category, 
      featured, 
      search 
    } = req.query;
    
    const filters = {};
    if (category) filters.category = category;
    if (featured === 'true') filters.featured = true;
    if (search) filters.search = search;
    
    const pagination = {
      page: parseInt(page),
      limit: parseInt(limit)
    };
    
    const result = await BusinessService.getPublicBusinesses(filters, pagination);
    
    res.json({
      success: true,
      data: result
    });
    
  } catch (error) {
    logger.error('Failed to get public businesses', {
      error: error.message,
      ip: req.ip
    });
    
    res.status(500).json({
      error: 'Failed to fetch businesses',
      message: error.message
    });
  }
});

/**
 * GET /api/business/:id
 * Get business profile
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const business = await BusinessService.getBusinessProfile(id);
    
    // Check if user has permission to view this business
    if (req.user) {
      const canView = req.user.role === 'super_admin' || 
                     req.user.businessId === id ||
                     business.isPublic;
      
      if (!canView) {
        return res.status(403).json({
          error: 'Access denied',
          message: 'You do not have permission to view this business'
        });
      }
    } else if (!business.isPublic) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'This business profile is not public'
      });
    }
    
    res.json({
      success: true,
      data: business
    });
    
  } catch (error) {
    logger.error('Failed to get business profile', {
      error: error.message,
      businessId: req.params.id,
      userId: req.user?.userId
    });
    
    res.status(404).json({
      error: 'Business not found',
      message: error.message
    });
  }
});

/**
 * PUT /api/business/:id
 * Update business profile
 */
router.put('/:id', requireUser, async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    // Remove sensitive fields that shouldn't be updated via this endpoint
    delete updateData.tenantId;
    delete updateData.status;
    delete updateData.verified;
    delete updateData.analytics;
    
    const business = await BusinessService.updateBusinessProfile(id, updateData, req.user.userId);
    
    res.json({
      success: true,
      message: 'Business profile updated successfully',
      data: business
    });
    
  } catch (error) {
    logger.error('Business profile update failed', {
      error: error.message,
      businessId: req.params.id,
      userId: req.user.userId
    });
    
    res.status(400).json({
      error: 'Update failed',
      message: error.message
    });
  }
});

/**
 * GET /api/business/slug/:slug
 * Get business by slug (public)
 */
router.get('/slug/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    
    const business = await Business.findOne({ 
      slug, 
      status: 'active', 
      isPublic: true 
    });
    
    if (!business) {
      return res.status(404).json({
        error: 'Business not found',
        message: 'The requested business could not be found'
      });
    }
    
    // Increment view count
    business.analytics.views += 1;
    await business.save();
    
    res.json({
      success: true,
      data: business
    });
    
  } catch (error) {
    logger.error('Failed to get business by slug', {
      error: error.message,
      slug: req.params.slug
    });
    
    res.status(500).json({
      error: 'Failed to fetch business',
      message: error.message
    });
  }
});

module.exports = router;
