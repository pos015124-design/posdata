const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['cash', 'credit'],
    required: true,
    default: 'cash'
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please fill a valid email address']
  },
  phone: {
    type: String,
    trim: true
  },
  creditLimit: {
    type: Number,
    min: 0,
    default: 0
  },
  currentCredit: {
    type: Number,
    min: 0,
    default: 0
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

// Create indexes for faster lookups
customerSchema.index({ email: 1 });
customerSchema.index({ phone: 1 });

module.exports = mongoose.model('Customer', customerSchema);