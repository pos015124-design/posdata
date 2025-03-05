const UserService = require('../../services/userService.js');
const User = require('../../models/User');
const jwt = require('jsonwebtoken');

const requireUser = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Unauthorized' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check if user exists and is approved
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    if (!user.isApproved && user.role !== 'admin') {
      return res.status(403).json({ message: 'Account not approved yet. Please contact an administrator.' });
    }
    
    req.user = decoded;
    req.userPermissions = user.permissions;
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Authentication required' });
  }
};

const requireAdmin = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Unauthorized' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    if (decoded.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }
    
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Authentication required' });
  }
};

const checkPermission = (permission) => {
  return async (req, res, next) => {
    if (!req.userPermissions) {
      return res.status(403).json({ message: 'Permission denied' });
    }
    
    if (req.user.role === 'admin' || req.userPermissions[permission]) {
      next();
    } else {
      return res.status(403).json({ message: `You don't have permission to access ${permission}` });
    }
  };
};

module.exports = {
  requireUser,
  requireAdmin,
  checkPermission
};
