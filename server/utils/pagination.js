/**
 * Pagination utility for MongoDB queries
 * Provides consistent pagination across all API endpoints
 */

const { logger } = require('../config/logger');

/**
 * Parse pagination parameters from request query
 * @param {Object} query - Request query parameters
 * @returns {Object} Parsed pagination options
 */
const parsePaginationParams = (query) => {
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 10));
  const skip = (page - 1) * limit;

  return { page, limit, skip };
};

/**
 * Parse sort parameters from request query
 * @param {string} sortQuery - Sort query string (e.g., "name.asc", "createdAt.desc")
 * @param {string} defaultSort - Default sort field
 * @returns {Object} MongoDB sort object
 */
const parseSortParams = (sortQuery, defaultSort = 'createdAt.desc') => {
  if (!sortQuery) {
    const [field, direction] = defaultSort.split('.');
    return { [field]: direction === 'desc' ? -1 : 1 };
  }

  const [field, direction = 'asc'] = sortQuery.split('.');

  // Whitelist of allowed sort fields to prevent NoSQL injection
  const allowedSortFields = [
    'name', 'email', 'createdAt', 'updatedAt', 'price', 'quantity',
    'date', 'amount', 'role', 'status', 'type', 'category'
  ];

  if (!allowedSortFields.includes(field)) {
    logger.warn('Invalid sort field attempted', { field, ip: 'unknown' });
    const [defaultField, defaultDirection] = defaultSort.split('.');
    return { [defaultField]: defaultDirection === 'desc' ? -1 : 1 };
  }

  return { [field]: direction === 'desc' ? -1 : 1 };
};

/**
 * Build search filter for text search
 * @param {string} searchTerm - Search term
 * @param {Array} searchFields - Fields to search in
 * @returns {Object} MongoDB filter object
 */
const buildSearchFilter = (searchTerm, searchFields = ['name']) => {
  if (!searchTerm || typeof searchTerm !== 'string') {
    return {};
  }

  // Escape special regex characters
  const escapedTerm = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  const searchConditions = searchFields.map(field => ({
    [field]: { $regex: escapedTerm, $options: 'i' }
  }));

  return searchConditions.length > 1
    ? { $or: searchConditions }
    : searchConditions[0] || {};
};

/**
 * Execute paginated query with metadata
 * @param {Object} model - Mongoose model
 * @param {Object} filter - MongoDB filter object
 * @param {Object} options - Pagination and sort options
 * @returns {Object} Paginated results with metadata
 */
const executePaginatedQuery = async (model, filter = {}, options = {}) => {
  const {
    page = 1,
    limit = 10,
    skip = 0,
    sort = { createdAt: -1 },
    populate = null,
    select = null
  } = options;

  try {
    // Build the query
    let query = model.find(filter);

    if (select) {
      query = query.select(select);
    }

    if (populate) {
      if (Array.isArray(populate)) {
        populate.forEach(pop => query = query.populate(pop));
      } else {
        query = query.populate(populate);
      }
    }

    // Execute queries in parallel for better performance
    const [data, totalCount] = await Promise.all([
      query.sort(sort).skip(skip).limit(limit).lean(),
      model.countDocuments(filter)
    ]);

    const totalPages = Math.ceil(totalCount / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    return {
      data,
      pagination: {
        currentPage: page,
        totalPages,
        totalCount,
        limit,
        hasNextPage,
        hasPrevPage,
        nextPage: hasNextPage ? page + 1 : null,
        prevPage: hasPrevPage ? page - 1 : null
      }
    };
  } catch (error) {
    logger.error('Pagination query failed', {
      error: error.message,
      model: model.modelName,
      filter,
      options
    });
    throw new Error('Failed to execute paginated query');
  }
};

/**
 * Middleware to add pagination to request object
 */
const paginationMiddleware = (req, res, next) => {
  const { page, limit, skip } = parsePaginationParams(req.query);
  const sort = parseSortParams(req.query.sort);
  const search = req.query.search;

  req.pagination = {
    page,
    limit,
    skip,
    sort,
    search
  };

  next();
};

/**
 * Helper function to create paginated response
 * @param {Object} model - Mongoose model
 * @param {Object} req - Express request object
 * @param {Object} additionalFilter - Additional filter conditions
 * @param {Object} options - Additional options (populate, select, etc.)
 */
const createPaginatedResponse = async (model, req, additionalFilter = {}, options = {}) => {
  const { page, limit, skip, sort, search } = req.pagination;

  // Build search filter if search term provided
  const searchFilter = search
    ? buildSearchFilter(search, options.searchFields)
    : {};

  // Combine filters
  const filter = { ...additionalFilter, ...searchFilter };

  // Execute paginated query
  return await executePaginatedQuery(model, filter, {
    page,
    limit,
    skip,
    sort,
    populate: options.populate,
    select: options.select
  });
};

module.exports = {
  parsePaginationParams,
  parseSortParams,
  buildSearchFilter,
  executePaginatedQuery,
  paginationMiddleware,
  createPaginatedResponse
};