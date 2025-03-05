const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const inventorySchema = new Schema({
  product: {
    type: Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  productName: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['restock', 'sale', 'adjustment', 'return'],
    required: true
  },
  quantity: {
    type: Number,
    required: true
  },
  previousStock: {
    type: Number,
    required: true
  },
  newStock: {
    type: Number,
    required: true
  },
  unitCost: {
    type: Number,
    min: 0,
    required: function() {
      return this.type === 'restock';
    }
  },
  totalCost: {
    type: Number,
    min: 0,
    required: function() {
      return this.type === 'restock';
    }
  },
  supplier: {
    type: String,
    trim: true,
    required: function() {
      return this.type === 'restock';
    }
  },
  invoiceNumber: {
    type: String,
    trim: true,
    required: function() {
      return this.type === 'restock';
    }
  },
  reference: {
    type: Schema.Types.ObjectId,
    // This could reference a Sale or other document
    refPath: 'referenceModel'
  },
  referenceModel: {
    type: String,
    enum: ['Sale', 'Adjustment']
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
inventorySchema.index({ product: 1 });
inventorySchema.index({ type: 1 });
inventorySchema.index({ createdAt: -1 });
inventorySchema.index({ staff: 1 });

module.exports = mongoose.model('Inventory', inventorySchema);