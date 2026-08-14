const Notification = require('../models/Notification');

/**
 * Persist a notification for a user.
 * Never throws — logging only, so callers can fire it from anywhere.
 * Also pushes a real-time event to the user's live sockets (if any) so the
 * bell updates instantly without waiting for the next poll.
 */
const createNotification = async ({ userId, type, title, message, link }) => {
  if (!userId) return null;
  try {
    const notification = await Notification.create({
      userId,
      type: type || 'system',
      title,
      message,
      link: link || '',
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

module.exports = { createNotification, getUnreadCount };
