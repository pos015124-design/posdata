const User = require('../../models/User');
const jwt = require('jsonwebtoken');
const { securityLogger } = require('../../config/logger');

const requireUser = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Unauthorized' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // DEBUG: Log decoded token
    console.log(`[AUTH] Token decoded - userId: ${decoded.userId}, email: ${decoded.email}, role: ${decoded.role}`);
    
    // Check if user exists and is approved
    const user = await User.findById(decoded.userId);
    if (!user) {
      securityLogger.warn('Authentication failed - user not found', {
        userId: decoded.userId,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
      return res.status(404).json({ message: 'User not found' });
    }
    
    console.log(`[AUTH] User found in DB - ${user.email}, isActive: ${user.isActive}`);
    
    if (!user.isApproved && !['admin', 'super_admin'].includes(user.role)) {
      securityLogger.warn('Authentication failed - account not approved', {
        userId: decoded.userId,
        role: user.role,
        ip: req.ip
      });
      return res.status(403).json({ message: 'Account not approved yet. Please contact an administrator.' });
    }
    
    if (!user.isActive) {
      securityLogger.warn('Authentication failed - account inactive', {
        userId: decoded.userId,
        ip: req.ip
      });
      return res.status(403).json({ message: 'Account is inactive.' });
    }
    
    req.user = decoded;
    req.userDetails = user;
    req.userPermissions = user.permissions;
    
    console.log(`[AUTH] Authentication successful for ${user.email}`);
    next();
  } catch (err) {
    securityLogger.warn('Authentication failed - invalid token', {
      error: err.message,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
    return res.status(403).json({ error: 'Authentication required' });
  }
};

const requireAdmin = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    console.log('requireAdmin: No token provided');
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('requireAdmin: Decoded token:', decoded);

    // Only allow 'admin' and 'super_admin' for admin endpoints (not business_admin)
    const adminRoles = ['admin', 'super_admin'];
    if (!adminRoles.includes(decoded.role)) {
      console.log('requireAdmin: Access denied for role', decoded.role);
      securityLogger.warn('Admin access denied', {
        userId: decoded.userId,
        role: decoded.role,
        ip: req.ip,
        path: req.path
      });
      return res.status(403).json({ message: 'Admin access required' });
    }

    req.user = decoded;
    next();
  } catch (err) {
    console.log('requireAdmin: JWT error', err);
    securityLogger.warn('Admin authentication failed', {
      error: err.message,
      ip: req.ip
    });
    return res.status(403).json({ error: 'Authentication required' });
  }
};

const requireSuperAdmin = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Unauthorized' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.role !== 'super_admin') {
      securityLogger.warn('Super admin access denied', {
        userId: decoded.userId,
        role: decoded.role,
        ip: req.ip,
        path: req.path
      });
      return res.status(403).json({ message: 'Super admin access required' });
    }

    req.user = decoded;
    next();
  } catch (err) {
    securityLogger.warn('Super admin authentication failed', {
      error: err.message,
      ip: req.ip
    });
    return res.status(403).json({ error: 'Authentication required' });
  }
};

const requireBusinessAdmin = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Unauthorized' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const businessAdminRoles = ['super_admin', 'business_admin'];
    if (!businessAdminRoles.includes(decoded.role)) {
      securityLogger.warn('Business admin access denied', {
        userId: decoded.userId,
        role: decoded.role,
        ip: req.ip,
        path: req.path
      });
      return res.status(403).json({ message: 'Business admin access required' });
    }

    req.user = decoded;
    next();
  } catch (err) {
    securityLogger.warn('Business admin authentication failed', {
      error: err.message,
      ip: req.ip
    });
    return res.status(403).json({ error: 'Authentication required' });
  }
};

