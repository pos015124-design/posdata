const BusinessService = require('../services/businessService');
const Business = require('../models/Business');
const User = require('../models/User');

describe('BusinessService', () => {
  let mockSuperAdmin, mockBusinessData;

  beforeEach(async () => {
    // Create a mock super admin user
    mockSuperAdmin = new User({
      email: 'superadmin@example.com',
      password: 'Password123!',
      role: 'super_admin',
      isApproved: true
    });
    await mockSuperAdmin.save();

    // Mock business data
    mockBusinessData = {
      name: 'Test Business',
      email: 'business@example.com',
      phone: '+1234567890',
      category: 'retail',
      businessType: 'physical',
      description: 'A test business',
      address: {
        street: '123 Main St',
        city: 'New York',
        state: 'NY',
        zipCode: '10001',
        country: 'US'
      },
      owner: {
        firstName: 'Business',
        lastName: 'Owner',
        email: 'owner@example.com',
        password: 'Password123!'
      },
      settings: {
        taxRate: 0.1,
        currency: 'USD',
        timezone: 'UTC'
      }
    };
  });

  afterEach(async () => {
    await Business.deleteMany({});
    await User.deleteMany({});
  });

  describe('createBusiness', () => {
    it('should create a business successfully', async () => {
      const result = await BusinessService.createBusiness(mockBusinessData);

      expect(result).toBeDefined();
      expect(result.name).toBe(mockBusinessData.name);
      expect(result.email).toBe(mockBusinessData.email);
      expect(result.category).toBe(mockBusinessData.category);
      expect(result.isApproved).toBe(false); // New businesses should not be approved initially
      expect(result.tenantId).toBeDefined();
      expect(result.ecommerce).toBeDefined();
      expect(result.analytics).toBeDefined();
    });

    it('should validate required fields', async () => {
      const invalidBusinessData = {
        name: '', // Invalid: empty name
        email: 'business@example.com'
      };

      await expect(BusinessService.createBusiness(invalidBusinessData))
        .rejects
        .toThrow();
    });

    it('should validate email format', async () => {
      const invalidBusinessData = {
        ...mockBusinessData,
        email: 'invalid-email' // Invalid email format
      };

      await expect(BusinessService.createBusiness(invalidBusinessData))
        .rejects
        .toThrow();
    });

    it('should validate business category', async () => {
      const invalidBusinessData = {
        ...mockBusinessData,
        category: 'invalid-category' // Invalid category
      };

      await expect(BusinessService.createBusiness(invalidBusinessData))
        .rejects
        .toThrow();
    });
  });

  describe('getBusinessById', () => {
    let business;

    beforeEach(async () => {
      business = await BusinessService.createBusiness(mockBusinessData);
    });

    it('should return business by ID', async () => {
      const result = await BusinessService.getBusinessById(business._id.toString());

      expect(result).toBeDefined();
      expect(result._id.toString()).toBe(business._id.toString());
      expect(result.name).toBe(mockBusinessData.name);
    });

    it('should return null for non-existent business', async () => {
      const result = await BusinessService.getBusinessById('507f1f77bcf86cd799439011');

      expect(result).toBeNull();
    });
  });

  describe('updateBusiness', () => {
    let business;

    beforeEach(async () => {
      business = await BusinessService.createBusiness(mockBusinessData);
    });

    it('should update business successfully', async () => {
      const updateData = {
        name: 'Updated Business Name',
        phone: '+0987654321',
        description: 'Updated description'
      };

      const result = await BusinessService.updateBusiness(business._id.toString(), updateData, mockSuperAdmin);

      expect(result).toBeDefined();
      expect(result.name).toBe(updateData.name);
      expect(result.phone).toBe(updateData.phone);
      expect(result.description).toBe(updateData.description);
    });

    it('should validate update data', async () => {
      const invalidUpdateData = {
        name: '', // Invalid: empty name
        email: 'invalid-email' // Invalid email format
      };

      await expect(BusinessService.updateBusiness(business._id.toString(), invalidUpdateData, mockSuperAdmin))
        .rejects
        .toThrow();
    });

    it('should not update non-existent business', async () => {
      await expect(BusinessService.updateBusiness('507f1f77bcf86cd799439011', { name: 'New Name' }, mockSuperAdmin))
        .rejects
        .toThrow();
    });
  });

  describe('deleteBusiness', () => {
    let business;

    beforeEach(async () => {
      business = await BusinessService.createBusiness(mockBusinessData);
    });

    it('should delete business successfully', async () => {
      const result = await BusinessService.deleteBusiness(business._id.toString(), mockSuperAdmin);

      expect(result).toBe(true);

      // Verify business no longer exists
      const deletedBusiness = await BusinessService.getBusinessById(business._id.toString());
      expect(deletedBusiness).toBeNull();
    });

    it('should return false for non-existent business', async () => {
      const result = await BusinessService.deleteBusiness('507f1f77bcf86cd799439011', mockSuperAdmin);

      expect(result).toBe(false);
    });
  });

  describe('getBusinesses', () => {
    beforeEach(async () => {
      // Create multiple businesses
      await BusinessService.createBusiness(mockBusinessData);
      await BusinessService.createBusiness({
        ...mockBusinessData,
        name: 'Second Business',
        email: 'second@example.com'
      });
    });

    it('should return all businesses', async () => {
      const result = await BusinessService.getBusinesses();

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(2);
    });

    it('should filter businesses by category', async () => {
      const result = await BusinessService.getBusinesses({ category: 'retail' });

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(2); // Both businesses are in 'retail' category
    });

    it('should filter businesses by name', async () => {
      const result = await BusinessService.getBusinesses({ search: 'Second' });

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(1);
      expect(result[0].name).toContain('Second');
    });

    it('should paginate results', async () => {
      const result = await BusinessService.getBusinesses({}, { page: 1, limit: 1 });

      expect(result).toBeDefined();
      expect(result.businesses).toHaveLength(1);
      expect(result.pagination).toBeDefined();
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(1);
      expect(result.pagination.total).toBe(2);
    });
  });

  describe('approveBusiness', () => {
    let business;

    beforeEach(async () => {
      business = await BusinessService.createBusiness(mockBusinessData);
      expect(business.isApproved).toBe(false); // Should be false initially
    });

    it('should approve business successfully', async () => {
      const result = await BusinessService.approveBusiness(business._id.toString(), mockSuperAdmin);

      expect(result).toBeDefined();
      expect(result._id.toString()).toBe(business._id.toString());
      expect(result.isApproved).toBe(true);
    });

    it('should return error for non-existent business', async () => {
      await expect(BusinessService.approveBusiness('507f1f77bcf86cd799439011', mockSuperAdmin))
        .rejects
        .toThrow();
    });
  });

  describe('rejectBusiness', () => {
    let business;

    beforeEach(async () => {
      business = await BusinessService.createBusiness(mockBusinessData);
      expect(business.isApproved).toBe(false); // Should be false initially
    });

    it('should reject business successfully', async () => {
      const reason = 'Does not meet requirements';
      const result = await BusinessService.rejectBusiness(business._id.toString(), reason, mockSuperAdmin);

      expect(result).toBeDefined();
      expect(result._id.toString()).toBe(business._id.toString());
      expect(result.isApproved).toBe(false);
      expect(result.rejectionReason).toBe(reason);
    });

    it('should return error for non-existent business', async () => {
      await expect(BusinessService.rejectBusiness('507f1f77bcf86cd799439011', 'Reason', mockSuperAdmin))
        .rejects
        .toThrow();
    });
  });

  describe('getPublicBusinesses', () => {
    beforeEach(async () => {
      // Create multiple businesses with different approval status
      await BusinessService.createBusiness(mockBusinessData); // Not approved
      
      const approvedBusinessData = {
        ...mockBusinessData,
        name: 'Approved Business',
        email: 'approved@example.com'
      };
      const approvedBusiness = await BusinessService.createBusiness(approvedBusinessData);
      approvedBusiness.isApproved = true;
      await approvedBusiness.save();
    });

    it('should return only approved businesses', async () => {
      // First approve the first business
      await BusinessService.approveBusiness(
        (await Business.findOne({ name: mockBusinessData.name }))._id.toString(), 
        mockSuperAdmin
      );

      const result = await BusinessService.getPublicBusinesses();

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(2); // Both businesses are now approved
    });

    it('should filter public businesses by category', async () => {
      // Approve the first business
      await BusinessService.approveBusiness(
        (await Business.findOne({ name: mockBusinessData.name }))._id.toString(), 
        mockSuperAdmin
      );

      const result = await BusinessService.getPublicBusinesses({ category: 'retail' });

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(2); // Both businesses are in 'retail' category
    });

    it('should filter public businesses by search', async () => {
      // Approve the first business
      await BusinessService.approveBusiness(
        (await Business.findOne({ name: mockBusinessData.name }))._id.toString(), 
        mockSuperAdmin
      );

      const result = await BusinessService.getPublicBusinesses({ search: 'Approved' });

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(1);
      expect(result[0].name).toContain('Approved');
    });
  });

  describe('getBusinessAnalytics', () => {
    let business;

    beforeEach(async () => {
      business = await BusinessService.createBusiness(mockBusinessData);
    });

    it('should return business analytics', async () => {
      const result = await BusinessService.getBusinessAnalytics(business._id.toString());

      expect(result).toBeDefined();
      expect(result.businessId).toBe(business._id.toString());
      expect(result.registrationDate).toBeDefined();
      expect(result.status).toBe('pending'); // Since business is not approved yet
      expect(result.tenantId).toBe(business.tenantId);
    });

    it('should return error for non-existent business', async () => {
      await expect(BusinessService.getBusinessAnalytics('507f1f77bcf86cd799439011'))
        .rejects
        .toThrow();
    });
  });

  describe('updateBusinessSettings', () => {
    let business;

    beforeEach(async () => {
      business = await BusinessService.createBusiness(mockBusinessData);
    });

    it('should update business settings successfully', async () => {
      const newSettings = {
        taxRate: 0.15,
        currency: 'EUR',
        timezone: 'Europe/Berlin'
      };

      const result = await BusinessService.updateBusinessSettings(business._id.toString(), newSettings, mockSuperAdmin);

      expect(result).toBeDefined();
      expect(result._id.toString()).toBe(business._id.toString());
      expect(result.settings.taxRate).toBe(newSettings.taxRate);
      expect(result.settings.currency).toBe(newSettings.currency);
      expect(result.settings.timezone).toBe(newSettings.timezone);
    });

    it('should validate settings data', async () => {
      const invalidSettings = {
        taxRate: -0.1, // Invalid: negative tax rate
        currency: 'INVALID' // Invalid currency
      };

      await expect(BusinessService.updateBusinessSettings(business._id.toString(), invalidSettings, mockSuperAdmin))
        .rejects
        .toThrow();
    });
  });

  describe('getBusinessByTenantId', () => {
    let business;

    beforeEach(async () => {
      business = await BusinessService.createBusiness(mockBusinessData);
    });

    it('should return business by tenant ID', async () => {
      const result = await BusinessService.getBusinessByTenantId(business.tenantId);

      expect(result).toBeDefined();
      expect(result._id.toString()).toBe(business._id.toString());
      expect(result.tenantId).toBe(business.tenantId);
    });

    it('should return null for non-existent tenant ID', async () => {
      const result = await BusinessService.getBusinessByTenantId('non-existent-tenant-id');

      expect(result).toBeNull();
    });
  });
});