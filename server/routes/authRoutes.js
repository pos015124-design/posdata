const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Staff = require('../models/Staff');
const { requireUser, requireAdmin } = require('./middleware/auth.js');
const {
  validateLogin,
  validateRegistration,
  handleValidationErrors,
  checkAccountLockout,
  recordFailedAttempt,
  clearLoginAttempts
} = require('./middleware/authEnhanced');
const { securityLogger, auditLogger } = require('../config/logger');
const { body: bodyCheck, validationResult: checkResult } = require('express-validator');
const { authenticator } = require('otplib');
const QRCode = require('qrcode');

// ── Two-Factor Authentication (TOTP) helpers ──────────────────────────────────
// Roles allowed to enable 2FA from Settings — admin + super admin only.
const TWO_FACTOR_ROLES = ['admin', 'super_admin', 'business_admin'];
const TOTP_ISSUER = 'BHABY E-Shop';

// window: 1 → accept the code from the previous, current, and next 30s step
// (tolerates small clock drift between the phone and the server).
authenticator.options = { window: 1 };

/**
 * Issue the access + refresh token pair, persist the refresh token, log the
 * login, and respond. Shared by the normal login path and the 2FA verify step
 * so both flows behave identically.
 */
const issueSession = async (user, req, res) => {
  const clientIP = req.ip;
  const userAgent = req.get('User-Agent');

  // Clear failed login attempts on successful login
  clearLoginAttempts(user.email);

  // Generate tokens with enhanced payload
  const tokenPayload = {
    userId: user._id,
    email: user.email,
    role: user.role,
    tenantId: user.tenantId,
    businessId: user.businessId
  };

  const accessToken = jwt.sign(
    tokenPayload,
    process.env.JWT_SECRET,
    { expiresIn: '24h' } // Extended for better UX, but implement refresh token rotation
  );

  const refreshToken = jwt.sign(
    tokenPayload,
    process.env.REFRESH_TOKEN_SECRET || process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

  // Log successful login
  securityLogger.info('Successful login', {
    email: user.email,
    userId: user._id,
    role: user.role,
    ip: clientIP,
    userAgent
  });

  auditLogger.info('User login', {
    action: 'LOGIN',
    userId: user._id,
    email: user.email,
    ip: clientIP,
    timestamp: new Date().toISOString()
  });

  // Persist the refresh token so the /refresh endpoint can validate it.
  // Without this save the refresh endpoint always returns 403 because
  // user.refreshToken is null.
  user.refreshToken = refreshToken;
  await user.save();

  // Backfill low-stock alerts for products already below their reorder point
  // (non-blocking — never delays the login response)
  setImmediate(async () => {
    try {
      const { sweepLowStockNotifications } = require('../services/notificationService');
      await sweepLowStockNotifications(user._id);
    } catch (sweepErr) {
      console.error('[Notification] login sweep failed:', sweepErr.message);
    }
  });

  res.json({
    success: true,
    accessToken,
    refreshToken,
    user: {
      email: user.email,
      role: user.role,
      isApproved: user.isApproved,
      permissions: user.permissions,
      tenantId: user.tenantId,
      businessId: user.businessId,
      fullName: user.fullName,
      notificationPrefs: user.notificationPrefs,
      twoFactorEnabled: !!user.twoFactorEnabled
    }
  });
};

router.post('/login',
  validateLogin,
  handleValidationErrors,
  checkAccountLockout,
  async (req, res) => {
    const { email, password } = req.body;
    const clientIP = req.ip;
    const userAgent = req.get('User-Agent');

    try {
      const user = await User.findOne({ email });
      if (!user) {
        recordFailedAttempt(email);
        securityLogger.warn('Login attempt with non-existent email', {
          email,
          ip: clientIP,
          userAgent
        });
        return res.status(401).json({
          error: 'Authentication failed',
          message: 'Invalid credentials'
        });
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        recordFailedAttempt(email);
        securityLogger.warn('Login attempt with incorrect password', {
          email,
          userId: user._id,
          ip: clientIP,
          userAgent
        });
        return res.status(401).json({
          error: 'Authentication failed',
          message: 'Invalid credentials'
        });
      }

      // Only super_admin is auto-approved on login.
      // business_admin users must wait for manual admin approval.
      if (user.role === 'super_admin') {
        if (!user.isApproved) {
          user.isApproved = true;
          await user.save();
        }
      }

      // Two-factor authentication: challenge the TOTP code before issuing
      // tokens. A short-lived single-purpose token lets the client complete
      // the second step without exposing any session credentials.
      if (user.twoFactorEnabled) {
        const twoFactorToken = jwt.sign(
          { userId: user._id, purpose: 'two_factor' },
          process.env.JWT_SECRET,
          { expiresIn: '5m' }
        );
        securityLogger.info('2FA challenge issued', {
          email: user.email,
          userId: user._id,
          ip: clientIP,
          userAgent
        });
        return res.json({ success: true, requiresTwoFactor: true, twoFactorToken });
      }

      await issueSession(user, req, res);
    } catch (error) {
      securityLogger.error('Login error', {
        error: error.message,
        email,
        ip: clientIP,
        userAgent
      });
      res.status(500).json({
        error: 'Internal server error',
        message: 'An error occurred during login'
      });
    }
  }
);

// ── Two-Factor Authentication (TOTP) routes ───────────────────────────────────
// GET /api/auth/2fa/status — whether 2FA is enabled for the current user
router.get('/2fa/status', requireUser, async (req, res) => {
  try {
    res.json({ success: true, twoFactorEnabled: !!req.userDetails.twoFactorEnabled });
  } catch (error) {
    securityLogger.error('2FA status error', { error: error.message, userId: req.user?.userId });
    res.status(500).json({ error: 'Failed to load 2FA status' });
  }
});

// POST /api/auth/2fa/setup — generate a TOTP secret + QR code for the app
router.post('/2fa/setup', requireUser, async (req, res) => {
  try {
    const user = req.userDetails;
    if (!TWO_FACTOR_ROLES.includes(user.role)) {
      return res.status(403).json({ message: 'Two-factor authentication is only available for admin accounts.' });
    }
    if (user.twoFactorEnabled) {
      return res.status(400).json({ message: 'Two-factor authentication is already enabled.' });
    }

    const secret = authenticator.generateSecret();
    const otpauthUrl = authenticator.keyuri(user.email, TOTP_ISSUER, secret);
    const qrCode = await QRCode.toDataURL(otpauthUrl);

    // Persist the pending secret so /enable only needs the verification code.
    // The user is still fully logged in — 2FA is not active until /enable.
    user.twoFactorSecret = secret;
    await user.save();

    securityLogger.info('2FA setup initiated', { userId: user._id, email: user.email, ip: req.ip });
    res.json({ success: true, secret, otpauthUrl, qrCode });
  } catch (error) {
    securityLogger.error('2FA setup error', { error: error.message, userId: req.user?.userId });
    res.status(500).json({ error: 'Failed to start 2FA setup' });
  }
});

// POST /api/auth/2fa/enable — verify the TOTP code + password, then enable 2FA
router.post('/2fa/enable', requireUser, async (req, res) => {
  try {
    const user = req.userDetails;
    if (!TWO_FACTOR_ROLES.includes(user.role)) {
      return res.status(403).json({ message: 'Two-factor authentication is only available for admin accounts.' });
    }

    const { code, password } = req.body;
    if (!code || !password) {
      return res.status(400).json({ message: 'Verification code and current password are required.' });
    }

    const fresh = await User.findById(user._id).select('+twoFactorSecret');
    if (!fresh.twoFactorSecret) {
      return res.status(400).json({ message: 'No pending setup found. Start 2FA setup first.' });
    }

    const passwordOk = await bcrypt.compare(password, fresh.password);
    if (!passwordOk) {
      securityLogger.warn('2FA enable failed - wrong password', { userId: user._id, email: user.email, ip: req.ip });
      return res.status(403).json({ message: 'Incorrect password.' });
    }

    const codeOk = authenticator.check(String(code).replace(/\s+/g, ''), fresh.twoFactorSecret);
    if (!codeOk) {
      securityLogger.warn('2FA enable failed - invalid code', { userId: user._id, email: user.email, ip: req.ip });
      return res.status(400).json({ message: 'Invalid verification code.' });
    }

    fresh.twoFactorEnabled = true;
    fresh.twoFactorSetupAt = new Date();
    // Invalidate existing sessions — they were authenticated without 2FA.
    fresh.refreshToken = null;
    await fresh.save();

    auditLogger.info('2FA enabled', { action: '2FA_ENABLE', userId: user._id, email: user.email, ip: req.ip });
    res.json({ success: true, message: 'Two-factor authentication enabled.' });
  } catch (error) {
    securityLogger.error('2FA enable error', { error: error.message, userId: req.user?.userId });
    res.status(500).json({ error: 'Failed to enable 2FA' });
  }
});

// POST /api/auth/2fa/disable — requires the current password, then turns 2FA off
router.post('/2fa/disable', requireUser, async (req, res) => {
  try {
    const user = req.userDetails;
    const { password } = req.body;
    if (!password) {
      return res.status(400).json({ message: 'Current password is required.' });
    }

    const passwordOk = await bcrypt.compare(password, user.password);
    if (!passwordOk) {
      securityLogger.warn('2FA disable failed - wrong password', { userId: user._id, email: user.email, ip: req.ip });
      return res.status(403).json({ message: 'Incorrect password.' });
    }

    user.twoFactorEnabled = false;
    user.twoFactorSecret = undefined;
    user.twoFactorSetupAt = undefined;
    user.refreshToken = null; // force a fresh login after disabling
    await user.save();

    auditLogger.info('2FA disabled', { action: '2FA_DISABLE', userId: user._id, email: user.email, ip: req.ip });
    res.json({ success: true, message: 'Two-factor authentication disabled.' });
  } catch (error) {
    securityLogger.error('2FA disable error', { error: error.message, userId: req.user?.userId });
    res.status(500).json({ error: 'Failed to disable 2FA' });
  }
});

// POST /api/auth/2fa/verify — complete the login with the TOTP code
router.post('/2fa/verify', async (req, res) => {
  const { twoFactorToken, code } = req.body;
  const clientIP = req.ip;
  const userAgent = req.get('User-Agent');

  if (!twoFactorToken || !code) {
    return res.status(400).json({ message: 'twoFactorToken and code are required.' });
  }

  let decoded;
  try {
    decoded = jwt.verify(twoFactorToken, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ message: 'Two-factor session expired. Please log in again.' });
  }
  if (decoded.purpose !== 'two_factor') {
    return res.status(403).json({ message: 'Invalid two-factor session.' });
  }

  try {
    const user = await User.findById(decoded.userId).select('+twoFactorSecret');
    if (!user) return res.status(401).json({ message: 'User not found.' });
    if (!user.twoFactorEnabled || !user.twoFactorSecret) {
      return res.status(403).json({ message: 'Two-factor authentication is not enabled for this account.' });
    }

    const codeOk = authenticator.check(String(code).replace(/\s+/g, ''), user.twoFactorSecret);
    if (!codeOk) {
      recordFailedAttempt(user.email);
      securityLogger.warn('2FA verify failed - invalid code', {
        email: user.email,
        userId: user._id,
        ip: clientIP,
        userAgent
      });
      return res.status(400).json({ message: 'Invalid verification code.' });
    }

    await issueSession(user, req, res);
  } catch (error) {
    securityLogger.error('2FA verify error', {
      error: error.message,
      ip: clientIP,
      userAgent
    });
    res.status(500).json({
      error: 'Internal server error',
      message: 'An error occurred during login'
    });
  }
});