const checkPermission = (permission) => {
  return async (req, res, next) => {
    if (!req.userPermissions) {
      securityLogger.warn('Permission check failed - no user permissions', {
        userId: req.user?.userId,
        ip: req.ip,
        permission: permission
      });
      return res.status(403).json({ message: 'Permission denied' });
    }

    // Super admins have all permissions
    const adminRoles = ['admin', 'super_admin', 'business_admin'];
    if (adminRoles.includes(req.user.role) || req.userPermissions[permission]) {
      next();
    } else {
      securityLogger.warn('Permission denied', {
        userId: req.user?.userId,
        role: req.user?.role,
        ip: req.ip,
        permission: permission,
        path: req.path
      });
      return res.status(403).json({ message: `You don't have permission to access ${permission}` });
    }
  };
};

const checkTenantAccess = (req, res, next) => {
  // Middleware to ensure users can only access their tenant's data
  if (req.user.role === 'super_admin') {
    // Super admins can access all tenants
    return next();
  }

  if (!req.user.tenantId) {
    securityLogger.warn('Tenant access failed - no tenant ID', {
      userId: req.user?.userId,
      role: req.user?.role,
      ip: req.ip
    });
    return res.status(403).json({ message: 'No tenant access' });
  }

  // Add tenant filter to request for use in controllers
  req.tenantFilter = { tenantId: req.user.tenantId };
  next();
};

const checkBusinessAccess = (businessId) => {
  return async (req, res, next) => {
    if (req.user.role === 'super_admin') {
      // Super admins can access all businesses
      return next();
    }

    if (req.user.role === 'business_admin' && req.user.businessId === businessId) {
      // Business admins can access their own business
      return next();
    }

    securityLogger.warn('Business access denied', {
      userId: req.user?.userId,
      role: req.user?.role,
      requestedBusinessId: businessId,
      userBusinessId: req.user?.businessId,
      ip: req.ip
    });
    return res.status(403).json({
      message: 'You do not have access to this business'
    });
  };
};

// Enhanced middleware for specific resource ownership
const checkResourceOwnership = (resourceModel, resourceIdField = '_id') => {
  return async (req, res, next) => {
    try {
      const resourceId = req.params[resourceIdField] || req.body[resourceIdField];
      if (!resourceId) {
        return res.status(400).json({ message: 'Resource ID not provided' });
      }

      const resource = await require(`../../models/${resourceModel}`).findById(resourceId);
      if (!resource) {
        return res.status(404).json({ message: 'Resource not found' });
      }

      // Check if the resource belongs to the user's tenant
      if (resource.tenantId && req.user.tenantId && resource.tenantId !== req.user.tenantId) {
        securityLogger.warn('Resource access denied - tenant mismatch', {
          userId: req.user?.userId,
          resourceTenantId: resource.tenantId,
          userTenantId: req.user.tenantId,
          resourceModel,
          resourceId,
          ip: req.ip
        });
        return res.status(403).json({ message: 'You do not have access to this resource' });
      }

      // Check if the resource belongs to the user's business
      if (resource.businessId && req.user.businessId && resource.businessId.toString() !== req.user.businessId.toString()) {
        securityLogger.warn('Resource access denied - business mismatch', {
          userId: req.user?.userId,
          resourceBusinessId: resource.businessId?.toString(),
          userBusinessId: req.user.businessId?.toString(),
          resourceModel,
          resourceId,
          ip: req.ip
        });
        return res.status(403).json({ message: 'You do not have access to this resource' });
      }

      next();
    } catch (error) {
      securityLogger.error('Resource ownership check failed', {
        error: error.message,
        userId: req.user?.userId,
        resourceModel,
        resourceId: req.params[resourceIdField],
        ip: req.ip
      });
      return res.status(500).json({ message: 'Internal server error' });
    }
  };
};

module.exports = {
  requireUser,
  requireAdmin,
  requireSuperAdmin,
  requireBusinessAdmin,
  checkPermission,
  checkTenantAccess,
  checkBusinessAccess,
  checkResourceOwnership
};