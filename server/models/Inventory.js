const mongoose = require('mongoose');

const inventorySchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
    index: true
  },
  quantity: {
    type: Number,
    required: true,
    default: 0
  },
  minimumStock: {
    type: Number,
    default: 10
  },
  maximumStock: {
    type: Number,
    default: 1000
  },
  location: {
    type: String,
    trim: true
  },
  lastRestocked: {
    type: Date,
    default: Date.now
  },
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    index: true
  }
}, {
  timestamps: true
});

inventorySchema.index({ tenantId: 1, productId: 1 });
inventorySchema.index({ quantity: 1 });

module.exports = mongoose.model('Inventory', inventorySchema);
