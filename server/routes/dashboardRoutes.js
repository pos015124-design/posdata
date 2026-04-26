/**
 * Dashboard Routes for Real-time Business Intelligence
 * Provides endpoints for dashboard data and WebSocket integration
 */

const express = require('express');
const router = express.Router();
const { requireUser, checkPermission } = require('./middleware/auth');
const AnalyticsService = require('../services/analyticsService');
const webSocketService = require('../services/websocketService');
const { cacheMiddleware } = require('../config/cache');
const { logger } = require('../config/logger');

/**
 * Get dashboard overview data - SCOPED TO CURRENT USER
 */
router.get('/overview',
  requireUser,
  checkPermission('dashboard'),
  async (req, res) => {
    try {
      const { dateRange = 'day' } = req.query;

      // CRITICAL: Pass userId to filter analytics by current user
      const [salesAnalytics, inventoryAnalytics] = await Promise.all([
        AnalyticsService.getSalesAnalytics({ dateRange }, req.user.userId),
        AnalyticsService.getInventoryAnalytics({}, req.user.userId)
      ]);

      const dashboardData = {
        sales: {
          totalRevenue: salesAnalytics.summary.totalRevenue,
          totalSales: salesAnalytics.summary.totalSales,
          averageOrderValue: salesAnalytics.summary.averageOrderValue,
          revenueGrowth: salesAnalytics.summary.revenueGrowth,
          salesGrowth: salesAnalytics.summary.salesGrowth
        },
        inventory: {
          totalProducts: inventoryAnalytics.stockOverview.totalProducts,
          totalStockValue: inventoryAnalytics.stockOverview.totalStockValue,
          lowStockItems: inventoryAnalytics.stockOverview.lowStockItems,
          outOfStockItems: inventoryAnalytics.stockOverview.outOfStockItems
        },
        trends: {
          dailySales: salesAnalytics.dailyTrend,
          topProducts: salesAnalytics.topProducts.slice(0, 5),
          paymentMethods: salesAnalytics.paymentMethods
        },
        alerts: inventoryAnalytics.lowStockItems.slice(0, 5),
        generatedAt: new Date().toISOString()
      };

      res.json({
        success: true,
        data: dashboardData
      });

    } catch (error) {
      logger.error('Failed to get dashboard overview', { error: error.message });
      res.status(500).json({
        error: 'Failed to fetch dashboard data',
        message: error.message
      });
    }
  }
);

module.exports = router;