/**
 * Cart Model for Shopping Cart Functionality
 * Handles customer shopping cart items and session management
 */

const mongoose = require('mongoose');

const cartItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  productName: {
    type: String,
    required: true,
    trim: true
  },
  productCode: {
    type: String,
    required: true,
    trim: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
    default: 1
  },
  subtotal: {
    type: Number,
    required: true,
    min: 0
  },
  // Store product details at time of adding to cart
  productSnapshot: {
    category: String,
    description: String,
    image: String,
    inStock: Boolean,
    stockQuantity: Number
  },
  addedAt: {
    type: Date,
    default: Date.now
  }
}, { _id: false });

const cartSchema = new mongoose.Schema({
  // Customer identification
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CustomerAccount',
    default: null // null for guest carts
  },
  sessionId: {
    type: String,
    required: true,
    index: true
  },
  
  // Business association
  businessId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Business',
    required: true,
    index: true
  },
  tenantId: {
    type: String,
    required: true,
    index: true
  },
  
  // Cart items
  items: [cartItemSchema],
  
  // Cart totals
  subtotal: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  },
  taxAmount: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  },
  taxRate: {
    type: Number,
    required: true,
    default: 0,
    min: 0,
    max: 1
  },
  total: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  },
  
  // Cart metadata
  itemCount: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  },
  currency: {
    type: String,
    default: 'USD'
  },
  
  // Cart status
  status: {
    type: String,
    enum: ['active', 'abandoned', 'converted', 'expired'],
    default: 'active'
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
  },
  lastActivity: {
    type: Date,
    default: Date.now,
    index: true
  },
  expiresAt: {
    type: Date,
    default: function() {
      // Cart expires after 7 days of inactivity
      return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    },
    index: true
  }
}, {
  timestamps: true
});

// Indexes for performance
cartSchema.index({ customerId: 1, businessId: 1 });
cartSchema.index({ sessionId: 1, businessId: 1 });
cartSchema.index({ tenantId: 1, status: 1 });
cartSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index
cartSchema.index({ lastActivity: 1 });
cartSchema.index({ createdAt: -1 });

// Pre-save middleware to calculate totals
cartSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  this.lastActivity = new Date();
  
  // Calculate cart totals
  this.subtotal = this.items.reduce((sum, item) => sum + item.subtotal, 0);
  this.itemCount = this.items.reduce((sum, item) => sum + item.quantity, 0);
  this.taxAmount = this.subtotal * this.taxRate;
  this.total = this.subtotal + this.taxAmount;
  
  // Update expiration date
  this.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  
  next();
});

// Pre-save middleware to calculate item subtotals
cartSchema.pre('save', function(next) {
  this.items.forEach(item => {
    item.subtotal = item.price * item.quantity;
  });
  next();
});

// Instance methods
cartSchema.methods.addItem = function(productData, quantity = 1) {
  const existingItemIndex = this.items.findIndex(
    item => item.product.toString() === productData._id.toString()
  );
  
  if (existingItemIndex > -1) {
    // Update existing item
    this.items[existingItemIndex].quantity += quantity;
    this.items[existingItemIndex].subtotal = 
      this.items[existingItemIndex].price * this.items[existingItemIndex].quantity;
  } else {
    // Add new item
    this.items.push({
      product: productData._id,
      productName: productData.name,
      productCode: productData.code,
      price: productData.price,
      quantity: quantity,
      subtotal: productData.price * quantity,
      productSnapshot: {
        category: productData.category,
        description: productData.description,
        image: productData.image,
        inStock: productData.stock > 0,
        stockQuantity: productData.stock
      }
    });
  }
  
  return this.save();
};

cartSchema.methods.removeItem = function(productId) {
  this.items = this.items.filter(
    item => item.product.toString() !== productId.toString()
  );
  return this.save();
};

cartSchema.methods.updateItemQuantity = function(productId, quantity) {
  const item = this.items.find(
    item => item.product.toString() === productId.toString()
  );
  
  if (item) {
    if (quantity <= 0) {
      return this.removeItem(productId);
    } else {
      item.quantity = quantity;
      item.subtotal = item.price * quantity;
      return this.save();
    }
  }
  
  throw new Error('Item not found in cart');
};

cartSchema.methods.clearCart = function() {
  this.items = [];
  return this.save();
};

cartSchema.methods.isExpired = function() {
  return new Date() > this.expiresAt;
};

// Static methods
cartSchema.statics.findBySessionAndBusiness = function(sessionId, businessId) {
  return this.findOne({ 
    sessionId, 
    businessId, 
    status: 'active',
    expiresAt: { $gt: new Date() }
  });
};

cartSchema.statics.findByCustomerAndBusiness = function(customerId, businessId) {
  return this.findOne({ 
    customerId, 
    businessId, 
    status: 'active',
    expiresAt: { $gt: new Date() }
  });
};

cartSchema.statics.cleanupExpiredCarts = function() {
  return this.deleteMany({
    $or: [
      { expiresAt: { $lt: new Date() } },
      { status: 'expired' }
    ]
  });
};

// Virtual for cart summary
cartSchema.virtual('summary').get(function() {
  return {
    itemCount: this.itemCount,
    subtotal: this.subtotal,
    taxAmount: this.taxAmount,
    total: this.total,
    currency: this.currency
  };
});

module.exports = mongoose.model('Cart', cartSchema);
