/**
 * CustomerAccount Model for E-commerce Customer Registration
 * Handles customer accounts for online shopping
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const addressSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['billing', 'shipping'],
    required: true
  },
  isDefault: {
    type: Boolean,
    default: false
  },
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  company: {
    type: String,
    trim: true
  },
  street: {
    type: String,
    required: true,
    trim: true
  },
  city: {
    type: String,
    required: true,
    trim: true
  },
  state: {
    type: String,
    required: true,
    trim: true
  },
  zipCode: {
    type: String,
    required: true,
    trim: true
  },
  country: {
    type: String,
    required: true,
    trim: true,
    default: 'US'
  },
  phone: {
    type: String,
    trim: true
  }
}, { _id: true });

const customerAccountSchema = new mongoose.Schema({
  // Basic Information
  firstName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50
  },
  lastName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please fill a valid email address']
  },
  phone: {
    type: String,
    trim: true
  },
  dateOfBirth: {
    type: Date
  },
  gender: {
    type: String,
    enum: ['male', 'female', 'other', 'prefer_not_to_say']
  },
  
  // Authentication
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  passwordResetToken: String,
  passwordResetExpires: Date,
  
  // Account Status
  isActive: {
    type: Boolean,
    default: true
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  verificationToken: String,
  verificationExpires: Date,
  
  // Addresses
  addresses: [addressSchema],
  
  // Preferences
  preferences: {
    newsletter: {
      type: Boolean,
      default: false
    },
    smsNotifications: {
      type: Boolean,
      default: false
    },
    emailNotifications: {
      type: Boolean,
      default: true
    },
    language: {
      type: String,
      default: 'en'
    },
    currency: {
      type: String,
      default: 'USD'
    }
  },
  
  // Shopping History
  orderHistory: {
    totalOrders: {
      type: Number,
      default: 0
    },
    totalSpent: {
      type: Number,
      default: 0
    },
    averageOrderValue: {
      type: Number,
      default: 0
    },
    lastOrderDate: Date,
    favoriteCategories: [{
      type: String
    }]
  },
  
  // Wishlist
  wishlist: [{
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product'
    },
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Business'
    },
    addedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Login tracking
  lastLogin: Date,
  loginCount: {
    type: Number,
    default: 0
  },
  
  // Security
  failedLoginAttempts: {
    type: Number,
    default: 0
  },
  accountLockedUntil: Date,
  
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
customerAccountSchema.index({ email: 1 });
customerAccountSchema.index({ isActive: 1, isVerified: 1 });
customerAccountSchema.index({ createdAt: -1 });
customerAccountSchema.index({ 'orderHistory.totalSpent': -1 });
customerAccountSchema.index({ lastLogin: -1 });

// Pre-save middleware to hash password
customerAccountSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Pre-save middleware to update timestamps
customerAccountSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Instance methods
customerAccountSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

customerAccountSchema.methods.generateVerificationToken = function() {
  const token = Math.random().toString(36).substring(2, 15) + 
                Math.random().toString(36).substring(2, 15);
  this.verificationToken = token;
  this.verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
  return token;
};

customerAccountSchema.methods.generatePasswordResetToken = function() {
  const token = Math.random().toString(36).substring(2, 15) + 
                Math.random().toString(36).substring(2, 15);
  this.passwordResetToken = token;
  this.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
  return token;
};

customerAccountSchema.methods.addToWishlist = function(productId, businessId) {
  const existingItem = this.wishlist.find(
    item => item.product.toString() === productId.toString() && 
            item.businessId.toString() === businessId.toString()
  );
  
  if (!existingItem) {
    this.wishlist.push({
      product: productId,
      businessId: businessId
    });
  }
  
  return this.save();
};

customerAccountSchema.methods.removeFromWishlist = function(productId, businessId) {
  this.wishlist = this.wishlist.filter(
    item => !(item.product.toString() === productId.toString() && 
              item.businessId.toString() === businessId.toString())
  );
  return this.save();
};

customerAccountSchema.methods.addAddress = function(addressData) {
  // If this is the first address or marked as default, make it default
  if (this.addresses.length === 0 || addressData.isDefault) {
    this.addresses.forEach(addr => addr.isDefault = false);
    addressData.isDefault = true;
  }
  
  this.addresses.push(addressData);
  return this.save();
};

customerAccountSchema.methods.updateOrderHistory = function(orderAmount) {
  this.orderHistory.totalOrders += 1;
  this.orderHistory.totalSpent += orderAmount;
  this.orderHistory.averageOrderValue = this.orderHistory.totalSpent / this.orderHistory.totalOrders;
  this.orderHistory.lastOrderDate = new Date();
  return this.save();
};

customerAccountSchema.methods.recordLogin = function() {
  this.lastLogin = new Date();
  this.loginCount += 1;
  this.failedLoginAttempts = 0;
  this.accountLockedUntil = undefined;
  return this.save();
};

customerAccountSchema.methods.recordFailedLogin = function() {
  this.failedLoginAttempts += 1;
  
  // Lock account after 5 failed attempts for 30 minutes
  if (this.failedLoginAttempts >= 5) {
    this.accountLockedUntil = new Date(Date.now() + 30 * 60 * 1000);
  }
  
  return this.save();
};

customerAccountSchema.methods.isAccountLocked = function() {
  return this.accountLockedUntil && this.accountLockedUntil > new Date();
};

// Virtual for full name
customerAccountSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Virtual for default shipping address
customerAccountSchema.virtual('defaultShippingAddress').get(function() {
  return this.addresses.find(addr => addr.type === 'shipping' && addr.isDefault);
});

// Virtual for default billing address
customerAccountSchema.virtual('defaultBillingAddress').get(function() {
  return this.addresses.find(addr => addr.type === 'billing' && addr.isDefault);
});

// Static methods
customerAccountSchema.statics.findByEmail = function(email) {
  return this.findOne({ email: email.toLowerCase() });
};

customerAccountSchema.statics.findActiveCustomers = function() {
  return this.find({ isActive: true, isVerified: true });
};

module.exports = mongoose.model('CustomerAccount', customerAccountSchema);
