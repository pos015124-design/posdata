/**
 * Store Service - Handles public storefront logic
 * Each seller/business has their own unique store
 */

const mongoose = require('mongoose');
const Business = require('../models/Business');
const Product = require('../models/Product');
const { logger } = require('../config/logger');

const SELLER_SORT_FIELDS = new Set(['createdAt', 'updatedAt', 'isFeatured', 'price', 'name', 'stock']);
const SELLER_SORT_ORDERS = new Set(['asc', 'desc']);
const MARKETPLACE_SORTS = new Set(['relevant', 'newest', 'price']);
const MARKETPLACE_CANDIDATE_LIMIT = 1000;
const SPONSORED_PRIORITY_BONUS = 12;

function tokenize(value) {
  return String(value || '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .map(token => token.trim())
    .filter(Boolean);
}

function marketplaceRelevance(product, search) {
  const queryTokens = tokenize(search);
  if (!queryTokens.length) return 0;

  const nameTokens = tokenize(product.name);
  const codeTokens = tokenize(product.code);
  const categoryTokens = tokenize(product.category);
  const descriptionTokens = tokenize(product.description);
  const tags = Array.isArray(product.tags) ? product.tags.flatMap(tokenize) : [];
  let score = 0;

  for (const token of queryTokens) {
    if (nameTokens.includes(token)) score += 100;
    else if (nameTokens.some(value => value.startsWith(token))) score += 75;
    else if (codeTokens.includes(token)) score += 70;
    else if (categoryTokens.includes(token)) score += 55;
    else if (tags.includes(token)) score += 45;
    else if (descriptionTokens.includes(token)) score += 25;
    else if ([product.name, product.code, product.category, product.description]
      .some(value => String(value || '').toLowerCase().includes(token))) score += 10;
  }

  return score / queryTokens.length;
}

function freshnessScore(createdAt, referenceTime) {
  const timestamp = new Date(createdAt || 0).getTime();
  if (!Number.isFinite(timestamp)) return 0;
  const reference = Number.isFinite(referenceTime) ? referenceTime : timestamp;
  const ageDays = Math.max(0, (reference - timestamp) / 86400000);
  return Math.max(0, 5 - Math.min(ageDays, 5));
}

function marketplaceBaseScore(product, search, referenceTime) {
  const relevance = marketplaceRelevance(product, search);
  const availability = product.stock > 0 ? 2 : 0;
  const featured = product.isFeatured ? 5 : 0;
  return {
    relevance,
    score: relevance * 100 + availability + featured + freshnessScore(product.createdAt, referenceTime)
  };
}

function isCurrentlySponsored(product, rankingNow) {
  if (product.isSponsored !== true) return false;
  if (product.sponsoredUntil == null) return true;
  const expiry = new Date(product.sponsoredUntil).getTime();
  return Number.isFinite(expiry) && expiry > rankingNow;
}

function rankMarketplaceCandidates(candidates, search = '', rankingNow = Date.now()) {
  const referenceTime = Math.max(...candidates.map(product => new Date(product.createdAt || 0).getTime()).filter(Number.isFinite));
  const scored = candidates.map((product, index) => {
    const base = marketplaceBaseScore(product, search, referenceTime);
    return {
      product,
      ...base,
      sponsored: isCurrentlySponsored(product, rankingNow),
      originalIndex: index
    };
  });
  const selected = [];
  const sellerCounts = new Map();

  while (scored.length) {
    const highestRelevance = Math.max(...scored.map(candidate => candidate.relevance));
    const eligibleAlternatives = scored.filter(candidate => {
      // With explicit search, diversity is applied only among sufficiently
      // relevant matches. This prevents unrelated products from being boosted.
      return highestRelevance === 0 || candidate.relevance >= highestRelevance * 0.8;
    });
    const chosen = eligibleAlternatives.reduce((winner, candidate) => {
      if (!winner) return candidate;
      const sponsoredPriority = (candidate.sponsored && (highestRelevance === 0 || candidate.relevance >= highestRelevance * 0.8)) ? SPONSORED_PRIORITY_BONUS : 0;
      const winnerSponsoredPriority = (winner.sponsored && (highestRelevance === 0 || winner.relevance >= highestRelevance * 0.8)) ? SPONSORED_PRIORITY_BONUS : 0;
      const winnerAdjusted = winner.score + winnerSponsoredPriority - (sellerCounts.get(winner.product.storeSlug) || 0) * 8;
      const candidateAdjusted = candidate.score + sponsoredPriority - (sellerCounts.get(candidate.product.storeSlug) || 0) * 8;
      if (candidateAdjusted !== winnerAdjusted) return candidateAdjusted > winnerAdjusted ? candidate : winner;
      if (candidate.score !== winner.score) return candidate.score > winner.score ? candidate : winner;
      return candidate.originalIndex < winner.originalIndex ? candidate : winner;
    }, null);

    selected.push(chosen.product);
    sellerCounts.set(chosen.product.storeSlug, (sellerCounts.get(chosen.product.storeSlug) || 0) + 1);
    scored.splice(scored.indexOf(chosen), 1);
  }

  return selected;
}

class StoreService {
  
  /**
   * Get public store by slug
   * @param {string} slug - Business slug
   * @returns {Promise<Object>} Store info and products
   */
  static async getStoreBySlug(slug) {
    try {
      const normalizedSlug = String(slug || '').trim().toLowerCase();
      if (!normalizedSlug) throw new Error('Store not found');

      


      // Find active, public business by slug
      const business = await Business.findOne({
        slug: normalizedSlug,
        status: 'active',
        isPublic: true
      }).select('_id name slug description logo email phone address socialMedia userId');

      if (!business) throw new Error('Store not found');
      
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

      const ownerBusinessCount = await Business.countDocuments({
        userId: business.userId,
        status: 'active',
        isPublic: true
      });

      // Legacy products without businessId are safe here only when this owner
      // has one public business. New products are scoped by businessId.
      const productOwnership = ownerBusinessCount === 1
        ? { $or: [{ businessId: business._id }, { userId: ownerObjectId, $or: [{ businessId: { $exists: false } }, { businessId: null }] }] }
        : { businessId: business._id };

      const products = await Product.find({
        ...productOwnership,
        isPublished: true,
        status: 'active'
      })
        .select('name code price images category description stock isFeatured')
        .sort({ isFeatured: -1, createdAt: -1, _id: -1 });
        
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
    const search = (pagination.search || '').trim();
    const category = (pagination.category || '').trim();
    const rankingNow = Date.now();
    const sortBy = pagination.sortBy || 'relevant';
    const sortOrder = pagination.sortOrder || 'desc';

    if (!MARKETPLACE_SORTS.has(sortBy) || !['asc', 'desc'].includes(sortOrder)) {
      throw new Error('Unsupported marketplace sort');
    }

    const businesses = await Business.find({ status: 'active', isPublic: true })
      .select('_id userId name slug')
      .lean();
    if (!businesses.length) {
      return { products: [], pagination: { page, limit, total: 0, pages: 0 } };
    }

    const storesByBusinessId = new Map();
    const businessesByUserId = new Map();
    for (const business of businesses) {
      storesByBusinessId.set(String(business._id), {
        storeName: business.name,
        storeSlug: business.slug,
        businessId: business._id
      });
      if (business.userId) {
        const uid = String(business.userId);
        const owners = businessesByUserId.get(uid) || [];
        owners.push(business);
        businessesByUserId.set(uid, owners);
      }
    }

    const unambiguousUserIds = [];
    for (const [uid, owners] of businessesByUserId) {
      if (owners.length !== 1) continue;
      try {
        unambiguousUserIds.push(new mongoose.Types.ObjectId(uid));
      } catch {
        // Malformed owner references cannot safely expose legacy products.
      }
    }
    const businessIds = [...storesByBusinessId.keys()].map(id => new mongoose.Types.ObjectId(id));
    const query = {
      $and: [
        {
          $or: [
            { businessId: { $in: businessIds } },
            {
              userId: { $in: unambiguousUserIds },
              $or: [{ businessId: { $exists: false } }, { businessId: null }]
            }
          ]
        },
        { isPublished: true, status: 'active' }
      ]
    };

    if (search) {
      const esc = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.$and.push({
        $or: [
          { name: { $regex: esc, $options: 'i' } },
          { code: { $regex: esc, $options: 'i' } },
          { description: { $regex: esc, $options: 'i' } },
          { category: { $regex: esc, $options: 'i' } },
          { tags: { $regex: esc, $options: 'i' } }
        ]
      });
    }
    if (category) query.category = category;

    const total = await Product.countDocuments(query);
    const select = 'name code price images category description tags stock userId businessId isFeatured isSponsored sponsoredUntil createdAt';
    let raw;
    if (sortBy === 'relevant') {
      // Rank a bounded, deterministic candidate pool before slicing pages. The
      // current catalog is well below this bound; larger catalogs can later
      // move this selection into a dedicated indexed ranking store.
      raw = await Product.find(query)
        .select(select)
        .sort({ createdAt: -1, _id: -1 })
        .limit(MARKETPLACE_CANDIDATE_LIMIT)
        .lean();
    } else {
      const direction = sortOrder === 'asc' ? 1 : -1;
      const sort = sortBy === 'newest' ? { createdAt: direction, _id: direction } : { price: direction, _id: direction };
      raw = await Product.find(query).select(select).sort(sort).skip(skip).limit(limit).lean();
    }

    const attributed = raw.map(product => {
      let store = product.businessId ? storesByBusinessId.get(String(product.businessId)) : null;
      if (!store) {
        const owners = businessesByUserId.get(String(product.userId)) || [];
        if (owners.length === 1) store = storesByBusinessId.get(String(owners[0]._id));
      }
      store = store || { storeName: null, storeSlug: null, businessId: null };
      return {
        ...product,
        images: product.images || [],
        storeName: store.storeName,
        storeSlug: store.storeSlug,
        ownerId: product.userId,
        isSponsored: product.isSponsored || false
      };
    });

    const ordered = sortBy === 'relevant'
      ? rankMarketplaceCandidates(attributed, search, rankingNow)
      : attributed;
    const products = sortBy === 'relevant' ? ordered.slice(skip, skip + limit) : ordered;
    return {
      products,
      pagination: { page, limit, total, pages: total ? Math.ceil(total / limit) : 0 }
    };
  }

  /** Distinct product categories among all marketplace-eligible listings */
  static async getMarketplaceCategories() {
    const businesses = await Business.find({
      status: 'active',
      isPublic: true
    })
      .select('_id userId')
      .lean();

    if (!businesses.length) return { categories: [] };

    const owners = new Map();
    for (const business of businesses) {
      if (!business.userId) continue;
      const uid = String(business.userId);
      owners.set(uid, (owners.get(uid) || 0) + 1);
    }
    const businessIds = businesses.map(b => b._id);
    const unambiguousUserIds = businesses
      .filter(b => b.userId && owners.get(String(b.userId)) === 1)
      .map(b => b.userId);

    const raw = await Product.distinct('category', {
      $and: [
        {
          $or: [
            { businessId: { $in: businessIds } },
            {
              userId: { $in: unambiguousUserIds },
              $or: [{ businessId: { $exists: false } }, { businessId: null }]
            }
          ]
        },
        { isPublished: true, status: 'active' }
      ]
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
              const ownerBusinessCount = await Business.countDocuments({
                userId: ownerObjectId,
                status: 'active',
                isPublic: true
              });
              productCount = await Product.countDocuments({
                ...(ownerBusinessCount === 1
                  ? { $or: [{ businessId: business._id }, { userId: ownerObjectId, $or: [{ businessId: { $exists: false } }, { businessId: null }] }] }
                  : { businessId: business._id }),
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
      const normalizedSlug = String(slug || '').trim().toLowerCase();
      if (!normalizedSlug) throw new Error('Store not found');

      // Verify store exists and is public
      const business = await Business.findOne({
        slug: normalizedSlug,
        status: 'active',
        isPublic: true
      });

      if (!business) {
        throw new Error('Store not found');
      }

      const { page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc' } = pagination;
      if (!SELLER_SORT_FIELDS.has(sortBy)) {
        throw new Error(`Unsupported seller sort field: ${sortBy}`);
      }
      if (!SELLER_SORT_ORDERS.has(sortOrder)) {
        throw new Error(`Unsupported seller sort order: ${sortOrder}`);
      }
      const skip = (page - 1) * limit;

      // Build query
      const ownerObjectId = new mongoose.Types.ObjectId(String(business.userId));
      const ownerBusinessCount = await Business.countDocuments({
        userId: ownerObjectId,
        status: 'active',
        isPublic: true
      });
      const query = {
        $and: [
          ownerBusinessCount === 1
            ? { $or: [{ businessId: business._id }, { userId: ownerObjectId, $or: [{ businessId: { $exists: false } }, { businessId: null }] }] }
            : { businessId: business._id },
          { isPublished: true, status: 'active' }
        ]
      };

      // Apply filters
      if (filters.category) {
        query.category = filters.category;
      }

      if (filters.search) {
        query.$and.push({
          $or: [
            { name: { $regex: filters.search, $options: 'i' } },
            { description: { $regex: filters.search, $options: 'i' } },
            { code: { $regex: filters.search, $options: 'i' } }
          ]
        });
      }

      if (filters.priceMin || filters.priceMax) {
        query.price = {};
        if (filters.priceMin) query.price.$gte = parseFloat(filters.priceMin);
        if (filters.priceMax) query.price.$lte = parseFloat(filters.priceMax);
      }

      if (filters.inStock === 'true') {
        query.stock = { $gt: 0 };
      }

      // Sort options remain seller-local. The final _id key makes equal-value
      // products deterministic without changing the requested primary order.
      const direction = sortOrder === 'desc' ? -1 : 1;
      const sort = { [sortBy]: direction };
      if (sortBy !== 'createdAt') sort.createdAt = -1;
      sort._id = direction;

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