router.post('/register',
  validateRegistration,
  handleValidationErrors,
  async (req, res) => {
    const { email, password, name, businessName } = req.body;
    const clientIP = req.ip;
    const userAgent = req.get('User-Agent');

    try {
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        securityLogger.warn('Registration attempt with existing email', {
          email,
          ip: clientIP,
          userAgent
        });
        return res.status(400).json({
          error: 'Registration failed',
          message: 'Email already registered'
        });
      }

      // Create user with business_admin role (seller/business owner)
      // isApproved: false — requires manual admin approval before access is granted
      const user = new User({
        email,
        password,
        firstName: name?.split(' ')[0] || '',
        lastName: name?.split(' ').slice(1).join(' ') || '',
        role: 'business_admin',
        isApproved: false,
        termsAccepted: true,
        termsAcceptedAt: new Date()
      });
      await user.save();

      // Automatically create a Business profile for the user
      if (businessName || name) {
        try {
          const Business = require('../models/Business');
          const business = new Business({
            name: businessName || `${name}'s Store`,
            slug: (businessName || name)
              .toLowerCase()
              .replace(/[^a-z0-9\s-]/g, '')
              .replace(/\s+/g, '-')
              .replace(/-+/g, '-')
              .trim(),
            email: email,
            userId: user._id,
            status: 'pending',   // requires admin approval
            isPublic: false,     // not visible until approved
            category: 'retail'
          });
          await business.save();
          
          // Link user to business
          user.businessId = business._id;
          await user.save();
          
          console.log('✅ Business profile created:', { name: business.name, slug: business.slug });
        } catch (error) {
          console.error('Failed to create business profile:', error.message);
          // Don't fail registration if business creation fails
        }
      }

      securityLogger.info('New user registration', {
        email: user.email,
        userId: user._id,
        role: user.role,
        ip: clientIP,
        userAgent
      });

      auditLogger.info('User registration', {
        action: 'REGISTER',
        userId: user._id,
        email: user.email,
        role: user.role,
        ip: clientIP,
        timestamp: new Date().toISOString()
      });

      // Notify admin of new seller registration (non-blocking)
      try {
        const { sendNewSellerRegistrationToAdmin } = require('../utils/emailService');
        const Business = require('../models/Business');
        const biz = await Business.findOne({ userId: user._id }).select('name');
        await sendNewSellerRegistrationToAdmin({
          sellerEmail: user.email,
          sellerName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email.split('@')[0],
          businessName: biz?.name || businessName || name || user.email
        });
      } catch (emailErr) {
        console.error('Failed to send admin registration notification:', emailErr.message);
      }

      // In-app notification to all super admins about the new registration (non-blocking)
      try {
        const { createNotification } = require('../services/notificationService');
        const UserModel = require('../models/User');
        const admins = await UserModel.find({ role: 'super_admin' }).select('_id');
        const sellerLabel = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email.split('@')[0];
        for (const admin of admins) {
          await createNotification({
            userId: admin._id,
            type: 'system',
            title: 'New seller registration',
            message: `${sellerLabel} (${user.email}) is awaiting approval${businessName || name ? ` — ${businessName || name}` : ''}.`,
            link: '/settings'
          });
        }
      } catch (notifErr) {
        console.error('Failed to notify admins of registration:', notifErr.message);
      }

      res.status(201).json({
        success: true,
        message: 'Registration successful! Your account is pending admin approval. You will be notified once approved.',
        requiresApproval: true,
        user: {
          email: user.email,
          role: user.role,
          name: user.fullName
        }
      });
    } catch (error) {
      console.error('User registration failed:', error);
      securityLogger.error('Registration error', {
        error: error.message,
        stack: error.stack,
        email,
        ip: clientIP,
        userAgent,
        body: req.body
      });
      res.status(500).json({
        error: 'Registration failed',
        message: error.message || 'An error occurred during registration'
      });
    }
  }
);

