const mongoose = require('mongoose');

const saleSchema = new mongoose.Schema({
  invoiceNumber: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer'
  },
  // Guest / storefront customer info (no account required)
  customerName: { type: String, trim: true },
  customerEmail: { type: String, trim: true, lowercase: true },
  customerPhone: { type: String, trim: true },
  customerAddress: { type: String, trim: true },
  customerCity: { type: String, trim: true },
  // Source: 'pos' (staff-created) | 'storefront' (public checkout)
  source: { type: String, enum: ['pos', 'storefront'], default: 'pos' },
  items: [{
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product'
    },
    productName: String,
    quantity: Number,
    price: Number,
    total: Number
  }],
  subtotal: {
    type: Number,
    required: true
  },
  tax: {
    type: Number,
    default: 0
  },
  discount: {
    type: Number,
    default: 0
  },
  total: {
    type: Number,
    required: true
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'card', 'credit', 'mobile'],
    default: 'cash'
  },
  amountPaid: {
    type: Number,
    default: 0
  },
  change: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'cancelled'],
    default: 'completed'
  },
  notes: String,

  // ── Delivery / middleman fields ───────────────────────────────────────────
  // Only populated for storefront orders managed by BHABY GROUP LTD
  deliveryStatus: {
    type: String,
    enum: ['unassigned', 'assigned', 'collected', 'out_for_delivery', 'delivered', 'failed'],
    default: 'unassigned'
  },
  riderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Rider',
    default: null
  },
  riderName:  { type: String, trim: true },
  riderPhone: { type: String, trim: true },
  assignedAt:  { type: Date },
  collectedAt: { type: Date },
  deliveredAt: { type: Date },
  deliveryNotes: { type: String, trim: true },
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    index: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

saleSchema.index({ createdAt: -1 });
saleSchema.index({ tenantId: 1, createdAt: -1 });
saleSchema.index({ createdBy: 1, createdAt: -1 });
saleSchema.index({ source: 1, createdAt: -1 });
saleSchema.index({ deliveryStatus: 1, source: 1 });

module.exports = mongoose.model('Sale', saleSchema);
