const Redis = require('ioredis');
const { logger } = require('./logger');

// Redis configuration
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  db: process.env.REDIS_DB || 0,
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 3,
  lazyConnect: true,
  keepAlive: 30000,
  connectTimeout: 10000,
  commandTimeout: 5000
};

// Create Redis client
let redisClient = null;

const createRedisClient = () => {
  if (redisClient) {
    return redisClient;
  }

  try {
    // Check if Redis is available before attempting to connect
    const redis = new Redis({
      ...redisConfig,
      lazyConnect: true,
      maxRetriesPerRequest: 0, // Don't retry
      retryDelayOnFailover: 100,
      enableReadyCheck: false,
      connectTimeout: 2000,
      lazyConnect: true,
      retryStrategy: (times) => {
        // Don't retry, just return null to disable cache
        logger.warn('Redis not available - cache disabled');
        return null;
      }
    });

    redisClient = redis;

    redisClient.on('connect', () => {
      logger.info('Redis connected successfully');
    });

    redisClient.on('error', (error) => {
      logger.warn('Redis connection error - operating without cache', { error: error.message });
      // Don't throw error, just log and continue without Redis
    });

    redisClient.on('close', () => {
      logger.warn('Redis connection closed');
    });

    redisClient.on('reconnecting', () => {
      logger.info('Redis reconnecting...');
    });

    // Test connection but don't fail if Redis is not available
    redisClient.ping().catch(() => {
      logger.warn('Redis not available - cache disabled');
    });

    return redisClient;
  } catch (error) {
    logger.warn('Failed to create Redis client - cache disabled', { error: error.message });
    return null;
  }
};

// Cache utility class
class CacheService {
  constructor() {
    this.client = createRedisClient();
    this.defaultTTL = 3600; // 1 hour in seconds
  }

  /**
   * Check if Redis is available
   * @returns {boolean} Redis availability status
   */
  isAvailable() {
    try {
      return this.client && (this.client.status === 'ready' || this.client.status === 'connecting');
    } catch (error) {
      return false;
    }
  }

  /**
   * Generate cache key with prefix
   * @param {string} key - Base key
   * @param {string} prefix - Key prefix
   * @returns {string} Formatted cache key
   */
  generateKey(key, prefix = 'dukani') {
    return `${prefix}:${key}`;
  }

  /**
   * Set cache value
   * @param {string} key - Cache key
   * @param {any} value - Value to cache
   * @param {number} ttl - Time to live in seconds
   * @returns {Promise<boolean>} Success status
   */
  async set(key, value, ttl = this.defaultTTL) {
    if (!this.isAvailable()) {
      logger.warn('Redis not available for SET operation', { key });
      return false;
    }

    try {
      const cacheKey = this.generateKey(key);
      const serializedValue = JSON.stringify(value);

      if (ttl > 0) {
        await this.client.setex(cacheKey, ttl, serializedValue);
      } else {
        await this.client.set(cacheKey, serializedValue);
      }

      logger.debug('Cache SET successful', { key: cacheKey, ttl });
      return true;
    } catch (error) {
      logger.error('Cache SET failed', { key, error: error.message });
      return false;
    }
  }

  /**
   * Get cache value
   * @param {string} key - Cache key
   * @returns {Promise<any|null>} Cached value or null
   */
  async get(key) {
    if (!this.isAvailable()) {
      logger.warn('Redis not available for GET operation', { key });
      return null;
    }

    try {
      const cacheKey = this.generateKey(key);
      const value = await this.client.get(cacheKey);

      if (value === null) {
        logger.debug('Cache MISS', { key: cacheKey });
        return null;
      }

      logger.debug('Cache HIT', { key: cacheKey });
      return JSON.parse(value);
    } catch (error) {
      logger.error('Cache GET failed', { key, error: error.message });
      return null;
    }
  }

  /**
   * Delete cache value
   * @param {string} key - Cache key
   * @returns {Promise<boolean>} Success status
   */
  async del(key) {
    if (!this.isAvailable()) {
      logger.warn('Redis not available for DEL operation', { key });
      return false;
    }

    try {
      const cacheKey = this.generateKey(key);
      const result = await this.client.del(cacheKey);

      logger.debug('Cache DEL successful', { key: cacheKey, deleted: result });
      return result > 0;
    } catch (error) {
      logger.error('Cache DEL failed', { key, error: error.message });
      return false;
    }
  }

  /**
   * Delete multiple cache keys by pattern
   * @param {string} pattern - Key pattern (e.g., "products:*")
   * @returns {Promise<number>} Number of deleted keys
   */
  async delPattern(pattern) {
    if (!this.isAvailable()) {
      logger.warn('Redis not available for DEL pattern operation', { pattern });
      return 0;
    }

    try {
      const cachePattern = this.generateKey(pattern);
      const keys = await this.client.keys(cachePattern);

      if (keys.length === 0) {
        return 0;
      }

      const result = await this.client.del(...keys);
      logger.debug('Cache DEL pattern successful', { pattern: cachePattern, deleted: result });
      return result;
    } catch (error) {
      logger.error('Cache DEL pattern failed', { pattern, error: error.message });
      return 0;
    }
  }

  /**
   * Check if key exists in cache
   * @param {string} key - Cache key
   * @returns {Promise<boolean>} Existence status
   */
  async exists(key) {
    if (!this.isAvailable()) {
      return false;
    }

    try {
      const cacheKey = this.generateKey(key);
      const result = await this.client.exists(cacheKey);
      return result === 1;
    } catch (error) {
      logger.error('Cache EXISTS failed', { key, error: error.message });
      return false;
    }
  }

  /**
   * Get cache statistics
   * @returns {Promise<Object>} Cache statistics
   */
  async getStats() {
    if (!this.isAvailable()) {
      return { available: false };
    }

    try {
      const info = await this.client.info('memory');
      const keyspace = await this.client.info('keyspace');

      return {
        available: true,
        memory: info,
        keyspace: keyspace,
        status: this.client.status
      };
    } catch (error) {
      logger.error('Failed to get cache stats', { error: error.message });
      return { available: false, error: error.message };
    }
  }

  /**
   * Close Redis connection
   */
  async close() {
    if (this.client) {
      await this.client.quit();
      redisClient = null;
    }
  }
}

// Create singleton instance
const cacheService = new CacheService();

// Cache middleware for Express routes - DISABLED FOR DATA ISOLATION
const cacheMiddleware = (ttl = 300) => {
  return async (req, res, next) => {
    // CRITICAL: Cache is DISABLED to prevent data leakage between users
    // Cache keys were based on URL only, not userId, causing data sharing
    return next();
    
    // Original caching logic (disabled):
    /*
    // Skip caching for non-GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Generate cache key based on URL and query parameters
    const cacheKey = `route:${req.originalUrl}`;

    try {
      const cachedData = await cacheService.get(cacheKey);

      if (cachedData) {
        logger.debug('Serving from cache', { key: cacheKey });
        return res.json(cachedData);
      }

      // Store original res.json function
      const originalJson = res.json;

      // Override res.json to cache the response
      res.json = function(data) {
        // Cache the response data
        cacheService.set(cacheKey, data, ttl);

        // Call original json function
        return originalJson.call(this, data);
      };

      next();
    } catch (error) {
      logger.error('Cache middleware error', { error: error.message });
      next();
    }
    */
  };
};

module.exports = {
  cacheService,
  cacheMiddleware,
  CacheService
};