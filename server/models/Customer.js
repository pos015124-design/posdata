const mongoose = require('mongoose');
const { encrypt, decrypt } = require('../utils/fieldEncryption');

const customerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    index: true,
    match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please fill a valid email address']
  },
  // PII encrypted at rest (AES-256-GCM). Note: encrypted fields are not
  // searchable — customer search matches name/email only.
  phone: {
    type: String,
    trim: true,
    set: (v) => encrypt(v),
    get: (v) => decrypt(v)
  },
  address: {
    type: String,
    trim: true,
    set: (v) => encrypt(v),
    get: (v) => decrypt(v)
  },
  creditBalance: {
    type: Number,
    default: 0
  },
  totalPurchases: {
    type: Number,
    default: 0
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    index: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  toJSON: { getters: true },
  toObject: { getters: true }
});

// Indexes
customerSchema.index({ name: 1 });
customerSchema.index({ tenantId: 1, name: 1 });

module.exports = mongoose.model('Customer', customerSchema);
