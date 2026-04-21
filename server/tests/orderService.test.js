const OrderService = require('../services/orderService');
const Order = require('../models/Order');
const Product = require('../models/Product');
const Cart = require('../models/Cart');
const User = require('../models/User');
const CustomerAccount = require('../models/CustomerAccount');

describe('OrderService', () => {
  let mockUser, mockCustomer, mockProduct, mockCart;

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
      businessId: 'business1',
      trackInventory: true
    });
    await mockProduct.save();

    // Create a mock cart
    mockCart = new Cart({
      customerId: mockCustomer._id,
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
      taxRate: 0.1,
      currency: 'USD'
    });
    await mockCart.save();
  });

  afterEach(async () => {
    await Order.deleteMany({});
    await Cart.deleteMany({});
    await Product.deleteMany({});
    await CustomerAccount.deleteMany({});
    await User.deleteMany({});
  });

  describe('createOrderFromCart', () => {
    it('should create order from cart successfully', async () => {
      const orderData = {
        customerEmail: 'customer@example.com',
        customerName: 'John Doe',
        customerPhone: '+1234567890',
        fulfillmentMethod: 'shipping',
        paymentMethod: 'card',
        shippingAddress: {
          firstName: 'John',
          lastName: 'Doe',
          street: '123 Main St',
          city: 'New York',
          state: 'NY',
          zipCode: '10001',
          country: 'US'
        },
        notes: 'Handle with care'
      };

      const result = await OrderService.createOrderFromCart(
        mockCart._id.toString(),
        orderData,
        mockCustomer._id.toString()
      );

      expect(result).toBeDefined();
      expect(result.customerId.toString()).toBe(mockCustomer._id.toString());
      expect(result.businessId.toString()).toBe(mockUser.businessId.toString());
      expect(result.items).toHaveLength(1);
      expect(result.items[0].productName).toBe(mockProduct.name);
      expect(result.total).toBeGreaterThan(0);
      expect(result.status).toBe('pending');
    });

    it('should validate cart exists', async () => {
      await expect(OrderService.createOrderFromCart(
        '507f1f77bcf86cd799439011', // Non-existent cart ID
        { customerEmail: 'test@example.com', customerName: 'Test' },
        mockCustomer._id.toString()
      )).rejects.toThrow('Cart not found');
    });

    it('should validate cart is not empty', async () => {
      const emptyCart = new Cart({
        customerId: mockCustomer._id,
        businessId: mockUser.businessId,
        tenantId: mockUser.tenantId,
        items: [],
        subtotal: 0,
        taxRate: 0,
        currency: 'USD'
      });
      await emptyCart.save();

      await expect(OrderService.createOrderFromCart(
        emptyCart._id.toString(),
        { customerEmail: 'test@example.com', customerName: 'Test' },
        mockCustomer._id.toString()
      )).rejects.toThrow('Cart is empty');
    });
  });

  describe('getOrder', () => {
    let order;

    beforeEach(async () => {
      const orderData = {
        customerEmail: 'customer@example.com',
        customerName: 'John Doe',
        customerPhone: '+1234567890',
        fulfillmentMethod: 'shipping',
        paymentMethod: 'card',
        shippingAddress: {
          firstName: 'John',
          lastName: 'Doe',
          street: '123 Main St',
          city: 'New York',
          state: 'NY',
          zipCode: '10001',
          country: 'US'
        }
      };

      order = await OrderService.createOrderFromCart(
        mockCart._id.toString(),
        orderData,
        mockCustomer._id.toString()
      );
    });

    it('should return order by ID', async () => {
      const result = await OrderService.getOrder(order._id.toString());

      expect(result).toBeDefined();
      expect(result._id.toString()).toBe(order._id.toString());
      expect(result.customerId.toString()).toBe(mockCustomer._id.toString());
    });

    it('should return null for non-existent order', async () => {
      await expect(OrderService.getOrder('507f1f77bcf86cd799439011'))
        .rejects.toThrow('Order not found');
    });
  });

  describe('getCustomerOrders', () => {
    beforeEach(async () => {
      const orderData = {
        customerEmail: 'customer@example.com',
        customerName: 'John Doe',
        customerPhone: '+1234567890',
        fulfillmentMethod: 'shipping',
        paymentMethod: 'card',
        shippingAddress: {
          firstName: 'John',
          lastName: 'Doe',
          street: '123 Main St',
          city: 'New York',
          state: 'NY',
          zipCode: '10001',
          country: 'US'
        }
      };

      // Create multiple orders for the same customer
      await OrderService.createOrderFromCart(
        mockCart._id.toString(),
        orderData,
        mockCustomer._id.toString()
      );

      // Create another cart and order
      const mockCart2 = new Cart({
        customerId: mockCustomer._id,
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
        taxRate: 0.1,
        currency: 'USD'
      });
      await mockCart2.save();

      await OrderService.createOrderFromCart(
        mockCart2._id.toString(),
        orderData,
        mockCustomer._id.toString()
      );
    });

    it('should return orders for customer', async () => {
      const result = await OrderService.getCustomerOrders(mockCustomer._id.toString());

      expect(result).toBeDefined();
      expect(result.orders).toHaveLength(2);
      expect(result.pagination.total).toBe(2);
      expect(result.orders[0].customerId.toString()).toBe(mockCustomer._id.toString());
    });

    it('should filter orders by status', async () => {
      const result = await OrderService.getCustomerOrders(
        mockCustomer._id.toString(),
        { status: 'pending' }
      );

      expect(result).toBeDefined();
      expect(result.orders).toHaveLength(2);
      expect(result.orders.every(order => order.status === 'pending')).toBe(true);
    });

    it('should paginate results', async () => {
      const result = await OrderService.getCustomerOrders(
        mockCustomer._id.toString(),
        {},
        { page: 1, limit: 1 }
      );

      expect(result).toBeDefined();
      expect(result.orders).toHaveLength(1);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(1);
      expect(result.pagination.total).toBe(2);
    });
  });

  describe('getBusinessOrders', () => {
    beforeEach(async () => {
      const orderData = {
        customerEmail: 'customer@example.com',
        customerName: 'John Doe',
        customerPhone: '+1234567890',
        fulfillmentMethod: 'shipping',
        paymentMethod: 'card',
        shippingAddress: {
          firstName: 'John',
          lastName: 'Doe',
          street: '123 Main St',
          city: 'New York',
          state: 'NY',
          zipCode: '10001',
          country: 'US'
        }
      };

      // Create multiple orders for the same business
      await OrderService.createOrderFromCart(
        mockCart._id.toString(),
        orderData,
        mockCustomer._id.toString()
      );

      // Create another cart and order
      const mockCart2 = new Cart({
        customerId: mockCustomer._id,
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
        taxRate: 0.1,
        currency: 'USD'
      });
      await mockCart2.save();

      await OrderService.createOrderFromCart(
        mockCart2._id.toString(),
        orderData,
        mockCustomer._id.toString()
      );
    });

    it('should return orders for business', async () => {
      const result = await OrderService.getBusinessOrders(mockUser.businessId.toString());

      expect(result).toBeDefined();
      expect(result.orders).toHaveLength(2);
      expect(result.pagination.total).toBe(2);
      expect(result.orders.every(order => order.businessId.toString() === mockUser.businessId.toString())).toBe(true);
    });

    it('should filter orders by status', async () => {
      const result = await OrderService.getBusinessOrders(
        mockUser.businessId.toString(),
        { status: 'pending' }
      );

      expect(result).toBeDefined();
      expect(result.orders).toHaveLength(2);
      expect(result.orders.every(order => order.status === 'pending')).toBe(true);
    });

    it('should paginate results', async () => {
      const result = await OrderService.getBusinessOrders(
        mockUser.businessId.toString(),
        {},
        { page: 1, limit: 1 }
      );

      expect(result).toBeDefined();
      expect(result.orders).toHaveLength(1);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(1);
      expect(result.pagination.total).toBe(2);
    });
  });

  describe('updateOrderStatus', () => {
    let order;

    beforeEach(async () => {
      const orderData = {
        customerEmail: 'customer@example.com',
        customerName: 'John Doe',
        customerPhone: '+1234567890',
        fulfillmentMethod: 'shipping',
        paymentMethod: 'card',
        shippingAddress: {
          firstName: 'John',
          lastName: 'Doe',
          street: '123 Main St',
          city: 'New York',
          state: 'NY',
          zipCode: '10001',
          country: 'US'
        }
      };

      order = await OrderService.createOrderFromCart(
        mockCart._id.toString(),
        orderData,
        mockCustomer._id.toString()
      );
    });

    it('should update order status successfully', async () => {
      const newStatus = 'confirmed';
      const result = await OrderService.updateOrderStatus(order._id.toString(), newStatus, mockUser._id.toString());

      expect(result).toBeDefined();
      expect(result._id.toString()).toBe(order._id.toString());
      expect(result.status).toBe(newStatus);
    });

    it('should validate status', async () => {
      await expect(OrderService.updateOrderStatus(
        order._id.toString(),
        'invalid_status',
        mockUser._id.toString()
      )).rejects.toThrow('Invalid order status');
    });

    it('should return error for non-existent order', async () => {
      await expect(OrderService.updateOrderStatus(
        '507f1f77bcf86cd799439011',
        'confirmed',
        mockUser._id.toString()
      )).rejects.toThrow('Order not found');
    });
  });

  describe('addTrackingInfo', () => {
    let order;

    beforeEach(async () => {
      const orderData = {
        customerEmail: 'customer@example.com',
        customerName: 'John Doe',
        customerPhone: '+1234567890',
        fulfillmentMethod: 'shipping',
        paymentMethod: 'card',
        shippingAddress: {
          firstName: 'John',
          lastName: 'Doe',
          street: '123 Main St',
          city: 'New York',
          state: 'NY',
          zipCode: '10001',
          country: 'US'
        }
      };

      order = await OrderService.createOrderFromCart(
        mockCart._id.toString(),
        orderData,
        mockCustomer._id.toString()
      );
    });

    it('should add tracking information successfully', async () => {
      const trackingNumber = '1Z999AA1234567890';
      const carrier = 'UPS';
      const result = await OrderService.addTrackingInfo(
        order._id.toString(),
        trackingNumber,
        carrier
      );

      expect(result).toBeDefined();
      expect(result._id.toString()).toBe(order._id.toString());
      expect(result.trackingNumber).toBe(trackingNumber);
      expect(result.shippingCarrier).toBe(carrier);
    });

    it('should return error for non-existent order', async () => {
      await expect(OrderService.addTrackingInfo(
        '507f1f77bcf86cd799439011',
        '1Z999AA1234567890',
        'UPS'
      )).rejects.toThrow('Order not found');
    });
  });

  describe('validateCartItems', () => {
    it('should return valid for valid cart items', async () => {
      const result = await OrderService.validateCartItems(mockCart);

      expect(result.isValid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('should detect unavailable products', async () => {
      // Create a cart with a non-existent product
      const invalidCart = new Cart({
        customerId: mockCustomer._id,
        businessId: mockUser.businessId,
        tenantId: mockUser.tenantId,
        items: [{
          product: '507f1f77bcf86cd799439011', // Non-existent product ID
          productName: 'Non-existent Product',
          productCode: 'NEP001',
          price: 25.99,
          quantity: 1,
          subtotal: 25.99
        }],
        subtotal: 25.99,
        taxRate: 0.1,
        currency: 'USD'
      });
      await invalidCart.save();

      const result = await OrderService.validateCartItems(invalidCart);

      expect(result.isValid).toBe(false);
      expect(result.issues).toContain('Product Non-existent Product is no longer available');
    });

    it('should detect insufficient stock', async () => {
      // Update product to have insufficient stock
      await Product.findByIdAndUpdate(mockProduct._id, { stock: 1 }); // Only 1 in stock but cart has 2

      const result = await OrderService.validateCartItems(mockCart);

      expect(result.isValid).toBe(false);
      expect(result.issues).toContain(`Insufficient stock for ${mockProduct.name}. Only 1 available.`);
    });
  });
});