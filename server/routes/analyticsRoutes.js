const express = require('express');
const router = express.Router();
const AnalyticsService = require('../services/analyticsService');
const { requireUser } = require('./middleware/auth');

// Get sales analytics
router.get('/sales', requireUser, async (req, res) => {
  try {
    const { dateRange } = req.query;
    const analytics = await AnalyticsService.getSalesAnalytics(dateRange);
    res.json(analytics);
  } catch (error) {
    console.error('Error fetching sales analytics:', error);
    res.status(500).json({ message: error.message });
  }
});
// Get inventory analytics
router.get('/inventory', requireUser, async (req, res) => {
  try {
    const { dateRange } = req.query;
    const analytics = await AnalyticsService.getInventoryAnalytics(dateRange);
    res.json(analytics);
  } catch (error) {
    console.error('Error fetching inventory analytics:', error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;