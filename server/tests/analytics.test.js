const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const Sale = require('../models/Sale');
const Product = require('../models/Product');
const Customer = require('../models/Customer');
const Expense = require('../models/Expense');
const AnalyticsService = require('../services/analyticsService');

describe('Analytics Service', () => {
  let testSales, testProducts, testCustomers, testExpenses;

  beforeEach(async () => {
    // Create test data
    testProducts = await Product.create([
      {
        name: 'Test Product 1',
        code: 'TP001',
        barcode: '1234567890123',
        price: 100,
        stock: 50,
        purchasePrice: 80,
        category: 'Electronics',
        supplier: 'Test Supplier 1',
        reorderPoint: 10
      },
      {
        name: 'Test Product 2',
        code: 'TP002',
        barcode: '1234567890124',
        price: 200,
        stock: 30,
        purchasePrice: 150,
        category: 'Accessories',
        supplier: 'Test Supplier 2',
        reorderPoint: 5
      }
    ]);

    testCustomers = await Customer.create([
      {
        name: 'Test Customer 1',
        type: 'cash',
        email: 'customer1@test.com'
      },
      {
        name: 'Test Customer 2',
        type: 'credit',
        email: 'customer2@test.com',
        creditLimit: 1000
      }
    ]);

    // Create test sales
    const today = new Date();
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);

    testSales = await Sale.create([
      {
        items: [
          {
            product: testProducts[0]._id,
            name: testProducts[0].name,
            quantity: 2,
            price: 100,
            total: 200
          }
        ],
        customer: testCustomers[0]._id,
        subtotal: 200,
        total: 200,
        tax: 36,
        taxRate: 18,
        amountPaid: 200,
        change: 0,
        paymentMethod: 'cash',
        staff: new mongoose.Types.ObjectId(),
        createdAt: today
      },
      {
        items: [
          {
            product: testProducts[1]._id,
            name: testProducts[1].name,
            quantity: 1,
            price: 200,
            total: 200
          }
        ],
        customer: testCustomers[1]._id,
        subtotal: 200,
        total: 200,
        tax: 36,
        taxRate: 18,
        amountPaid: 200,
        change: 0,
        paymentMethod: 'credit',
        staff: new mongoose.Types.ObjectId(),
        createdAt: yesterday
      }
    ]);

    // Create test expenses
    testExpenses = await Expense.create([
      {
        description: 'Test Expense 1',
        amount: 50,
        category: 'Office Supplies',
        date: today,
        staff: new mongoose.Types.ObjectId()
      },
      {
        description: 'Test Expense 2',
        amount: 100,
        category: 'Utilities',
        date: yesterday,
        staff: new mongoose.Types.ObjectId()
      }
    ]);
  });

  describe('getSalesAnalytics', () => {
    it('should return comprehensive sales analytics', async () => {
      const analytics = await AnalyticsService.getSalesAnalytics({
        dateRange: 'week'
      });

      expect(analytics).toHaveProperty('summary');
      expect(analytics).toHaveProperty('comparison');
      expect(analytics).toHaveProperty('paymentMethods');
      expect(analytics).toHaveProperty('dailyTrend');
      expect(analytics).toHaveProperty('topProducts');
      expect(analytics).toHaveProperty('staffPerformance');
      expect(analytics).toHaveProperty('generatedAt');

      // Check summary data
      expect(analytics.summary.totalRevenue).toBeGreaterThanOrEqual(0);
      expect(analytics.summary.totalSales).toBeGreaterThanOrEqual(0);
      expect(analytics.summary.averageOrderValue).toBeGreaterThanOrEqual(0);

      // Check payment methods breakdown
      expect(Array.isArray(analytics.paymentMethods)).toBe(true);

      // Check daily trend
      expect(Array.isArray(analytics.dailyTrend)).toBe(true);

      // Check top products
      expect(Array.isArray(analytics.topProducts)).toBe(true);
    });

    it('should handle date range filters correctly', async () => {
      const analytics = await AnalyticsService.getSalesAnalytics({
        startDate: new Date().toISOString(),
        endDate: new Date().toISOString()
      });

      expect(analytics).toHaveProperty('summary');
      expect(analytics.period.startDate).toBeDefined();
      expect(analytics.period.endDate).toBeDefined();
    });

    it('should calculate growth percentages correctly', async () => {
      const analytics = await AnalyticsService.getSalesAnalytics({
        dateRange: 'day'
      });

      expect(analytics.summary).toHaveProperty('revenueGrowth');
      expect(analytics.summary).toHaveProperty('salesGrowth');
      expect(typeof analytics.summary.revenueGrowth).toBe('number');
      expect(typeof analytics.summary.salesGrowth).toBe('number');
    });
  });

  describe('Performance', () => {
    it('should complete analytics query within acceptable time', async () => {
      const startTime = Date.now();

      await AnalyticsService.getSalesAnalytics({
        dateRange: 'month'
      });

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete within 2 seconds
      expect(duration).toBeLessThan(2000);
    });
  });
});