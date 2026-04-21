const User = require('../models/User');

describe('User Model', () => {
  let userData;

  beforeEach(() => {
    userData = {
      email: 'test@example.com',
      password: 'TestPass123!',
      firstName: 'Test',
      lastName: 'User',
      role: 'staff'
    };
  });

  afterEach(async () => {
    await User.deleteMany({});
  });

  describe('User Creation', () => {
    it('should create a user successfully with valid data', async () => {
      const user = new User(userData);
      const savedUser = await user.save();

      expect(savedUser._id).toBeDefined();
      expect(savedUser.email).toBe(userData.email);
      expect(savedUser.firstName).toBe(userData.firstName);
      expect(savedUser.lastName).toBe(userData.lastName);
      expect(savedUser.role).toBe(userData.role);
      expect(savedUser.isApproved).toBe(false);
      expect(savedUser.isActive).toBe(true);
    });

    it('should hash password before saving', async () => {
      const user = new User(userData);
      const savedUser = await user.save();

      expect(savedUser.password).not.toBe(userData.password);
      expect(savedUser.password).toMatch(/^\$2[ayb]\$.+/); // bcrypt hash format
    });

    it('should require email field', async () => {
      const user = new User({ ...userData, email: undefined });
      const err = await user.save().catch(err => err);

      expect(err.errors.email).toBeDefined();
      expect(err.errors.email.message).toBe('Path `email` is required.');
    });

    it('should require password field', async () => {
      const user = new User({ ...userData, password: undefined });
      const err = await user.save().catch(err => err);

      expect(err.errors.password).toBeDefined();
      expect(err.errors.password.message).toBe('Path `password` is required.');
    });

    it('should validate email format', async () => {
      const user = new User({ ...userData, email: 'invalid-email' });
      const err = await user.save().catch(err => err);

      expect(err.errors.email).toBeDefined();
    });

    it('should set default role to staff', async () => {
      const user = new User({ ...userData, role: undefined });
      const savedUser = await user.save();

      expect(savedUser.role).toBe('staff');
    });

    it('should set default permissions based on role', async () => {
      const user = new User({ ...userData, role: 'super_admin' });
      const savedUser = await user.save();

      expect(savedUser.permissions.dashboard).toBe(true);
      expect(savedUser.permissions.analytics).toBe(true);
      expect(savedUser.permissions.pos).toBe(true);
      expect(savedUser.permissions.platformManagement).toBe(true);
      expect(savedUser.permissions.tenantManagement).toBe(true);
    });
  });

  describe('Password Comparison', () => {
    it('should return true for correct password', async () => {
      const user = new User(userData);
      await user.save();

      const isMatch = await user.comparePassword('TestPass123!');
      expect(isMatch).toBe(true);
    });

    it('should return false for incorrect password', async () => {
      const user = new User(userData);
      await user.save();

      const isMatch = await user.comparePassword('WrongPassword123!');
      expect(isMatch).toBe(false);
    });
  });

  describe('Login Recording', () => {
    it('should record login successfully', async () => {
      const user = new User(userData);
      await user.save();

      const updatedUser = await user.recordLogin();
      expect(updatedUser.loginCount).toBe(1);
      expect(updatedUser.lastLogin).toBeDefined();
      expect(updatedUser.failedLoginAttempts).toBe(0);
    });

    it('should record failed login', async () => {
      const user = new User(userData);
      await user.save();

      const updatedUser = await user.recordFailedLogin();
      expect(updatedUser.failedLoginAttempts).toBe(1);
    });

    it('should lock account after 5 failed attempts', async () => {
      const user = new User(userData);
      await user.save();

      // Record 5 failed attempts
      for (let i = 0; i < 5; i++) {
        await user.recordFailedLogin();
      }

      const updatedUser = await User.findById(user._id);
      expect(updatedUser.isAccountLocked()).toBe(true);
    });
  });

  describe('Static Methods', () => {
    beforeEach(async () => {
      await User.create([
        { email: 'admin@example.com', password: 'Password123!', role: 'super_admin', isApproved: true },
        { email: 'business@example.com', password: 'Password123!', role: 'business_admin', isApproved: true, tenantId: 'tenant1' },
        { email: 'staff@example.com', password: 'Password123!', role: 'staff', isApproved: true, tenantId: 'tenant1' }
      ]);
    });

    it('should find user by email', async () => {
      const user = await User.findByEmail('admin@example.com');
      expect(user).toBeDefined();
      expect(user.email).toBe('admin@example.com');
    });

    it('should find users by role', async () => {
      const users = await User.findByRole('staff');
      expect(users).toHaveLength(1);
      expect(users[0].role).toBe('staff');
    });

    it('should find users by role and tenant', async () => {
      const users = await User.findByRole('staff', 'tenant1');
      expect(users).toHaveLength(1);
      expect(users[0].role).toBe('staff');
      expect(users[0].tenantId).toBe('tenant1');
    });

    it('should find super admins', async () => {
      const users = await User.findSuperAdmins();
      expect(users).toHaveLength(1);
      expect(users[0].role).toBe('super_admin');
    });

    it('should find business admins for tenant', async () => {
      const users = await User.findBusinessAdmins('tenant1');
      expect(users).toHaveLength(1);
      expect(users[0].role).toBe('business_admin');
      expect(users[0].tenantId).toBe('tenant1');
    });
  });
});