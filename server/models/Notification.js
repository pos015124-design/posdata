const mongoose = require('mongoose');

/**
 * Notification — per-user in-app notifications.
 * Powers the bell in the seller dashboard (orders, approvals, low stock, etc.).
 * Read state is per user; entries are pruned by retention so the collection
 * doesn't grow unbounded.
 */
const notificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: ['order', 'sale', 'approval', 'suspension', 'low_stock', 'system'],
    default: 'system'
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  message: {
    type: String,
    required: true,
    trim: true
  },
  link: {
    type: String,
    default: ''
  },
  read: {
    type: Boolean,
    default: false
  },
  readAt: {
    type: Date
  }
}, {
  timestamps: true,
  toJSON: {
    transform: function (doc, ret) {
      delete ret.__v;
      return ret;
    }
  }
});

// Fast lookups: a user's unread feed first, then newest-first
notificationSchema.index({ userId: 1, read: 1, createdAt: -1 });

// Auto-prune old notifications (90 days) so the collection never grows unbounded
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 3600 });

module.exports = mongoose.model('Notification', notificationSchema);
