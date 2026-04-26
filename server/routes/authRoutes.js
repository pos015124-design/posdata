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

      // Allow login for unapproved users; frontend will handle waiting approval UI

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
    const { email, password, name } = req.body;
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

      // Create user with isApproved set to false
      const user = new User({
        email,
        password,
        isApproved: false // New users need approval
      });
      await user.save();

      // Create a corresponding staff record
      const staffName = name || email.split('@')[0]; // Use name if provided, otherwise use email username
      const staff = new Staff({
        userId: user._id,  // Changed from 'user' to 'userId'
        name: staffName,
        role: 'staff',     // Changed from 'Sales Clerk' to valid enum value 'staff'
        email: email,
        isActive: true
      });
      await staff.save();

      // Log successful registration
      securityLogger.info('New user registration', {
        email: user.email,
        userId: user._id,
        ip: clientIP,
        userAgent
      });

      auditLogger.info('User registration', {
        action: 'REGISTER',
        userId: user._id,
        email: user.email,
        ip: clientIP,
        timestamp: new Date().toISOString()
      });

      res.status(201).json({
        success: true,
        message: 'Registration successful. Your account is pending approval by an administrator.',
        user: {
          email: user.email,
          role: user.role
        }
      });
    } catch (error) {
      // Log full error stack and request body for debugging
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
        message: error.message,
        details: error.stack
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
    return res.status(500).json({ message: 'Server error', error: error?.message, stack: error?.stack });
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