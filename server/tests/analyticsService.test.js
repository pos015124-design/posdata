const mongoose = require('mongoose');
const AnalyticsService = require('../services/analyticsService');
const User = require('../models/User');
const Product = require('../models/Product');
const Sale = require('../models/Sale');
const Expense = require('../models/Expense');

const DAY = 24 * 60 * 60 * 1000;
let invoiceCounter = 0;
const nextInvoice = () => `INV-TEST-${Date.now()}-${invoiceCounter++}`;

const makeSale = (userId, overrides = {}) => ({
  invoiceNumber: nextInvoice(),
  items: [{
    productId: new mongoose.Types.ObjectId(),
    productName: 'Test Product',
    quantity: 2,
    price: 100,
    total: 200
  }],
  subtotal: 200,
  total: 200,
  paymentMethod: 'cash',
  status: 'completed',
  createdBy: userId,
  ...overrides
});

describe('AnalyticsService', () => {
  let mockUser, otherUser;

  beforeEach(async () => {
    mockUser = await User.create({
      email: 'admin@example.com',
      password: 'Password123!',
      firstName: 'Admin',
      lastName: 'One',
      role: 'business_admin',
      isApproved: true,
      isActive: true
    });
    otherUser = await User.create({
      email: 'other@example.com',
      password: 'Password123!',
      firstName: 'Other',
      lastName: 'Admin',
      role: 'business_admin',
      isApproved: true,
      isActive: true
    });
  });

  afterEach(async () => {
    await User.deleteMany({});
    await Product.deleteMany({});
    await Sale.deleteMany({});
    await Expense.deleteMany({});
  });

  describe('getSalesAnalytics', () => {
    it('should return sales analytics for the default 30-day period', async () => {
      await Sale.create([
        makeSale(mockUser._id, { total: 500, subtotal: 500, items: [{ productId: new mongoose.Types.ObjectId(), productName: 'A', quantity: 5, price: 100, total: 500 }] }),
        makeSale(mockUser._id, { total: 300, subtotal: 300, items: [{ productId: new mongoose.Types.ObjectId(), productName: 'B', quantity: 3, price: 100, total: 300 }] })
      ]);

      const analytics = await AnalyticsService.getSalesAnalytics({}, mockUser._id.toString());

      expect(analytics.summary.totalSales).toBe(2);
      expect(analytics.summary.totalRevenue).toBe(800);
      expect(analytics.summary.averageOrderValue).toBe(400);
      expect(analytics.summary.netProfit).toBe(800);
      expect(analytics.topProducts).toHaveLength(2);
      expect(analytics.period.startDate).toBeDefined();
      expect(analytics.period.endDate).toBeDefined();
    });

    it('should only count the requesting user\'s sales (data isolation)', async () => {
      await Sale.create([
        makeSale(mockUser._id, { total: 500 }),
        makeSale(otherUser._id, { total: 9999 })
      ]);

      const analytics = await AnalyticsService.getSalesAnalytics({}, mockUser._id.toString());

      expect(analytics.summary.totalSales).toBe(1);
      expect(analytics.summary.totalRevenue).toBe(500);
    });

    it('should filter analytics by explicit date range', async () => {
      const now = Date.now();
      await Sale.create([
        // Inside the requested window
        makeSale(mockUser._id, { total: 200, createdAt: new Date(now - 2 * DAY) }),
        // Outside (older than the window)
        makeSale(mockUser._id, { total: 999, createdAt: new Date(now - 20 * DAY) })
      ]);

      const analytics = await AnalyticsService.getSalesAnalytics({
        startDate: new Date(now - 5 * DAY).toISOString(),
        endDate: new Date(now).toISOString()
      }, mockUser._id.toString());

      expect(analytics.summary.totalSales).toBe(1);
      expect(analytics.summary.totalRevenue).toBe(200);
    });

    it('should calculate growth percentages against the previous period', async () => {
      const now = Date.now();
      // Previous period: 60-30 days ago (outside default 30d window)
      await Sale.create([
        makeSale(mockUser._id, { total: 500, createdAt: new Date(now - 40 * DAY) }),
        makeSale(mockUser._id, { total: 500, createdAt: new Date(now - 35 * DAY) })
      ]);
      // Current period: within last 30 days
      await Sale.create([
        makeSale(mockUser._id, { total: 1000, createdAt: new Date(now - 3 * DAY) })
      ]);

      const analytics = await AnalyticsService.getSalesAnalytics({}, mockUser._id.toString());

      // Previous revenue 1000 → current 1000 → 0% growth
      expect(analytics.summary.totalRevenue).toBe(1000);
      expect(analytics.summary.revenueGrowth).toBeCloseTo(0, 5);
      expect(analytics.comparison.previous.totalRevenue).toBe(1000);
    });

    it('should break down sales by payment method', async () => {
      await Sale.create([
        makeSale(mockUser._id, { total: 200, paymentMethod: 'cash' }),
        makeSale(mockUser._id, { total: 300, paymentMethod: 'mobile' })
      ]);

      const analytics = await AnalyticsService.getSalesAnalytics({}, mockUser._id.toString());

      const methods = analytics.paymentMethods;
      expect(methods).toHaveLength(2);
      const cash = methods.find(m => m._id === 'cash');
      expect(cash.count).toBe(1);
      expect(cash.total).toBe(200);
    });

    it('should include expense totals in the summary', async () => {
      await Sale.create(makeSale(mockUser._id, { total: 1000 }));
      await Expense.create({
        title: 'Rent',
        amount: 250,
        category: 'Rent',
        date: new Date(),
        createdBy: mockUser._id
      });

      const analytics = await AnalyticsService.getSalesAnalytics({}, mockUser._id.toString());

      expect(analytics.summary.totalExpenses).toBe(250);
      expect(analytics.summary.netProfit).toBe(750);
    });
  });

  describe('getInventoryAnalytics', () => {
    it('should return inventory analytics for the user\'s products', async () => {
      await Product.create([
        {
          userId: mockUser._id,
          name: 'In Stock', code: 'IS001', price: 100, purchasePrice: 80,
          stock: 50, category: 'Electronics', reorderPoint: 10, status: 'active'
        },
        {
          userId: mockUser._id,
          name: 'Low Stock', code: 'LS001', price: 50, purchasePrice: 30,
          stock: 5, category: 'Electronics', reorderPoint: 10, status: 'active'
        },
        {
          userId: mockUser._id,
          name: 'Out', code: 'OO001', price: 20, purchasePrice: 10,
          stock: 0, category: 'Clothing', reorderPoint: 5, status: 'active'
        }
      ]);

      const analytics = await AnalyticsService.getInventoryAnalytics({}, mockUser._id.toString());

      expect(analytics.stockOverview.totalProducts).toBe(3);
      // 50*80 + 5*30 + 0*10
      expect(analytics.stockOverview.totalStockValue).toBe(4150);
      expect(analytics.stockOverview.lowStockItems).toBe(2); // Low + Out
      expect(analytics.stockOverview.outOfStockItems).toBe(1);
      expect(analytics.lowStockItems).toHaveLength(2);
      expect(analytics.categoryBreakdown).toHaveLength(2);
    });

    it('should exclude other users\' products (data isolation)', async () => {
      await Product.create({
        userId: mockUser._id, name: 'Mine', code: 'M001', price: 10, purchasePrice: 5,
        stock: 10, category: 'General', reorderPoint: 2, status: 'active'
      });
      await Product.create({
        userId: otherUser._id, name: 'Theirs', code: 'T001', price: 10, purchasePrice: 5,
        stock: 9999, category: 'General', reorderPoint: 2, status: 'active'
      });

      const analytics = await AnalyticsService.getInventoryAnalytics({}, mockUser._id.toString());

      expect(analytics.stockOverview.totalProducts).toBe(1);
    });

    it('should filter inventory by category', async () => {
      await Product.create([
        {
          userId: mockUser._id, name: 'Elec', code: 'E001', price: 10, purchasePrice: 5,
          stock: 10, category: 'Electronics', reorderPoint: 2, status: 'active'
        },
        {
          userId: mockUser._id, name: 'Book', code: 'B001', price: 10, purchasePrice: 5,
          stock: 10, category: 'Books', reorderPoint: 2, status: 'active'
        }
      ]);

      const analytics = await AnalyticsService.getInventoryAnalytics({ category: 'Books' }, mockUser._id.toString());

      expect(analytics.stockOverview.totalProducts).toBe(1);
      expect(analytics.categoryBreakdown[0]._id).toBe('Books');
    });
  });
});
