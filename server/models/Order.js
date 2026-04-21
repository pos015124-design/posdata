/**
 * Order Model for E-commerce Order Management
 * Handles customer orders, order items, and order lifecycle
 */

const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  // NEW: Reference to Seller (for multi-seller orders)
  seller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Seller',
    required: false // Optional for backward compatibility
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
    min: 1
  },
  subtotal: {
    type: Number,
    required: true,
    min: 0
  },
  // Product snapshot at time of order
  productSnapshot: {
    category: String,
    description: String,
    image: String,
    supplier: String
  }
}, { _id: false });

const shippingAddressSchema = new mongoose.Schema({
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
}, { _id: false });

const orderSchema = new mongoose.Schema({
  // Order identification
  orderNumber: {
    type: String,
    required: true,
    unique: true,
    index: true
  },

  // Customer information
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CustomerAccount',
    default: null // null for guest orders
  },
  customerEmail: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  customerName: {
    type: String,
    required: true,
    trim: true
  },
  customerPhone: {
    type: String,
    trim: true
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

  // NEW: Array of sellers involved in this order (for quick access/filtering)
  sellers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Seller',
    required: false
  }],

  // Order items
  items: [orderItemSchema],
  
  // Order totals
  subtotal: {
    type: Number,
    required: true,
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
  shippingAmount: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  },
  discountAmount: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  },
  total: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    default: 'USD'
  },
  
  // Order status and fulfillment
  status: {
    type: String,
    enum: [
      'pending',      // Order placed, awaiting payment
      'confirmed',    // Payment confirmed, processing
      'processing',   // Order being prepared
      'shipped',      // Order shipped
      'delivered',    // Order delivered
      'completed',    // Order completed
      'cancelled',    // Order cancelled
      'refunded'      // Order refunded
    ],
    default: 'pending',
    index: true
  },
  
  // Fulfillment method
  fulfillmentMethod: {
    type: String,
    enum: ['pickup', 'delivery', 'shipping'],
    required: true
  },
  
  // Shipping information
  shippingAddress: shippingAddressSchema,
  trackingNumber: {
    type: String,
    trim: true
  },
  shippingCarrier: {
    type: String,
    trim: true
  },
  
  // Payment information
  paymentMethod: {
    type: String,
    enum: ['cash', 'card', 'mobile', 'online', 'bank_transfer'],
    required: true
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'refunded', 'partially_refunded'],
    default: 'pending',
    index: true
  },
  transactionId: {
    type: String,
    trim: true
  },
  
  // Order notes and special instructions
  notes: {
    type: String,
    trim: true
  },
  specialInstructions: {
    type: String,
    trim: true
  },
  
  // Staff handling the order
  assignedStaff: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Important dates
  orderDate: {
    type: Date,
    default: Date.now,
    index: true
  },
  confirmedAt: Date,
  shippedAt: Date,
  deliveredAt: Date,
  completedAt: Date,
  cancelledAt: Date,
  
  // Estimated dates
  estimatedShipDate: Date,
  estimatedDeliveryDate: Date,
  
  // Order source
  source: {
    type: String,
    enum: ['online', 'pos', 'phone', 'email'],
    default: 'online'
  },
  
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
orderSchema.index({ orderNumber: 1 });
orderSchema.index({ customerId: 1, orderDate: -1 });
orderSchema.index({ businessId: 1, orderDate: -1 });
orderSchema.index({ tenantId: 1, status: 1 });
orderSchema.index({ status: 1, orderDate: -1 });
orderSchema.index({ paymentStatus: 1 });
orderSchema.index({ customerEmail: 1 });
orderSchema.index({ orderDate: -1 });
orderSchema.index({ total: -1 });

// Pre-save middleware
orderSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  
  // Calculate totals
  this.subtotal = this.items.reduce((sum, item) => sum + item.subtotal, 0);
  this.total = this.subtotal + this.taxAmount + this.shippingAmount - this.discountAmount;
  
  // Update status timestamps
  if (this.isModified('status')) {
    const now = new Date();
    switch (this.status) {
      case 'confirmed':
        if (!this.confirmedAt) this.confirmedAt = now;
        break;
      case 'shipped':
        if (!this.shippedAt) this.shippedAt = now;
        break;
      case 'delivered':
        if (!this.deliveredAt) this.deliveredAt = now;
        break;
      case 'completed':
        if (!this.completedAt) this.completedAt = now;
        break;
      case 'cancelled':
        if (!this.cancelledAt) this.cancelledAt = now;
        break;
    }
  }
  
  next();
});

// Generate order number before saving
orderSchema.pre('save', function(next) {
  if (!this.orderNumber) {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    
    this.orderNumber = `ORD-${year}${month}${day}-${random}`;
  }
  next();
});

// Instance methods
orderSchema.methods.canBeCancelled = function() {
  return ['pending', 'confirmed', 'processing'].includes(this.status);
};

orderSchema.methods.canBeRefunded = function() {
  return ['completed', 'delivered'].includes(this.status) && this.paymentStatus === 'paid';
};

orderSchema.methods.updateStatus = function(newStatus, staffId = null) {
  this.status = newStatus;
  if (staffId) {
    this.assignedStaff = staffId;
  }
  return this.save();
};

orderSchema.methods.addTrackingInfo = function(trackingNumber, carrier) {
  this.trackingNumber = trackingNumber;
  this.shippingCarrier = carrier;
  if (this.status === 'processing') {
    this.status = 'shipped';
  }
  return this.save();
};

// Static methods
orderSchema.statics.generateOrderNumber = function() {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  
  return `ORD-${year}${month}${day}-${random}`;
};

// Virtual for order summary
orderSchema.virtual('summary').get(function() {
  return {
    orderNumber: this.orderNumber,
    status: this.status,
    total: this.total,
    currency: this.currency,
    itemCount: this.items.length,
    orderDate: this.orderDate
  };
});

// Virtual for full customer name
orderSchema.virtual('fullCustomerName').get(function() {
  if (this.shippingAddress) {
    return `${this.shippingAddress.firstName} ${this.shippingAddress.lastName}`;
  }
  return this.customerName;
});

module.exports = mongoose.model('Order', orderSchema);
