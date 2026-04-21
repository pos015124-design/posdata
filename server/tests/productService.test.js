const ProductService = require('../services/productService');
const Product = require('../models/Product');
const User = require('../models/User');

describe('ProductService', () => {
  let mockUser, mockProductData;

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

    // Mock product data
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
      tenantId: 'tenant1',
      businessId: 'business1'
    };
  });

  afterEach(async () => {
    await Product.deleteMany({});
    await User.deleteMany({});
  });

  describe('createProduct', () => {
    it('should create a product successfully', async () => {
      const result = await ProductService.createProduct(mockProductData, mockUser);

      expect(result).toBeDefined();
      expect(result.name).toBe(mockProductData.name);
      expect(result.code).toBe(mockProductData.code);
      expect(result.price).toBe(mockProductData.price);
      expect(result.tenantId).toBe(mockProductData.tenantId);
      expect(result.businessId).toBe(mockProductData.businessId);
    });

    it('should validate required fields', async () => {
      const invalidProductData = {
        name: '', // Invalid: empty name
        code: 'TP001',
        price: 25.99
      };

      await expect(ProductService.createProduct(invalidProductData, mockUser))
        .rejects
        .toThrow();
    });

    it('should validate price is positive', async () => {
      const invalidProductData = {
        ...mockProductData,
        price: -10 // Invalid: negative price
      };

      await expect(ProductService.createProduct(invalidProductData, mockUser))
        .rejects
        .toThrow();
    });

    it('should validate stock is non-negative', async () => {
      const invalidProductData = {
        ...mockProductData,
        stock: -5 // Invalid: negative stock
      };

      await expect(ProductService.createProduct(invalidProductData, mockUser))
        .rejects
        .toThrow();
    });
  });

  describe('getProductById', () => {
    it('should return product by ID', async () => {
      const createdProduct = await ProductService.createProduct(mockProductData, mockUser);

      const result = await ProductService.getProductById(createdProduct._id.toString());

      expect(result).toBeDefined();
      expect(result._id.toString()).toBe(createdProduct._id.toString());
      expect(result.name).toBe(mockProductData.name);
    });

    it('should return null for non-existent product', async () => {
      const result = await ProductService.getProductById('507f1f77bcf86cd799439011');

      expect(result).toBeNull();
    });
  });

  describe('updateProduct', () => {
    let product;

    beforeEach(async () => {
      product = await ProductService.createProduct(mockProductData, mockUser);
    });

    it('should update product successfully', async () => {
      const updateData = {
        name: 'Updated Product Name',
        price: 30.99,
        stock: 150
      };

      const result = await ProductService.updateProduct(product._id.toString(), updateData, mockUser);

      expect(result).toBeDefined();
      expect(result.name).toBe(updateData.name);
      expect(result.price).toBe(updateData.price);
      expect(result.stock).toBe(updateData.stock);
    });

    it('should validate update data', async () => {
      const invalidUpdateData = {
        name: '', // Invalid: empty name
        price: -10 // Invalid: negative price
      };

      await expect(ProductService.updateProduct(product._id.toString(), invalidUpdateData, mockUser))
        .rejects
        .toThrow();
    });

    it('should not update non-existent product', async () => {
      await expect(ProductService.updateProduct('507f1f77bcf86cd799439011', { name: 'New Name' }, mockUser))
        .rejects
        .toThrow();
    });
  });

  describe('deleteProduct', () => {
    let product;

    beforeEach(async () => {
      product = await ProductService.createProduct(mockProductData, mockUser);
    });

    it('should delete product successfully', async () => {
      const result = await ProductService.deleteProduct(product._id.toString(), mockUser);

      expect(result).toBe(true);

      // Verify product no longer exists
      const deletedProduct = await ProductService.getProductById(product._id.toString());
      expect(deletedProduct).toBeNull();
    });

    it('should return false for non-existent product', async () => {
      const result = await ProductService.deleteProduct('507f1f77bcf86cd799439011', mockUser);

      expect(result).toBe(false);
    });
  });

  describe('getProducts', () => {
    beforeEach(async () => {
      // Create multiple products
      await ProductService.createProduct(mockProductData, mockUser);
      await ProductService.createProduct({
        ...mockProductData,
        name: 'Second Product',
        code: 'TP002',
        barcode: '1234567890124'
      }, mockUser);
    });

    it('should return all products for tenant', async () => {
      const result = await ProductService.getProducts(mockUser);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(2);
      expect(result[0].tenantId).toBe(mockUser.tenantId);
    });

    it('should filter products by category', async () => {
      const result = await ProductService.getProducts(mockUser, { category: 'Electronics' });

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(2); // Both products are in 'Electronics' category
    });

    it('should filter products by name', async () => {
      const result = await ProductService.getProducts(mockUser, { search: 'Second' });

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(1);
      expect(result[0].name).toContain('Second');
    });

    it('should paginate results', async () => {
      const result = await ProductService.getProducts(mockUser, {}, { page: 1, limit: 1 });

      expect(result).toBeDefined();
      expect(result.products).toHaveLength(1);
      expect(result.pagination).toBeDefined();
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(1);
      expect(result.pagination.total).toBeGreaterThanOrEqual(2);
    });
  });

  describe('updateProductStock', () => {
    let product;

    beforeEach(async () => {
      product = await ProductService.createProduct(mockProductData, mockUser);
    });

    it('should update product stock successfully', async () => {
      const newStock = 75;
      const result = await ProductService.updateProductStock(product._id.toString(), newStock, mockUser);

      expect(result).toBeDefined();
      expect(result.stock).toBe(newStock);
    });

    it('should validate stock value', async () => {
      await expect(ProductService.updateProductStock(product._id.toString(), -10, mockUser))
        .rejects
        .toThrow();
    });
  });
});