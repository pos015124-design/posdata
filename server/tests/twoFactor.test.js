const request = require('supertest');
const express = require('express');
const User = require('../models/User');
const authRoutes = require('../routes/authRoutes');
const { helmet, mongoSanitize, hpp, compression } = require('../config/security');
const { authenticator } = require('otplib');

// Create test app (mirrors auth.test.js)
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

describe('Two-Factor Authentication (TOTP)', () => {
  let app;
  let adminToken;

  const createUser = async (overrides = {}) => {
    const user = new User({
      email: 'admin@example.com',
      password: 'TestPass123!',
      isApproved: true,
      role: 'super_admin',
      ...overrides
    });
    await user.save();
    return user;
  };

  const login = async (email = 'admin@example.com', password = 'TestPass123!') => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email, password });
    return res;
  };

  beforeEach(async () => {
    app = createTestApp();
    const user = await createUser();
    const res = await login();
    adminToken = res.body.accessToken;
  });

  describe('GET /api/auth/2fa/status', () => {
    it('returns disabled by default', async () => {
      const res = await request(app)
        .get('/api/auth/2fa/status')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.twoFactorEnabled).toBe(false);
    });

    it('rejects unauthenticated requests', async () => {
      await request(app)
        .get('/api/auth/2fa/status')
        .expect(401);
    });
  });

  describe('POST /api/auth/2fa/setup', () => {
    it('returns a base32 secret and a QR code data URL', async () => {
      const res = await request(app)
        .post('/api/auth/2fa/setup')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.secret).toMatch(/^[A-Z2-7]+$/); // base32 alphabet
      expect(res.body.qrCode).toMatch(/^data:image\/png;base64,/);
      expect(res.body.otpauthUrl).toContain('otpauth://totp/');
    });

    it('denies staff accounts', async () => {
      const staff = await createUser({ email: 'staff@example.com', role: 'staff' });
      const staffLogin = await login('staff@example.com');
      const staffToken = staffLogin.body.accessToken;
      expect(staff).toBeTruthy();

      const res = await request(app)
        .post('/api/auth/2fa/setup')
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(403);

      expect(res.body.message).toContain('admin accounts');
    });

    it('rejects setup when already enabled', async () => {
      const user = await User.findOne({ email: 'admin@example.com' });
      user.twoFactorEnabled = true;
      user.twoFactorSecret = authenticator.generateSecret();
      await user.save();

      const res = await request(app)
        .post('/api/auth/2fa/setup')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);

      expect(res.body.message).toContain('already enabled');
    });
  });

  describe('POST /api/auth/2fa/enable', () => {
    let secret;

    beforeEach(async () => {
      const res = await request(app)
        .post('/api/auth/2fa/setup')
        .set('Authorization', `Bearer ${adminToken}`);
      secret = res.body.secret;
    });

    it('enables 2FA with a valid code and password', async () => {
      const token = authenticator.generate(secret);

      const res = await request(app)
        .post('/api/auth/2fa/enable')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ code: token, password: 'TestPass123!' })
        .expect(200);

      expect(res.body.success).toBe(true);

      const user = await User.findOne({ email: 'admin@example.com' }).select('+twoFactorSecret');
      expect(user.twoFactorEnabled).toBe(true);
      expect(user.twoFactorSetupAt).toBeTruthy();
      // Existing (pre-2FA) sessions are invalidated
      // (refreshToken is a dynamic field — mongoose hydrates missing paths as undefined)
      expect(user.refreshToken).toBeFalsy();
    });

    it('rejects an invalid code', async () => {
      const res = await request(app)
        .post('/api/auth/2fa/enable')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ code: '000000', password: 'TestPass123!' })
        .expect(400);

      expect(res.body.message).toBe('Invalid verification code.');
    });

    it('rejects a wrong password', async () => {
      const token = authenticator.generate(secret);

      const res = await request(app)
        .post('/api/auth/2fa/enable')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ code: token, password: 'WrongPassword1!' })
        .expect(403);

      expect(res.body.message).toBe('Incorrect password.');
    });
  });

  describe('login + POST /api/auth/2fa/verify', () => {
    let secret;

    beforeEach(async () => {
      // Enable 2FA directly on the model (no need to re-exercise /enable here)
      secret = authenticator.generateSecret();
      await User.updateOne(
        { email: 'admin@example.com' },
        { $set: { twoFactorEnabled: true, twoFactorSecret: secret } }
      );
    });

    it('challenges with requiresTwoFactor and completes login via /2fa/verify', async () => {
      const challenge = await login();
      expect(challenge.body.requiresTwoFactor).toBe(true);
      expect(challenge.body.twoFactorToken).toBeTruthy();
      expect(challenge.body.accessToken).toBeFalsy();

      const verify = await request(app)
        .post('/api/auth/2fa/verify')
        .send({ twoFactorToken: challenge.body.twoFactorToken, code: authenticator.generate(secret) })
        .expect(200);

      expect(verify.body.success).toBe(true);
      expect(verify.body.accessToken).toBeTruthy();
      expect(verify.body.refreshToken).toBeTruthy();
      expect(verify.body.user.twoFactorEnabled).toBe(true);
    });

    it('rejects an invalid code', async () => {
      const challenge = await login();

      const verify = await request(app)
        .post('/api/auth/2fa/verify')
        .send({ twoFactorToken: challenge.body.twoFactorToken, code: '000000' })
        .expect(400);

      expect(verify.body.message).toBe('Invalid verification code.');
    });

    it('rejects an expired/forged two-factor token', async () => {
      const verify = await request(app)
        .post('/api/auth/2fa/verify')
        .send({ twoFactorToken: 'not-a-real-token', code: authenticator.generate(secret) })
        .expect(401);

      expect(verify.body.message).toContain('expired');
    });
  });

  describe('POST /api/auth/2fa/disable', () => {
    it('disables 2FA with the correct password', async () => {
      const secret = authenticator.generateSecret();
      await User.updateOne(
        { email: 'admin@example.com' },
        { $set: { twoFactorEnabled: true, twoFactorSecret: secret } }
      );

      const res = await request(app)
        .post('/api/auth/2fa/disable')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ password: 'TestPass123!' })
        .expect(200);

      expect(res.body.success).toBe(true);

      // Login now works without a 2FA challenge
      const loginRes = await login();
      expect(loginRes.body.requiresTwoFactor).toBeFalsy();
      expect(loginRes.body.accessToken).toBeTruthy();
    });

    it('rejects a wrong password', async () => {
      const res = await request(app)
        .post('/api/auth/2fa/disable')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ password: 'WrongPassword1!' })
        .expect(403);

      expect(res.body.message).toBe('Incorrect password.');
    });
  });
});
