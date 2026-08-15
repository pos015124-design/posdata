const mongoose = require('mongoose');

/**
 * ArchivedSale — immutable record of cancelled (failed-payment) storefront sales
 * moved out of the active Sale collection by scripts/archive-cancelled-sales.js.
 *
 * Keeps the audit trail (invoice, items, customer, totals, cancellation note)
 * without cluttering the live delivery / order / fulfillment queries. These are
 * read-only references; never referenced by any live workflow.
 */
const archivedSaleSchema = new mongoose.Schema({
  originalSaleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Sale'
  },
  invoiceNumber: {
    type: String,
    required: true,
    index: true
  },
  source: { type: String, default: 'storefront' },
  items: [{
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    productName: String,
    quantity: Number,
    price: Number,
    total: Number
  }],
  subtotal: Number,
  tax: { type: Number, default: 0 },
  discount: { type: Number, default: 0 },
  total: Number,
  paymentMethod: String,
  paymentStatus: String,
  status: { type: String, default: 'cancelled' },
  notes: String,
  // Customer snapshot (super-admin only reference — never surfaced to sellers)
  customerName: String,
  customerEmail: String,
  customerPhone: String,
  customerCity: String,
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  saleCreatedAt: Date,
  cancelledAt: Date,
  archivedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

archivedSaleSchema.index({ archivedAt: -1 });
archivedSaleSchema.index({ invoiceNumber: 1 });

module.exports = mongoose.model('ArchivedSale', archivedSaleSchema);
