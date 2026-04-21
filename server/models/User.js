const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  // Basic Information
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  firstName: {
    type: String,
    trim: true
  },
  lastName: {
    type: String,
    trim: true
  },

  // Role and Tenant Association
  role: {
    type: String,
    enum: ['super_admin', 'business_admin', 'staff', 'customer'],
    default: 'staff'
  },
  tenantId: {
    type: String,
    index: true
  },
  businessId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Business'
  },

  // Account Status
  isApproved: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },

  // Enhanced Permissions for Multi-tenant E-commerce
  permissions: {
    // Dashboard and Analytics
    dashboard: {
      type: Boolean,
      default: true
    },
    analytics: {
      type: Boolean,
      default: false
    },

    // Sales and POS
    pos: {
      type: Boolean,
      default: false
    },
    sales: {
      type: Boolean,
      default: false
    },
    orders: {
      type: Boolean,
      default: false
    },

    // Inventory Management
    inventory: {
      type: Boolean,
      default: false
    },
    products: {
      type: Boolean,
      default: false
    },
    categories: {
      type: Boolean,
      default: false
    },

    // Customer Management
    customers: {
      type: Boolean,
      default: false
    },
    customerAccounts: {
      type: Boolean,
      default: false
    },

    // Staff and User Management
    staff: {
      type: Boolean,
      default: false
    },
    users: {
      type: Boolean,
      default: false
    },

    // Business Management
    business: {
      type: Boolean,
      default: false
    },
    businessSettings: {
      type: Boolean,
      default: false
    },

    // Reports and Exports
    reports: {
      type: Boolean,
      default: false
    },
    exports: {
      type: Boolean,
      default: false
    },

    // System Settings
    settings: {
      type: Boolean,
      default: false
    },
    systemSettings: {
      type: Boolean,
      default: false
    },

    // Super Admin Only
    platformManagement: {
      type: Boolean,
      default: false
    },
    tenantManagement: {
      type: Boolean,
      default: false
    }
  },

  // Login and Security
  lastLogin: Date,
  loginCount: {
    type: Number,
    default: 0
  },
  failedLoginAttempts: {
    type: Number,
    default: 0
  },
  accountLockedUntil: Date,

  // Password Reset
  passwordResetToken: String,
  passwordResetExpires: Date,

  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes for performance
userSchema.index({ email: 1 });
userSchema.index({ role: 1, tenantId: 1 });
userSchema.index({ businessId: 1, role: 1 });
userSchema.index({ isApproved: 1, isActive: 1 });
userSchema.index({ lastLogin: -1 });

// Pre-save middleware to hash password
userSchema.pre('save', async function(next) {
  if (this.isModified('password')) {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
  }

  // Update timestamp
  this.updatedAt = new Date();

  // Set default permissions based on role
  if (this.isModified('role')) {
    this.setDefaultPermissions();
  }

  next();
});

// Instance methods
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.setDefaultPermissions = function() {
  const defaultPermissions = {
    super_admin: {
      dashboard: true,
      analytics: true,
      pos: true,
      sales: true,
      orders: true,
      inventory: true,
      products: true,
      categories: true,
      customers: true,
      customerAccounts: true,
      staff: true,
      users: true,
      business: true,
      businessSettings: true,
      reports: true,
      exports: true,
      settings: true,
      systemSettings: true,
      platformManagement: true,
      tenantManagement: true
    },
    business_admin: {
      dashboard: true,
      analytics: true,
      pos: true,
      sales: true,
      orders: true,
      inventory: true,
      products: true,
      categories: true,
      customers: true,
      customerAccounts: true,
      staff: true,
      users: true,
      business: true,
      businessSettings: true,
      reports: true,
      exports: true,
      settings: true,
      systemSettings: false,
      platformManagement: false,
      tenantManagement: false
    },
    staff: {
      dashboard: true,
      analytics: false,
      pos: false,
      sales: false,
      orders: false,
      inventory: false,
      products: false,
      categories: false,
      customers: false,
      customerAccounts: false,
      staff: false,
      users: false,
      business: false,
      businessSettings: false,
      reports: false,
      exports: false,
      settings: false,
      systemSettings: false,
      platformManagement: false,
      tenantManagement: false
    },
    customer: {
      dashboard: false,
      analytics: false,
      pos: false,
      sales: false,
      orders: false,
      inventory: false,
      products: false,
      categories: false,
      customers: false,
      customerAccounts: false,
      staff: false,
      users: false,
      business: false,
      businessSettings: false,
      reports: false,
      exports: false,
      settings: false,
      systemSettings: false,
      platformManagement: false,
      tenantManagement: false
    }
  };

  const rolePermissions = defaultPermissions[this.role];
  if (rolePermissions) {
    this.permissions = { ...this.permissions.toObject(), ...rolePermissions };
  }
};

userSchema.methods.recordLogin = function() {
  this.lastLogin = new Date();
  this.loginCount += 1;
  this.failedLoginAttempts = 0;
  this.accountLockedUntil = undefined;
  return this.save();
};

userSchema.methods.recordFailedLogin = function() {
  this.failedLoginAttempts += 1;

  // Lock account after 5 failed attempts for 30 minutes
  if (this.failedLoginAttempts >= 5) {
    this.accountLockedUntil = new Date(Date.now() + 30 * 60 * 1000);
  }

  return this.save();
};

userSchema.methods.isAccountLocked = function() {
  return this.accountLockedUntil && this.accountLockedUntil > new Date();
};

userSchema.methods.generatePasswordResetToken = function() {
  const token = Math.random().toString(36).substring(2, 15) +
                Math.random().toString(36).substring(2, 15);
  this.passwordResetToken = token;
  this.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
  return token;
};

// Virtual for full name
userSchema.virtual('fullName').get(function() {
  if (this.firstName && this.lastName) {
    return `${this.firstName} ${this.lastName}`;
  }
  return this.email;
});

// Static methods
userSchema.statics.findByEmail = function(email) {
  return this.findOne({ email: email.toLowerCase() });
};

userSchema.statics.findByRole = function(role, tenantId = null) {
  const query = { role, isActive: true };
  if (tenantId) {
    query.tenantId = tenantId;
  }
  return this.find(query);
};

userSchema.statics.findSuperAdmins = function() {
  return this.find({ role: 'super_admin', isActive: true });
};

userSchema.statics.findBusinessAdmins = function(tenantId) {
  return this.find({ role: 'business_admin', tenantId, isActive: true });
};

module.exports = mongoose.model('User', userSchema);