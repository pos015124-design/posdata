/**
 * WebSocket Service for Real-time Dashboard Updates
 * Handles Socket.io connections and real-time data broadcasting
 */

const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const { logger } = require('../config/logger');
const Product = require('../models/Product');
const Sale = require('../models/Sale');

class WebSocketService {
  constructor() {
    this.io = null;
    this.connectedUsers = new Map();
    this.dashboardUpdateInterval = null;
    this.notificationQueue = [];
  }

  /**
   * Initialize Socket.io server
   * @param {Object} server - HTTP server instance
   */
  initialize(server) {
    this.io = new Server(server, {
      cors: {
        origin: process.env.CLIENT_URL || "http://localhost:3000",
        methods: ["GET", "POST"],
        credentials: true
      },
      transports: ['websocket', 'polling']
    });

    this.setupMiddleware();
    this.setupEventHandlers();
    this.startDashboardUpdates();

    logger.info('WebSocket service initialized');
  }

  /**
   * Setup authentication middleware for Socket.io
   */
  setupMiddleware() {
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];

        if (!token) {
          return next(new Error('Authentication token required'));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        socket.userId = decoded.userId;
        socket.userRole = decoded.role;

        logger.debug('WebSocket authentication successful', {
          userId: decoded.userId,
          socketId: socket.id
        });

        next();
      } catch (error) {
        logger.error('WebSocket authentication failed', { error: error.message });
        next(new Error('Authentication failed'));
      }
    });
  }

  /**
   * Setup Socket.io event handlers
   */
  setupEventHandlers() {
    this.io.on('connection', (socket) => {
      this.handleConnection(socket);

      socket.on('join-dashboard', (data) => this.handleJoinDashboard(socket, data));
      socket.on('leave-dashboard', () => this.handleLeaveDashboard(socket));
      socket.on('request-analytics', (filters) => this.handleAnalyticsRequest(socket, filters));
      socket.on('customize-dashboard', (layout) => this.handleDashboardCustomization(socket, layout));
      socket.on('disconnect', () => this.handleDisconnection(socket));
    });
  }

  /**
   * Handle new WebSocket connection
   * @param {Object} socket - Socket.io socket instance
   */
  handleConnection(socket) {
    const userInfo = {
      socketId: socket.id,
      userId: socket.userId,
      role: socket.userRole,
      connectedAt: new Date(),
      dashboardActive: false
    };

    this.connectedUsers.set(socket.id, userInfo);

    logger.info('User connected to WebSocket', {
      userId: socket.userId,
      socketId: socket.id,
      totalConnections: this.connectedUsers.size
    });

    // Send initial connection data
    socket.emit('connection-established', {
      message: 'Connected to real-time dashboard',
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Handle user joining dashboard
   * @param {Object} socket - Socket.io socket instance
   * @param {Object} data - Dashboard join data
   */
  async handleJoinDashboard(socket, data = {}) {
    try {
      const userInfo = this.connectedUsers.get(socket.id);
      if (userInfo) {
        userInfo.dashboardActive = true;
        userInfo.dashboardPreferences = data.preferences || {};
      }

      // Join dashboard room for targeted updates
      socket.join('dashboard');

      // Send initial dashboard data
      const initialData = await this.getDashboardData();
      socket.emit('dashboard-data', initialData);

      logger.info('User joined dashboard', {
        userId: socket.userId,
        socketId: socket.id,
        preferences: data.preferences
      });

    } catch (error) {
      logger.error('Error handling dashboard join', { error: error.message });
      socket.emit('error', { message: 'Failed to join dashboard' });
    }
  }

  /**
   * Handle user leaving dashboard
   * @param {Object} socket - Socket.io socket instance
   */
  handleLeaveDashboard(socket) {
    const userInfo = this.connectedUsers.get(socket.id);
    if (userInfo) {
      userInfo.dashboardActive = false;
    }

    socket.leave('dashboard');

    logger.info('User left dashboard', {
      userId: socket.userId,
      socketId: socket.id
    });
  }

  /**
   * Handle analytics data request
   * @param {Object} socket - Socket.io socket instance
   * @param {Object} filters - Analytics filters
   */
  async handleAnalyticsRequest(socket, filters) {
    try {
      // Simplified analytics response for now
      const mockAnalytics = {
        totalSales: 0,
        totalRevenue: 0,
        salesCount: 0,
        averageOrderValue: 0,
        topProducts: [],
        salesTrends: [],
        period: filters.dateRange || 'day'
      };

      socket.emit('analytics-data', {
        type: 'sales',
        data: mockAnalytics,
        timestamp: new Date().toISOString()
      });

      logger.debug('Analytics data sent', {
        userId: socket.userId,
        filters: filters
      });

    } catch (error) {
      logger.error('Error handling analytics request', { error: error.message });
      socket.emit('error', { message: 'Failed to fetch analytics data' });
    }
  }

  /**
   * Handle dashboard customization
   * @param {Object} socket - Socket.io socket instance
   * @param {Object} layout - Dashboard layout configuration
   */
  handleDashboardCustomization(socket, layout) {
    const userInfo = this.connectedUsers.get(socket.id);
    if (userInfo) {
      userInfo.dashboardLayout = layout;
    }

    logger.info('Dashboard customized', {
      userId: socket.userId,
      layout: layout
    });

    socket.emit('dashboard-customization-saved', {
      message: 'Dashboard layout saved successfully',
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Handle WebSocket disconnection
   * @param {Object} socket - Socket.io socket instance
   */
  handleDisconnection(socket) {
    const userInfo = this.connectedUsers.get(socket.id);

    if (userInfo) {
      logger.info('User disconnected from WebSocket', {
        userId: userInfo.userId,
        socketId: socket.id,
        connectedDuration: Date.now() - userInfo.connectedAt.getTime(),
        totalConnections: this.connectedUsers.size - 1
      });
    }

    this.connectedUsers.delete(socket.id);
  }

  /**
   * Get comprehensive dashboard data
   * @returns {Promise<Object>} Dashboard data
   */
  async getDashboardData() {
    try {
      // Simplified dashboard data for now (avoiding analytics service issues)
      const lowStockItems = await this.getLowStockAlerts();

      return {
        sales: {
          totalSales: 0,
          totalRevenue: 0,
          averageOrderValue: 0,
          salesCount: 0
        },
        inventory: {
          totalProducts: 0,
          lowStockCount: lowStockItems.length,
          totalValue: 0
        },
        alerts: lowStockItems,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Error getting dashboard data', { error: error.message });
      return {
        sales: { totalSales: 0, totalRevenue: 0, averageOrderValue: 0, salesCount: 0 },
        inventory: { totalProducts: 0, lowStockCount: 0, totalValue: 0 },
        alerts: [],
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Get low stock alerts
   * @returns {Promise<Array>} Low stock items
   */
  async getLowStockAlerts() {
    try {
      const lowStockItems = await Product.find({
        $expr: { $lte: ['$stock', '$reorderPoint'] }
      })
      .select('name category stock reorderPoint supplier')
      .sort({ stock: 1 })
      .limit(10);

      return lowStockItems.map(item => ({
        id: item._id,
        name: item.name,
        category: item.category,
        currentStock: item.stock,
        reorderPoint: item.reorderPoint,
        supplier: item.supplier,
        severity: item.stock === 0 ? 'critical' : item.stock <= item.reorderPoint * 0.5 ? 'high' : 'medium'
      }));
    } catch (error) {
      logger.error('Error getting low stock alerts', { error: error.message });
      return [];
    }
  }

  /**
   * Start periodic dashboard updates
   */
  startDashboardUpdates() {
    // Update dashboard every 30 seconds
    this.dashboardUpdateInterval = setInterval(async () => {
      try {
        const dashboardUsers = Array.from(this.connectedUsers.values())
          .filter(user => user.dashboardActive);

        if (dashboardUsers.length > 0) {
          const dashboardData = await this.getDashboardData();
          this.io.to('dashboard').emit('dashboard-update', dashboardData);

          logger.debug('Dashboard update sent', {
            activeUsers: dashboardUsers.length,
            timestamp: new Date().toISOString()
          });
        }
      } catch (error) {
        logger.error('Error in dashboard update cycle', { error: error.message });
      }
    }, 30000);

    logger.info('Dashboard update cycle started');
  }

  /**
   * Stop periodic dashboard updates
   */
  stopDashboardUpdates() {
    if (this.dashboardUpdateInterval) {
      clearInterval(this.dashboardUpdateInterval);
      this.dashboardUpdateInterval = null;
      logger.info('Dashboard update cycle stopped');
    }
  }

  /**
   * Broadcast real-time notification
   * @param {Object} notification - Notification data
   */
  broadcastNotification(notification) {
    const notificationData = {
      id: Date.now().toString(),
      ...notification,
      timestamp: new Date().toISOString()
    };

    this.io.to('dashboard').emit('notification', notificationData);

    logger.info('Notification broadcasted', {
      type: notification.type,
      recipients: this.io.sockets.adapter.rooms.get('dashboard')?.size || 0
    });
  }

  /**
   * Broadcast sale event
   * @param {Object} saleData - Sale information
   */
  broadcastSaleEvent(saleData) {
    const notification = {
      type: 'sale',
      title: 'New Sale',
      message: `Sale of $${saleData.total} completed`,
      data: {
        saleId: saleData._id,
        total: saleData.total,
        paymentMethod: saleData.paymentMethod,
        items: saleData.items.length
      },
      priority: saleData.total > 1000 ? 'high' : 'normal'
    };

    this.broadcastNotification(notification);
  }

  /**
   * Broadcast inventory alert
   * @param {Object} productData - Product information
   */
  broadcastInventoryAlert(productData) {
    const notification = {
      type: 'inventory',
      title: 'Low Stock Alert',
      message: `${productData.name} is running low (${productData.stock} remaining)`,
      data: {
        productId: productData._id,
        productName: productData.name,
        currentStock: productData.stock,
        reorderPoint: productData.reorderPoint
      },
      priority: productData.stock === 0 ? 'critical' : 'high'
    };

    this.broadcastNotification(notification);
  }

  /**
   * Get connection statistics
   * @returns {Object} Connection statistics
   */
  getConnectionStats() {
    const activeConnections = this.connectedUsers.size;
    const dashboardUsers = Array.from(this.connectedUsers.values())
      .filter(user => user.dashboardActive).length;

    return {
      totalConnections: activeConnections,
      dashboardUsers: dashboardUsers,
      updateInterval: this.dashboardUpdateInterval ? 30000 : null,
      uptime: process.uptime()
    };
  }

  /**
   * Cleanup and shutdown
   */
  shutdown() {
    this.stopDashboardUpdates();

    if (this.io) {
      this.io.close();
      logger.info('WebSocket service shutdown completed');
    }
  }
}

// Create singleton instance
const webSocketService = new WebSocketService();

module.exports = webSocketService;