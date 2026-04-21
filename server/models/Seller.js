/**
 * Seller Model for Multi-Vendor Marketplace
 * Represents individual sellers/vendors in the marketplace
 * Each seller has their own inventory, pricing, and stock for products in the Global Catalog
 */

const mongoose = require('mongoose');

const sellerSchema = new mongoose.Schema({
  // Seller Identity
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true
  },
  
  // Business Information
  businessName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200,
    index: true
  },
  businessDescription: {
    type: String,
    trim: true,
    maxlength: 1000
  },
  businessLogo: {
    type: String,
    trim: true
  },
  
  // Contact Information
  contactEmail: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
    index: true
  },
  contactPhone: {
    type: String,
    trim: true
  },
  address: {
    street: String,
    city: String,
    state: String,
    country: String,
    postalCode: String
  },
  
  // Seller Status
  status: {
    type: String,
    enum: ['pending', 'active', 'suspended', 'inactive'],
    default: 'pending',
    index: true
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  verifiedAt: Date,
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Seller Settings
  settings: {
    autoAcceptOrders: {
      type: Boolean,
      default: true
    },
    notifyOnNewOrder: {
      type: Boolean,
      default: true
    },
    lowStockThreshold: {
      type: Number,
      default: 10,
      min: 0
    },
    currency: {
      type: String,
      default: 'TZS'
    },
    taxRate: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    paymentMethods: [{
      type: String,
      enum: ['cash', 'mobile_money', 'bank_transfer', 'card']
    }]
  },
  
  // Seller Performance Metrics
  metrics: {
    totalProducts: {
      type: Number,
      default: 0
    },
    totalSales: {
      type: Number,
      default: 0
    },
    totalRevenue: {
      type: Number,
      default: 0
    },
    totalOrders: {
      type: Number,
      default: 0
    },
    averageRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    totalRatings: {
      type: Number,
      default: 0
    },
    responseTime: {
      type: Number, // in minutes
      default: 0
    },
    lastOrderDate: Date
  },
  
  // Banking/Payment Information (for payouts)
  paymentInfo: {
    bankName: String,
    accountName: String,
    accountNumber: String,
    mobileMoneyNumber: String,
    mobileMoneyProvider: {
      type: String,
      enum: ['M-Pesa', 'Tigo Pesa', 'Airtel Money', 'Halopesa']
    }
  },
  
  // Approval Information
  approvalNotes: String,
  approvedAt: Date,
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  suspendedAt: Date,
  suspendedReason: String
  
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      delete ret.__v;
      return ret;
    }
  }
});

// Indexes for performance
sellerSchema.index({ userId: 1, status: 1 });
sellerSchema.index({ businessName: 1 });
sellerSchema.index({ contactEmail: 1 });
sellerSchema.index({ status: 1, isVerified: 1 });
sellerSchema.index({ 'metrics.totalRevenue': -1 });
sellerSchema.index({ 'metrics.averageRating': -1 });
sellerSchema.index({ createdAt: -1 });

// Virtual for seller rating display
sellerSchema.virtual('ratingDisplay').get(function() {
  return this.metrics?.averageRating?.toFixed(1) || '0.0';
});

// Virtual for active status
sellerSchema.virtual('isActive').get(function() {
  return this.status === 'active' && this.isVerified;
});

// Methods
sellerSchema.methods.incrementSales = function(amount) {
  this.metrics.totalSales += 1;
  this.metrics.totalRevenue += amount;
  this.metrics.lastOrderDate = new Date();
  return this.save();
};

sellerSchema.methods.updateProductCount = function(count) {
  this.metrics.totalProducts = count;
  return this.save();
};

sellerSchema.methods.addRating = function(rating) {
  const totalRatings = this.metrics.totalRatings || 0;
  const currentAvg = this.metrics.averageRating || 0;
  
  this.metrics.totalRatings = totalRatings + 1;
  this.metrics.averageRating = ((currentAvg * totalRatings) + rating) / this.metrics.totalRatings;
  
  return this.save();
};

// Static methods
sellerSchema.statics.findActiveSellers = function() {
  return this.find({ status: 'active', isVerified: true });
};

sellerSchema.statics.findByUserId = function(userId) {
  return this.findOne({ userId });
};

sellerSchema.statics.findTopSellers = function(limit = 10) {
  return this.find({ status: 'active', isVerified: true })
    .sort({ 'metrics.totalRevenue': -1 })
    .limit(limit);
};

sellerSchema.statics.searchSellers = function(query) {
  return this.find({
    $or: [
      { businessName: { $regex: query, $options: 'i' } },
      { contactEmail: { $regex: query, $options: 'i' } }
    ],
    status: 'active',
    isVerified: true
  });
};

// Pre-save middleware
sellerSchema.pre('save', function(next) {
  // Generate slug from business name if needed
  if (this.isModified('businessName')) {
    this.businessName = this.businessName.trim();
  }
  next();
});

// Post-save middleware
sellerSchema.post('save', function(doc) {
  console.log(`Seller ${doc.businessName} saved with status: ${doc.status}`);
});

module.exports = mongoose.model('Seller', sellerSchema);
