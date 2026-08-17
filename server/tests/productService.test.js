const mongoose = require('mongoose');
const ProductService = require('../services/productService');
const Product = require('../models/Product');
const User = require('../models/User');

// Shared valid ObjectId for fixtures — mongoose 8 rejects bare strings.
const TEST_BUSINESS_ID = new mongoose.Types.ObjectId();

describe('ProductService', () => {
  let mockUser, mockProductData;

  beforeEach(async () => {
    mockUser = new User({
      email: 'admin@example.com',
      password: 'Password123!',
      role: 'business_admin',
      tenantId: 'tenant1',
      businessId: TEST_BUSINESS_ID,
      isApproved: true
    });
    await mockUser.save();

    mockProductData = {
      name: 'Test Product',
      code: 'TP001',
      barcode: '1234567890123',
      price: 25.99,
      purchasePrice: 15.99,
      stock: 100,
      category: 'Electronics',
      supplier: 'Test Supplier',
      reorderPoint: 10,
      description: 'A test product',
      businessId: TEST_BUSINESS_ID
    };
  });

  afterEach(async () => {
    await Product.deleteMany({});
    await User.deleteMany({});
  });

  describe('createProduct', () => {
    it('should create a product successfully and link ownership', async () => {
      const result = await ProductService.createProduct({ ...mockProductData }, mockUser._id);

      expect(result).toBeDefined();
      expect(result.name).toBe(mockProductData.name);
      expect(result.code).toBe(mockProductData.code);
      expect(result.price).toBe(mockProductData.price);
      expect(String(result.businessId)).toBe(String(TEST_BUSINESS_ID));
      expect(String(result.userId)).toBe(String(mockUser._id));
    });

    it('should reject a duplicate code for the same user', async () => {
      await ProductService.createProduct({ ...mockProductData }, mockUser._id);

      await expect(ProductService.createProduct({ ...mockProductData }, mockUser._id))
        .rejects
        .toThrow('already exists');
    });

    it('should reject a duplicate barcode for the same user', async () => {
      await ProductService.createProduct({ ...mockProductData }, mockUser._id);

      await expect(ProductService.createProduct({
        ...mockProductData,
        code: 'TP999'
      }, mockUser._id))
        .rejects
        .toThrow('barcode already exists');
    });

    it('should reject invalid data (missing required name)', async () => {
      const invalidProductData = { ...mockProductData, name: '' };

      await expect(ProductService.createProduct(invalidProductData, mockUser._id))
        .rejects
        .toThrow();
    });

    it('should reject a negative price', async () => {
      const invalidProductData = { ...mockProductData, price: -10 };

      await expect(ProductService.createProduct(invalidProductData, mockUser._id))
        .rejects
        .toThrow();
    });
  });

  describe('getProductById', () => {
    it('should return product by ID', async () => {
      const created = await ProductService.createProduct({ ...mockProductData }, mockUser._id);
      const result = await ProductService.getProductById(created._id.toString());

      expect(result).toBeDefined();
      expect(result._id.toString()).toBe(created._id.toString());
      expect(result.name).toBe(mockProductData.name);
    });

    it('should throw for a non-existent product', async () => {
      await expect(ProductService.getProductById(new mongoose.Types.ObjectId().toString()))
        .rejects
        .toThrow('Product not found');
    });
  });

  describe('getAllProducts', () => {
    beforeEach(async () => {
      await ProductService.createProduct({ ...mockProductData }, mockUser._id);
      await ProductService.createProduct({
        ...mockProductData,
        name: 'Second Product',
        code: 'TP002',
        barcode: '1234567890124'
      }, mockUser._id);
    });

    it('should return only the current user\'s products', async () => {
      const otherUser = new User({
        email: 'other@example.com',
        password: 'Password123!',
        role: 'business_admin',
        isApproved: true
      });
      await otherUser.save();
      await ProductService.createProduct({
        ...mockProductData,
        name: 'Other Product',
        code: 'TP003',
        barcode: '1234567890125'
      }, otherUser._id);

      const result = await ProductService.getAllProducts({ page: 1, limit: 10 }, {}, mockUser._id);
      expect(result.data).toHaveLength(2);
      result.data.forEach(p => expect(String(p.userId)).toBe(String(mockUser._id)));
    });

    it('should filter products by category', async () => {
      const result = await ProductService.getAllProducts({ page: 1, limit: 10 }, { category: 'Electronics' }, mockUser._id);
      expect(result.data).toHaveLength(2);
    });

    it('should search products by name', async () => {
      // Search is parsed from query params into the pagination object by the
      // route middleware — the service reads pagination.search.
      const result = await ProductService.getAllProducts({ page: 1, limit: 10, search: 'Second' }, {}, mockUser._id);
      expect(result.data).toHaveLength(1);
      expect(result.data[0].name).toContain('Second');
    });

    it('should paginate results', async () => {
      const result = await ProductService.getAllProducts({ page: 1, limit: 1 }, {}, mockUser._id);
      expect(result.data).toHaveLength(1);
      expect(result.pagination.currentPage).toBe(1);
      expect(result.pagination.limit).toBe(1);
      expect(result.pagination.totalCount).toBe(2);
    });
  });

  describe('updateProduct', () => {
    let product;

    beforeEach(async () => {
      product = await ProductService.createProduct({ ...mockProductData }, mockUser._id);
    });

    it('should update product successfully', async () => {
      const result = await ProductService.updateProduct(product._id.toString(), {
        name: 'Updated Product Name',
        price: 30.99,
        stock: 150
      });

      expect(result).toBeDefined();
      expect(result.name).toBe('Updated Product Name');
      expect(result.price).toBe(30.99);
      expect(result.stock).toBe(150);
    });

    it('should throw for a non-existent product', async () => {
      await expect(ProductService.updateProduct(new mongoose.Types.ObjectId().toString(), { name: 'New Name' }))
        .rejects
        .toThrow('Product not found');
    });
  });

  describe('deleteProduct', () => {
    let product;

    beforeEach(async () => {
      product = await ProductService.createProduct({ ...mockProductData }, mockUser._id);
    });

    it('should delete product successfully', async () => {
      const result = await ProductService.deleteProduct(product._id.toString());
      expect(result).toBe(true);

      await expect(ProductService.getProductById(product._id.toString()))
        .rejects
        .toThrow('Product not found');
    });

    it('should throw for a non-existent product', async () => {
      await expect(ProductService.deleteProduct(new mongoose.Types.ObjectId().toString()))
        .rejects
        .toThrow('Product not found');
    });
  });

  describe('updateStock', () => {
    let product;

    beforeEach(async () => {
      product = await ProductService.createProduct({ ...mockProductData }, mockUser._id);
    });

    it('should update product stock successfully', async () => {
      const result = await ProductService.updateStock(product._id.toString(), 75);
      expect(result).toBeDefined();
      expect(result.stock).toBe(75);
    });

    it('should throw for a non-existent product', async () => {
      await expect(ProductService.updateStock(new mongoose.Types.ObjectId().toString(), 5))
        .rejects
        .toThrow('Product not found');
    });
  });

  describe('getLowStockAlerts', () => {
    it('should return only products below their reorder point', async () => {
      await ProductService.createProduct({ ...mockProductData }, mockUser._id); // stock 100, reorder 10
      await ProductService.createProduct({
        ...mockProductData,
        name: 'Low Stock Item',
        code: 'TP002',
        barcode: '1234567890124',
        stock: 3,
        reorderPoint: 10
      }, mockUser._id);

      const alerts = await ProductService.getLowStockAlerts();
      expect(alerts).toHaveLength(1);
      expect(alerts[0].name).toBe('Low Stock Item');
    });
  });
});
