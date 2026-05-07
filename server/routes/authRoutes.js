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

      // Clear failed login attempts on successful login
      clearLoginAttempts(email);

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
          fullName: user.fullName
        }
      });
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

  try {
    // Verify the refresh token
    const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);

    // Find the user
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.refreshToken !== refreshToken) {
      return res.status(403).json({
        success: false,
        message: 'Invalid refresh token'
      });
    }

    // Generate new tokens
    const newAccessToken = jwt.sign(
      { userId: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    const newRefreshToken = jwt.sign(
      { userId: user._id, email: user.email, role: user.role },
      process.env.REFRESH_TOKEN_SECRET,
      { expiresIn: '7d' }
    );

    // Update user's refresh token in database
    user.refreshToken = newRefreshToken;
    await user.save();

    // Return new tokens
    return res.status(200).json({
      success: true,
      data: {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken
      }
    });

  } catch (error) {
    console.error(`Token refresh error: ${error.message}`);

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

router.get('/me', requireUser, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    console.log('User data from /me endpoint:', {
      email: user.email,
      role: user.role,
      permissions: user.permissions,
      isApproved: user.isApproved
    });
    
    return res.status(200).json({
      user: {
        email: user.email,
        role: user.role,
        permissions: user.permissions,
        isApproved: user.isApproved
      }
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    return res.status(500).json({ message: 'Server error' });
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
    const result = await User.updateMany(
      { isApproved: false, role: { $ne: 'super_admin' } },
      { $set: { isApproved: true } }
    );
    return res.json({
      success: true,
      message: `Approved ${result.modifiedCount} pending user(s)`,
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

    await User.findByIdAndDelete(req.params.userId);
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

module.exports = router;