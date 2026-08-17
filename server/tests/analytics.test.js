/**
 * Sales Analytics Tests
 * Focused coverage for getSalesAnalytics: period defaults, growth math,
 * top-product naming, and expense netting.
 */

const mongoose = require('mongoose');
const AnalyticsService = require('../services/analyticsService');
const User = require('../models/User');
const Sale = require('../models/Sale');
const Expense = require('../models/Expense');

const DAY = 24 * 60 * 60 * 1000;
let invoiceCounter = 0;
const nextInvoice = () => `INV-ANA-${Date.now()}-${invoiceCounter++}`;

const makeSale = (userId, overrides = {}) => ({
  invoiceNumber: nextInvoice(),
  items: [{
    productId: new mongoose.Types.ObjectId(),
    productName: 'Analytics Product',
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

describe('Analytics Service', () => {
  let user;

  beforeEach(async () => {
    user = await User.create({
      email: 'analytics@test.com',
      password: 'Password123!',
      firstName: 'Ana',
      lastName: 'Lytics',
      role: 'business_admin',
      isApproved: true,
      isActive: true
    });
  });

  afterEach(async () => {
    await User.deleteMany({});
    await Sale.deleteMany({});
    await Expense.deleteMany({});
  });

  it('should return comprehensive sales analytics', async () => {
    await Sale.create([
      makeSale(user._id, { total: 600, subtotal: 600, items: [{ productId: new mongoose.Types.ObjectId(), productName: 'Laptop', quantity: 1, price: 600, total: 600 }] }),
      makeSale(user._id, { total: 400, subtotal: 400, items: [{ productId: new mongoose.Types.ObjectId(), productName: 'Mouse', quantity: 2, price: 200, total: 400 }] })
    ]);

    const analytics = await AnalyticsService.getSalesAnalytics({}, user._id.toString());

    expect(analytics.summary.totalRevenue).toBe(1000);
    expect(analytics.summary.totalSales).toBe(2);
    expect(analytics.summary.averageOrderValue).toBe(500);
    expect(analytics.summary.totalTax).toBe(0);
    expect(analytics.summary.netProfit).toBe(1000);
    expect(analytics.dailyTrend.length).toBeGreaterThan(0);
    expect(analytics.hourlySales.length).toBeGreaterThan(0);
    expect(analytics.generatedAt).toBeDefined();
  });

  it('should report top products with real product names', async () => {
    await Sale.create([
      makeSale(user._id, { total: 200, items: [{ productId: new mongoose.Types.ObjectId(), productName: 'Wireless Mouse', quantity: 2, price: 100, total: 200 }] }),
      makeSale(user._id, { total: 1200, items: [{ productId: new mongoose.Types.ObjectId(), productName: 'Gaming Laptop', quantity: 1, price: 1200, total: 1200 }] })
    ]);

    const analytics = await AnalyticsService.getSalesAnalytics({}, user._id.toString());

    expect(analytics.topProducts).toHaveLength(2);
    // Highest revenue first, with the correct product name
    expect(analytics.topProducts[0].productName).toBe('Gaming Laptop');
    expect(analytics.topProducts[0].totalRevenue).toBe(1200);
    expect(analytics.topProducts[1].productName).toBe('Wireless Mouse');
  });

  it('should handle date range filters correctly', async () => {
    const now = Date.now();
    await Sale.create([
      makeSale(user._id, { total: 100, createdAt: new Date(now - 1 * DAY) }),
      makeSale(user._id, { total: 100, createdAt: new Date(now - 2 * DAY) }),
      makeSale(user._id, { total: 900, createdAt: new Date(now - 10 * DAY) })
    ]);

    const analytics = await AnalyticsService.getSalesAnalytics({
      startDate: new Date(now - 3 * DAY).toISOString(),
      endDate: new Date(now).toISOString()
    }, user._id.toString());

    expect(analytics.summary.totalSales).toBe(2);
    expect(analytics.summary.totalRevenue).toBe(200);
  });

  it('should calculate growth percentages correctly', async () => {
    const now = Date.now();
    // Previous period (outside the default 30d window): 1 sale, 1000 revenue
    await Sale.create([
      makeSale(user._id, { total: 1000, createdAt: new Date(now - 35 * DAY) })
    ]);
    // Current period: 1500 revenue → 50% growth
    await Sale.create([
      makeSale(user._id, { total: 1000, createdAt: new Date(now - 2 * DAY) }),
      makeSale(user._id, { total: 500, createdAt: new Date(now - 1 * DAY) })
    ]);

    const analytics = await AnalyticsService.getSalesAnalytics({}, user._id.toString());

    expect(analytics.summary.totalRevenue).toBe(1500);
    expect(analytics.summary.revenueGrowth).toBeCloseTo(50, 5);
    expect(analytics.summary.salesGrowth).toBeCloseTo(100, 5); // 2 vs 1 sale
  });

  it('should net expenses against revenue', async () => {
    await Sale.create(makeSale(user._id, { total: 1000 }));
    await Expense.create({
      title: 'Packaging',
      amount: 300,
      category: 'Supplies',
      date: new Date(),
      createdBy: user._id
    });

    const analytics = await AnalyticsService.getSalesAnalytics({}, user._id.toString());

    expect(analytics.summary.totalExpenses).toBe(300);
    expect(analytics.summary.netProfit).toBe(700);
    expect(analytics.expenseCategories).toHaveLength(1);
  });

  it('should return zeros when there is no data', async () => {
    const analytics = await AnalyticsService.getSalesAnalytics({}, user._id.toString());

    expect(analytics.summary.totalRevenue).toBe(0);
    expect(analytics.summary.totalSales).toBe(0);
    expect(analytics.summary.netProfit).toBe(0);
    expect(analytics.topProducts).toHaveLength(0);
    expect(analytics.dailyTrend).toHaveLength(0);
  });
});
