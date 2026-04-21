/**
 * Business Service for E-commerce Business Management
 * Handles business registration, profile management, and business operations
 */

const mongoose = require('mongoose');
const Business = require('../models/Business');
const User = require('../models/User');
const Tenant = require('../models/Tenant');
const TenantService = require('./tenantService');
const { logger } = require('../config/logger');

class BusinessService {
  
  /**
   * Register a new business
   * @param {Object} businessData - Business registration data
   * @param {Object} ownerData - Business owner data
   * @returns {Promise<Object>} Created business and owner
   */
  static async registerBusiness(businessData, ownerData) {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      // Validate business data
      await this.validateBusinessData(businessData);
      // Check if business name or slug already exists
      const existingBusiness = await Business.findOne({
        $or: [
          { name: businessData.name },
          { slug: businessData.slug || this.generateSlug(businessData.name) }
        ]
      }).session(session);
      if (existingBusiness) {
        throw new Error('Business name or URL already exists');
      }
      // Create tenant first
      const tenantData = {
        name: businessData.name,
        domain: businessData.slug || this.generateSlug(businessData.name),
        adminEmail: ownerData.email,
        plan: businessData.plan || 'basic'
      };
      const tenant = await TenantService.createTenant(tenantData);
      // Create business owner user
      const businessOwner = new User({
        email: ownerData.email,
        password: ownerData.password,
        firstName: ownerData.firstName,
        lastName: ownerData.lastName,
        role: 'business_admin',
        tenantId: tenant.tenantId,
        isApproved: false, // Requires admin approval
        isActive: true
      });
      await businessOwner.save({ session });
      // Create business profile
      const business = new Business({
        tenantId: tenant.tenantId,
        name: businessData.name,
        slug: businessData.slug || this.generateSlug(businessData.name),
        description: businessData.description,
        tagline: businessData.tagline,
        email: businessData.email || ownerData.email,
        phone: businessData.phone,
        website: businessData.website,
        address: businessData.address,
        category: businessData.category,
        businessType: businessData.businessType || 'hybrid',
        status: 'pending', // Requires admin approval
        isPublic: false,
        ecommerce: {
          enabled: true,
          currency: businessData.currency || 'USD',
          taxRate: businessData.taxRate || 0,
          shippingEnabled: businessData.shippingEnabled || false,
          pickupEnabled: businessData.pickupEnabled || true,
          minimumOrderAmount: businessData.minimumOrderAmount || 0
        },
        businessHours: businessData.businessHours || this.getDefaultBusinessHours(),
        socialMedia: businessData.socialMedia || []
      });
      await business.save({ session });
      // Update user with business reference
      businessOwner.businessId = business._id;
      await businessOwner.save({ session });
      await session.commitTransaction();
      session.endSession();
      logger.info('Business registered successfully', {
        businessId: business._id,
        tenantId: tenant.tenantId,
        ownerEmail: ownerData.email
      });
      return {
        business: {
          id: business._id,
          name: business.name,
          slug: business.slug,
          status: business.status,
          tenantId: business.tenantId
        },
        owner: {
          id: businessOwner._id,
          email: businessOwner.email,
          fullName: businessOwner.fullName,
          role: businessOwner.role,
          isApproved: businessOwner.isApproved
        },
        tenant: {
          tenantId: tenant.tenantId,
          plan: tenant.plan
        }
      };
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      // Log full error stack and input for debugging
      console.error('BusinessService.registerBusiness failed:', error, { businessData, ownerData });
      logger.error('BusinessService.registerBusiness failed', {
        error: error.message,
        stack: error.stack,
        businessData,
        ownerData
      });
      throw new Error(`Business registration failed: ${error.message}`);
    }
  }
  
  /**
   * Approve a business registration
   * @param {string} businessId - Business ID
   * @param {string} adminId - Admin user ID
   * @returns {Promise<Object>} Updated business
   */
  static async approveBusiness(businessId, adminId) {
    try {
      const business = await Business.findById(businessId);
      if (!business) {
        throw new Error('Business not found');
      }
      
      if (business.status !== 'pending') {
        throw new Error('Business is not pending approval');
      }
      
      // Update business status
      business.status = 'active';
      business.isPublic = true;
      await business.save();
      
      // Approve business owner
      const owner = await User.findOne({ 
        businessId: businessId, 
        role: 'business_admin' 
      });
      
      if (owner) {
        owner.isApproved = true;
        await owner.save();
      }
      
      logger.info('Business approved', {
        businessId,
        adminId,
        businessName: business.name
      });
      
      return business;
      
    } catch (error) {
      logger.error('Business approval failed', {
        error: error.message,
        businessId,
        adminId
      });
      throw error;
    }
  }
  
  /**
   * Reject a business registration
   * @param {string} businessId - Business ID
   * @param {string} adminId - Admin user ID
   * @param {string} reason - Rejection reason
   * @returns {Promise<Object>} Updated business
   */
  static async rejectBusiness(businessId, adminId, reason) {
    try {
      const business = await Business.findById(businessId);
      if (!business) {
        throw new Error('Business not found');
      }
      
      if (business.status !== 'pending') {
        throw new Error('Business is not pending approval');
      }
      
      // Update business status
      business.status = 'suspended';
      business.isPublic = false;
      await business.save();
      
      // Deactivate business owner
      const owner = await User.findOne({ 
        businessId: businessId, 
        role: 'business_admin' 
      });
      
      if (owner) {
        owner.isApproved = false;
        owner.isActive = false;
        await owner.save();
      }
      
      logger.info('Business rejected', {
        businessId,
        adminId,
        reason,
        businessName: business.name
      });
      
      return business;
      
    } catch (error) {
      logger.error('Business rejection failed', {
        error: error.message,
        businessId,
        adminId
      });
      throw error;
    }
  }
  
  /**
   * Get business profile
   * @param {string} businessId - Business ID
   * @returns {Promise<Object>} Business profile
   */
  static async getBusinessProfile(businessId) {
    try {
      const business = await Business.findById(businessId);
      if (!business) {
        throw new Error('Business not found');
      }
      
      return business;
      
    } catch (error) {
      logger.error('Failed to get business profile', {
        error: error.message,
        businessId
      });
      throw error;
    }
  }
  
  /**
   * Update business profile
   * @param {string} businessId - Business ID
   * @param {Object} updateData - Update data
   * @param {string} userId - User making the update
   * @returns {Promise<Object>} Updated business
   */
  static async updateBusinessProfile(businessId, updateData, userId) {
    try {
      const business = await Business.findById(businessId);
      if (!business) {
        throw new Error('Business not found');
      }
      
      // Validate user has permission to update this business
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }
      
      if (user.role !== 'super_admin' && 
          (user.role !== 'business_admin' || user.businessId.toString() !== businessId)) {
        throw new Error('Insufficient permissions to update business');
      }
      
      // Update business data
      Object.assign(business, updateData);
      await business.save();
      
      logger.info('Business profile updated', {
        businessId,
        userId,
        updatedFields: Object.keys(updateData)
      });
      
      return business;
      
    } catch (error) {
      logger.error('Business profile update failed', {
        error: error.message,
        businessId,
        userId
      });
      throw error;
    }
  }
  
  /**
   * Get all businesses (admin only)
   * @param {Object} filters - Filter options
   * @param {Object} pagination - Pagination options
   * @returns {Promise<Object>} Businesses list with pagination
   */
  static async getAllBusinesses(filters = {}, pagination = {}) {
    try {
      const { page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc' } = pagination;
      const skip = (page - 1) * limit;
      
      // Build query
      const query = {};
      if (filters.status) query.status = filters.status;
      if (filters.category) query.category = filters.category;
      if (filters.businessType) query.businessType = filters.businessType;
      if (filters.search) {
        query.$or = [
          { name: { $regex: filters.search, $options: 'i' } },
          { email: { $regex: filters.search, $options: 'i' } },
          { description: { $regex: filters.search, $options: 'i' } }
        ];
      }
      
      const [businesses, total] = await Promise.all([
        Business.find(query)
          .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        Business.countDocuments(query)
      ]);
      
      return {
        businesses,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
      
    } catch (error) {
      logger.error('Failed to get businesses list', {
        error: error.message,
        filters,
        pagination
      });
      throw error;
    }
  }
  
  /**
   * Get public businesses (for marketplace)
   * @param {Object} filters - Filter options
   * @param {Object} pagination - Pagination options
   * @returns {Promise<Object>} Public businesses list
   */
  static async getPublicBusinesses(filters = {}, pagination = {}) {
    try {
      const { page = 1, limit = 20 } = pagination;
      const skip = (page - 1) * limit;
      
      // Build query for public businesses only
      const query = { 
        status: 'active', 
        isPublic: true 
      };
      
      if (filters.category) query.category = filters.category;
      if (filters.featured) query.featured = true;
      if (filters.search) {
        query.$or = [
          { name: { $regex: filters.search, $options: 'i' } },
          { description: { $regex: filters.search, $options: 'i' } },
          { tags: { $in: [new RegExp(filters.search, 'i')] } }
        ];
      }
      
      const [businesses, total] = await Promise.all([
        Business.find(query)
          .select('name slug description tagline category businessType logo banner colors analytics')
          .sort({ featured: -1, 'analytics.revenue': -1, createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        Business.countDocuments(query)
      ]);
      
      return {
        businesses,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
      
    } catch (error) {
      logger.error('Failed to get public businesses', {
        error: error.message,
        filters,
        pagination
      });
      throw error;
    }
  }
  
  /**
   * Validate business registration data
   * @param {Object} businessData - Business data to validate
   */
  static async validateBusinessData(businessData) {
    const required = ['name', 'category', 'email'];
    const missing = required.filter(field => !businessData[field]);
    
    if (missing.length > 0) {
      throw new Error(`Missing required fields: ${missing.join(', ')}`);
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(businessData.email)) {
      throw new Error('Invalid email format');
    }
    
    // Validate category
    const validCategories = [
      'retail', 'restaurant', 'services', 'electronics', 'clothing', 
      'health', 'beauty', 'automotive', 'home-garden', 'sports',
      'books', 'toys', 'jewelry', 'grocery', 'other'
    ];
    
    if (!validCategories.includes(businessData.category)) {
      throw new Error('Invalid business category');
    }
  }
  
  /**
   * Generate URL slug from business name
   * @param {string} name - Business name
   * @returns {string} URL slug
   */
  static generateSlug(name) {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim('-');
  }
  
  /**
   * Get default business hours
   * @returns {Array} Default business hours
   */
  static getDefaultBusinessHours() {
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    return days.map(day => ({
      day,
      isOpen: day !== 'sunday',
      openTime: '09:00',
      closeTime: '17:00'
    }));
  }
}

module.exports = BusinessService;
