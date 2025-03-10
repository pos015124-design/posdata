const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const saleItemSchema = new Schema({
  product: {
    type: Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  total: {
    type: Number,
    required: true,
    min: 0
  }
});

const discountSchema = new Schema({
  type: {
    type: String,
    enum: ['percentage', 'fixed'],
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  code: {
    type: String,
    trim: true
  }
});

const saleSchema = new Schema({
  items: [saleItemSchema],
  customer: {
    type: Schema.Types.ObjectId,
    ref: 'Customer',
    default: null
  },
  subtotal: {
    type: Number,
    required: true,
    min: 0
  },
  tax: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  },
  taxRate: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  },
  taxIncluded: {
    type: Boolean,
    default: false
  },
  discounts: [discountSchema],
  total: {
    type: Number,
    required: true,
    min: 0
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'card', 'mobile', 'credit'],
    required: true
  },
  transactionNumber: {
    type: String,
    trim: true
  },
  amountPaid: {
    type: Number,
    required: true,
    min: 0
  },
  change: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  },
  notes: {
    type: String,
    trim: true
  },
  staff: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Create indexes for faster lookups and reporting
saleSchema.index({ createdAt: -1 });
saleSchema.index({ customer: 1 });
saleSchema.index({ staff: 1 });
saleSchema.index({ paymentMethod: 1 });

module.exports = mongoose.model('Sale', saleSchema);