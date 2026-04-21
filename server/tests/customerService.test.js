const CustomerService = require('../services/customerService');
const CustomerAccount = require('../models/CustomerAccount');
const User = require('../models/User');

describe('CustomerService', () => {
  let mockUser, mockCustomerData;

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

    // Mock customer data
    mockCustomerData = {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      phone: '+1234567890',
      type: 'credit',
      creditLimit: 1000,
      address: '123 Main St, New York, NY 10001',
      tenantId: 'tenant1',
      businessId: 'business1'
    };
  });

  afterEach(async () => {
    await CustomerAccount.deleteMany({});
    await User.deleteMany({});
  });

  describe('createCustomer', () => {
    it('should create a customer successfully', async () => {
      const result = await CustomerService.createCustomer(mockCustomerData, mockUser);

      expect(result).toBeDefined();
      expect(result.firstName).toBe(mockCustomerData.firstName);
      expect(result.lastName).toBe(mockCustomerData.lastName);
      expect(result.email).toBe(mockCustomerData.email);
      expect(result.phone).toBe(mockCustomerData.phone);
      expect(result.type).toBe(mockCustomerData.type);
      expect(result.creditLimit).toBe(mockCustomerData.creditLimit);
      expect(result.tenantId).toBe(mockCustomerData.tenantId);
      expect(result.businessId).toBe(mockCustomerData.businessId);
    });

    it('should validate required fields', async () => {
      const invalidCustomerData = {
        firstName: '', // Invalid: empty first name
        lastName: 'Doe',
        email: 'john.doe@example.com'
      };

      await expect(CustomerService.createCustomer(invalidCustomerData, mockUser))
        .rejects
        .toThrow();
    });

    it('should validate email format', async () => {
      const invalidCustomerData = {
        ...mockCustomerData,
        email: 'invalid-email' // Invalid email format
      };

      await expect(CustomerService.createCustomer(invalidCustomerData, mockUser))
        .rejects
        .toThrow();
    });

    it('should validate credit limit is non-negative', async () => {
      const invalidCustomerData = {
        ...mockCustomerData,
        creditLimit: -100 // Invalid: negative credit limit
      };

      await expect(CustomerService.createCustomer(invalidCustomerData, mockUser))
        .rejects
        .toThrow();
    });

    it('should not allow duplicate emails', async () => {
      // Create first customer
      await CustomerService.createCustomer(mockCustomerData, mockUser);

      // Try to create another customer with same email
      await expect(CustomerService.createCustomer(mockCustomerData, mockUser))
        .rejects
        .toThrow();
    });
  });

  describe('getCustomerById', () => {
    let customer;

    beforeEach(async () => {
      customer = await CustomerService.createCustomer(mockCustomerData, mockUser);
    });

    it('should return customer by ID', async () => {
      const result = await CustomerService.getCustomerById(customer._id.toString());

      expect(result).toBeDefined();
      expect(result._id.toString()).toBe(customer._id.toString());
      expect(result.firstName).toBe(mockCustomerData.firstName);
    });

    it('should return null for non-existent customer', async () => {
      const result = await CustomerService.getCustomerById('507f1f77bcf86cd799439011');

      expect(result).toBeNull();
    });
  });

  describe('updateCustomer', () => {
    let customer;

    beforeEach(async () => {
      customer = await CustomerService.createCustomer(mockCustomerData, mockUser);
    });

    it('should update customer successfully', async () => {
      const updateData = {
        firstName: 'Jane',
        lastName: 'Smith',
        phone: '+0987654321',
        creditLimit: 1500
      };

      const result = await CustomerService.updateCustomer(customer._id.toString(), updateData, mockUser);

      expect(result).toBeDefined();
      expect(result.firstName).toBe(updateData.firstName);
      expect(result.lastName).toBe(updateData.lastName);
      expect(result.phone).toBe(updateData.phone);
      expect(result.creditLimit).toBe(updateData.creditLimit);
    });

    it('should validate update data', async () => {
      const invalidUpdateData = {
        firstName: '', // Invalid: empty first name
        email: 'invalid-email' // Invalid email format
      };

      await expect(CustomerService.updateCustomer(customer._id.toString(), invalidUpdateData, mockUser))
        .rejects
        .toThrow();
    });

    it('should not update non-existent customer', async () => {
      await expect(CustomerService.updateCustomer('507f1f77bcf86cd799439011', { firstName: 'New Name' }, mockUser))
        .rejects
        .toThrow();
    });
  });

  describe('deleteCustomer', () => {
    let customer;

    beforeEach(async () => {
      customer = await CustomerService.createCustomer(mockCustomerData, mockUser);
    });

    it('should delete customer successfully', async () => {
      const result = await CustomerService.deleteCustomer(customer._id.toString(), mockUser);

      expect(result).toBe(true);

      // Verify customer no longer exists
      const deletedCustomer = await CustomerService.getCustomerById(customer._id.toString());
      expect(deletedCustomer).toBeNull();
    });

    it('should return false for non-existent customer', async () => {
      const result = await CustomerService.deleteCustomer('507f1f77bcf86cd799439011', mockUser);

      expect(result).toBe(false);
    });
  });

  describe('getCustomers', () => {
    beforeEach(async () => {
      // Create multiple customers
      await CustomerService.createCustomer(mockCustomerData, mockUser);
      await CustomerService.createCustomer({
        ...mockCustomerData,
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane.smith@example.com'
      }, mockUser);
    });

    it('should return all customers for business', async () => {
      const result = await CustomerService.getCustomers(mockUser);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(2);
      expect(result[0].businessId.toString()).toBe(mockUser.businessId.toString());
    });

    it('should filter customers by type', async () => {
      const result = await CustomerService.getCustomers(mockUser, { type: 'credit' });

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(2); // Both customers are of type 'credit'
    });

    it('should filter customers by name', async () => {
      const result = await CustomerService.getCustomers(mockUser, { search: 'Jane' });

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(1);
      expect(result[0].firstName).toContain('Jane');
    });

    it('should paginate results', async () => {
      const result = await CustomerService.getCustomers(mockUser, {}, { page: 1, limit: 1 });

      expect(result).toBeDefined();
      expect(result.customers).toHaveLength(1);
      expect(result.pagination).toBeDefined();
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(1);
      expect(result.pagination.total).toBeGreaterThanOrEqual(2);
    });
  });

  describe('updateCustomerCredit', () => {
    let customer;

    beforeEach(async () => {
      customer = await CustomerService.createCustomer(mockCustomerData, mockUser);
    });

    it('should update customer credit successfully', async () => {
      const newCreditLimit = 2000;
      const result = await CustomerService.updateCustomerCredit(customer._id.toString(), newCreditLimit, mockUser);

      expect(result).toBeDefined();
      expect(result.creditLimit).toBe(newCreditLimit);
    });

    it('should validate credit limit value', async () => {
      await expect(CustomerService.updateCustomerCredit(customer._id.toString(), -100, mockUser))
        .rejects
        .toThrow();
    });
  });

  describe('searchCustomers', () => {
    beforeEach(async () => {
      // Create multiple customers
      await CustomerService.createCustomer(mockCustomerData, mockUser);
      await CustomerService.createCustomer({
        ...mockCustomerData,
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane.smith@example.com'
      }, mockUser);
      await CustomerService.createCustomer({
        ...mockCustomerData,
        firstName: 'Bob',
        lastName: 'Johnson',
        email: 'bob.johnson@example.com'
      }, mockUser);
    });

    it('should search customers by name', async () => {
      const result = await CustomerService.searchCustomers('Jane', mockUser);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(1);
      expect(result[0].firstName).toBe('Jane');
    });

    it('should search customers by email', async () => {
      const result = await CustomerService.searchCustomers('bob.johnson@example.com', mockUser);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(1);
      expect(result[0].email).toBe('bob.johnson@example.com');
    });

    it('should return empty array for non-existent search', async () => {
      const result = await CustomerService.searchCustomers('nonexistent', mockUser);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(0);
    });
  });
});