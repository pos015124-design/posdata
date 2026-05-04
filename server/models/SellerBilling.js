/**
 * SellerBilling — tracks fees owed by sellers to BHABY GROUP LTD
 *
 * Three fee types:
 *   registration  — TZS 300,000 one-time setup fee
 *   subscription  — TZS 5,000/month ads/sponsorship fee
 *   commission    — 5% of each completed sale (auto-calculated)
 *
 * Payment is made via bank transfer to PBZ account 0952509001 (BHABY GROUP LTD).
 * Admin marks the record as paid after confirming receipt.
 */
const mongoose = require('mongoose');

const sellerBillingSchema = new mongoose.Schema({
  // The seller (business_admin user)
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  businessId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Business',
    index: true
  },
  businessName: { type: String, trim: true },

  // Fee type
  type: {
    type: String,
    enum: ['registration', 'subscription', 'commission'],
    required: true,
    index: true
  },

  // Amount in TZS
  amount: { type: Number, required: true, min: 0 },

  // For commission: which sale this relates to
  saleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Sale' },
  saleInvoice: { type: String, trim: true },

  // For subscription: billing period
  periodStart: { type: Date },
  periodEnd:   { type: Date },

  // Payment status
  status: {
    type: String,
    enum: ['unpaid', 'paid', 'waived'],
    default: 'unpaid',
    index: true
  },

  // Payment details (filled when seller pays via PBZ)
  paidAt: { type: Date },
  paidBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // super_admin who confirmed
  paymentReference: { type: String, trim: true }, // bank transaction ref from seller

  // Description shown to seller
  description: { type: String, trim: true },

  dueDate: { type: Date }
}, { timestamps: true });

sellerBillingSchema.index({ userId: 1, status: 1 });
sellerBillingSchema.index({ type: 1, status: 1 });
sellerBillingSchema.index({ createdAt: -1 });

module.exports = mongoose.model('SellerBilling', sellerBillingSchema);
