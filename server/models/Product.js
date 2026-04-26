const mongoose = require('mongoose');

const productVariantSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  value: {
    type: String,
    required: true,
    trim: true
  },
  priceAdjustment: {
    type: Number,
    default: 0
  },
  stockAdjustment: {
    type: Number,
    default: 0
  }
}, { _id: false });

const productImageSchema = new mongoose.Schema({
  url: {
    type: String,
    required: true,
    trim: true
  },
  alt: {
    type: String,
    trim: true
  },
  isPrimary: {
    type: Boolean,
    default: false
  },
  order: {
    type: Number,
    default: 0
  }
}, { _id: false });

const productSchema = new mongoose.Schema({
  // Basic Product Information
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  slug: {
    type: String,
    trim: true,
    lowercase: true,
    index: true
  },
  description: {
    type: String,
    trim: true,
    maxlength: 2000
  },
  shortDescription: {
    type: String,
    trim: true,
    maxlength: 500
  },

  // Product Codes and Identification
  code: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  barcode: {
    type: String,
    trim: true,
    index: true
  },
  sku: {
    type: String,
    trim: true,
    index: true
  },

  // Pricing
  price: {
    type: Number,
    required: true,
    min: 0,
    index: true
  },
  compareAtPrice: {
    type: Number,
    min: 0
  },
  purchasePrice: {
    type: Number,
    required: true,
    min: 0
  },

  // Inventory Management
  stock: {
    type: Number,
    required: true,
    default: 0,
    min: 0,
    index: true
  },
  trackInventory: {
    type: Boolean,
    default: true
  },
  allowBackorder: {
    type: Boolean,
    default: false
  },
  reorderPoint: {
    type: Number,
    required: true,
    default: 10,
    min: 0
  },

  // Categorization
  category: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  subcategory: {
    type: String,
    trim: true
  },
  tags: [{
    type: String,
    trim: true
  }],

  // Supplier Information (Optional)
  supplier: {
    type: String,
    trim: true
  },
  supplierCode: {
    type: String,
    trim: true
  },

  // E-commerce Specific Fields
  isPublished: {
    type: Boolean,
    default: false,
    index: true
  },
  isFeatured: {
    type: Boolean,
    default: false,
    index: true
  },
  isDigital: {
    type: Boolean,
    default: false
  },
  requiresShipping: {
    type: Boolean,
    default: true
  },

  // Product Images
  images: [productImageSchema],

  // Product Variants (size, color, etc.)
  variants: [productVariantSchema],
  hasVariants: {
    type: Boolean,
    default: false
  },

  // Physical Properties
  weight: {
    type: Number,
    min: 0
  },
  dimensions: {
    length: Number,
    width: Number,
    height: Number,
    unit: {
      type: String,
      enum: ['in', 'cm', 'ft', 'm'],
      default: 'in'
    }
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
    sales: {
      type: Number,
      default: 0
    },
    revenue: {
      type: Number,
      default: 0
    },
    lastSold: Date
  },

  // Ownership & Multi-tenant
  businessId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Business',
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  isGlobal: {
    type: Boolean,
    default: false,
    index: true
  },

  // Status
  status: {
    type: String,
    enum: ['active', 'inactive', 'discontinued'],
    default: 'active',
    index: true
  },

  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes for e-commerce performance
productSchema.index({ barcode: 1 });
productSchema.index({ code: 1 });
productSchema.index({ slug: 1 });
productSchema.index({ category: 1, status: 1 });
productSchema.index({ price: 1, status: 1 });
productSchema.index({ isPublished: 1, isFeatured: 1 });
productSchema.index({ stock: 1, trackInventory: 1 });
productSchema.index({ tags: 1 });
productSchema.index({ 'analytics.sales': -1 });
productSchema.index({ createdAt: -1 });
productSchema.index({ userId: 1, status: 1 }); // User's products
productSchema.index({ businessId: 1, status: 1 }); // Business products
productSchema.index({ isGlobal: 1, status: 1 }); // Global catalog

// Compound unique indexes - ensure code/barcode uniqueness per user
productSchema.index({ userId: 1, code: 1 }, { unique: true, partialFilterExpression: { code: { $type: 'string' } } });
productSchema.index({ userId: 1, barcode: 1 }, { unique: true, partialFilterExpression: { barcode: { $type: 'string' } } });

// Text search index for product search
productSchema.index({
  name: 'text',
  description: 'text',
  tags: 'text',
  category: 'text'
});

// Pre-save middleware to generate slug
productSchema.pre('save', function(next) {
  if (!this.slug && this.name) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim('-');
  }

  // Normalize category - trim whitespace
  if (this.category) {
    this.category = this.category.trim();
  }

  // Update timestamp
  this.updatedAt = new Date();

  // Set hasVariants flag
  this.hasVariants = this.variants && this.variants.length > 0;

  next();
});

// Virtual for primary image
productSchema.virtual('primaryImage').get(function() {
  if (!this.images || this.images.length === 0) return null;
  return this.images.find(img => img.isPrimary) || this.images[0];
});

// Virtual for in stock status
productSchema.virtual('inStock').get(function() {
  if (!this.trackInventory) return true;
  return this.stock > 0 || this.allowBackorder;
});

// Virtual for discount percentage
productSchema.virtual('discountPercentage').get(function() {
  if (!this.compareAtPrice || this.compareAtPrice <= this.price) return 0;
  return Math.round(((this.compareAtPrice - this.price) / this.compareAtPrice) * 100);
});

// Instance methods
productSchema.methods.updateStock = function(quantity, operation = 'set') {
  if (operation === 'add') {
    this.stock += quantity;
  } else if (operation === 'subtract') {
    this.stock = Math.max(0, this.stock - quantity);
  } else {
    this.stock = Math.max(0, quantity);
  }
  return this.save();
};

productSchema.methods.recordSale = function(quantity, saleAmount) {
  this.analytics.sales += quantity;
  this.analytics.revenue += saleAmount;
  this.analytics.lastSold = new Date();
  return this.save();
};

productSchema.methods.incrementViews = function() {
  this.analytics.views += 1;
  return this.save();
};

// Static methods
productSchema.statics.findPublished = function() {
  return this.find({ isPublished: true, status: 'active' });
};

productSchema.statics.findFeatured = function() {
  return this.find({ isFeatured: true, isPublished: true, status: 'active' });
};

productSchema.statics.findByCategory = function(category) {
  return this.find({ category, isPublished: true, status: 'active' });
};

productSchema.statics.searchProducts = function(query) {
  return this.find(
    { $text: { $search: query }, isPublished: true, status: 'active' },
    { score: { $meta: 'textScore' } }
  ).sort({ score: { $meta: 'textScore' } });
};

module.exports = mongoose.model('Product', productSchema);