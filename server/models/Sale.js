const mongoose = require('mongoose');
const { encrypt, decrypt } = require('../utils/fieldEncryption');
const { generateTrackingCode } = require('../utils/trackingCode');

const saleSchema = new mongoose.Schema({
  invoiceNumber: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  // Short customer-facing code (TRK-XXXXX) — the long invoice number is awkward
  // to type on mobile. Accepted by the public tracking endpoints.
  trackingCode: {
    type: String,
    trim: true,
    index: true,
    default: generateTrackingCode
  },
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer'
  },
  // Guest / storefront customer info (no account required). customerEmail stays
  // plaintext — it is the invoice-verification lookup key. The rest is PII
  // encrypted at rest (AES-256-GCM); lean() queries must decrypt via
  // utils/fieldEncryption.decryptFields before exposing these fields.
  customerName: { type: String, trim: true },
  customerEmail: { type: String, trim: true, lowercase: true },
  customerPhone: {
    type: String, trim: true,
    set: (v) => encrypt(v),
    get: (v) => decrypt(v)
  },
  customerAddress: {
    type: String, trim: true,
    set: (v) => encrypt(v),
    get: (v) => decrypt(v)
  },
  customerCity: {
    type: String, trim: true,
    set: (v) => encrypt(v),
    get: (v) => decrypt(v)
  },
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
    enum: ['cash', 'card', 'credit', 'mobile', 'online'],
    default: 'cash'
  },
  // Payment lifecycle for online / Selcom flows. POS & cash sales are 'paid' instantly;
  // storefront Selcom sales start 'pending' until the webhook confirms payment.
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'refunded'],
    default: 'pending'
  },
  // Selcom checkout order id this sale belongs to (aggregate payment covering multiple sellers)
  selcomOrderId: {
    type: String,
    trim: true,
    index: true
  },
  // Selcom transaction reference once payment confirms
  transactionId: {
    type: String,
    trim: true
  },
  paidAt: {
    type: Date
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
    enum: ['pending', 'completed', 'cancelled', 'refunded'],
    default: 'completed'
  },
  notes: String,
  // Refund metadata (super admin initiated on paid storefront orders)
  refundedAt: { type: Date },
  refundedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  refundReason: { type: String, trim: true },

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
  timestamps: true,
  toJSON: { getters: true },
  toObject: { getters: true }
});

saleSchema.index({ createdAt: -1 });
saleSchema.index({ tenantId: 1, createdAt: -1 });
saleSchema.index({ createdBy: 1, createdAt: -1 });
saleSchema.index({ status: 1, createdAt: -1 }); // platform & analytics date-window queries
saleSchema.index({ source: 1, createdAt: -1 });
saleSchema.index({ deliveryStatus: 1, source: 1 });
saleSchema.index({ paymentStatus: 1, createdAt: -1 });
saleSchema.index({ selcomOrderId: 1 });
// Unique where present (default-generates for every doc)
saleSchema.index({ trackingCode: 1 }, { unique: true, partialFilterExpression: { trackingCode: { $type: 'string' } } });

module.exports = mongoose.model('Sale', saleSchema);