// GET /api/auth/notification-prefs — current user's notification preferences
router.get('/notification-prefs', requireUser, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('notificationPrefs');
    res.json({ success: true, notificationPrefs: user?.notificationPrefs || {} });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/auth/notification-prefs — update notification preferences
router.put('/notification-prefs', requireUser, async (req, res) => {
  try {
    const { email, orders, lowStock, reports, reportFrequency } = req.body;
    const update = {};
    if (typeof email === 'boolean') update['notificationPrefs.email'] = email;
    if (typeof orders === 'boolean') update['notificationPrefs.orders'] = orders;
    if (typeof lowStock === 'boolean') update['notificationPrefs.lowStock'] = lowStock;
    if (typeof reports === 'boolean') update['notificationPrefs.reports'] = reports;
    if (reportFrequency && ['daily', 'weekly', 'off'].includes(reportFrequency)) {
      update['notificationPrefs.reportFrequency'] = reportFrequency;
      // Keep the legacy boolean in sync — 'off' disables report emails entirely
      update['notificationPrefs.reports'] = reportFrequency !== 'off';
    }

    const user = await User.findByIdAndUpdate(req.user.userId, { $set: update }, { new: true }).select('notificationPrefs');
    res.json({ success: true, notificationPrefs: user?.notificationPrefs || {} });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/logout', async (req, res) => {
  const { email } = req.body;

  const user = await User.findOne({ email });
  if (user) {
    user.refreshToken = null;
    await user.save();
  }

  res.status(200).json({ message: 'User logged out successfully.' });
});

router.post('/refresh', async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(401).json({
      success: false,
      message: 'Refresh token is required'
    });
  }

  // Require a dedicated secret — never share signing keys between token types
  const refreshSecret = process.env.REFRESH_TOKEN_SECRET;
  if (!refreshSecret) {
    return res.status(500).json({
      success: false,
      message: 'Server configuration error'
    });
  }

  try {
    // Verify the refresh token
    const decoded = jwt.verify(refreshToken, refreshSecret);

    // Find the user and validate the stored refresh token (prevents reuse after logout)
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.refreshToken !== refreshToken) {
      // Token mismatch — possible token reuse attack; invalidate all sessions
      user.refreshToken = null;
      await user.save();
      return res.status(403).json({
        success: false,
        message: 'Invalid refresh token'
      });
    }

    // Build new token pair (rotation — old refresh token is invalidated)
    const tokenPayload = {
      userId: user._id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
      businessId: user.businessId
    };

    const newAccessToken = jwt.sign(tokenPayload, process.env.JWT_SECRET, { expiresIn: '24h' });
    const newRefreshToken = jwt.sign(tokenPayload, refreshSecret, { expiresIn: '7d' });

    // Persist the new refresh token, invalidating the old one
    user.refreshToken = newRefreshToken;
    await user.save();

    return res.status(200).json({
      success: true,
      data: {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken
      }
    });

  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(403).json({
        success: false,
        message: 'Refresh token has expired'
      });
    }

    return res.status(403).json({
      success: false,
      message: 'Invalid refresh token'
    });
  }
});

