const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Staff = require('../models/Staff');
const { requireUser, requireAdmin } = require('./middleware/auth.js');

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    // Check if user is approved (admins are always approved)
    if (!user.isApproved && user.role !== 'admin') {
      return res.status(403).json({ 
        message: 'Your account is pending approval. Please contact an administrator.',
        pendingApproval: true
      });
    }

    const accessToken = jwt.sign(
      { userId: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    console.log('Login successful for user:', {
      email: user.email,
      role: user.role,
      isApproved: user.isApproved,
      permissions: user.permissions
    });
    
    res.json({
      success: true,
      accessToken,
      user: {
        email: user.email,
        role: user.role,
        isApproved: user.isApproved,
        permissions: user.permissions
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.post('/register', async (req, res) => {
  const { email, password, name } = req.body;

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already registered' });
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
      name: staffName,
      role: 'Sales Clerk', // Default role
      email: email,
      performance: 0,
      user: user._id
    });
    await staff.save();

    res.status(201).json({
      success: true,
      message: 'Registration successful. Your account is pending approval by an administrator.',
      user: {
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
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

  try {
    // Verify the refresh token
    const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);

    // Find the user
    const user = await UserService.get(decoded._id);

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
    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user);

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
  try {
    const pendingUsers = await User.find({ isApproved: false }).select('-password');
    return res.json({ users: pendingUsers });
  } catch (error) {
    console.error('Error fetching pending users:', error);
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