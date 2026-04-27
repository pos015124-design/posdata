/**
 * Store Service - Handles public storefront logic
 * Each seller/business has their own unique store
 */

const Business = require('../models/Business');
const Product = require('../models/Product');
const { logger } = require('../config/logger');

class StoreService {
  
  /**
   * Get public store by slug
   * @param {string} slug - Business slug
   * @returns {Promise<Object>} Store info and products
   */
  static async getStoreBySlug(slug) {
    try {
      console.log(`[Store Service] Looking for store slug: "${slug}"`);
      
      // First, try to find ANY business with this slug (ignore status/isPublic)
      const anyBusiness = await Business.findOne({
        slug: slug.toLowerCase()
      });
      
      if (!anyBusiness) {
        console.log(`[Store Service] ❌ No business found with slug: "${slug}"`);
        console.log(`[Store Service] 💡 Available businesses:`);
        
        const allBusinesses = await Business.find({}).select('slug userId status isPublic name');
        console.log(allBusinesses.map(b => ({
          slug: b.slug,
          name: b.name,
          status: b.status,
          isPublic: b.isPublic,
          userId: b.userId
        })));
        
        throw new Error('Store not found');
      }
      
      console.log(`[Store Service] Found business:`, {
        slug: anyBusiness.slug,
        name: anyBusiness.name,
        status: anyBusiness.status,
        isPublic: anyBusiness.isPublic,
        userId: anyBusiness.userId
      });
      
      // Find active, public business by slug
      const business = await Business.findOne({
        slug: slug.toLowerCase(),
        status: 'active',
        isPublic: true
      }).select('name slug description logo email phone address socialMedia');

      if (!business) {
        console.log(`[Store Service] ❌ Business exists but is not accessible:`);
        console.log(`   - status: "${anyBusiness.status}" (needs to be "active")`);
        console.log(`   - isPublic: ${anyBusiness.isPublic} (needs to be true)`);
        throw new Error('Store not found');
      }
      
      console.log(`[Store Service] ✅ Store accessible, fetching products...`);

      // Get published products for this business
      const products = await Product.find({
        userId: business.userId,
        isPublished: true,
        status: 'active'
      })
        .select('name code price images category description stock isFeatured')
        .sort({ isFeatured: -1, createdAt: -1 });
        
      console.log(`[Store Service] Found ${products.length} products for this store`);

      return {
        business: {
          _id: business._id,
          name: business.name,
          slug: business.slug,
          description: business.description,
          logo: business.logo,
          email: business.email,
          phone: business.phone,
          address: business.address,
          socialMedia: business.socialMedia
        },
        products: products.map(p => ({
          _id: p._id,
          name: p.name,
          code: p.code,
          price: p.price,
          images: p.images || [],
          category: p.category,
          description: p.description,
          stock: p.stock,
          isFeatured: p.isFeatured
        })),
        productCount: products.length
      };

    } catch (error) {
      throw new Error(`Error fetching store: ${error.message}`);
    }
  }

  /**
   * Get all public stores (store directory)
   * @param {Object} filters - Filter options
   * @param {Object} pagination - Pagination options
   * @returns {Promise<Object>} List of public stores
   */
  static async getPublicStores(filters = {}, pagination = {}) {
    try {
      const { page = 1, limit = 20 } = pagination;
      const skip = (page - 1) * limit;

      // Build query
      const query = {
        status: 'active',
        isPublic: true
      };

      if (filters.search) {
        query.$or = [
          { name: { $regex: filters.search, $options: 'i' } },
          { description: { $regex: filters.search, $options: 'i' } }
        ];
      }

      if (filters.category) {
        query.category = filters.category;
      }

      // Get total count
      const total = await Business.countDocuments(query);

      // Get businesses
      const businesses = await Business.find(query)
        .select('name slug description logo email category')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      // Get product count for each business
      const storesWithCounts = await Promise.all(
        businesses.map(async (business) => {
          const productCount = await Product.countDocuments({
            userId: business.userId,
            isPublished: true,
            status: 'active'
          });

          return {
            _id: business._id,
            name: business.name,
            slug: business.slug,
            description: business.description,
            logo: business.logo,
            email: business.email,
            category: business.category,
            productCount
          };
        })
      );

      return {
        stores: storesWithCounts,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };

    } catch (error) {
      throw new Error(`Error fetching stores: ${error.message}`);
    }
  }

  /**
   * Get store products with filtering
   * @param {string} slug - Business slug
   * @param {Object} filters - Filter options
   * @param {Object} pagination - Pagination options
   * @returns {Promise<Object>} Filtered products
   */
  static async getStoreProducts(slug, filters = {}, pagination = {}) {
    try {
      // Verify store exists and is public
      const business = await Business.findOne({
        slug: slug.toLowerCase(),
        status: 'active',
        isPublic: true
      });

      if (!business) {
        throw new Error('Store not found');
      }

      const { page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc' } = pagination;
      const skip = (page - 1) * limit;

      // Build query
      const query = {
        userId: business.userId,
        isPublished: true,
        status: 'active'
      };

      // Apply filters
      if (filters.category) {
        query.category = filters.category;
      }

      if (filters.search) {
        query.$or = [
          { name: { $regex: filters.search, $options: 'i' } },
          { description: { $regex: filters.search, $options: 'i' } },
          { code: { $regex: filters.search, $options: 'i' } }
        ];
      }

      if (filters.priceMin || filters.priceMax) {
        query.price = {};
        if (filters.priceMin) query.price.$gte = parseFloat(filters.priceMin);
        if (filters.priceMax) query.price.$lte = parseFloat(filters.priceMax);
      }

      if (filters.inStock === 'true') {
        query.stock = { $gt: 0 };
      }

      // Sort options
      const sort = {};
      sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

      // Get total count
      const total = await Product.countDocuments(query);

      // Get products
      const products = await Product.find(query)
        .select('name code price images category description stock isFeatured')
        .sort(sort)
        .skip(skip)
        .limit(limit);

      return {
        business: {
          _id: business._id,
          name: business.name,
          slug: business.slug
        },
        products: products.map(p => ({
          _id: p._id,
          name: p.name,
          code: p.code,
          price: p.price,
          images: p.images || [],
          category: p.category,
          description: p.description,
          stock: p.stock,
          isFeatured: p.isFeatured
        })),
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };

    } catch (error) {
      throw new Error(`Error fetching store products: ${error.message}`);
    }
  }

  /**
   * Generate store URL for a business
   * @param {string} slug - Business slug
   * @param {string} baseUrl - Base URL of the application
   * @returns {string} Full store URL
   */
  static getStoreUrl(slug, baseUrl = '') {
    return `${baseUrl}/store/${slug}`;
  }
}

module.exports = StoreService;
