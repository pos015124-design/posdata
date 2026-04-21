const mongoose = require('mongoose');

const staffSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
    index: true
  },
  role: {
    type: String,
    enum: ['admin', 'manager', 'cashier', 'staff'],
    default: 'staff'
  },
  permissions: {
    type: Map,
    of: Boolean,
    default: {}
  },
  isActive: {
    type: Boolean,
    default: true
  },
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    index: true
  },
  hiredDate: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

staffSchema.index({ tenantId: 1, email: 1 });
staffSchema.index({ userId: 1 });

module.exports = mongoose.model('Staff', staffSchema);
