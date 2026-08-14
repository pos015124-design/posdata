/**
 * PaymentSession — a single Selcom checkout order covering one cart checkout.
 *
 * The storefront checkout groups items per seller, producing one Sale per seller.
 * A PaymentSession links those sales to ONE Selcom order so the buyer pays once
 * and the webhook confirms all linked sales together (middleman settlement model).
 */

const mongoose = require('mongoose');

const paymentSessionSchema = new mongoose.Schema({
  // Selcom order id (also used as our public session id for status polling)
  selcomOrderId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  vendor: { type: String, trim: true },

  amount: { type: Number, required: true, min: 0 },
  currency: { type: String, default: 'TZS' },

  // Collection method: 'wallet' (USSD push) | 'card' (till alias / gateway)
  method: {
    type: String,
    enum: ['wallet', 'card'],
    required: true
  },
  phone: { type: String, trim: true }, // normalized msisdn (2557XXXXXXXX)

  customer: {
    name: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    phone: { type: String, trim: true },
    address: { type: String, trim: true },
    city: { type: String, trim: true }
  },
  notes: { type: String, trim: true },

  // The pending sales this payment covers (one per seller)
  sales: [{
    saleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Sale' },
    invoiceNumber: { type: String, trim: true },
    total: { type: Number },
    sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  }],

  // Lifecycle
  status: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'expired'],
    default: 'pending',
    index: true
  },

  // Last known Selcom result
  result: { type: String, trim: true },        // SUCCESS | FAIL | INPROGRESS | AMBIGUOUS
  resultcode: { type: String, trim: true },    // 000 on success
  message: { type: String, trim: true },
  reference: { type: String, trim: true },     // Selcom transaction reference
  transactionId: { type: String, trim: true },

  // Card gateway redirect (from create-till-alias)
  redirectUrl: { type: String, trim: true },

  // USSD push expiry — pending sessions older than this are abandoned
  expiresAt: {
    type: Date,
    index: true
  },

  // Last time we reconciled with Selcom's order-status endpoint (poll throttling)
  syncedAt: {
    type: Date,
    default: null
  },

  paidAt: { type: Date },
  failedAt: { type: Date },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

paymentSessionSchema.index({ status: 1, expiresAt: 1 });

module.exports = mongoose.model('PaymentSession', paymentSessionSchema);
