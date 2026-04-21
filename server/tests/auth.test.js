const request = require('supertest');
const express = require('express');
const User = require('../models/User');
const Staff = require('../models/Staff');
const authRoutes = require('../routes/authRoutes');
const { helmet, mongoSanitize, hpp, compression } = require('../config/security');

// Create test app
const createTestApp = () => {
  const app = express();
  app.use(express.json());
  app.use(helmet());
  app.use(mongoSanitize());
  app.use(hpp());
  app.use(compression());
  app.use('/api/auth', authRoutes);
  return app;
};

describe('Authentication Routes', () => {
  let app;

  beforeEach(() => {
    app = createTestApp();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'TestPass123!',
        name: 'Test User'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Registration successful');
      expect(response.body.user.email).toBe(userData.email);

      // Verify user was created in database
      const user = await User.findOne({ email: userData.email });
      expect(user).toBeTruthy();
      expect(user.isApproved).toBe(false);

      // Verify staff record was created
      const staff = await Staff.findOne({ email: userData.email });
      expect(staff).toBeTruthy();
      expect(staff.name).toBe(userData.name);
    });

    it('should reject registration with invalid email', async () => {
      const userData = {
        email: 'invalid-email',
        password: 'TestPass123!',
        name: 'Test User'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.error).toBe('Validation failed');
      expect(response.body.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            msg: 'Please provide a valid email address'
          })
        ])
      );
    });

    it('should reject registration with weak password', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'weak',
        name: 'Test User'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.error).toBe('Validation failed');
      expect(response.body.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            msg: expect.stringContaining('Password must')
          })
        ])
      );
    });

    it('should reject registration with existing email', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'TestPass123!',
        name: 'Test User'
      };

      // Create user first
      await request(app)
        .post('/api/auth/register')
        .send(userData);

      // Try to register again with same email
      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.error).toBe('Registration failed');
      expect(response.body.message).toBe('Email already registered');
    });
  });

  describe('POST /api/auth/login', () => {
    let testUser;

    beforeEach(async () => {
      // Create a test user
      testUser = new User({
        email: 'test@example.com',
        password: 'TestPass123!',
        isApproved: true,
        role: 'admin'
      });
      await testUser.save();
    });

    it('should login successfully with valid credentials', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'TestPass123!'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.accessToken).toBeTruthy();
      expect(response.body.refreshToken).toBeTruthy();
      expect(response.body.user.email).toBe(loginData.email);
    });

    it('should reject login with invalid email', async () => {
      const loginData = {
        email: 'nonexistent@example.com',
        password: 'TestPass123!'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body.error).toBe('Authentication failed');
      expect(response.body.message).toBe('Invalid credentials');
    });

    it('should reject login with invalid password', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'WrongPassword123!'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body.error).toBe('Authentication failed');
      expect(response.body.message).toBe('Invalid credentials');
    });

    it('should reject login for unapproved user', async () => {
      // Create unapproved user
      const unapprovedUser = new User({
        email: 'unapproved@example.com',
        password: 'TestPass123!',
        isApproved: false,
        role: 'user'
      });
      await unapprovedUser.save();

      const loginData = {
        email: 'unapproved@example.com',
        password: 'TestPass123!'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(403);

      expect(response.body.error).toBe('Account not approved');
      expect(response.body.pendingApproval).toBe(true);
    });

    it('should reject login with malformed email', async () => {
      const loginData = {
        email: 'invalid-email',
        password: 'TestPass123!'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(400);

      expect(response.body.error).toBe('Validation failed');
    });
  });
});