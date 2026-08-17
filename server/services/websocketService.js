/**
 * WebSocket Service for Real-time Dashboard Updates
 * Handles Socket.io connections and real-time data broadcasting
 */

const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
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
        // true = reflect the request origin (works for same-origin and any
        // configured frontend). Socket auth is JWT-verified regardless.
        origin: process.env.FRONTEND_URL || process.env.CLIENT_URL || true,
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

      // Send initial dashboard data — scoped to the connected user's own data
      const initialData = await this.getDashboardData(socket.userId);
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
      // Real per-user analytics — same data the REST dashboard endpoints return,
      // scoped to the connected user's own sales and inventory.
      const data = await this.getDashboardData(socket.userId, filters);

      socket.emit('analytics-data', {
        type: 'sales',
        data,
        period: filters?.dateRange || 'day',
        timestamp: new Date().toISOString()
      });

      logger.debug('Analytics data sent', {
        userId: socket.userId,
        filters
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
   * Get comprehensive dashboard data for a user — real queries, scoped to the
   * user's own products and sales (data isolation).
   * @param {string|null} userId - Owner user id; null = unscoped (used only by
   *   super-admin/global views).
   * @param {Object} [filters] - Optional period filter (not yet applied to sales).
   * @returns {Promise<Object>} Dashboard data
   */
  async getDashboardData(userId = null, filters = {}) {
    try {
      const ownerId = userId ? new mongoose.Types.ObjectId(String(userId)) : null;
      const productMatch = ownerId ? { userId: ownerId } : {};
      const saleMatch = ownerId
        ? { createdBy: ownerId, status: { $ne: 'cancelled' } }
        : { status: { $ne: 'cancelled' } };
      const todayStart = new Date(new Date().setHours(0, 0, 0, 0));

      const [productAgg, saleAgg, todayAgg, lowStockItems] = await Promise.all([
        Product.aggregate([
          { $match: productMatch },
          { $group: { _id: null, totalProducts: { $sum: 1 }, totalValue: { $sum: { $multiply: ['$stock', '$purchasePrice'] } } } }
        ]),
        Sale.aggregate([
          { $match: saleMatch },
          { $group: { _id: null, totalRevenue: { $sum: '$total' }, salesCount: { $sum: 1 } } }
        ]),
        Sale.aggregate([
          { $match: { ...saleMatch, createdAt: { $gte: todayStart } } },
          { $group: { _id: null, revenue: { $sum: '$total' }, sales: { $sum: 1 } } }
        ]),
        this.getLowStockAlerts(userId)
      ]);

      const products = productAgg[0] || { totalProducts: 0, totalValue: 0 };
      const sales = saleAgg[0] || { totalRevenue: 0, salesCount: 0 };
      const today = todayAgg[0] || { revenue: 0, sales: 0 };

      return {
        sales: {
          totalSales: sales.salesCount,
          totalRevenue: sales.totalRevenue,
          averageOrderValue: sales.salesCount > 0 ? sales.totalRevenue / sales.salesCount : 0,
          todayRevenue: today.revenue,
          todaySales: today.sales
        },
        inventory: {
          totalProducts: products.totalProducts,
          lowStockCount: lowStockItems.length,
          totalValue: products.totalValue
        },
        alerts: lowStockItems,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Error getting dashboard data', { error: error.message, userId });
      return {
        sales: { totalSales: 0, totalRevenue: 0, averageOrderValue: 0, todayRevenue: 0, todaySales: 0 },
        inventory: { totalProducts: 0, lowStockCount: 0, totalValue: 0 },
        alerts: [],
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Get low stock alerts for a user's own products (data isolation).
   * @param {string|null} userId - Owner user id
   * @returns {Promise<Array>} Low stock items
   */
  async getLowStockAlerts(userId = null) {
    try {
      const query = { $expr: { $lte: ['$stock', '$reorderPoint'] } };
      if (userId) {
        query.userId = new mongoose.Types.ObjectId(String(userId));
      }

      const lowStockItems = await Product.find(query)
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
   * Start periodic dashboard updates — each active user receives their OWN
   * scoped data (no cross-tenant leakage through a shared room broadcast).
   */
  startDashboardUpdates() {
    // Update dashboard every 30 seconds
    this.dashboardUpdateInterval = setInterval(async () => {
      try {
        const dashboardUsers = Array.from(this.connectedUsers.values())
          .filter(user => user.dashboardActive);

        if (dashboardUsers.length > 0) {
          await Promise.all(dashboardUsers.map(async (user) => {
            const dashboardData = await this.getDashboardData(user.userId);
            this.emitToUser(user.userId, 'dashboard-update', dashboardData);
          }));

          logger.debug('Dashboard updates sent', {
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
   * Emit an event to every live socket belonging to a specific user.
   * Used for targeted notifications (data isolation: users only see their own).
   * @param {string} userId - Target user id
   * @param {string} event - Event name
   * @param {Object} data - Event payload
   * @returns {number} Number of sockets the event was delivered to
   */
  emitToUser(userId, event, data) {
    if (!this.io) return 0;
    const target = String(userId);
    let delivered = 0;
    for (const socket of this.io.sockets.sockets.values()) {
      if (socket.userId && String(socket.userId) === target) {
        socket.emit(event, data);
        delivered++;
      }
    }
    return delivered;
  }

  /**
   * Broadcast sale event
   * @param {Object} saleData - Sale information
   */
  broadcastSaleEvent(saleData) {
    const notification = {
      type: 'sale',
      title: 'New Sale',
      message: `Sale of ${saleData.total} completed`,
      data: {
        saleId: saleData._id,
        total: saleData.total,
        paymentMethod: saleData.paymentMethod,
        items: saleData.items?.length || 0
      },
      priority: saleData.total > 1000 ? 'high' : 'normal'
    };

    // Deliver to the owning user's sockets when known (data isolation),
    // otherwise fall back to the dashboard room broadcast.
    if (saleData.createdBy) {
      this.emitToUser(saleData.createdBy, 'notification', {
        ...notification,
        timestamp: new Date().toISOString()
      });
    } else {
      this.broadcastNotification(notification);
    }
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

    if (productData.userId) {
      this.emitToUser(productData.userId, 'notification', {
        ...notification,
        timestamp: new Date().toISOString()
      });
    } else {
      this.broadcastNotification(notification);
    }
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