/**
 * Catalog Routes for Public Product Browsing
 * Handles public product catalog, search, and filtering
 */

const express = require('express');
const router = express.Router();
const CatalogService = require('../services/catalogService');
const { logger } = require('../config/logger');

/**
 * GET /api/catalog/business/:businessId/products
 * Get products for a business
 */
router.get('/business/:businessId/products', async (req, res) => {
  try {
    const { businessId } = req.params;
    const {
      page = 1,
      limit = 20,
      category,
      subcategory,
      priceMin,
      priceMax,
      inStock,
      featured,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;
    
    if (!businessId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        error: 'Invalid business ID'
      });
    }
    
    const filters = {
      category,
      subcategory,
      priceMin,
      priceMax,
      inStock,
      featured,
      search
    };
    
    // Remove undefined values
    Object.keys(filters).forEach(key => {
      if (filters[key] === undefined) {
        delete filters[key];
      }
    });
    
    const pagination = {
      page: parseInt(page),
      limit: Math.min(parseInt(limit), 100), // Max 100 items per page
      sortBy,
      sortOrder
    };
    
    const result = await CatalogService.getBusinessProducts(businessId, filters, pagination);
    
    res.json({
      success: true,
      data: result
    });
    
  } catch (error) {
    logger.error('Failed to get business products', {
      error: error.message,
      businessId: req.params.businessId,
      query: req.query
    });
    
    res.status(404).json({
      error: 'Failed to get products',
      message: error.message
    });
  }
});

/**
 * GET /api/catalog/business/:businessId/product/:slug
 * Get product details by slug
 */
router.get('/business/:businessId/product/:slug', async (req, res) => {
  try {
    const { businessId, slug } = req.params;
    
    if (!businessId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        error: 'Invalid business ID'
      });
    }
    
    const result = await CatalogService.getProductBySlug(businessId, slug);
    
    res.json({
      success: true,
      data: result
    });
    
  } catch (error) {
    logger.error('Failed to get product by slug', {
      error: error.message,
      businessId: req.params.businessId,
      slug: req.params.slug
    });
    
    res.status(404).json({
      error: 'Product not found',
      message: error.message
    });
  }
});

/**
 * GET /api/catalog/business/:businessId/categories
 * Get categories for a business
 */
router.get('/business/:businessId/categories', async (req, res) => {
  try {
    const { businessId } = req.params;
    
    if (!businessId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        error: 'Invalid business ID'
      });
    }
    
    const categories = await CatalogService.getBusinessCategories(businessId);
    
    res.json({
      success: true,
      data: categories
    });
    
  } catch (error) {
    logger.error('Failed to get business categories', {
      error: error.message,
      businessId: req.params.businessId
    });
    
    res.status(404).json({
      error: 'Failed to get categories',
      message: error.message
    });
  }
});

/**
 * GET /api/catalog/search
 * Search products across all businesses
 */
router.get('/search', async (req, res) => {
  try {
    const {
      q: searchQuery,
      page = 1,
      limit = 20,
      category,
      priceMin,
      priceMax
    } = req.query;
    
    if (!searchQuery || searchQuery.trim().length < 2) {
      return res.status(400).json({
        error: 'Search query must be at least 2 characters long'
      });
    }
    
    const filters = {
      category,
      priceMin,
      priceMax
    };
    
    // Remove undefined values
    Object.keys(filters).forEach(key => {
      if (filters[key] === undefined) {
        delete filters[key];
      }
    });
    
    const pagination = {
      page: parseInt(page),
      limit: Math.min(parseInt(limit), 100)
    };
    
    const result = await CatalogService.searchProducts(searchQuery.trim(), filters, pagination);
    
    res.json({
      success: true,
      data: result
    });
    
  } catch (error) {
    logger.error('Failed to search products', {
      error: error.message,
      query: req.query
    });
    
    res.status(500).json({
      error: 'Search failed',
      message: error.message
    });
  }
});

/**
 * GET /api/catalog/featured
 * Get featured products across all businesses
 */
router.get('/featured', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20
    } = req.query;
    
    const pagination = {
      page: parseInt(page),
      limit: Math.min(parseInt(limit), 100)
    };
    
    const result = await CatalogService.getFeaturedProducts(pagination);
    
    res.json({
      success: true,
      data: result
    });
    
  } catch (error) {
    logger.error('Failed to get featured products', {
      error: error.message,
      query: req.query
    });
    
    res.status(500).json({
      error: 'Failed to get featured products',
      message: error.message
    });
  }
});

/**
 * GET /api/catalog/product/:productId/related
 * Get related products
 */
router.get('/product/:productId/related', async (req, res) => {
  try {
    const { productId } = req.params;
    const { limit = 4 } = req.query;
    
    if (!productId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        error: 'Invalid product ID'
      });
    }
    
    const relatedProducts = await CatalogService.getRelatedProducts(
      productId,
      Math.min(parseInt(limit), 20)
    );
    
    res.json({
      success: true,
      data: relatedProducts
    });
    
  } catch (error) {
    logger.error('Failed to get related products', {
      error: error.message,
      productId: req.params.productId
    });
    
    res.status(404).json({
      error: 'Failed to get related products',
      message: error.message
    });
  }
});

/**
 * GET /api/catalog/business/:businessSlug/products
 * Get products for a business by slug (alternative endpoint)
 */
router.get('/business-slug/:businessSlug/products', async (req, res) => {
  try {
    const { businessSlug } = req.params;
    
    // Find business by slug first
    const Business = require('../models/Business');
    const business = await Business.findOne({
      slug: businessSlug,
      status: 'active',
      isPublic: true
    }).select('_id');
    
    if (!business) {
      return res.status(404).json({
        error: 'Business not found'
      });
    }
    
    // Forward to main products endpoint
    req.params.businessId = business._id.toString();
    return router.handle(req, res);
    
  } catch (error) {
    logger.error('Failed to get business by slug', {
      error: error.message,
      businessSlug: req.params.businessSlug
    });
    
    res.status(404).json({
      error: 'Business not found',
      message: error.message
    });
  }
});

module.exports = router;
