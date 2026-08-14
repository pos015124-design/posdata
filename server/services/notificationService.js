const Notification = require('../models/Notification');

/**
 * Persist a notification for a user.
 * Never throws — logging only, so callers can fire it from anywhere.
 * Also pushes a real-time event to the user's live sockets (if any) so the
 * bell updates instantly without waiting for the next poll.
 */
const createNotification = async ({ userId, type, title, message, link, ref }) => {
  if (!userId) return null;
  try {
    // Respect per-user notification preferences. Account-critical types
    // (approval, suspension, system) always deliver — they can't be muted.
    const prefKey = type === 'order' || type === 'sale' ? 'orders'
      : type === 'low_stock' ? 'lowStock'
      : null;
    if (prefKey) {
      const User = require('../models/User');
      const user = await User.findById(userId).select('notificationPrefs').lean();
      if (user?.notificationPrefs?.[prefKey] === false) return null;
    }

    const notification = await Notification.create({
      userId,
      type: type || 'system',
      title,
      message,
      link: link || '',
      ref: ref || '',
      read: false
    });

    try {
      const webSocketService = require('./websocketService');
      webSocketService.emitToUser(userId, 'notification', {
        _id: notification._id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        link: notification.link,
        createdAt: notification.createdAt
      });
    } catch (socketErr) {
      // Socket layer is optional — polling fallback covers it
    }

    return notification;
  } catch (err) {
    console.error('[Notification] create failed:', err.message);
    return null;
  }
};

const getUnreadCount = async (userId) => {
  try {
    return await Notification.countDocuments({ userId, read: false });
  } catch {
    return 0;
  }
};

/**
 * Backfill low-stock alerts for products ALREADY at/below their reorder point.
 * Runs at login so sellers immediately see existing low-stock items in the bell.
 * Dedup: only creates one UNREAD low_stock notification per product per crossing
 * (keyed by ref "product:<id>"), so it never re-alerts while the item stays low.
 */
const sweepLowStockNotifications = async (userId) => {
  try {
    const User = require('../models/User');
    const user = await User.findById(userId).select('notificationPrefs').lean();
    if (user?.notificationPrefs?.lowStock === false) return 0;

    const Product = require('../models/Product');
    const products = await Product.find({
      userId,
      $expr: { $lte: ['$stock', '$reorderPoint'] }
    }).select('_id name stock reorderPoint').lean();
    if (!products.length) return 0;

    const refs = products.map(p => `product:${p._id}`);
    const existingRefs = await Notification.find({
      userId,
      type: 'low_stock',
      read: false,
      ref: { $in: refs }
    }).distinct('ref');

    let created = 0;
    for (const p of products) {
      const ref = `product:${p._id}`;
      if (existingRefs.includes(ref)) continue;
      await createNotification({
        userId,
        type: 'low_stock',
        title: 'Low stock alert',
        message: `${p.name} is at or below its reorder point (${p.stock} unit${p.stock === 1 ? '' : 's'} left).`,
        link: '/inventory',
        ref
      });
      created++;
    }
    return created;
  } catch (err) {
    console.error('[Notification] low stock sweep failed:', err.message);
    return 0;
  }
};

module.exports = { createNotification, getUnreadCount, sweepLowStockNotifications };
