const StaffService = require('../services/staffService');
const Staff = require('../models/Staff');
const User = require('../models/User');
const Business = require('../models/Business');

describe('StaffService', () => {
  let mockBusinessAdmin, mockBusiness, mockStaffData;

  beforeEach(async () => {
    // Create a mock business
    mockBusiness = new Business({
      name: 'Test Business',
      email: 'business@example.com',
      isApproved: true,
      tenantId: 'tenant1'
    });
    await mockBusiness.save();

    // Create a mock business admin user
    mockBusinessAdmin = new User({
      email: 'admin@example.com',
      password: 'Password123!',
      role: 'business_admin',
      tenantId: 'tenant1',
      businessId: mockBusiness._id,
      isApproved: true
    });
    await mockBusinessAdmin.save();

    // Mock staff data
    mockStaffData = {
      name: 'John Doe',
      email: 'john.doe@example.com',
      phone: '+1234567890',
      role: 'Manager',
      permissions: {
        dashboard: true,
        pos: true,
        inventory: true,
        customers: true,
        staff: true,
        reports: true,
        settings: true
      },
      businessId: mockBusiness._id,
      tenantId: 'tenant1'
    };
  });

  afterEach(async () => {
    await Staff.deleteMany({});
    await User.deleteMany({});
    await Business.deleteMany({});
  });

  describe('createStaff', () => {
    it('should create a staff member successfully', async () => {
      const result = await StaffService.createStaff(mockStaffData, mockBusinessAdmin);

      expect(result).toBeDefined();
      expect(result.name).toBe(mockStaffData.name);
      expect(result.email).toBe(mockStaffData.email);
      expect(result.role).toBe(mockStaffData.role);
      expect(result.businessId.toString()).toBe(mockBusiness._id.toString());
      expect(result.tenantId).toBe(mockStaffData.tenantId);
      expect(result.user).toBeDefined(); // Should create a user account
    });

    it('should validate required fields', async () => {
      const invalidStaffData = {
        name: '', // Invalid: empty name
        email: 'john.doe@example.com'
      };

      await expect(StaffService.createStaff(invalidStaffData, mockBusinessAdmin))
        .rejects
        .toThrow();
    });

    it('should validate email format', async () => {
      const invalidStaffData = {
        ...mockStaffData,
        email: 'invalid-email' // Invalid email format
      };

      await expect(StaffService.createStaff(invalidStaffData, mockBusinessAdmin))
        .rejects
        .toThrow();
    });

    it('should validate role', async () => {
      const invalidStaffData = {
        ...mockStaffData,
        role: 'invalid-role' // Invalid role
      };

      await expect(StaffService.createStaff(invalidStaffData, mockBusinessAdmin))
        .rejects
        .toThrow();
    });

    it('should not allow duplicate emails', async () => {
      // Create first staff member
      await StaffService.createStaff(mockStaffData, mockBusinessAdmin);

      // Try to create another staff with same email
      await expect(StaffService.createStaff(mockStaffData, mockBusinessAdmin))
        .rejects
        .toThrow();
    });
  });

  describe('getStaffById', () => {
    let staff;

    beforeEach(async () => {
      staff = await StaffService.createStaff(mockStaffData, mockBusinessAdmin);
    });

    it('should return staff by ID', async () => {
      const result = await StaffService.getStaffById(staff._id.toString());

      expect(result).toBeDefined();
      expect(result._id.toString()).toBe(staff._id.toString());
      expect(result.name).toBe(mockStaffData.name);
    });

    it('should return null for non-existent staff', async () => {
      const result = await StaffService.getStaffById('507f1f77bcf86cd799439011');

      expect(result).toBeNull();
    });
  });

  describe('updateStaff', () => {
    let staff;

    beforeEach(async () => {
      staff = await StaffService.createStaff(mockStaffData, mockBusinessAdmin);
    });

    it('should update staff successfully', async () => {
      const updateData = {
        name: 'Jane Smith',
        phone: '+0987654321',
        role: 'Sales Clerk'
      };

      const result = await StaffService.updateStaff(staff._id.toString(), updateData, mockBusinessAdmin);

      expect(result).toBeDefined();
      expect(result.name).toBe(updateData.name);
      expect(result.phone).toBe(updateData.phone);
      expect(result.role).toBe(updateData.role);
    });

    it('should update staff permissions', async () => {
      const updateData = {
        permissions: {
          dashboard: true,
          pos: false,
          inventory: true,
          customers: false,
          staff: true,
          reports: false,
          settings: true
        }
      };

      const result = await StaffService.updateStaff(staff._id.toString(), updateData, mockBusinessAdmin);

      expect(result).toBeDefined();
      expect(result.permissions.dashboard).toBe(updateData.permissions.dashboard);
      expect(result.permissions.pos).toBe(updateData.permissions.pos);
      expect(result.permissions.inventory).toBe(updateData.permissions.inventory);
      expect(result.permissions.customers).toBe(updateData.permissions.customers);
      expect(result.permissions.staff).toBe(updateData.permissions.staff);
      expect(result.permissions.reports).toBe(updateData.permissions.reports);
      expect(result.permissions.settings).toBe(updateData.permissions.settings);
    });

    it('should validate update data', async () => {
      const invalidUpdateData = {
        name: '', // Invalid: empty name
        email: 'invalid-email' // Invalid email format
      };

      await expect(StaffService.updateStaff(staff._id.toString(), invalidUpdateData, mockBusinessAdmin))
        .rejects
        .toThrow();
    });

    it('should not update non-existent staff', async () => {
      await expect(StaffService.updateStaff('507f1f77bcf86cd799439011', { name: 'New Name' }, mockBusinessAdmin))
        .rejects
        .toThrow();
    });
  });

  describe('deleteStaff', () => {
    let staff;

    beforeEach(async () => {
      staff = await StaffService.createStaff(mockStaffData, mockBusinessAdmin);
    });

    it('should delete staff successfully', async () => {
      const result = await StaffService.deleteStaff(staff._id.toString(), mockBusinessAdmin);

      expect(result).toBe(true);

      // Verify staff no longer exists
      const deletedStaff = await StaffService.getStaffById(staff._id.toString());
      expect(deletedStaff).toBeNull();
    });

    it('should return false for non-existent staff', async () => {
      const result = await StaffService.deleteStaff('507f1f77bcf86cd799439011', mockBusinessAdmin);

      expect(result).toBe(false);
    });
  });

  describe('getStaffByBusiness', () => {
    beforeEach(async () => {
      // Create multiple staff members
      await StaffService.createStaff(mockStaffData, mockBusinessAdmin);
      await StaffService.createStaff({
        ...mockStaffData,
        name: 'Jane Smith',
        email: 'jane.smith@example.com',
        role: 'Sales Clerk'
      }, mockBusinessAdmin);
    });

    it('should return all staff for business', async () => {
      const result = await StaffService.getStaffByBusiness(mockBusiness._id.toString(), mockBusinessAdmin);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(2);
      expect(result[0].businessId.toString()).toBe(mockBusiness._id.toString());
    });

    it('should filter staff by role', async () => {
      const result = await StaffService.getStaffByBusiness(mockBusiness._id.toString(), mockBusinessAdmin, { role: 'Manager' });

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(1);
      expect(result[0].role).toBe('Manager');
    });

    it('should filter staff by name', async () => {
      const result = await StaffService.getStaffByBusiness(mockBusiness._id.toString(), mockBusinessAdmin, { search: 'Jane' });

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(1);
      expect(result[0].name).toContain('Jane');
    });

    it('should paginate results', async () => {
      const result = await StaffService.getStaffByBusiness(mockBusiness._id.toString(), mockBusinessAdmin, {}, { page: 1, limit: 1 });

      expect(result).toBeDefined();
      expect(result.staff).toHaveLength(1);
      expect(result.pagination).toBeDefined();
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(1);
      expect(result.pagination.total).toBe(2);
    });
  });

  describe('updateStaffPermissions', () => {
    let staff;

    beforeEach(async () => {
      staff = await StaffService.createStaff(mockStaffData, mockBusinessAdmin);
    });

    it('should update staff permissions successfully', async () => {
      const newPermissions = {
        dashboard: false,
        pos: true,
        inventory: false,
        customers: true,
        staff: false,
        reports: true,
        settings: false
      };

      const result = await StaffService.updateStaffPermissions(staff._id.toString(), newPermissions, mockBusinessAdmin);

      expect(result).toBeDefined();
      expect(result._id.toString()).toBe(staff._id.toString());
      expect(result.permissions.dashboard).toBe(newPermissions.dashboard);
      expect(result.permissions.pos).toBe(newPermissions.pos);
      expect(result.permissions.inventory).toBe(newPermissions.inventory);
      expect(result.permissions.customers).toBe(newPermissions.customers);
      expect(result.permissions.staff).toBe(newPermissions.staff);
      expect(result.permissions.reports).toBe(newPermissions.reports);
      expect(result.permissions.settings).toBe(newPermissions.settings);
    });

    it('should validate permissions object', async () => {
      const invalidPermissions = {
        invalidPermission: true // Invalid permission
      };

      await expect(StaffService.updateStaffPermissions(staff._id.toString(), invalidPermissions, mockBusinessAdmin))
        .rejects
        .toThrow();
    });
  });

  describe('approveStaff', () => {
    let staff;

    beforeEach(async () => {
      // Create unapproved staff
      const unapprovedStaffData = {
        ...mockStaffData,
        name: 'Unapproved Staff',
        email: 'unapproved@example.com'
      };
      staff = await StaffService.createStaff(unapprovedStaffData, mockBusinessAdmin);
      
      // Set isApproved to false to simulate unapproved staff
      staff.user.isApproved = false;
      await staff.user.save();
    });

    it('should approve staff successfully', async () => {
      const result = await StaffService.approveStaff(staff._id.toString(), mockBusinessAdmin);

      expect(result).toBeDefined();
      expect(result._id.toString()).toBe(staff._id.toString());
      expect(result.user.isApproved).toBe(true);
    });

    it('should return error for non-existent staff', async () => {
      await expect(StaffService.approveStaff('507f1f77bcf86cd799439011', mockBusinessAdmin))
        .rejects
        .toThrow();
    });
  });

  describe('getStaffAnalytics', () => {
    beforeEach(async () => {
      // Create multiple staff members
      await StaffService.createStaff(mockStaffData, mockBusinessAdmin);
      await StaffService.createStaff({
        ...mockStaffData,
        name: 'Jane Smith',
        email: 'jane.smith@example.com',
        role: 'Sales Clerk'
      }, mockBusinessAdmin);
    });

    it('should return staff analytics', async () => {
      const result = await StaffService.getStaffAnalytics(mockBusiness._id.toString());

      expect(result).toBeDefined();
      expect(result.totalStaff).toBe(2);
      expect(result.byRole).toBeDefined();
      expect(result.byRole.Manager).toBe(1);
      expect(result.byRole['Sales Clerk']).toBe(1);
      expect(result.activeStaff).toBe(2); // Assuming all staff are active
    });

    it('should return analytics for non-existent business', async () => {
      const result = await StaffService.getStaffAnalytics('507f1f77bcf86cd799439011');

      expect(result).toBeDefined();
      expect(result.totalStaff).toBe(0);
      expect(result.byRole).toBeDefined();
    });
  });

  describe('searchStaff', () => {
    beforeEach(async () => {
      // Create multiple staff members
      await StaffService.createStaff(mockStaffData, mockBusinessAdmin);
      await StaffService.createStaff({
        ...mockStaffData,
        name: 'Jane Smith',
        email: 'jane.smith@example.com'
      }, mockBusinessAdmin);
      await StaffService.createStaff({
        ...mockStaffData,
        name: 'Bob Johnson',
        email: 'bob.johnson@example.com'
      }, mockBusinessAdmin);
    });

    it('should search staff by name', async () => {
      const result = await StaffService.searchStaff('Jane', mockBusiness._id.toString(), mockBusinessAdmin);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Jane Smith');
    });

    it('should search staff by email', async () => {
      const result = await StaffService.searchStaff('bob.johnson@example.com', mockBusiness._id.toString(), mockBusinessAdmin);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(1);
      expect(result[0].email).toBe('bob.johnson@example.com');
    });

    it('should return empty array for non-existent search', async () => {
      const result = await StaffService.searchStaff('nonexistent', mockBusiness._id.toString(), mockBusinessAdmin);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(0);
    });
  });

  describe('updateStaffRole', () => {
    let staff;

    beforeEach(async () => {
      staff = await StaffService.createStaff(mockStaffData, mockBusinessAdmin);
    });

    it('should update staff role successfully', async () => {
      const newRole = 'Sales Clerk';
      const result = await StaffService.updateStaffRole(staff._id.toString(), newRole, mockBusinessAdmin);

      expect(result).toBeDefined();
      expect(result._id.toString()).toBe(staff._id.toString());
      expect(result.role).toBe(newRole);
    });

    it('should validate role', async () => {
      await expect(StaffService.updateStaffRole(staff._id.toString(), 'invalid-role', mockBusinessAdmin))
        .rejects
        .toThrow();
    });
  });
});