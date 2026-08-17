const mongoose = require('mongoose');
const CustomerService = require('../services/customerService');
const Customer = require('../models/Customer');
const User = require('../models/User');

// Shared valid ObjectId for fixtures — mongoose 8 rejects bare strings.
const TEST_BUSINESS_ID = new mongoose.Types.ObjectId();

describe('CustomerService', () => {
  let mockUser, mockCustomerData;

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

    mockCustomerData = {
      name: 'John Doe',
      email: 'john.doe@example.com',
      phone: '+1234567890',
      address: '123 Main St, New York, NY 10001'
    };
  });

  afterEach(async () => {
    await Customer.deleteMany({});
    await User.deleteMany({});
  });

  describe('createCustomer', () => {
    it('should create a customer successfully and link ownership', async () => {
      const result = await CustomerService.createCustomer({ ...mockCustomerData }, mockUser._id);

      expect(result).toBeDefined();
      expect(result.name).toBe(mockCustomerData.name);
      expect(result.email).toBe(mockCustomerData.email);
      expect(result.phone).toBe(mockCustomerData.phone);
      expect(result.address).toBe(mockCustomerData.address);
      expect(String(result.userId)).toBe(String(mockUser._id));
      expect(result.isActive).toBe(true);
    });

    it('should reject missing required name', async () => {
      const invalidCustomerData = { ...mockCustomerData, name: '' };

      await expect(CustomerService.createCustomer(invalidCustomerData, mockUser._id))
        .rejects
        .toThrow();
    });

    it('should reject an invalid email format', async () => {
      const invalidCustomerData = { ...mockCustomerData, email: 'invalid-email' };

      await expect(CustomerService.createCustomer(invalidCustomerData, mockUser._id))
        .rejects
        .toThrow();
    });
  });

  describe('getAllCustomers', () => {
    beforeEach(async () => {
      await CustomerService.createCustomer({ ...mockCustomerData }, mockUser._id);
      await CustomerService.createCustomer({
        ...mockCustomerData,
        name: 'Jane Smith',
        email: 'jane.smith@example.com'
      }, mockUser._id);
    });

    it('should return only the current user\'s customers', async () => {
      const otherUser = new User({
        email: 'other@example.com',
        password: 'Password123!',
        role: 'business_admin',
        isApproved: true
      });
      await otherUser.save();
      await CustomerService.createCustomer({
        ...mockCustomerData,
        name: 'Other Customer',
        email: 'other@example.com'
      }, otherUser._id);

      const result = await CustomerService.getAllCustomers({ page: 1, limit: 10 }, {}, mockUser._id);
      expect(result.data).toHaveLength(2);
      result.data.forEach(c => expect(String(c.userId)).toBe(String(mockUser._id)));
    });

    it('should search customers by name', async () => {
      const result = await CustomerService.getAllCustomers({ page: 1, limit: 10 }, { search: 'Jane' }, mockUser._id);
      expect(result.data).toHaveLength(1);
      expect(result.data[0].name).toContain('Jane');
    });

    it('should paginate results', async () => {
      const result = await CustomerService.getAllCustomers({ page: 1, limit: 1 }, {}, mockUser._id);
      expect(result.data).toHaveLength(1);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(1);
      expect(result.pagination.total).toBe(2);
    });
  });

  describe('getCustomerById', () => {
    it('should return customer by ID', async () => {
      const customer = await CustomerService.createCustomer({ ...mockCustomerData }, mockUser._id);
      const result = await CustomerService.getCustomerById(customer._id.toString());

      expect(result).toBeDefined();
      expect(result._id.toString()).toBe(customer._id.toString());
      expect(result.name).toBe(mockCustomerData.name);
    });

    it('should throw for a non-existent customer', async () => {
      await expect(CustomerService.getCustomerById(new mongoose.Types.ObjectId().toString()))
        .rejects
        .toThrow('Customer not found');
    });
  });

  describe('updateCustomer', () => {
    let customer;

    beforeEach(async () => {
      customer = await CustomerService.createCustomer({ ...mockCustomerData }, mockUser._id);
    });

    it('should update customer successfully', async () => {
      const updateData = {
        name: 'Jane Smith',
        phone: '+0987654321'
      };

      const result = await CustomerService.updateCustomer(customer._id.toString(), updateData, mockUser._id);

      expect(result).toBeDefined();
      expect(result.name).toBe(updateData.name);
      expect(result.phone).toBe(updateData.phone);
    });

    it('should reject invalid update data (bad email)', async () => {
      await expect(CustomerService.updateCustomer(customer._id.toString(), { email: 'invalid-email' }, mockUser._id))
        .rejects
        .toThrow();
    });

    it('should throw for a non-existent customer', async () => {
      await expect(CustomerService.updateCustomer(new mongoose.Types.ObjectId().toString(), { name: 'New Name' }, mockUser._id))
        .rejects
        .toThrow('Customer not found');
    });
  });

  describe('deleteCustomer', () => {
    let customer;

    beforeEach(async () => {
      customer = await CustomerService.createCustomer({ ...mockCustomerData }, mockUser._id);
    });

    it('should soft-delete customer successfully', async () => {
      const result = await CustomerService.deleteCustomer(customer._id.toString(), mockUser._id);

      expect(result).toBeDefined();
      expect(result.isActive).toBe(false);

      // Soft-deleted customers no longer appear in listings
      const list = await CustomerService.getAllCustomers({ page: 1, limit: 10 }, {}, mockUser._id);
      expect(list.data).toHaveLength(0);
    });

    it('should throw for a non-existent customer', async () => {
      await expect(CustomerService.deleteCustomer(new mongoose.Types.ObjectId().toString(), mockUser._id))
        .rejects
        .toThrow('Customer not found');
    });
  });

  describe('updateCredit', () => {
    let customer;

    beforeEach(async () => {
      customer = await CustomerService.createCustomer({ ...mockCustomerData }, mockUser._id);
    });

    it('should add to the customer\'s credit balance', async () => {
      const result = await CustomerService.updateCredit(customer._id.toString(), 500);
      expect(result).toBeDefined();
      expect(result.creditBalance).toBe(500);

      const again = await CustomerService.updateCredit(customer._id.toString(), 250);
      expect(again.creditBalance).toBe(750);
    });

    it('should throw for a non-existent customer', async () => {
      await expect(CustomerService.updateCredit(new mongoose.Types.ObjectId().toString(), 100))
        .rejects
        .toThrow('Customer not found');
    });
  });
});
