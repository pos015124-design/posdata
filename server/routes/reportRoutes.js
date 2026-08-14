const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * GET /api/reports/unsubscribe?token=<signed>
 * One-click unsubscribe from sales report emails. The token is signed by the
 * digest sender script, so this works without logging in. Re-enabling reports
 * is done from Settings → Notifications.
 */
router.get('/unsubscribe', async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) return res.status(400).send('Missing unsubscribe token.');

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.purpose !== 'report-unsubscribe' || !decoded.userId) {
      return res.status(400).send('This unsubscribe link is invalid.');
    }

    await User.findByIdAndUpdate(decoded.userId, {
      $set: {
        'notificationPrefs.reports': false,
        'notificationPrefs.reportFrequency': 'off'
      }
    });

    res
      .status(200)
      .type('html')
      .send(
        '<div style="font-family:Arial,sans-serif;text-align:center;padding:60px 20px;">' +
        '<h2 style="color:#1f2937;">You have been unsubscribed</h2>' +
        '<p style="color:#4b5563;">You will no longer receive sales report emails from E-Shop.</p>' +
        '<p style="color:#9ca3af;font-size:13px;">You can re-enable them anytime in <strong>Settings → Notifications</strong>.</p>' +
        '</div>'
      );
  } catch (error) {
    res.status(400).send('This unsubscribe link is invalid or expired.');
  }
});

module.exports = router;
