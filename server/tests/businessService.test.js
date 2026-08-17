/**
 * Business Service Tests
 * Tests business registration, approval, and profile management
 */

const mongoose = require('mongoose');
const BusinessService = require('../services/businessService');
const Business = require('../models/Business');
const User = require('../models/User');
const Tenant = require('../models/Tenant');

const validBusinessData = () => ({
  name: 'Test Business',
  category: 'retail',
  email: 'business@test.com',
  description: 'A test business',
  tagline: 'Testing',
  businessType: 'hybrid'
});

const validOwnerData = () => ({
  email: 'owner@test.com',
  password: 'Password123!',
  firstName: 'Test',
  lastName: 'Owner'
});

describe('BusinessService', () => {
  afterEach(async () => {
    await Business.deleteMany({});
    await User.deleteMany({});
    await Tenant.deleteMany({});
  });

  describe('registerBusiness', () => {
    it('should register a business successfully', async () => {
      const result = await BusinessService.registerBusiness(validBusinessData(), validOwnerData());

      expect(result.business.name).toBe('Test Business');
      expect(result.business.status).toBe('pending');
      expect(result.owner.email).toBe('owner@test.com');
      expect(result.owner.role).toBe('business_admin');
      expect(result.owner.isApproved).toBe(false);
      expect(result.tenant.tenantId).toBeDefined();

      // Business persisted with pending status
      const business = await Business.findById(result.business.id);
      expect(business).not.toBeNull();
      expect(business.status).toBe('pending');
      expect(business.slug).toBe('test-business');
      expect(business.userId.toString()).toBe(String(result.owner.id));

      // Owner linked to the business
      const owner = await User.findById(result.owner.id);
      expect(owner.businessId.toString()).toBe(String(result.business.id));
    });

    it('should reject duplicate business names', async () => {
      await BusinessService.registerBusiness(validBusinessData(), validOwnerData());

      await expect(
        BusinessService.registerBusiness(
          { ...validBusinessData(), email: 'other@test.com' },
          { ...validOwnerData(), email: 'other-owner@test.com' }
        )
      ).rejects.toThrow('Business name or URL already exists');
    });

    it('should validate required fields', async () => {
      await expect(
        BusinessService.registerBusiness({ name: 'Only Name' }, validOwnerData())
      ).rejects.toThrow('Missing required fields');
    });

    it('should validate email format', async () => {
      await expect(
        BusinessService.registerBusiness(
          { ...validBusinessData(), email: 'not-an-email' },
          validOwnerData()
        )
      ).rejects.toThrow('Invalid email format');
    });

    it('should validate business category', async () => {
      await expect(
        BusinessService.registerBusiness(
          { ...validBusinessData(), category: 'not-a-category' },
          validOwnerData()
        )
      ).rejects.toThrow('Invalid business category');
    });
  });

  describe('approveBusiness', () => {
    it('should approve a pending business and its owner', async () => {
      const { business, owner } = await BusinessService.registerBusiness(validBusinessData(), validOwnerData());

      const approved = await BusinessService.approveBusiness(business.id, new mongoose.Types.ObjectId());

      expect(approved.status).toBe('active');
      expect(approved.isPublic).toBe(true);

      const updatedOwner = await User.findById(owner.id);
      expect(updatedOwner.isApproved).toBe(true);
    });

    it('should return error for non-existent business', async () => {
      await expect(
        BusinessService.approveBusiness(new mongoose.Types.ObjectId(), new mongoose.Types.ObjectId())
      ).rejects.toThrow('Business not found');
    });

    it('should reject approval when business is not pending', async () => {
      const { business } = await BusinessService.registerBusiness(validBusinessData(), validOwnerData());
      await BusinessService.approveBusiness(business.id, new mongoose.Types.ObjectId());

      await expect(
        BusinessService.approveBusiness(business.id, new mongoose.Types.ObjectId())
      ).rejects.toThrow('Business is not pending approval');
    });
  });

  describe('rejectBusiness', () => {
    it('should reject a pending business and deactivate its owner', async () => {
      const { business, owner } = await BusinessService.registerBusiness(validBusinessData(), validOwnerData());

      const rejected = await BusinessService.rejectBusiness(business.id, new mongoose.Types.ObjectId(), 'Policy violation');

      expect(rejected.status).toBe('suspended');
      expect(rejected.isPublic).toBe(false);

      const updatedOwner = await User.findById(owner.id);
      expect(updatedOwner.isApproved).toBe(false);
      expect(updatedOwner.isActive).toBe(false);
    });

    it('should return error for non-existent business', async () => {
      await expect(
        BusinessService.rejectBusiness(new mongoose.Types.ObjectId(), new mongoose.Types.ObjectId(), 'nope')
      ).rejects.toThrow('Business not found');
    });
  });

  describe('getBusinessProfile', () => {
    it('should return a business by ID', async () => {
      const { business } = await BusinessService.registerBusiness(validBusinessData(), validOwnerData());

      const found = await BusinessService.getBusinessProfile(business.id);
      expect(found.name).toBe('Test Business');
    });

    it('should throw for non-existent business', async () => {
      await expect(
        BusinessService.getBusinessProfile(new mongoose.Types.ObjectId())
      ).rejects.toThrow('Business not found');
    });
  });

  describe('updateBusinessProfile', () => {
    it('should let the business owner update their business', async () => {
      const { business, owner } = await BusinessService.registerBusiness(validBusinessData(), validOwnerData());

      const updated = await BusinessService.updateBusinessProfile(business.id, { description: 'Updated description' }, owner.id);

      expect(updated.description).toBe('Updated description');
    });

    it('should let a super admin update any business', async () => {
      const { business } = await BusinessService.registerBusiness(validBusinessData(), validOwnerData());

      const superAdmin = await User.create({
        email: 'super@test.com',
        password: 'Password123!',
        firstName: 'Super',
        lastName: 'Admin',
        role: 'super_admin',
        isApproved: true,
        isActive: true
      });

      const updated = await BusinessService.updateBusinessProfile(business.id, { tagline: 'By super admin' }, superAdmin._id);
      expect(updated.tagline).toBe('By super admin');
    });

    it('should reject updates from unrelated users', async () => {
      const { business } = await BusinessService.registerBusiness(validBusinessData(), validOwnerData());

      const stranger = await User.create({
        email: 'stranger@test.com',
        password: 'Password123!',
        firstName: 'Some',
        lastName: 'Stranger',
        role: 'business_admin',
        isApproved: true,
        isActive: true
      });

      await expect(
        BusinessService.updateBusinessProfile(business.id, { name: 'Hacked' }, stranger._id)
      ).rejects.toThrow('Insufficient permissions');
    });

    it('should not update a non-existent business', async () => {
      const owner = await User.create({
        email: 'owner2@test.com',
        password: 'Password123!',
        firstName: 'Test',
        lastName: 'Owner',
        role: 'business_admin',
        isApproved: true,
        isActive: true
      });

      await expect(
        BusinessService.updateBusinessProfile(new mongoose.Types.ObjectId(), { name: 'X' }, owner._id)
      ).rejects.toThrow('Business not found');
    });
  });

  describe('getAllBusinesses', () => {
    it('should return all businesses with pagination', async () => {
      await BusinessService.registerBusiness(validBusinessData(), validOwnerData());
      await BusinessService.registerBusiness(
        { ...validBusinessData(), name: 'Second Business', slug: 'second-business', email: 'second@test.com' },
        { ...validOwnerData(), email: 'second-owner@test.com' }
      );

      const result = await BusinessService.getAllBusinesses({}, { page: 1, limit: 10 });

      expect(result.businesses.length).toBe(2);
      expect(result.pagination.total).toBe(2);
      expect(result.pagination.pages).toBe(1);
    });

    it('should filter businesses by status', async () => {
      const { business } = await BusinessService.registerBusiness(validBusinessData(), validOwnerData());
      await BusinessService.approveBusiness(business.id, new mongoose.Types.ObjectId());

      const pending = await BusinessService.getAllBusinesses({ status: 'pending' }, {});
      const active = await BusinessService.getAllBusinesses({ status: 'active' }, {});

      expect(pending.businesses.length).toBe(0);
      expect(active.businesses.length).toBe(1);
    });

    it('should search businesses by name', async () => {
      await BusinessService.registerBusiness(validBusinessData(), validOwnerData());
      await BusinessService.registerBusiness(
        { ...validBusinessData(), name: 'Acme Supplies', slug: 'acme-supplies', email: 'acme@test.com' },
        { ...validOwnerData(), email: 'acme-owner@test.com' }
      );

      const result = await BusinessService.getAllBusinesses({ search: 'acme' }, {});
      expect(result.businesses.length).toBe(1);
      expect(result.businesses[0].name).toBe('Acme Supplies');
    });
  });

  describe('getPublicBusinesses', () => {
    it('should only return active public businesses', async () => {
      const { business } = await BusinessService.registerBusiness(validBusinessData(), validOwnerData());
      await BusinessService.approveBusiness(business.id, new mongoose.Types.ObjectId());

      // Create a second business that stays pending (not public)
      await BusinessService.registerBusiness(
        { ...validBusinessData(), name: 'Hidden Store', slug: 'hidden-store', email: 'hidden@test.com' },
        { ...validOwnerData(), email: 'hidden-owner@test.com' }
      );

      const result = await BusinessService.getPublicBusinesses({}, {});
      expect(result.businesses.length).toBe(1);
      expect(result.businesses[0].name).toBe('Test Business');
    });

    it('should filter public businesses by category', async () => {
      const { business } = await BusinessService.registerBusiness(validBusinessData(), validOwnerData());
      await BusinessService.approveBusiness(business.id, new mongoose.Types.ObjectId());

      const matching = await BusinessService.getPublicBusinesses({ category: 'retail' }, {});
      const nonMatching = await BusinessService.getPublicBusinesses({ category: 'electronics' }, {});

      expect(matching.businesses.length).toBe(1);
      expect(nonMatching.businesses.length).toBe(0);
    });
  });

  describe('generateSlug', () => {
    it('should generate URL-friendly slugs', () => {
      expect(BusinessService.generateSlug('My Awesome Store!')).toBe('my-awesome-store');
      expect(BusinessService.generateSlug('  Multiple   Spaces  ')).toBe('multiple-spaces');
    });
  });
});
