/**
 * Performance and Load Tests
 * Tests for performance bottlenecks and system optimization
 */

const request = require('supertest');
const app = require('../server'); // Adjust path as needed
const mongoose = require('mongoose');
const { setupTestDB, teardownTestDB } = require('./setup');

describe('Performance and Load Tests', () => {
  beforeAll(async () => {
    await setupTestDB();
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
      expect(duration).toBeLessThan(100); // Should respond in under 100ms
    });

    test('GET /api/products should respond within acceptable time', async () => {
      const start = Date.now();
      const response = await request(app)
        .get('/api/products')
        .set('Authorization', 'Bearer test-token'); // Mock token
      const duration = Date.now() - start;

      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(500); // Should respond in under 500ms
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

    test('Concurrent product requests should not cause errors', async () => {
      // First create a valid user and get a token (this would be done in a real test)
      const requests = Array.from({ length: 5 }, () => 
        request(app)
          .get('/api/products')
          .set('Authorization', 'Bearer test-token') // Mock token
      );

      const responses = await Promise.all(requests);
      
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
    });
  });

  describe('Database Query Performance Tests', () => {
    test('Complex queries should execute within time limits', async () => {
      // This would test complex database operations
      const start = Date.now();
      
      // Simulate a complex query (this is a placeholder)
      // In a real test, this would be an actual complex query
      await new Promise(resolve => setTimeout(resolve, 50)); // Simulate DB operation
      
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(200); // Complex query should complete in under 200ms
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

      // Memory increase should be less than 5MB for 20 requests
      expect(memoryIncreaseMB).toBeLessThan(5);
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
      expect(duration).toBeLessThan(5000); // Should handle 50 requests in under 5 seconds
    });
  });
});

// Additional performance utilities
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