const jwt = require('jsonwebtoken');
const User = require('../../models/User');
const { body, validationResult } = require('express-validator');

// Account lockout tracking (in production, use Redis)
const loginAttempts = new Map();
const MAX_LOGIN_ATTEMPTS = parseInt(process.env.MAX_LOGIN_ATTEMPTS) || 5;
const LOCKOUT_TIME = parseInt(process.env.LOCKOUT_TIME) || 15 * 60 * 1000; // 15 minutes

// Helper function to check if account is locked
const isAccountLocked = (email) => {
  const attempts = loginAttempts.get(email);
  if (!attempts) return false;

  if (attempts.count >= MAX_LOGIN_ATTEMPTS) {
    const timeSinceLastAttempt = Date.now() - attempts.lastAttempt;
    if (timeSinceLastAttempt < LOCKOUT_TIME) {
      return true;
    } else {
      // Reset attempts after lockout period
      loginAttempts.delete(email);
      return false;
    }
  }
  return false;
};

// Helper function to record failed login attempt
const recordFailedAttempt = (email) => {
  const attempts = loginAttempts.get(email) || { count: 0, lastAttempt: 0 };
  attempts.count += 1;
  attempts.lastAttempt = Date.now();
  loginAttempts.set(email, attempts);
};

// Helper function to clear login attempts on successful login
const clearLoginAttempts = (email) => {
  loginAttempts.delete(email);
};

// Validation middleware for login
const validateLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
];

// Validation middleware for registration
const validateRegistration = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
  body('name')
    .optional()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('Name can only contain letters and spaces'),
];

// Enhanced JWT verification with additional security checks
const verifyToken = async (token) => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Check if user still exists and is active
    const user = await User.findById(decoded.userId);
    if (!user) {
      throw new Error('User no longer exists');
    }

    // Check if user is still approved
    if (!user.isApproved && user.role !== 'admin') {
      throw new Error('Account not approved');
    }

    return { decoded, user };
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
};

// Enhanced authentication middleware
const requireUser = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({
      error: 'Authentication required',
      message: 'No token provided'
    });
  }

  try {
    const { decoded, user } = await verifyToken(token);

    req.user = decoded;
    req.userPermissions = user.permissions;
    req.userDetails = user;
    next();
  } catch (error) {
    return res.status(403).json({
      error: 'Authentication failed',
      message: error.message
    });
  }
};

// Enhanced admin middleware
const requireAdmin = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({
      error: 'Authentication required',
      message: 'No token provided'
    });
  }

  try {
    const { decoded, user } = await verifyToken(token);

    if (decoded.role !== 'admin') {
      return res.status(403).json({
        error: 'Access denied',
        message: 'Admin access required'
      });
    }

    req.user = decoded;
    req.userPermissions = user.permissions;
    req.userDetails = user;
    next();
  } catch (error) {
    return res.status(403).json({
      error: 'Authentication failed',
      message: error.message
    });
  }
};

// Enhanced permission checking middleware
const checkPermission = (permission) => {
  return async (req, res, next) => {
    if (!req.userPermissions) {
      return res.status(403).json({
        error: 'Permission denied',
        message: 'User permissions not found'
      });
    }

    if (req.user.role === 'admin' || req.userPermissions[permission]) {
      next();
    } else {
      return res.status(403).json({
        error: 'Permission denied',
        message: `You don't have permission to access ${permission}`
      });
    }
  };
};

// Validation error handler
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      message: 'Please check your input data',
      details: errors.array()
    });
  }
  next();
};

// Account lockout middleware
const checkAccountLockout = (req, res, next) => {
  const { email } = req.body;

  if (isAccountLocked(email)) {
    const attempts = loginAttempts.get(email);
    const timeRemaining = LOCKOUT_TIME - (Date.now() - attempts.lastAttempt);

    return res.status(423).json({
      error: 'Account locked',
      message: 'Too many failed login attempts. Please try again later.',
      timeRemaining: Math.ceil(timeRemaining / 1000 / 60) // minutes
    });
  }

  next();
};

module.exports = {
  requireUser,
  requireAdmin,
  checkPermission,
  validateLogin,
  validateRegistration,
  handleValidationErrors,
  checkAccountLockout,
  recordFailedAttempt,
  clearLoginAttempts,
  isAccountLocked,
  verifyToken
};