const InventoryService = require('../services/inventoryService');
const Product = require('../models/Product');
const User = require('../models/User');

describe('InventoryService', () => {
  let mockUser, mockProduct;

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

    // Create a mock product
    mockProduct = new Product({
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
      businessId: 'business1',
      trackInventory: true
    });
    await mockProduct.save();
  });

  afterEach(async () => {
    await Product.deleteMany({});
    await User.deleteMany({});
  });

  describe('getInventory', () => {
    beforeEach(async () => {
      // Create multiple products
      await new Product({
        name: 'Product 1',
        code: 'P001',
        price: 10.99,
        stock: 50,
        category: 'Electronics',
        tenantId: 'tenant1',
        businessId: 'business1',
        trackInventory: true
      }).save();

      await new Product({
        name: 'Product 2',
        code: 'P002',
        price: 15.99,
        stock: 25,
        category: 'Clothing',
        tenantId: 'tenant1',
        businessId: 'business1',
        trackInventory: true
      }).save();
    });

    it('should return all inventory items for business', async () => {
      const result = await InventoryService.getInventory(mockUser);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(3); // 3 products total
      expect(result[0].businessId.toString()).toBe(mockUser.businessId.toString());
    });

    it('should filter inventory by category', async () => {
      const result = await InventoryService.getInventory(mockUser, { category: 'Electronics' });

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(2); // 2 products in Electronics category
    });

    it('should filter inventory by stock level', async () => {
      const result = await InventoryService.getInventory(mockUser, { lowStock: true });

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(0); // No products below reorder point
    });

    it('should filter inventory by name', async () => {
      const result = await InventoryService.getInventory(mockUser, { search: 'Product 1' });

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(1);
      expect(result[0].name).toContain('Product 1');
    });

    it('should paginate results', async () => {
      const result = await InventoryService.getInventory(mockUser, {}, { page: 1, limit: 2 });

      expect(result).toBeDefined();
      expect(result.products).toHaveLength(2);
      expect(result.pagination).toBeDefined();
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(2);
      expect(result.pagination.total).toBe(3);
    });
  });

  describe('getLowStockItems', () => {
    beforeEach(async () => {
      // Create products with different stock levels
      await new Product({
        name: 'Low Stock Product',
        code: 'LSP001',
        price: 20.99,
        stock: 5, // Below reorder point of 10
        reorderPoint: 10,
        tenantId: 'tenant1',
        businessId: 'business1',
        trackInventory: true
      }).save();

      await new Product({
        name: 'Normal Stock Product',
        code: 'NSP001',
        price: 15.99,
        stock: 50,
        reorderPoint: 10,
        tenantId: 'tenant1',
        businessId: 'business1',
        trackInventory: true
      }).save();
    });

    it('should return products with low stock', async () => {
      const result = await InventoryService.getLowStockItems(mockUser);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(1);
      expect(result[0].stock).toBe(5);
      expect(result[0].reorderPoint).toBe(10);
      expect(result[0].name).toBe('Low Stock Product');
    });

    it('should filter low stock by category', async () => {
      const result = await InventoryService.getLowStockItems(mockUser, { category: 'Electronics' });

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(0); // No electronics with low stock
    });
  });

  describe('updateStock', () => {
    it('should update stock successfully', async () => {
      const newStock = 150;
      const result = await InventoryService.updateStock(mockProduct._id.toString(), newStock, mockUser);

      expect(result).toBeDefined();
      expect(result.stock).toBe(newStock);
    });

    it('should validate stock value', async () => {
      await expect(InventoryService.updateStock(mockProduct._id.toString(), -10, mockUser))
        .rejects
        .toThrow();
    });

    it('should return error for non-existent product', async () => {
      await expect(InventoryService.updateStock('507f1f77bcf86cd799439011', 100, mockUser))
        .rejects
        .toThrow();
    });
  });

  describe('adjustStock', () => {
    it('should adjust stock by adding quantity', async () => {
      const adjustment = 25;
      const result = await InventoryService.adjustStock(mockProduct._id.toString(), adjustment, 'add', mockUser);

      expect(result).toBeDefined();
      expect(result.stock).toBe(mockProduct.stock + adjustment);
    });

    it('should adjust stock by subtracting quantity', async () => {
      const adjustment = 25;
      const result = await InventoryService.adjustStock(mockProduct._id.toString(), adjustment, 'remove', mockUser);

      expect(result).toBeDefined();
      expect(result.stock).toBe(mockProduct.stock - adjustment);
    });

    it('should validate adjustment value', async () => {
      await expect(InventoryService.adjustStock(mockProduct._id.toString(), -10, 'add', mockUser))
        .rejects
        .toThrow();
    });

    it('should not allow removing more stock than available', async () => {
      const tooMuchAdjustment = mockProduct.stock + 1;
      await expect(InventoryService.adjustStock(mockProduct._id.toString(), tooMuchAdjustment, 'remove', mockUser))
        .rejects
        .toThrow();
    });

    it('should return error for non-existent product', async () => {
      await expect(InventoryService.adjustStock('507f1f77bcf86cd799439011', 10, 'add', mockUser))
        .rejects
        .toThrow();
    });
  });

  describe('getInventoryValue', () => {
    beforeEach(async () => {
      // Create multiple products with different values
      await new Product({
        name: 'Expensive Product',
        code: 'EP001',
        price: 100,
        purchasePrice: 80,
        stock: 10,
        tenantId: 'tenant1',
        businessId: 'business1',
        trackInventory: true
      }).save();

      await new Product({
        name: 'Cheap Product',
        code: 'CP001',
        price: 5,
        purchasePrice: 3,
        stock: 100,
        tenantId: 'tenant1',
        businessId: 'business1',
        trackInventory: true
      }).save();
    });

    it('should calculate total inventory value', async () => {
      const result = await InventoryService.getInventoryValue(mockUser);

      expect(result).toBeDefined();
      expect(result.totalValue).toBeGreaterThan(0);
      expect(result.totalItems).toBe(3); // 3 products total
      expect(result.totalStock).toBe(210); // 100 + 10 + 100
    });

    it('should calculate inventory value by category', async () => {
      const result = await InventoryService.getInventoryValue(mockUser, { category: 'Electronics' });

      expect(result).toBeDefined();
      expect(result.totalValue).toBeGreaterThan(0);
    });
  });

  describe('getStockHistory', () => {
    it('should return stock history for product', async () => {
      // Note: This assumes the product model tracks stock changes
      // For now, we'll just verify the function exists and returns expected format
      const result = await InventoryService.getStockHistory(mockProduct._id.toString(), mockUser);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('getReorderRecommendations', () => {
    beforeEach(async () => {
      // Create products with different stock levels
      await new Product({
        name: 'Low Stock Product',
        code: 'LSP001',
        price: 20.99,
        stock: 5, // Below reorder point of 10
        reorderPoint: 10,
        tenantId: 'tenant1',
        businessId: 'business1',
        trackInventory: true
      }).save();

      await new Product({
        name: 'Normal Stock Product',
        code: 'NSP001',
        price: 15.99,
        stock: 50,
        reorderPoint: 10,
        tenantId: 'tenant1',
        businessId: 'business1',
        trackInventory: true
      }).save();
    });

    it('should return products that need reordering', async () => {
      const result = await InventoryService.getReorderRecommendations(mockUser);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(1);
      expect(result[0].stock).toBe(5);
      expect(result[0].reorderPoint).toBe(10);
      expect(result[0].name).toBe('Low Stock Product');
    });

    it('should return empty array when no products need reordering', async () => {
      // Update the low stock product to above reorder point
      await Product.findOneAndUpdate(
        { name: 'Low Stock Product' },
        { stock: 15 }
      );

      const result = await InventoryService.getReorderRecommendations(mockUser);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(0);
    });
  });

  describe('validateStockAdjustment', () => {
    it('should validate stock adjustment successfully', async () => {
      const result = await InventoryService.validateStockAdjustment(mockProduct._id.toString(), 10, 'add');

      expect(result).toBeDefined();
      expect(result.isValid).toBe(true);
      expect(result.message).toBe('Stock adjustment is valid');
    });

    it('should detect invalid adjustment type', async () => {
      const result = await InventoryService.validateStockAdjustment(mockProduct._id.toString(), 10, 'invalid');

      expect(result).toBeDefined();
      expect(result.isValid).toBe(false);
      expect(result.message).toContain('Invalid adjustment type');
    });

    it('should detect insufficient stock for removal', async () => {
      const result = await InventoryService.validateStockAdjustment(mockProduct._id.toString(), mockProduct.stock + 1, 'remove');

      expect(result).toBeDefined();
      expect(result.isValid).toBe(false);
      expect(result.message).toContain('Insufficient stock');
    });

    it('should return error for non-existent product', async () => {
      const result = await InventoryService.validateStockAdjustment('507f1f77bcf86cd799439011', 10, 'remove');

      expect(result).toBeDefined();
      expect(result.isValid).toBe(false);
      expect(result.message).toContain('Product not found');
    });
  });
});