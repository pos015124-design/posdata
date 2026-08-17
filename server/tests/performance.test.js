/**
 * Performance and Load Tests
 * Tests for performance bottlenecks and system optimization
 */

const request = require('supertest');
const mongoose = require('mongoose');
const { setupTestDB, teardownTestDB } = require('./setup');

describe('Performance and Load Tests', () => {
  let app;

  beforeAll(async () => {
    await setupTestDB();
    // server.js connects to the DB via DATABASE_URL at require time and exits
    // the process when it can't — so it must be loaded only after the test DB
    // is up (setupTestDB sets DATABASE_URL when none is configured).
    app = require('../server');

    // Seed one public store + product so the catalog endpoint has a real
    // query path to exercise (not just an empty-collection fast path).
    const User = require('../models/User');
    const Business = require('../models/Business');
    const Product = require('../models/Product');
    const user = await User.create({
      email: 'perf@test.com',
      password: 'Password123!',
      firstName: 'Perf',
      lastName: 'Tester',
      role: 'business_admin',
      isApproved: true,
      isActive: true
    });
    await Business.create({
      userId: user._id,
      name: 'Perf Store',
      slug: 'perf-store',
      email: 'perf@test.com',
      category: 'retail',
      status: 'active',
      isPublic: true
    });
    await Product.create({
      userId: user._id,
      name: 'Perf Product',
      code: 'PERF001',
      price: 100,
      purchasePrice: 80,
      stock: 10,
      category: 'Electronics',
      reorderPoint: 2,
      status: 'active',
      isPublished: true
    });
  });

  afterAll(async () => {
    await teardownTestDB();
  });

  describe('API Response Time Tests', () => {
    test('GET /health should respond quickly', async () => {
      const start = Date.now();
      const response = await request(app).get('/health');
      const duration = Date.now() - start;

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('OK');
      // Generous bound — cold CI boxes are slow; this guards against real regressions
      expect(duration).toBeLessThan(1000);
    });

    test('GET /ready should report database readiness', async () => {
      const response = await request(app).get('/ready');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('OK');
      expect(response.body.database.connected).toBe(true);
    });

    test('Public catalog products should respond within acceptable time', async () => {
      const start = Date.now();
      const response = await request(app).get('/api/public/products');
      const duration = Date.now() - start;

      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(2000);
    });
  });

  describe('Concurrent Request Tests', () => {
    test('Multiple concurrent requests should be handled properly', async () => {
      const requests = Array.from({ length: 10 }, () =>
        request(app).get('/health')
      );

      const responses = await Promise.all(requests);

      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
    });

    test('Concurrent catalog requests should not cause errors', async () => {
      const requests = Array.from({ length: 5 }, () =>
        request(app).get('/api/public/products')
      );

      const responses = await Promise.all(requests);

      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
    });
  });

  describe('Database Query Performance Tests', () => {
    test('Indexed product lookup executes within time limits', async () => {
      const Product = require('../models/Product');
      const start = Date.now();

      // Real query — exercises the userId+status index used by the catalog
      const result = await Product.find({ userId: { $ne: null }, status: 'active' })
        .sort({ createdAt: -1 })
        .limit(10)
        .lean();

      const duration = Date.now() - start;
      expect(Array.isArray(result)).toBe(true);
      expect(duration).toBeLessThan(2000);
    });
  });

  describe('Memory Usage Tests', () => {
    test('Memory usage should not increase significantly with multiple requests', async () => {
      const initialMemory = process.memoryUsage().heapUsed;

      // Make multiple requests
      for (let i = 0; i < 20; i++) {
        await request(app).get('/health');
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      const memoryIncreaseMB = memoryIncrease / 1024 / 1024;

      // Memory increase should be less than 20MB for 20 requests (GC can be lazy)
      expect(memoryIncreaseMB).toBeLessThan(20);
    });
  });

  describe('Load Simulation Tests', () => {
    test('System should handle burst of requests without errors', async () => {
      const startTime = Date.now();

      // Simulate a burst of 50 requests
      const requests = Array.from({ length: 50 }, async (_, index) => {
        return request(app)
          .get('/health')
          .then(response => ({ index, response }));
      });

      const results = await Promise.allSettled(requests);
      const duration = Date.now() - startTime;

      // Check that most requests succeeded
      const successfulRequests = results.filter(result =>
        result.status === 'fulfilled' && result.value.response.status === 200
      ).length;

      expect(successfulRequests).toBeGreaterThanOrEqual(45); // At least 90% success rate
      expect(duration).toBeLessThan(10000); // Should handle 50 requests in under 10 seconds
    });
  });
});

// Performance utilities
const performanceUtils = {
  measureFunction: async (fn, ...args) => {
    const start = process.hrtime.bigint();
    const result = await fn(...args);
    const end = process.hrtime.bigint();
    const duration = Number(end - start) / 1000000; // Convert to milliseconds

    return { result, duration };
  },

  runLoadTest: async (requestFn, iterations = 100, concurrency = 10) => {
    const batchRequests = [];

    for (let i = 0; i < iterations; i += concurrency) {
      const batch = [];
      const batchEnd = Math.min(i + concurrency, iterations);

      for (let j = i; j < batchEnd; j++) {
        batch.push(requestFn());
      }

      batchRequests.push(Promise.allSettled(batch));
    }

    const allResults = await Promise.all(batchRequests);
    const flatResults = allResults.flat();

    const successful = flatResults.filter(r => r.status === 'fulfilled').length;
    const failed = flatResults.filter(r => r.status === 'rejected').length;

    return {
      total: iterations,
      successful,
      failed,
      successRate: successful / iterations
    };
  }
};

module.exports = { performanceUtils };
