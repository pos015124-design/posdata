const AnalyticsService = require('../services/analyticsService');
const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');
const CustomerAccount = require('../models/CustomerAccount');
const Sale = require('../models/Sale');
const Expense = require('../models/Expense');

describe('AnalyticsService', () => {
  let mockUser, mockCustomer, mockProduct;

  beforeEach(async () => {
    // Create a mock user
    mockUser = new User({
      email: 'admin@example.com',
      password: 'Password123!',
      role: 'business_admin',
      tenantId: 'tenant1',
      businessId: 'business1',
      isApproved: true
    });
    await mockUser.save();

    // Create a mock customer
    mockCustomer = new CustomerAccount({
      email: 'customer@example.com',
      firstName: 'John',
      lastName: 'Doe',
      tenantId: 'tenant1',
      businessId: 'business1'
    });
    await mockCustomer.save();

    // Create a mock product
    mockProduct = new Product({
      name: 'Test Product',
      code: 'TP001',
      price: 25.99,
      stock: 100,
      category: 'Electronics',
      tenantId: 'tenant1',
      businessId: 'business1'
    });
    await mockProduct.save();
  });

  afterEach(async () => {
    await Order.deleteMany({});
    await Product.deleteMany({});
    await CustomerAccount.deleteMany({});
    await User.deleteMany({});
    await Sale.deleteMany({});
    await Expense.deleteMany({});
  });

  describe('getSalesAnalytics', () => {
    beforeEach(async () => {
      // Create multiple orders for analytics
      const baseDate = new Date();
      
      // Create orders for different periods
      await new Order({
        customerId: mockCustomer._id,
        customerEmail: 'customer@example.com',
        customerName: 'John Doe',
        businessId: mockUser.businessId,
        tenantId: mockUser.tenantId,
        items: [{
          product: mockProduct._id,
          productName: mockProduct.name,
          productCode: mockProduct.code,
          price: mockProduct.price,
          quantity: 2,
          subtotal: mockProduct.price * 2
        }],
        subtotal: mockProduct.price * 2,
        taxAmount: (mockProduct.price * 2) * 0.1,
        total: (mockProduct.price * 2) + ((mockProduct.price * 2) * 0.1),
        currency: 'USD',
        status: 'completed',
        orderDate: new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate() - 1) // Yesterday
      }).save();

      await new Order({
        customerId: mockCustomer._id,
        customerEmail: 'customer@example.com',
        customerName: 'John Doe',
        businessId: mockUser.businessId,
        tenantId: mockUser.tenantId,
        items: [{
          product: mockProduct._id,
          productName: mockProduct.name,
          productCode: mockProduct.code,
          price: mockProduct.price,
          quantity: 1,
          subtotal: mockProduct.price
        }],
        subtotal: mockProduct.price,
        taxAmount: mockProduct.price * 0.1,
        total: mockProduct.price + (mockProduct.price * 0.1),
        currency: 'USD',
        status: 'completed',
        orderDate: new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate()) // Today
      }).save();
    });

    it('should return sales analytics for default period', async () => {
      const result = await AnalyticsService.getSalesAnalytics({}, mockUser);

      expect(result).toBeDefined();
      expect(result.currentPeriod).toBeDefined();
      expect(result.previousPeriod).toBeDefined();
      expect(result.currentPeriod.totalSales).toBeGreaterThan(0);
      expect(result.currentPeriod.totalRevenue).toBeGreaterThan(0);
      expect(result.currentPeriod.averageOrderValue).toBeGreaterThan(0);
      expect(result.currentPeriod.topProducts).toBeDefined();
      expect(Array.isArray(result.currentPeriod.topProducts)).toBe(true);
    });

    it('should filter analytics by date range', async () => {
      const today = new Date();
      const result = await AnalyticsService.getSalesAnalytics({
        dateRange: 'today'
      }, mockUser);

      expect(result).toBeDefined();
      expect(result.currentPeriod.totalSales).toBe(2); // Should include today's order
    });

    it('should filter analytics by specific dates', async () => {
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      const result = await AnalyticsService.getSalesAnalytics({
        startDate: yesterday.toISOString(),
        endDate: today.toISOString()
      }, mockUser);

      expect(result).toBeDefined();
      expect(result.currentPeriod.totalSales).toBe(2); // Both orders
    });
  });

  describe('getCustomerAnalytics', () => {
    beforeEach(async () => {
      // Create multiple customers
      await new CustomerAccount({
        email: 'customer1@example.com',
        firstName: 'John',
        lastName: 'Doe',
        tenantId: 'tenant1',
        businessId: 'business1'
      }).save();

      await new CustomerAccount({
        email: 'customer2@example.com',
        firstName: 'Jane',
        lastName: 'Smith',
        tenantId: 'tenant1',
        businessId: 'business1'
      }).save();

      // Create orders for customer analytics
      await new Order({
        customerId: mockCustomer._id,
        customerEmail: 'customer@example.com',
        customerName: 'John Doe',
        businessId: mockUser.businessId,
        tenantId: mockUser.tenantId,
        items: [{
          product: mockProduct._id,
          productName: mockProduct.name,
          productCode: mockProduct.code,
          price: mockProduct.price,
          quantity: 2,
          subtotal: mockProduct.price * 2
        }],
        subtotal: mockProduct.price * 2,
        total: (mockProduct.price * 2) + ((mockProduct.price * 2) * 0.1),
        currency: 'USD',
        status: 'completed'
      }).save();
    });

    it('should return customer analytics', async () => {
      const result = await AnalyticsService.getCustomerAnalytics({}, mockUser);

      expect(result).toBeDefined();
      expect(result.totalCustomers).toBe(3); // 3 customers total
      expect(result.activeCustomers).toBeGreaterThanOrEqual(1); // At least 1 with orders
      expect(result.customerGrowth).toBeDefined();
      expect(result.customerSegments).toBeDefined();
      expect(result.topCustomers).toBeDefined();
      expect(Array.isArray(result.topCustomers)).toBe(true);
    });
  });

  describe('getInventoryAnalytics', () => {
    beforeEach(async () => {
      // Create multiple products with different categories
      await new Product({
        name: 'Product 1',
        code: 'P1',
        price: 10,
        stock: 50,
        category: 'Electronics',
        tenantId: 'tenant1',
        businessId: 'business1'
      }).save();

      await new Product({
        name: 'Product 2',
        code: 'P2',
        price: 15,
        stock: 30,
        category: 'Clothing',
        tenantId: 'tenant1',
        businessId: 'business1'
      }).save();

      await new Product({
        name: 'Product 3',
        code: 'P3',
        price: 20,
        stock: 10,
        category: 'Electronics',
        tenantId: 'tenant1',
        businessId: 'business1'
      }).save();
    });

    it('should return inventory analytics', async () => {
      const result = await AnalyticsService.getInventoryAnalytics({}, mockUser);

      expect(result).toBeDefined();
      expect(result.totalProducts).toBe(4); // 4 products total
      expect(result.totalStockValue).toBeGreaterThan(0);
      expect(result.productsByCategory).toBeDefined();
      expect(result.lowStockItems).toBeDefined();
      expect(Array.isArray(result.lowStockItems)).toBe(true);
      expect(result.outOfStockItems).toBeDefined();
      expect(Array.isArray(result.outOfStockItems)).toBe(true);
    });

    it('should filter by category', async () => {
      const result = await AnalyticsService.getInventoryAnalytics({ category: 'Electronics' }, mockUser);

      expect(result).toBeDefined();
      expect(result.totalProducts).toBe(3); // 3 electronics products
    });
  });

  describe('getFinancialAnalytics', () => {
    beforeEach(async () => {
      // Create orders for financial analytics
      await new Order({
        customerId: mockCustomer._id,
        customerEmail: 'customer@example.com',
        customerName: 'John Doe',
        businessId: mockUser.businessId,
        tenantId: mockUser.tenantId,
        items: [{
          product: mockProduct._id,
          productName: mockProduct.name,
          productCode: mockProduct.code,
          price: mockProduct.price,
          quantity: 2,
          subtotal: mockProduct.price * 2
        }],
        subtotal: mockProduct.price * 2,
        taxAmount: (mockProduct.price * 2) * 0.1,
        total: (mockProduct.price * 2) + ((mockProduct.price * 2) * 0.1),
        currency: 'USD',
        status: 'completed'
      }).save();

      // Create expenses for financial analytics
      await new Expense({
        description: 'Office Supplies',
        amount: 100,
        category: 'Office',
        businessId: mockUser.businessId,
        tenantId: mockUser.tenantId,
        date: new Date()
      }).save();

      await new Expense({
        description: 'Marketing',
        amount: 200,
        category: 'Marketing',
        businessId: mockUser.businessId,
        tenantId: mockUser.tenantId,
        date: new Date()
      }).save();
    });

    it('should return financial analytics', async () => {
      const result = await AnalyticsService.getFinancialAnalytics({}, mockUser);

      expect(result).toBeDefined();
      expect(result.totalRevenue).toBeGreaterThan(0);
      expect(result.totalExpenses).toBe(300); // 100 + 200
      expect(result.netProfit).toBeDefined();
      expect(result.expenseByCategory).toBeDefined();
      expect(result.revenueTrends).toBeDefined();
    });

    it('should filter by date range', async () => {
      const result = await AnalyticsService.getFinancialAnalytics({
        dateRange: 'today'
      }, mockUser);

      expect(result).toBeDefined();
      expect(result.totalRevenue).toBeGreaterThan(0);
    });
  });

  describe('getDashboardAnalytics', () => {
    beforeEach(async () => {
      // Create data for all analytics
      await new Order({
        customerId: mockCustomer._id,
        customerEmail: 'customer@example.com',
        customerName: 'John Doe',
        businessId: mockUser.businessId,
        tenantId: mockUser.tenantId,
        items: [{
          product: mockProduct._id,
          productName: mockProduct.name,
          productCode: mockProduct.code,
          price: mockProduct.price,
          quantity: 2,
          subtotal: mockProduct.price * 2
        }],
        subtotal: mockProduct.price * 2,
        taxAmount: (mockProduct.price * 2) * 0.1,
        total: (mockProduct.price * 2) + ((mockProduct.price * 2) * 0.1),
        currency: 'USD',
        status: 'completed'
      }).save();

      await new CustomerAccount({
        email: 'customer1@example.com',
        firstName: 'Jane',
        lastName: 'Smith',
        tenantId: 'tenant1',
        businessId: 'business1'
      }).save();

      await new Product({
        name: 'Inventory Product',
        code: 'IP001',
        price: 30,
        stock: 25,
        category: 'Electronics',
        tenantId: 'tenant1',
        businessId: 'business1'
      }).save();

      await new Expense({
        description: 'Office Supplies',
        amount: 100,
        category: 'Office',
        businessId: mockUser.businessId,
        tenantId: mockUser.tenantId
      }).save();
    });

    it('should return comprehensive dashboard analytics', async () => {
      const result = await AnalyticsService.getDashboardAnalytics({}, mockUser);

      expect(result).toBeDefined();
      expect(result.sales).toBeDefined();
      expect(result.customers).toBeDefined();
      expect(result.inventory).toBeDefined();
      expect(result.financial).toBeDefined();
      expect(result.trends).toBeDefined();
      expect(result.alerts).toBeDefined();
    });
  });

  describe('getTrendAnalytics', () => {
    beforeEach(async () => {
      const baseDate = new Date();
      
      // Create orders for different days to show trends
      for (let i = 0; i < 5; i++) {
        const orderDate = new Date(baseDate);
        orderDate.setDate(orderDate.getDate() - i);
        
        await new Order({
          customerId: mockCustomer._id,
          customerEmail: 'customer@example.com',
          customerName: 'John Doe',
          businessId: mockUser.businessId,
          tenantId: mockUser.tenantId,
          items: [{
            product: mockProduct._id,
            productName: mockProduct.name,
            productCode: mockProduct.code,
            price: mockProduct.price,
            quantity: i + 1, // Different quantities for different trends
            subtotal: mockProduct.price * (i + 1)
          }],
          subtotal: mockProduct.price * (i + 1),
          total: (mockProduct.price * (i + 1)) + ((mockProduct.price * (i + 1)) * 0.1),
          currency: 'USD',
          status: 'completed',
          orderDate
        }).save();
      }
    });

    it('should return trend analytics', async () => {
      const result = await AnalyticsService.getTrendAnalytics({
        period: 'week'
      }, mockUser);

      expect(result).toBeDefined();
      expect(result.dailyTrends).toBeDefined();
      expect(Array.isArray(result.dailyTrends)).toBe(true);
      expect(result.weeklyTrends).toBeDefined();
      expect(result.monthlyTrends).toBeDefined();
      expect(result.growthRate).toBeDefined();
    });
  });

  describe('getAlerts', () => {
    beforeEach(async () => {
      // Create a product with low stock
      await new Product({
        name: 'Low Stock Product',
        code: 'LSP001',
        price: 25,
        stock: 2, // Below reorder point of 5
        reorderPoint: 5,
        category: 'Electronics',
        tenantId: 'tenant1',
        businessId: 'business1'
      }).save();

      // Create an old order that might be considered late
      await new Order({
        customerId: mockCustomer._id,
        customerEmail: 'customer@example.com',
        customerName: 'John Doe',
        businessId: mockUser.businessId,
        tenantId: mockUser.tenantId,
        items: [{
          product: mockProduct._id,
          productName: mockProduct.name,
          productCode: mockProduct.code,
          price: mockProduct.price,
          quantity: 1,
          subtotal: mockProduct.price
        }],
        subtotal: mockProduct.price,
        total: mockProduct.price + (mockProduct.price * 0.1),
        currency: 'USD',
        status: 'pending',
        orderDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000) // 10 days ago
      }).save();
    });

    it('should return system alerts', async () => {
      const result = await AnalyticsService.getAlerts(mockUser);

      expect(result).toBeDefined();
      expect(result.lowStock).toBeDefined();
      expect(Array.isArray(result.lowStock)).toBe(true);
      expect(result.pendingOrders).toBeDefined();
      expect(Array.isArray(result.pendingOrders)).toBe(true);
      expect(result.systemAlerts).toBeDefined();
      expect(Array.isArray(result.systemAlerts)).toBe(true);
    });
  });
});