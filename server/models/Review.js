/**
 * Review Model — customer ratings and feedback for sellers/stores
 */
const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  // The business/store being reviewed
  businessId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Business',
    required: true,
    index: true
  },
  businessSlug: { type: String, trim: true, index: true },

  // Reviewer info (guest or registered customer)
  reviewerName: { type: String, required: true, trim: true, maxlength: 100 },
  reviewerEmail: { type: String, trim: true, lowercase: true },

  // Rating 1–5
  rating: { type: Number, required: true, min: 1, max: 5, index: true },

  // Written feedback
  comment: { type: String, trim: true, maxlength: 1000 },

  // Moderation
  isApproved: { type: Boolean, default: true, index: true },
  isVerifiedPurchase: { type: Boolean, default: false },

  // Optional: which order/sale this relates to
  saleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Sale' }
}, { timestamps: true });

reviewSchema.index({ businessId: 1, isApproved: 1, createdAt: -1 });

module.exports = mongoose.model('Review', reviewSchema);
