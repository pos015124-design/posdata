/**
 * Catalog Service for Public Product Browsing
 * Handles public product catalog, search, and filtering
 */

const Product = require('../models/Product');
const Business = require('../models/Business');
const Category = require('../models/Category');
const { logger } = require('../config/logger');

class CatalogService {
  
  /**
   * Get public products for a business
   * @param {string} businessId - Business ID
   * @param {Object} filters - Filter options
   * @param {Object} pagination - Pagination options
   * @returns {Promise<Object>} Products list
   */
  static async getBusinessProducts(businessId, filters = {}, pagination = {}) {
    try {
      // Verify business is public and active
      const business = await Business.findOne({
        _id: businessId,
        status: 'active',
        isPublic: true
      });
      
      if (!business) {
        throw new Error('Business not found or not public');
      }
      
      const { page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc' } = pagination;
      const skip = (page - 1) * limit;
      
      // Build query for published products only
      const query = {
        isPublished: true,
        status: 'active'
      };
      
      // Apply filters
      if (filters.category) {
        query.category = filters.category;
      }
      
      if (filters.subcategory) {
        query.subcategory = filters.subcategory;
      }
      
      if (filters.priceMin || filters.priceMax) {
        query.price = {};
        if (filters.priceMin) query.price.$gte = parseFloat(filters.priceMin);
        if (filters.priceMax) query.price.$lte = parseFloat(filters.priceMax);
      }
      
      if (filters.inStock === 'true') {
        query.$or = [
          { trackInventory: false },
          { trackInventory: true, stock: { $gt: 0 } },
          { trackInventory: true, allowBackorder: true }
        ];
      }
      
      if (filters.featured === 'true') {
        query.isFeatured = true;
      }
      
      if (filters.search) {
        query.$text = { $search: filters.search };
      }
      
      // Build sort object
      const sort = {};
      if (filters.search) {
        sort.score = { $meta: 'textScore' };
      }
      sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
      
      const [products, total] = await Promise.all([
        Product.find(query)
          .select('name slug description shortDescription price compareAtPrice images category subcategory tags isFeatured stock trackInventory allowBackorder analytics')
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .lean(),
        Product.countDocuments(query)
      ]);
      
      // Increment view count for products
      if (products.length > 0) {
        const productIds = products.map(p => p._id);
        await Product.updateMany(
          { _id: { $in: productIds } },
          { $inc: { 'analytics.views': 1 } }
        );
      }
      
      return {
        products,
        business: {
          id: business._id,
          name: business.name,
          slug: business.slug,
          description: business.description,
          logo: business.logo,
          colors: business.colors
        },
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
      
    } catch (error) {
      logger.error('Failed to get business products', {
        error: error.message,
        businessId,
        filters,
        pagination
      });
      throw error;
    }
  }
  
  /**
   * Get product details by slug
   * @param {string} businessId - Business ID
   * @param {string} productSlug - Product slug
   * @returns {Promise<Object>} Product details
   */
  static async getProductBySlug(businessId, productSlug) {
    try {
      // Verify business is public and active
      const business = await Business.findOne({
        _id: businessId,
        status: 'active',
        isPublic: true
      });
      
      if (!business) {
        throw new Error('Business not found or not public');
      }
      
      const product = await Product.findOne({
        slug: productSlug,
        isPublished: true,
        status: 'active'
      }).lean();
      
      if (!product) {
        throw new Error('Product not found');
      }
      
      // Increment view count
      await Product.findByIdAndUpdate(
        product._id,
        { $inc: { 'analytics.views': 1 } }
      );
      
      return {
        product,
        business: {
          id: business._id,
          name: business.name,
          slug: business.slug,
          description: business.description,
          logo: business.logo,
          colors: business.colors
        }
      };
      
    } catch (error) {
      logger.error('Failed to get product by slug', {
        error: error.message,
        businessId,
        productSlug
      });
      throw error;
    }
  }
  
  /**
   * Search products across all businesses
   * @param {string} searchQuery - Search query
   * @param {Object} filters - Filter options
   * @param {Object} pagination - Pagination options
   * @returns {Promise<Object>} Search results
   */
  static async searchProducts(searchQuery, filters = {}, pagination = {}) {
    try {
      const { page = 1, limit = 20 } = pagination;
      const skip = (page - 1) * limit;
      
      // Build query
      const query = {
        isPublished: true,
        status: 'active',
        $text: { $search: searchQuery }
      };
      
      // Apply filters
      if (filters.category) {
        query.category = filters.category;
      }
      
      if (filters.priceMin || filters.priceMax) {
        query.price = {};
        if (filters.priceMin) query.price.$gte = parseFloat(filters.priceMin);
        if (filters.priceMax) query.price.$lte = parseFloat(filters.priceMax);
      }
      
      const [products, total] = await Promise.all([
        Product.find(query)
          .select('name slug description price compareAtPrice images category tags businessId')
          .sort({ score: { $meta: 'textScore' }, 'analytics.sales': -1 })
          .skip(skip)
          .limit(limit)
          .populate('businessId', 'name slug logo')
          .lean(),
        Product.countDocuments(query)
      ]);
      
      return {
        products,
        searchQuery,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
      
    } catch (error) {
      logger.error('Failed to search products', {
        error: error.message,
        searchQuery,
        filters
      });
      throw error;
    }
  }
  
  /**
   * Get featured products across all businesses
   * @param {Object} pagination - Pagination options
   * @returns {Promise<Object>} Featured products
   */
  static async getFeaturedProducts(pagination = {}) {
    try {
      const { page = 1, limit = 20 } = pagination;
      const skip = (page - 1) * limit;
      
      const [products, total] = await Promise.all([
        Product.find({
          isPublished: true,
          status: 'active',
          isFeatured: true
        })
          .select('name slug description price compareAtPrice images category tags businessId')
          .sort({ 'analytics.sales': -1, createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .populate('businessId', 'name slug logo colors')
          .lean(),
        Product.countDocuments({
          isPublished: true,
          status: 'active',
          isFeatured: true
        })
      ]);
      
      return {
        products,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
      
    } catch (error) {
      logger.error('Failed to get featured products', {
        error: error.message
      });
      throw error;
    }
  }
  
  /**
   * Get product categories for a business
   * @param {string} businessId - Business ID
   * @returns {Promise<Array>} Categories list
   */
  static async getBusinessCategories(businessId) {
    try {
      // Verify business is public and active
      const business = await Business.findOne({
        _id: businessId,
        status: 'active',
        isPublic: true
      });
      
      if (!business) {
        throw new Error('Business not found or not public');
      }
      
      const categories = await Product.aggregate([
        {
          $match: {
            isPublished: true,
            status: 'active'
          }
        },
        {
          $group: {
            _id: '$category',
            count: { $sum: 1 },
            subcategories: { $addToSet: '$subcategory' }
          }
        },
        {
          $sort: { count: -1 }
        }
      ]);
      
      return categories.map(cat => ({
        name: cat._id,
        count: cat.count,
        subcategories: cat.subcategories.filter(Boolean)
      }));
      
    } catch (error) {
      logger.error('Failed to get business categories', {
        error: error.message,
        businessId
      });
      throw error;
    }
  }
  
  /**
   * Get related products
   * @param {string} productId - Product ID
   * @param {number} limit - Number of related products
   * @returns {Promise<Array>} Related products
   */
  static async getRelatedProducts(productId, limit = 4) {
    try {
      const product = await Product.findById(productId);
      if (!product) {
        throw new Error('Product not found');
      }
      
      const relatedProducts = await Product.find({
        _id: { $ne: productId },
        category: product.category,
        isPublished: true,
        status: 'active'
      })
        .select('name slug price compareAtPrice images category')
        .sort({ 'analytics.sales': -1 })
        .limit(limit)
        .lean();
      
      return relatedProducts;
      
    } catch (error) {
      logger.error('Failed to get related products', {
        error: error.message,
        productId
      });
      throw error;
    }
  }
}

module.exports = CatalogService;
