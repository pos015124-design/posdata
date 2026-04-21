/**
 * Tenant Model for Multi-Tenant Architecture
 * Stores organization-level information and settings
 */

const mongoose = require('mongoose');

const tenantSchema = new mongoose.Schema({
  tenantId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  domain: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  adminEmail: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  plan: {
    type: String,
    enum: ['basic', 'professional', 'enterprise'],
    default: 'basic'
  },
  status: {
    type: String,
    enum: ['active', 'suspended', 'inactive'],
    default: 'active'
  },
  settings: {
    maxUsers: {
      type: Number,
      default: 10
    },
    maxProducts: {
      type: Number,
      default: 1000
    },
    maxOrders: {
      type: Number,
      default: 10000
    },
    maxStorage: {
      type: Number,
      default: 1000 // MB
    },
    features: [{
      type: String
    }],
    ecommerce: {
      enabled: {
        type: Boolean,
        default: true
      },
      allowMultipleBusinesses: {
        type: Boolean,
        default: false
      },
      allowCustomerRegistration: {
        type: Boolean,
        default: true
      },
      allowGuestCheckout: {
        type: Boolean,
        default: true
      },
      paymentMethods: [{
        type: String,
        enum: ['cash', 'card', 'mobile', 'online', 'bank_transfer']
      }],
      shippingEnabled: {
        type: Boolean,
        default: false
      },
      taxCalculation: {
        type: String,
        enum: ['none', 'simple', 'advanced'],
        default: 'simple'
      }
    },
    branding: {
      logo: String,
      primaryColor: {
        type: String,
        default: '#2563eb'
      },
      secondaryColor: {
        type: String,
        default: '#1f2937'
      },
      accentColor: {
        type: String,
        default: '#f59e0b'
      }
    },
    notifications: {
      email: {
        type: Boolean,
        default: true
      },
      webhook: {
        type: Boolean,
        default: false
      },
      webhookUrl: String,
      orderNotifications: {
        type: Boolean,
        default: true
      },
      lowStockNotifications: {
        type: Boolean,
        default: true
      }
    },
    timezone: {
      type: String,
      default: 'UTC'
    },
    currency: {
      type: String,
      default: 'USD'
    },
    locale: {
      type: String,
      default: 'en-US'
    }
  },
  billing: {
    plan: {
      type: String,
      enum: ['basic', 'professional', 'enterprise'],
      default: 'basic'
    },
    billingCycle: {
      type: String,
      enum: ['monthly', 'yearly'],
      default: 'monthly'
    },
    nextBillingDate: Date,
    lastPaymentDate: Date,
    paymentMethod: {
      type: String,
      enum: ['credit_card', 'bank_transfer', 'paypal'],
      default: 'credit_card'
    }
  },
  usage: {
    users: {
      type: Number,
      default: 0
    },
    products: {
      type: Number,
      default: 0
    },
    orders: {
      type: Number,
      default: 0
    },
    customers: {
      type: Number,
      default: 0
    },
    businesses: {
      type: Number,
      default: 0
    },
    sales: {
      type: Number,
      default: 0
    },
    revenue: {
      type: Number,
      default: 0
    },
    apiCalls: {
      type: Number,
      default: 0
    },
    storage: {
      type: Number,
      default: 0
    },
    bandwidth: {
      type: Number,
      default: 0
    },
    lastUpdated: {
      type: Date,
      default: Date.now
    }
  },
  metadata: {
    industry: String,
    companySize: {
      type: String,
      enum: ['1-10', '11-50', '51-200', '201-1000', '1000+']
    },
    country: String,
    referralSource: String
  }
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
tenantSchema.index({ tenantId: 1 });
tenantSchema.index({ domain: 1 });
tenantSchema.index({ status: 1 });
tenantSchema.index({ 'billing.nextBillingDate': 1 });
tenantSchema.index({ createdAt: -1 });

// Virtual for full tenant info
tenantSchema.virtual('isActive').get(function() {
  return this.status === 'active';
});

// Methods
tenantSchema.methods.updateUsage = async function(usageData) {
  this.usage = {
    ...this.usage,
    ...usageData,
    lastUpdated: new Date()
  };
  return this.save();
};

tenantSchema.methods.hasFeature = function(feature) {
  return this.settings.features.includes(feature);
};

tenantSchema.methods.isWithinLimits = function(resource, count) {
  const limits = {
    users: this.settings.maxUsers,
    products: this.settings.maxProducts
  };
  
  return count < (limits[resource] || Infinity);
};

// Static methods
tenantSchema.statics.findByDomain = function(domain) {
  return this.findOne({ domain: domain.toLowerCase() });
};

tenantSchema.statics.findActive = function() {
  return this.find({ status: 'active' });
};

tenantSchema.statics.getUsageStats = async function() {
  return this.aggregate([
    {
      $group: {
        _id: '$plan',
        count: { $sum: 1 },
        totalUsers: { $sum: '$usage.users' },
        totalProducts: { $sum: '$usage.products' },
        totalSales: { $sum: '$usage.sales' }
      }
    }
  ]);
};

// Pre-save middleware
tenantSchema.pre('save', function(next) {
  if (this.isNew) {
    // Set default billing date for new tenants
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    this.billing.nextBillingDate = nextMonth;
  }
  next();
});

// Post-save middleware
tenantSchema.post('save', function(doc) {
  // Log tenant creation/updates
  console.log(`Tenant ${doc.tenantId} saved with status: ${doc.status}`);
});

module.exports = mongoose.model('Tenant', tenantSchema);
