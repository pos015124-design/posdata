/**
 * Business Routes for E-commerce Business Management
 * Handles business registration, approval, and management endpoints
 */

const express = require('express');
const router = express.Router();
const BusinessService = require('../services/businessService');
const TenantService = require('../services/tenantService');
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
 * GET /api/business/my-business
 * Get current user's business profile
 */
router.get('/my-business', requireUser, async (req, res) => {
  try {
    const Business = require('../models/Business');
    
    // Find business owned by this user
    const business = await Business.findOne({ 
      userId: req.user.userId 
    }).select('name slug description logo email phone address isPublic status category');
    
    if (!business) {
      return res.status(404).json({
        error: 'Business not found',
        message: 'You have not created a business profile yet'
      });
    }
    
    res.json({
      success: true,
      data: business
    });
    
  } catch (error) {
    logger.error('Failed to get user business', {
      error: error.message,
      userId: req.user.userId
    });
    
    res.status(500).json({
      error: 'Failed to fetch business',
      message: error.message
    });
  }
});

/**
 * POST /api/business/my-business
 * Create business profile for current user
 */
router.post('/my-business', requireUser, async (req, res) => {
  try {
    const Business = require('../models/Business');
    const User = require('../models/User');
    const { name, slug, email, phone, address, category, description, isPublic } = req.body;
    
    // Check if user already has a business
    const existingBusiness = await Business.findOne({ userId: req.user.userId });
    
    if (existingBusiness) {
      return res.status(400).json({
        error: 'Business already exists',
        message: 'You already have a business profile. Use PUT to update it.',
        businessId: existingBusiness._id
      });
    }
    
    // Generate slug if not provided
    let businessSlug = slug;
    if (!businessSlug && name) {
      businessSlug = name
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();
    }
    
    if (!businessSlug) {
      return res.status(400).json({
        error: 'Slug required',
        message: 'Please provide a store slug or business name'
      });
    }
    
    // Check if slug is unique
    const slugExists = await Business.findOne({ slug: businessSlug });
    if (slugExists) {
      return res.status(400).json({
        error: 'Slug already taken',
        message: 'This store URL is already in use. Please choose a different one.'
      });
    }
    
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        message: 'Unable to resolve current user'
      });
    }

    // Ensure tenantId exists before creating business
    let tenantId = user.tenantId;
    if (!tenantId) {
      const tenant = await TenantService.createTenant({
        name: name || `${req.user.email}'s Store`,
        domain: businessSlug,
        adminEmail: email || req.user.email,
        plan: 'basic'
      });
      tenantId = tenant.tenantId;
      user.tenantId = tenantId;
      await user.save();
    }

    // Create business
    const business = new Business({
      tenantId,
      name: name || `${req.user.email}'s Store`,
      slug: businessSlug,
      email: email || req.user.email,
      phone: phone || '',
      address: address || {},
      category: category || 'retail',
      description: description || '',
      userId: req.user.userId,
      status: 'active', // Auto-activate for now
      isPublic: isPublic !== undefined ? isPublic : true
    });
    
    await business.save();
    
    // Link user to business
    await User.findByIdAndUpdate(req.user.userId, {
      businessId: business._id
    });
    
    logger.info('Business created', {
      businessId: business._id,
      userId: req.user.userId,
      slug: business.slug,
      name: business.name
    });
    
    res.status(201).json({
      success: true,
      message: 'Business created successfully',
      data: business
    });
    
  } catch (error) {
    logger.error('Failed to create business', {
      error: error.message,
      userId: req.user.userId
    });
    
    res.status(400).json({
      error: 'Failed to create business',
      message: error.message
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
 * POST /api/business/sync-approved-owners
 * Backfill: activate businesses whose owners are already approved
 */
router.post('/sync-approved-owners', requireAdmin, async (req, res) => {
  try {
    const Business = require('../models/Business');
    const User = require('../models/User');

    const approvedOwners = await User.find({
      role: 'business_admin',
      isApproved: true,
      businessId: { $exists: true, $ne: null }
    }).select('businessId');

    const businessIds = approvedOwners.map((u) => u.businessId).filter(Boolean);
    const result = await Business.updateMany(
      { _id: { $in: businessIds } },
      { $set: { status: 'active', isPublic: true } }
    );

    res.json({
      success: true,
      message: `Synchronized ${result.modifiedCount || 0} business profile(s)`,
      updatedCount: result.modifiedCount || 0
    });
  } catch (error) {
    logger.error('Failed to sync approved owner businesses', {
      error: error.message,
      userId: req.user?.userId
    });
    res.status(500).json({
      error: 'Sync failed',
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
