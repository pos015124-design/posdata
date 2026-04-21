/**
 * Business Model for E-commerce Store Profiles
 * Represents public-facing business/store information
 */

const mongoose = require('mongoose');

const businessHoursSchema = new mongoose.Schema({
  day: {
    type: String,
    enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
    required: true
  },
  isOpen: {
    type: Boolean,
    default: true
  },
  openTime: {
    type: String,
    default: '09:00'
  },
  closeTime: {
    type: String,
    default: '17:00'
  }
}, { _id: false });

const socialMediaSchema = new mongoose.Schema({
  platform: {
    type: String,
    enum: ['facebook', 'instagram', 'twitter', 'linkedin', 'youtube', 'tiktok'],
    required: true
  },
  url: {
    type: String,
    required: true,
    trim: true
  }
}, { _id: false });

const businessSchema = new mongoose.Schema({
  // Link to tenant
  tenantId: {
    type: String,
    required: true,
    index: true
  },
  
  // Basic Information
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: /^[a-z0-9-]+$/
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500
  },
  tagline: {
    type: String,
    trim: true,
    maxlength: 100
  },
  
  // Contact Information
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  phone: {
    type: String,
    trim: true
  },
  website: {
    type: String,
    trim: true
  },
  
  // Address
  address: {
    street: {
      type: String,
      trim: true
    },
    city: {
      type: String,
      trim: true
    },
    state: {
      type: String,
      trim: true
    },
    zipCode: {
      type: String,
      trim: true
    },
    country: {
      type: String,
      trim: true,
      default: 'US'
    }
  },
  
  // Business Details
  category: {
    type: String,
    required: true,
    enum: [
      'retail', 'restaurant', 'services', 'electronics', 'clothing', 
      'health', 'beauty', 'automotive', 'home-garden', 'sports',
      'books', 'toys', 'jewelry', 'grocery', 'other'
    ]
  },
  businessType: {
    type: String,
    enum: ['online', 'physical', 'hybrid'],
    default: 'hybrid'
  },
  
  // Visual Branding
  logo: {
    type: String,
    trim: true
  },
  banner: {
    type: String,
    trim: true
  },
  colors: {
    primary: {
      type: String,
      default: '#2563eb'
    },
    secondary: {
      type: String,
      default: '#1f2937'
    },
    accent: {
      type: String,
      default: '#f59e0b'
    }
  },
  
  // Business Hours
  businessHours: [businessHoursSchema],
  timezone: {
    type: String,
    default: 'UTC'
  },
  
  // Social Media
  socialMedia: [socialMediaSchema],
  
  // E-commerce Settings
  ecommerce: {
    enabled: {
      type: Boolean,
      default: true
    },
    currency: {
      type: String,
      default: 'USD'
    },
    taxRate: {
      type: Number,
      default: 0,
      min: 0,
      max: 1
    },
    shippingEnabled: {
      type: Boolean,
      default: false
    },
    pickupEnabled: {
      type: Boolean,
      default: true
    },
    minimumOrderAmount: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  
  // Status and Visibility
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended', 'pending'],
    default: 'pending'
  },
  isPublic: {
    type: Boolean,
    default: false
  },
  featured: {
    type: Boolean,
    default: false
  },
  
  // SEO
  seo: {
    metaTitle: {
      type: String,
      trim: true,
      maxlength: 60
    },
    metaDescription: {
      type: String,
      trim: true,
      maxlength: 160
    },
    keywords: [{
      type: String,
      trim: true
    }]
  },
  
  // Analytics
  analytics: {
    views: {
      type: Number,
      default: 0
    },
    orders: {
      type: Number,
      default: 0
    },
    revenue: {
      type: Number,
      default: 0
    },
    lastOrderDate: Date
  },
  
  // Verification
  verified: {
    type: Boolean,
    default: false
  },
  verificationDate: Date,
  
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
businessSchema.index({ tenantId: 1 });
businessSchema.index({ slug: 1 });
businessSchema.index({ status: 1, isPublic: 1 });
businessSchema.index({ category: 1, status: 1 });
businessSchema.index({ featured: 1, status: 1 });
businessSchema.index({ 'analytics.revenue': -1 });
businessSchema.index({ createdAt: -1 });

// Pre-save middleware to update timestamps
businessSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Generate slug from name if not provided
businessSchema.pre('save', function(next) {
  if (!this.slug && this.name) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim('-');
  }
  next();
});

// Virtual for full address
businessSchema.virtual('fullAddress').get(function() {
  const addr = this.address;
  if (!addr.street) return '';
  
  const parts = [addr.street, addr.city, addr.state, addr.zipCode, addr.country];
  return parts.filter(Boolean).join(', ');
});

// Virtual for business hours display
businessSchema.virtual('isCurrentlyOpen').get(function() {
  if (!this.businessHours || this.businessHours.length === 0) return false;
  
  const now = new Date();
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const currentDay = dayNames[now.getDay()];
  
  const todayHours = this.businessHours.find(h => h.day === currentDay);
  if (!todayHours || !todayHours.isOpen) return false;
  
  const currentTime = now.toTimeString().slice(0, 5);
  return currentTime >= todayHours.openTime && currentTime <= todayHours.closeTime;
});

module.exports = mongoose.model('Business', businessSchema);
