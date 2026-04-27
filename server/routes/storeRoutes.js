/**
 * Public Store Routes - No authentication required
 * Handles individual storefronts and store directory
 */

const express = require('express');
const router = express.Router();
const StoreService = require('../services/storeService');
const { logger } = require('../config/logger');

/**
 * GET /api/public/stores
 * Get all public stores (store directory)
 */
router.get('/stores', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      category, 
      search 
    } = req.query;
    
    const filters = {};
    if (category) filters.category = category;
    if (search) filters.search = search;
    
    const pagination = {
      page: parseInt(page),
      limit: Math.min(parseInt(limit), 100) // Max 100 per page
    };
    
    const result = await StoreService.getPublicStores(filters, pagination);
    
    res.json({
      success: true,
      data: result
    });
    
  } catch (error) {
    logger.error('Failed to get public stores', {
      error: error.message,
      ip: req.ip
    });
    
    res.status(500).json({
      error: 'Failed to fetch stores',
      message: error.message
    });
  }
});

/**
 * GET /api/public/store/:slug
 * Get individual store by slug
 */
router.get('/store/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    
    if (!slug || slug.trim() === '') {
      return res.status(400).json({
        error: 'Store slug is required'
      });
    }
    
    const storeData = await StoreService.getStoreBySlug(slug);
    
    res.json({
      success: true,
      data: storeData
    });
    
  } catch (error) {
    if (error.message === 'Store not found') {
      // HELPFUL: Return list of available stores
      try {
        const Business = require('../models/Business');
        const allBusinesses = await Business.find({}).select('slug name status isPublic');
        
        return res.status(404).json({
          error: 'Store not found',
          message: `Store '${req.params.slug}' does not exist or is not public`,
          availableStores: allBusinesses.map(b => ({
            slug: b.slug,
            name: b.name,
            status: b.status,
            isPublic: b.isPublic,
            accessible: b.status === 'active' && b.isPublic === true
          })),
          hint: 'Store must have status="active" AND isPublic=true to be accessible'
        });
      } catch (e) {
        return res.status(404).json({
          error: 'Store not found',
          message: 'This store does not exist or is not public'
        });
      }
    }
    
    logger.error('Failed to get store', {
      error: error.message,
      slug: req.params.slug,
      ip: req.ip
    });
    
    res.status(500).json({
      error: 'Failed to fetch store',
      message: error.message
    });
  }
});

/**
 * GET /api/public/store/:slug/products
 * Get products for a specific store with filtering
 */
router.get('/store/:slug/products', async (req, res) => {
  try {
    const { slug } = req.params;
    const { 
      page = 1, 
      limit = 20, 
      category, 
      search,
      priceMin,
      priceMax,
      inStock,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;
    
    if (!slug || slug.trim() === '') {
      return res.status(400).json({
        error: 'Store slug is required'
      });
    }
    
    const filters = {
      category,
      search,
      priceMin,
      priceMax,
      inStock
    };
    
    // Remove undefined values
    Object.keys(filters).forEach(key => {
      if (filters[key] === undefined) {
        delete filters[key];
      }
    });
    
    const pagination = {
      page: parseInt(page),
      limit: Math.min(parseInt(limit), 100),
      sortBy,
      sortOrder
    };
    
    const result = await StoreService.getStoreProducts(slug, filters, pagination);
    
    res.json({
      success: true,
      data: result
    });
    
  } catch (error) {
    if (error.message === 'Store not found') {
      return res.status(404).json({
        error: 'Store not found',
        message: 'This store does not exist or is not public'
      });
    }
    
    logger.error('Failed to get store products', {
      error: error.message,
      slug: req.params.slug,
      ip: req.ip
    });
    
    res.status(500).json({
      error: 'Failed to fetch store products',
      message: error.message
    });
  }
});

module.exports = router;
