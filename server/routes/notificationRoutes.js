const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const { requireUser } = require('./middleware/auth');

/**
 * GET /api/notifications?limit=20
 * Current user's notifications, newest first, plus the unread count.
 */
router.get('/', requireUser, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 50);
    const [notifications, unreadCount] = await Promise.all([
      Notification.find({ userId: req.user.userId })
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean(),
      Notification.countDocuments({ userId: req.user.userId, read: false })
    ]);
    res.json({ success: true, notifications, unreadCount });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * GET /api/notifications/unread-count
 * Cheap unread count for polling — keeps the feed endpoint light.
 */
router.get('/unread-count', requireUser, async (req, res) => {
  try {
    const unreadCount = await Notification.countDocuments({ userId: req.user.userId, read: false });
    res.json({ success: true, unreadCount });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * PUT /api/notifications/:id/read
 * Mark a single notification read (owner only).
 */
router.put('/:id/read', requireUser, async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.userId },
      { $set: { read: true, readAt: new Date() } },
      { new: true }
    );
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }
    res.json({ success: true, notification });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * PUT /api/notifications/read-all
 * Mark every unread notification read for the current user.
 */
router.put('/read-all', requireUser, async (req, res) => {
  try {
    await Notification.updateMany(
      { userId: req.user.userId, read: false },
      { $set: { read: true, readAt: new Date() } }
    );
    res.json({ success: true });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
