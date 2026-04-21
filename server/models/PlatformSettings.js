/**
 * PlatformSettings Model for Global Platform Configuration
 * Manages platform-wide settings and configurations
 */

const mongoose = require('mongoose');

const platformSettingsSchema = new mongoose.Schema({
  // Platform Information
  platformName: {
    type: String,
    default: 'Dukani E-commerce Platform'
  },
  platformVersion: {
    type: String,
    default: '2.0.0'
  },
  platformDescription: {
    type: String,
    default: 'Multi-tenant e-commerce platform for businesses'
  },
  
  // Landing Page Settings
  landingPage: {
    enabled: {
      type: Boolean,
      default: true
    },
    title: {
      type: String,
      default: 'Dukani - Your E-commerce Solution'
    },
    subtitle: {
      type: String,
      default: 'Build and manage your online store with ease'
    },
    heroImage: String,
    features: [{
      title: String,
      description: String,
      icon: String
    }],
    testimonials: [{
      name: String,
      business: String,
      content: String,
      rating: {
        type: Number,
        min: 1,
        max: 5
      }
    }],
    ctaText: {
      type: String,
      default: 'Start Your Free Trial'
    },
    ctaUrl: {
      type: String,
      default: '/register'
    }
  },
  
  // Business Registration Settings
  businessRegistration: {
    enabled: {
      type: Boolean,
      default: true
    },
    requireApproval: {
      type: Boolean,
      default: true
    },
    autoApprove: {
      type: Boolean,
      default: false
    },
    requiredFields: [{
      type: String,
      enum: ['name', 'email', 'phone', 'address', 'businessType', 'category', 'description']
    }],
    allowedCategories: [{
      type: String
    }],
    defaultPlan: {
      type: String,
      enum: ['basic', 'professional', 'enterprise'],
      default: 'basic'
    },
    trialPeriod: {
      type: Number,
      default: 30 // days
    }
  },
  
  // Payment and Billing
  billing: {
    enabled: {
      type: Boolean,
      default: false
    },
    currency: {
      type: String,
      default: 'USD'
    },
    plans: [{
      name: String,
      price: Number,
      billingCycle: {
        type: String,
        enum: ['monthly', 'yearly']
      },
      features: [String],
      limits: {
        users: Number,
        products: Number,
        orders: Number,
        storage: Number
      }
    }],
    paymentMethods: [{
      type: String,
      enum: ['stripe', 'paypal', 'bank_transfer']
    }],
    taxRate: {
      type: Number,
      default: 0,
      min: 0,
      max: 1
    }
  },
  
  // Email Settings
  email: {
    enabled: {
      type: Boolean,
      default: true
    },
    provider: {
      type: String,
      enum: ['smtp', 'sendgrid', 'mailgun', 'ses'],
      default: 'smtp'
    },
    fromEmail: {
      type: String,
      default: 'noreply@dukani.com'
    },
    fromName: {
      type: String,
      default: 'Dukani Platform'
    },
    templates: {
      welcome: {
        subject: String,
        body: String
      },
      businessApproval: {
        subject: String,
        body: String
      },
      businessRejection: {
        subject: String,
        body: String
      },
      passwordReset: {
        subject: String,
        body: String
      },
      orderConfirmation: {
        subject: String,
        body: String
      }
    }
  },
  
  // Security Settings
  security: {
    passwordMinLength: {
      type: Number,
      default: 6
    },
    passwordRequireSpecialChar: {
      type: Boolean,
      default: false
    },
    passwordRequireNumber: {
      type: Boolean,
      default: false
    },
    passwordRequireUppercase: {
      type: Boolean,
      default: false
    },
    maxLoginAttempts: {
      type: Number,
      default: 5
    },
    lockoutDuration: {
      type: Number,
      default: 30 // minutes
    },
    sessionTimeout: {
      type: Number,
      default: 24 // hours
    },
    twoFactorAuth: {
      enabled: {
        type: Boolean,
        default: false
      },
      required: {
        type: Boolean,
        default: false
      }
    }
  },
  
  // File Upload Settings
  uploads: {
    maxFileSize: {
      type: Number,
      default: 5 // MB
    },
    allowedTypes: [{
      type: String,
      default: ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    }],
    storage: {
      type: String,
      enum: ['local', 's3', 'cloudinary'],
      default: 'local'
    },
    cdnEnabled: {
      type: Boolean,
      default: false
    },
    cdnUrl: String
  },
  
  // Analytics and Tracking
  analytics: {
    enabled: {
      type: Boolean,
      default: true
    },
    googleAnalytics: {
      enabled: {
        type: Boolean,
        default: false
      },
      trackingId: String
    },
    dataRetention: {
      type: Number,
      default: 365 // days
    }
  },
  
  // API Settings
  api: {
    rateLimit: {
      enabled: {
        type: Boolean,
        default: true
      },
      requestsPerMinute: {
        type: Number,
        default: 100
      },
      requestsPerHour: {
        type: Number,
        default: 1000
      }
    },
    cors: {
      enabled: {
        type: Boolean,
        default: true
      },
      allowedOrigins: [{
        type: String
      }]
    },
    webhooks: {
      enabled: {
        type: Boolean,
        default: false
      },
      maxRetries: {
        type: Number,
        default: 3
      },
      timeout: {
        type: Number,
        default: 30 // seconds
      }
    }
  },
  
  // Maintenance and System
  maintenance: {
    enabled: {
      type: Boolean,
      default: false
    },
    message: {
      type: String,
      default: 'System is under maintenance. Please try again later.'
    },
    allowedIPs: [{
      type: String
    }],
    scheduledStart: Date,
    scheduledEnd: Date
  },
  
  // Feature Flags
  features: {
    multiTenancy: {
      type: Boolean,
      default: true
    },
    ecommerce: {
      type: Boolean,
      default: true
    },
    pos: {
      type: Boolean,
      default: true
    },
    inventory: {
      type: Boolean,
      default: true
    },
    analytics: {
      type: Boolean,
      default: true
    },
    reports: {
      type: Boolean,
      default: true
    },
    mobileApp: {
      type: Boolean,
      default: false
    }
  },
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  lastModifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Ensure only one settings document exists
platformSettingsSchema.index({}, { unique: true });

// Pre-save middleware
platformSettingsSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Static method to get or create settings
platformSettingsSchema.statics.getSettings = async function() {
  let settings = await this.findOne();
  if (!settings) {
    settings = new this({});
    await settings.save();
  }
  return settings;
};

// Static method to update settings
platformSettingsSchema.statics.updateSettings = async function(updates, userId) {
  const settings = await this.getSettings();
  Object.assign(settings, updates);
  settings.lastModifiedBy = userId;
  return settings.save();
};

module.exports = mongoose.model('PlatformSettings', platformSettingsSchema);
