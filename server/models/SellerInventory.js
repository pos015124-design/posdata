/**
 * SellerInventory Model for Multi-Vendor Marketplace
 * Links a Seller to a Product (from Global Catalog) with seller-specific pricing and stock
 * This is the core model that enables multiple sellers to sell the same product at different prices
 */

const mongoose = require('mongoose');

const sellerInventorySchema = new mongoose.Schema({
  // References
  seller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Seller',
    required: true,
    index: true
  },
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
    index: true
  },
  
  // Seller-Specific Pricing (can differ from catalog price)
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
  
  // Seller-Specific Stock
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
    default: 10,
    min: 0
  },
  
  // Product Identification (Seller can have their own barcode/SKU)
  barcode: {
    type: String,
    trim: true,
    index: true,
    sparse: true // Allow multiple null/undefined values
  },
  sku: {
    type: String,
    trim: true,
    index: true,
    sparse: true
  },
  
  // Variant Attributes (Color, Size, etc.)
  variantAttributes: {
    color: String,
    size: String,
    material: String,
    style: String,
    other: String
  },
  
  // Additional seller-specific details
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
      enum: ['cm', 'inch'],
      default: 'cm'
    }
  },
  
  // Status
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  
  // Seller's product condition
  condition: {
    type: String,
    enum: ['new', 'refurbished', 'used', 'like_new'],
    default: 'new'
  },
  
  // Seller-specific description (can override catalog description)
  customDescription: {
    type: String,
    trim: true,
    maxlength: 2000
  },
  
  // Images (Seller can add their own product images)
  images: [{
    url: String,
    alt: String,
    isPrimary: {
      type: Boolean,
      default: false
    },
    order: {
      type: Number,
      default: 0
    }
  }],
  
  // Seller Performance for this product
  metrics: {
    totalSold: {
      type: Number,
      default: 0
    },
    totalRevenue: {
      type: Number,
      default: 0
    },
    lastSoldAt: Date,
    views: {
      type: Number,
      default: 0
    }
  },
  
  // Stock Management
  lowStockAlert: {
    type: Boolean,
    default: false
  },
  outOfStockSince: Date,
  
  // Timestamps
  listedAt: {
    type: Date,
    default: Date.now
  },
  lastRestockedAt: Date
  
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      delete ret.__v;
      return ret;
    }
  }
});

// Compound unique index: Each seller can only have ONE inventory entry per product
sellerInventorySchema.index({ seller: 1, product: 1 }, { unique: true });

// Indexes for performance
sellerInventorySchema.index({ seller: 1, isActive: 1 });
sellerInventorySchema.index({ product: 1, isActive: 1 });
sellerInventorySchema.index({ price: 1 });
sellerInventorySchema.index({ stock: 1 });
sellerInventorySchema.index({ barcode: 1 });
sellerInventorySchema.index({ sku: 1 });
sellerInventorySchema.index({ isActive: 1, stock: 1 });
sellerInventorySchema.index({ 'metrics.totalSold': -1 });
sellerInventorySchema.index({ createdAt: -1 });

// Virtual for stock status
sellerInventorySchema.virtual('stockStatus').get(function() {
  if (this.stock <= 0) return 'out_of_stock';
  if (this.stock <= this.reorderPoint) return 'low_stock';
  return 'in_stock';
});

// Virtual for profit margin
sellerInventorySchema.virtual('profitMargin').get(function() {
  if (this.purchasePrice <= 0) return 0;
  return ((this.price - this.purchasePrice) / this.price * 100).toFixed(2);
});

// Methods
sellerInventorySchema.methods.reduceStock = function(quantity) {
  if (!this.trackInventory && !this.allowBackorder && this.stock < quantity) {
    throw new Error('Insufficient stock');
  }
  
  this.stock = Math.max(0, this.stock - quantity);
  this.metrics.totalSold += quantity;
  this.metrics.totalRevenue += (this.price * quantity);
  this.metrics.lastSoldAt = new Date();
  
  // Update stock alerts
  if (this.stock <= 0) {
    this.outOfStockSince = new Date();
    this.lowStockAlert = false;
  } else if (this.stock <= this.reorderPoint) {
    this.lowStockAlert = true;
  }
  
  return this.save();
};

sellerInventorySchema.methods.addStock = function(quantity) {
  this.stock += quantity;
  this.lastRestockedAt = new Date();
  
  // Clear alerts if stock is sufficient
  if (this.stock > this.reorderPoint) {
    this.lowStockAlert = false;
    this.outOfStockSince = undefined;
  }
  
  return this.save();
};

sellerInventorySchema.methods.recordView = function() {
  this.metrics.views += 1;
  return this.save();
};

// Static methods
sellerInventorySchema.statics.findBySellerAndProduct = function(sellerId, productId) {
  return this.findOne({ seller: sellerId, product: productId });
};

sellerInventorySchema.statics.findBySeller = function(sellerId, options = {}) {
  const query = { seller: sellerId };
  if (options.isActive !== undefined) query.isActive = options.isActive;
  if (options.inStockOnly) query.stock = { $gt: 0 };
  
  return this.find(query)
    .populate('product', 'name code barcode category')
    .sort({ createdAt: -1 });
};

sellerInventorySchema.statics.findByProduct = function(productId) {
  return this.find({ product: productId, isActive: true })
    .populate('seller', 'businessName contactEmail status')
    .sort({ price: 1 }); // Sort by price (lowest first)
};

sellerInventorySchema.statics.findLowStockBySeller = function(sellerId) {
  return this.find({
    seller: sellerId,
    stock: { $lte: mongoose.Types.ObjectId(sellerId) ? 10 : '$reorderPoint' },
    stock: { $gt: 0 },
    isActive: true
  }).populate('product', 'name code');
};

sellerInventorySchema.statics.searchByBarcode = function(barcode) {
  return this.findOne({ barcode, isActive: true })
    .populate('product')
    .populate('seller');
};

sellerInventorySchema.statics.getBestPrice = function(productId) {
  return this.findOne({ product: productId, isActive: true, stock: { $gt: 0 } })
    .sort({ price: 1 })
    .populate('seller', 'businessName status');
};

sellerInventorySchema.statics.getSellerStats = async function(sellerId) {
  return this.aggregate([
    { $match: { seller: mongoose.Types.ObjectId(sellerId) } },
    {
      $group: {
        _id: null,
        totalProducts: { $sum: 1 },
        totalStock: { $sum: '$stock' },
        totalSold: { $sum: '$metrics.totalSold' },
        totalRevenue: { $sum: '$metrics.totalRevenue' },
        avgPrice: { $avg: '$price' },
        lowStockItems: {
          $sum: { $cond: [{ $and: [{ $gt: ['$stock', 0] }, { $lte: ['$stock', '$reorderPoint'] }] }, 1, 0] }
        },
        outOfStockItems: {
          $sum: { $cond: [{ $eq: ['$stock', 0] }, 1, 0] }
        }
      }
    }
  ]);
};

// Pre-save middleware
sellerInventorySchema.pre('save', function(next) {
  // Validate price is greater than 0 if active
  if (this.isActive && this.price <= 0) {
    next(new Error('Active products must have a price greater than 0'));
  }
  next();
});

// Post-save middleware
sellerInventorySchema.post('save', function(doc) {
  console.log(`SellerInventory: Product ${doc.product} listed by seller ${doc.seller} at ${doc.price}`);
});

module.exports = mongoose.model('SellerInventory', sellerInventorySchema);
