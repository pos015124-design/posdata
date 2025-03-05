const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  code: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  barcode: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  purchasePrice: {
    type: Number,
    required: true,
    min: 0
  },
  stock: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  },
  category: {
    type: String,
    required: true,
    trim: true
  },
  supplier: {
    type: String,
    required: true,
    trim: true
  },
  reorderPoint: {
    type: Number,
    required: true,
    default: 10,
    min: 0
  },
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

// Create index on barcode for faster lookups
productSchema.index({ barcode: 1 });

module.exports = mongoose.model('Product', productSchema);