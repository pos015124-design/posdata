/**
 * Store Service - Handles public storefront logic
 * Each seller/business has their own unique store
 */

const mongoose = require('mongoose');
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
      }).select('name slug description logo email phone address socialMedia userId');

      if (!business) {
        console.log(`[Store Service] ❌ Business exists but is not accessible:`);
        console.log(`   - status: "${anyBusiness.status}" (needs to be "active")`);
        console.log(`   - isPublic: ${anyBusiness.isPublic} (needs to be true)`);
        throw new Error('Store not found');
      }
      
      console.log(`[Store Service] ✅ Store accessible, fetching products...`);

      // Cast userId to ObjectId so the query matches product.userId (ObjectId field)
      let ownerObjectId;
      try {
        ownerObjectId = new mongoose.Types.ObjectId(String(business.userId));
      } catch {
        console.log(`[Store Service] ❌ business.userId is not a valid ObjectId: ${business.userId}`);
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
          products: [],
          productCount: 0
        };
      }

      // Get published products for this business
      const products = await Product.find({
        userId: ownerObjectId,
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
          isFeatured: p.isFeatured,
          ownerId: business.userId,
          storeName: business.name,
          storeSlug: business.slug
        })),
        productCount: products.length
      };

    } catch (error) {
      if (error.message === 'Store not found') {
        throw error;
      }
      throw new Error(`Error fetching store: ${error.message}`);
    }
  }

  /**
   * AliExpress-style: published products from all active + public businesses.
   * Individual /store/:slug still lists only that owner's products.
   */
  static async getMarketplaceProducts(pagination = {}) {
    const page = Math.max(1, parseInt(pagination.page, 10) || 1);
    const limit = Math.min(Math.max(1, parseInt(pagination.limit, 10) || 100), 200);
    const skip = (page - 1) * limit;

    const businesses = await Business.find({
      status: 'active',
      isPublic: true
    })
      .select('userId name slug')
      .lean();

    if (!businesses.length) {
      return {
        products: [],
        pagination: { page, limit, total: 0, pages: 0 }
      };
    }

    const userIdToStore = new Map();
    const userIds = [];
    for (const b of businesses) {
      if (!b.userId) continue;
      const uid = String(b.userId);
      if (!userIdToStore.has(uid)) {
        // Cast to ObjectId so the $in query matches product.userId (ObjectId field)
        try {
          userIds.push(new mongoose.Types.ObjectId(uid));
        } catch {
          continue; // skip malformed ids
        }
        userIdToStore.set(uid, { storeName: b.name, storeSlug: b.slug });
      }
    }

    const query = {
      userId: { $in: userIds },
      isPublished: true,
      status: 'active'
    };

    const search = (pagination.search || '').trim();
    if (search) {
      const esc = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.$or = [
        { name: { $regex: esc, $options: 'i' } },
        { code: { $regex: esc, $options: 'i' } },
        { description: { $regex: esc, $options: 'i' } },
        { category: { $regex: esc, $options: 'i' } }
      ];
    }

    const cat = (pagination.category || '').trim();
    if (cat) {
      query.category = cat;
    }

    const total = await Product.countDocuments(query);
    const raw = await Product.find(query)
      .select('name code price images category description stock userId')
      .sort({ isFeatured: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const products = raw.map(p => {
      const store = userIdToStore.get(String(p.userId)) || { storeName: 'Store', storeSlug: null };
      return {
        _id: p._id,
        name: p.name,
        code: p.code,
        price: p.price,
        images: p.images || [],
        category: p.category,
        description: p.description,
        stock: p.stock,
        storeName: store.storeName,
        storeSlug: store.storeSlug,
        ownerId: p.userId
      };
    });

    return {
      products,
      pagination: {
        page,
        limit,
        total,
        pages: total ? Math.ceil(total / limit) : 0
      }
    };
  }

  /** Distinct product categories among all marketplace-eligible listings */
  static async getMarketplaceCategories() {
    const businesses = await Business.find({
      status: 'active',
      isPublic: true
    })
      .select('userId')
      .lean();

    const userIds = businesses.map(b => b.userId).filter(Boolean);
    if (!userIds.length) {
      return { categories: [] };
    }

    const raw = await Product.distinct('category', {
      userId: { $in: userIds },
      isPublished: true,
      status: 'active'
    });

    const categories = (raw || [])
      .filter(c => c != null && String(c).trim() !== '')
      .map(c => String(c))
      .sort((a, b) => a.localeCompare(b));

    return { categories };
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

      // Get businesses — include userId so product count query works
      const businesses = await Business.find(query)
        .select('name slug description logo email category userId')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      // Get product count for each business
      const storesWithCounts = await Promise.all(
        businesses.map(async (business) => {
          let productCount = 0;
          if (business.userId) {
            try {
              const ownerObjectId = new mongoose.Types.ObjectId(String(business.userId));
              productCount = await Product.countDocuments({
                userId: ownerObjectId,
                isPublished: true,
                status: 'active'
              });
            } catch {
              // userId not a valid ObjectId — count stays 0
            }
          }

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
        userId: new mongoose.Types.ObjectId(String(business.userId)),
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
