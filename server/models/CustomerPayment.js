const mongoose = require('mongoose');

const customerPaymentSchema = new mongoose.Schema({
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'bank', 'mobile_money', 'other'],
    required: true
  },
  reference: {
    type: String,
    trim: true
  },
  notes: {
    type: String,
    trim: true
  },
  date: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Create indexes for faster lookups
customerPaymentSchema.index({ customer: 1 });
customerPaymentSchema.index({ date: 1 });

module.exports = mongoose.model('CustomerPayment', customerPaymentSchema);