// GET /api/auth/me — returns fresh user data from DB.
// Uses a token-only check (no approval gate) so unapproved users can poll
// their own status from the WaitingApproval screen.
router.get('/me', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Unauthorized' });

  try {
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });

    return res.status(200).json({
      user: {
        email: user.email,
        role: user.role,
        permissions: user.permissions,
        isApproved: user.isApproved,
        isSuspended: user.isSuspended || false
      }
    });
  } catch (error) {
    console.error('Error fetching user /me:', error);
    return res.status(403).json({ message: 'Invalid token' });
  }
});

// Admin routes for user management
router.get('/pending-users', requireAdmin, async (req, res) => {
  console.log('HIT /api/auth/pending-users route');
  try {
    const pendingUsers = await User.find({ isApproved: false }).select('-password');
    console.log('Fetched pending users:', pendingUsers.length);
    return res.json({ users: pendingUsers });
  } catch (error) {
    console.error('Error fetching pending users:', error, error?.stack);
    return res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/auth/users — all users (alias used by PendingUsers component)
router.get('/users', requireAdmin, async (req, res) => {
  try {
    const users = await User.find({ role: { $ne: 'super_admin' } })
      .select('-password')
      .sort({ createdAt: -1 });
    return res.json({ users });
  } catch (error) {
    console.error('Error fetching users:', error);
    return res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/auth/approve-all-pending — approve every unapproved user at once
router.put('/approve-all-pending', requireAdmin, async (req, res) => {
  try {
    // Find all unapproved sellers first so we can also activate their businesses
    const pendingUsers = await User.find({
      isApproved: false,
      role: { $ne: 'super_admin' }
    }).select('_id role');

    // Approve all users
    const result = await User.updateMany(
      { isApproved: false, role: { $ne: 'super_admin' } },
      { $set: { isApproved: true } }
    );

    // Activate each seller's business
    const Business = require('../models/Business');
    for (const u of pendingUsers) {
      if (u.role === 'business_admin') {
        await Business.findOneAndUpdate(
          { userId: u._id },
          { $set: { status: 'active', isPublic: true } }
        );
      }
    }

    return res.json({
      success: true,
      message: `Approved ${result.modifiedCount} pending user(s) and activated their businesses`,
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    console.error('Error approving all pending users:', error);
    return res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/auth/suspend/:userId — suspend a user
router.put('/suspend/:userId', requireAdmin, async (req, res) => {
  try {
    const { reason } = req.body;
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.role === 'super_admin') return res.status(403).json({ message: 'Cannot suspend super admin' });

    user.isSuspended = true;
    user.isActive = false;
    user.suspendedAt = new Date();
    user.suspendedReason = reason || 'Suspended by admin';
    await user.save();

    // Notify the user about the suspension (non-blocking)
    setImmediate(async () => {
      try {
        const { sendAccountSuspendedEmail } = require('../utils/emailService');
        await sendAccountSuspendedEmail({
          userEmail: user.email,
          userName: user.fullName || user.firstName || user.email.split('@')[0],
          reason: user.suspendedReason
        });
      } catch (emailErr) {
        console.error('Failed to send suspension email:', emailErr.message);
      }

      // In-app notification to the suspended user (non-blocking)
      try {
        const { createNotification } = require('../services/notificationService');
        await createNotification({
          userId: user._id,
          type: 'suspension',
          title: 'Account suspended',
          message: 'Your account has been suspended by an administrator.',
          link: ''
        });
      } catch (notifErr) {
        console.error('Failed to create suspension notification:', notifErr.message);
      }
    });

    return res.json({ success: true, message: 'User suspended successfully' });
  } catch (error) {
    return res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/auth/activate/:userId — reactivate a suspended user
router.put('/activate/:userId', requireAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.isSuspended = false;
    user.isActive = true;
    user.isApproved = true;
    user.suspendedAt = undefined;
    user.suspendedReason = undefined;
    await user.save();

    return res.json({ success: true, message: 'User activated successfully' });
  } catch (error) {
    return res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/auth/users/:userId — delete a user
router.delete('/users/:userId', requireAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.role === 'super_admin') return res.status(403).json({ message: 'Cannot delete super admin' });

    // Capture details before deleting so we can notify the user
    const wasPendingSeller = user.role === 'business_admin' && !user.isApproved;
    const userEmail = user.email;
    const userName = user.fullName || user.firstName || user.email.split('@')[0];

    await User.findByIdAndDelete(req.params.userId);

    // Send rejection email for a pending seller whose registration was declined
    // (non-blocking — must not fail the delete request)
    if (wasPendingSeller) {
      setImmediate(async () => {
        try {
          const { sendSellerRejectedEmail } = require('../utils/emailService');
          await sendSellerRejectedEmail({ sellerEmail: userEmail, sellerName: userName });
        } catch (emailErr) {
          console.error('Failed to send rejection email:', emailErr.message);
        }
      });
    }

    return res.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    return res.status(500).json({ message: 'Server error' });
  }
});

router.put('/approve/:userId', requireAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    user.isApproved = true;
    // Ensure business_admin has all their permissions set correctly
    if (user.role === 'business_admin') {
      user.setDefaultPermissions();
    }
    await user.save();

    const Business = require('../models/Business');
    let business = null;

    if (user.role === 'business_admin') {
      // Activate the seller's business so products appear in marketplace
      business = await Business.findOne({ userId: user._id });
      if (business) {
        business.status = 'active';
        business.isPublic = true;
        await business.save();
      }

      // Auto-create registration fee billing record
      try {
        const SellerBilling = require('../models/SellerBilling');
        const existing = await SellerBilling.findOne({ userId: user._id, type: 'registration' });
        if (!existing) {
          await SellerBilling.create({
            userId: user._id,
            businessId: business?._id,
            businessName: business?.name || user.email,
            type: 'registration',
            amount: 300000,
            description: 'One-time seller registration fee — E-Shop by BHABY GROUP LTD',
            dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
          });
        }
      } catch (billingErr) {
        console.error('Failed to create registration billing record:', billingErr.message);
      }

      // Send approval email to seller (non-blocking)
      try {
        const { sendSellerApprovalEmail } = require('../utils/emailService');
        await sendSellerApprovalEmail({
          sellerEmail: user.email,
          sellerName: user.fullName || user.firstName || user.email.split('@')[0],
          businessName: business?.name || user.email
        });
      } catch (emailErr) {
        console.error('Failed to send approval email:', emailErr.message);
      }

      // In-app notification to the approved seller (non-blocking)
      try {
        const { createNotification } = require('../services/notificationService');
        await createNotification({
          userId: user._id,
          type: 'approval',
          title: 'Account approved',
          message: `Your seller account${business?.name ? ` for ${business.name}` : ''} has been approved. Welcome to E-Shop!`,
          link: '/dashboard'
        });
      } catch (notifErr) {
        console.error('Failed to create approval notification:', notifErr.message);
      }
    }
    
    return res.json({ 
      success: true, 
      message: 'User approved successfully',
      user: {
        email: user.email,
        role: user.role,
        isApproved: user.isApproved
      }
    });
  } catch (error) {
    console.error('Error approving user:', error);
    return res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/auth/fix-business/:userId — super admin only
// Creates a missing business profile for a user who registered but has none
router.put('/fix-business/:userId', requireAdmin, async (req, res) => {
  try {
    const User = require('../models/User');
    const Business = require('../models/Business');

    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Check if business already exists
    const existing = await Business.findOne({ userId: user._id });
    if (existing) {
      // Just ensure it's linked on the user record
      if (!user.businessId) {
        user.businessId = existing._id;
        await user.save();
      }
      return res.json({ success: true, message: 'Business already exists — linked to user', data: existing });
    }

    // Also check by email
    const byEmail = await Business.findOne({ email: user.email });
    if (byEmail) {
      byEmail.userId = user._id;
      if (!byEmail.tenantId) byEmail.tenantId = 'default';
      if (user.isApproved) { byEmail.status = 'active'; byEmail.isPublic = true; }
      await byEmail.save();
      user.businessId = byEmail._id;
      await user.save();
      return res.json({ success: true, message: 'Existing business linked to user', data: byEmail });
    }

    // Create a new business for this user
    const name = `${user.firstName || user.email.split('@')[0]}'s Store`;
    const baseSlug = user.email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '-');
    // Ensure slug is unique
    let slug = baseSlug;
    let count = 1;
    while (await Business.findOne({ slug })) { slug = `${baseSlug}-${count++}`; }

    const business = new Business({
      name,
      slug,
      email: user.email,
      userId: user._id,
      tenantId: 'default',
      category: 'retail',
      status: user.isApproved ? 'active' : 'pending',
      isPublic: !!user.isApproved
    });
    await business.save();

    user.businessId = business._id;
    await user.save();

    return res.json({ success: true, message: 'Business created and linked', data: business });
  } catch (error) {
    console.error('fix-business error:', error);
    return res.status(500).json({ message: error.message });
  }
});

router.put('/permissions/:userId', requireAdmin, async (req, res) => {
  try {
    const { permissions } = req.body;
    if (!permissions) {
      return res.status(400).json({ message: 'Permissions are required' });
    }
    
    const user = await User.findById(req.params.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    user.permissions = permissions;
    await user.save();
    
    return res.json({ 
      success: true, 
      message: 'User permissions updated successfully',
      user: {
        email: user.email,
        role: user.role,
        permissions: user.permissions
      }
    });
  } catch (error) {
    console.error('Error updating user permissions:', error);
    return res.status(500).json({ message: 'Server error' });
  }
});

// ── Authenticated password change ────────────────────────────────────────────
// POST /api/auth/change-password
// Requires a valid access token. Verifies the current password before updating.
// The User pre-save hook re-hashes the new password automatically.
router.post('/change-password',
  requireUser,
  [
    bodyCheck('currentPassword').notEmpty().withMessage('Current password is required'),
    bodyCheck('newPassword').isLength({ min: 8 }).withMessage('New password must be at least 8 characters'),
  ],
  async (req, res) => {
    const errors = checkResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Validation failed', details: errors.array() });
    }

    try {
      const { currentPassword, newPassword } = req.body;
      const user = await User.findById(req.user.userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) {
        return res.status(400).json({ message: 'Current password is incorrect.' });
      }

      user.password     = newPassword;
      // Invalidate all other sessions on password change
      user.refreshToken = undefined;
      await user.save();

      securityLogger.info('Password changed by authenticated user', {
        userId: user._id,
        email:  user.email,
        ip:     req.ip
      });

      return res.json({ success: true, message: 'Password updated successfully.' });
    } catch (error) {
      securityLogger.error('change-password error', { error: error.message, ip: req.ip });
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// ── Password reset — seller / admin accounts ──────────────────────────────────
//
// POST /api/auth/forgot-password
// Accepts an email address, generates a cryptographically secure reset token
// (via User.generatePasswordResetToken which uses crypto.randomBytes), saves it
// to the user document, and dispatches a reset email.
//
// The response is always the same generic message regardless of whether the
// email exists.  This prevents user-enumeration attacks (an attacker cannot
// tell from the response whether an account is registered).
//
router.post('/forgot-password',
  [
    bodyCheck('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('A valid email address is required')
  ],
  async (req, res) => {
    const errors = checkResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Validation failed', details: errors.array() });
    }

    // Always return the same message — do not reveal whether the account exists
    const GENERIC_OK = 'If an account with that email exists, a password reset link has been sent.';

    try {
      const { email } = req.body;
      const user = await User.findOne({ email });

      if (!user) {
        // Deliberate: same response as success
        return res.json({ success: true, message: GENERIC_OK });
      }

      // Suspended accounts should not be able to reset passwords
      if (user.isSuspended) {
        return res.json({ success: true, message: GENERIC_OK });
      }

      const token = user.generatePasswordResetToken();
      await user.save();

      try {
        const { sendPasswordResetEmail } = require('../utils/emailService');
        await sendPasswordResetEmail(user.email, token);
      } catch (emailErr) {
        securityLogger.error('Failed to dispatch password reset email', {
          userId: user._id,
          error: emailErr.message
        });
        // Continue — do not expose internal email failures to the client
      }

      securityLogger.info('Password reset requested', {
        userId: user._id,
        email: user.email,
        ip: req.ip
      });

      return res.json({ success: true, message: GENERIC_OK });
    } catch (error) {
      securityLogger.error('forgot-password error', { error: error.message, ip: req.ip });
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// POST /api/auth/reset-password
// Accepts the token (from the email link) and the new password.
// Validates token existence + expiry, hashes the new password via the pre-save
// hook on User, invalidates the token, and resets any account lockout state.
router.post('/reset-password',
  [
    bodyCheck('token')
      .notEmpty()
      .withMessage('Reset token is required'),
    bodyCheck('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters')
  ],
  async (req, res) => {
    const errors = checkResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Validation failed', details: errors.array() });
    }

    try {
      const { token, password } = req.body;

      const user = await User.findOne({
        passwordResetToken:   token,
        passwordResetExpires: { $gt: new Date() }   // token must not be expired
      });

      if (!user) {
        return res.status(400).json({
          error: 'Invalid or expired reset token',
          message: 'This reset link is invalid or has expired. Please request a new one.'
        });
      }

      // Assign the new password — the pre-save hook on User hashes it with bcrypt (12 rounds)
      user.password            = password;
      user.passwordResetToken  = undefined;
      user.passwordResetExpires = undefined;
      // Reset any lockout state so the user can log in immediately
      user.failedLoginAttempts = 0;
      user.accountLockedUntil  = undefined;
      // Invalidate all existing sessions by clearing the stored refresh token
      user.refreshToken = undefined;

      await user.save();

      securityLogger.info('Password reset completed', {
        userId: user._id,
        email:  user.email,
        ip:     req.ip
      });

      auditLogger.info('Password reset', {
        action:    'PASSWORD_RESET',
        userId:    user._id,
        email:     user.email,
        ip:        req.ip,
        timestamp: new Date().toISOString()
      });

      return res.json({
        success: true,
        message: 'Password has been reset successfully. You can now log in with your new password.'
      });
    } catch (error) {
      securityLogger.error('reset-password error', { error: error.message, ip: req.ip });
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
);

module.exports = router;