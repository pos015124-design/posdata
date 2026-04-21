/**
 * Platform Service for Super Admin Management
 * Handles platform-wide operations, settings, and analytics
 */

const mongoose = require('mongoose');
const PlatformSettings = require('../models/PlatformSettings');
const Business = require('../models/Business');
const User = require('../models/User');
const Tenant = require('../models/Tenant');
const Order = require('../models/Order');
const { logger } = require('../config/logger');

class PlatformService {
  
  /**
   * Get platform dashboard analytics
   * @returns {Promise<Object>} Platform analytics data
   */
  static async getPlatformAnalytics() {
    try {
      const [
        totalBusinesses,
        activeBusinesses,
        pendingBusinesses,
        totalUsers,
        totalOrders,
        totalRevenue,
        recentBusinesses,
        topBusinesses
      ] = await Promise.all([
        Business.countDocuments(),
        Business.countDocuments({ status: 'active' }),
        Business.countDocuments({ status: 'pending' }),
        User.countDocuments({ role: { $ne: 'super_admin' } }),
        Order.countDocuments(),
        Order.aggregate([
          { $match: { status: { $in: ['completed', 'delivered'] } } },
          { $group: { _id: null, total: { $sum: '$total' } } }
        ]),
        Business.find({ status: 'pending' })
          .sort({ createdAt: -1 })
          .limit(5)
          .select('name email category createdAt'),
        Business.find({ status: 'active' })
          .sort({ 'analytics.revenue': -1 })
          .limit(10)
          .select('name analytics.revenue analytics.orders category')
      ]);
      
      // Calculate growth metrics (last 30 days)
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      
      const [
        newBusinessesThisMonth,
        newUsersThisMonth,
        ordersThisMonth,
        revenueThisMonth
      ] = await Promise.all([
        Business.countDocuments({ createdAt: { $gte: thirtyDaysAgo } }),
        User.countDocuments({ 
          createdAt: { $gte: thirtyDaysAgo },
          role: { $ne: 'super_admin' }
        }),
        Order.countDocuments({ createdAt: { $gte: thirtyDaysAgo } }),
        Order.aggregate([
          { 
            $match: { 
              createdAt: { $gte: thirtyDaysAgo },
              status: { $in: ['completed', 'delivered'] }
            }
          },
          { $group: { _id: null, total: { $sum: '$total' } } }
        ])
      ]);
      
      return {
        overview: {
          totalBusinesses,
          activeBusinesses,
          pendingBusinesses,
          totalUsers,
          totalOrders,
          totalRevenue: totalRevenue[0]?.total || 0
        },
        growth: {
          newBusinessesThisMonth,
          newUsersThisMonth,
          ordersThisMonth,
          revenueThisMonth: revenueThisMonth[0]?.total || 0
        },
        recentBusinesses,
        topBusinesses
      };
      
    } catch (error) {
      logger.error('Failed to get platform analytics', {
        error: error.message
      });
      throw error;
    }
  }
  
  /**
   * Get platform settings
   * @returns {Promise<Object>} Platform settings
   */
  static async getPlatformSettings() {
    try {
      return await PlatformSettings.getSettings();
    } catch (error) {
      logger.error('Failed to get platform settings', {
        error: error.message
      });
      throw error;
    }
  }
  
  /**
   * Update platform settings
   * @param {Object} updates - Settings updates
   * @param {string} adminId - Admin user ID
   * @returns {Promise<Object>} Updated settings
   */
  static async updatePlatformSettings(updates, adminId) {
    try {
      const settings = await PlatformSettings.updateSettings(updates, adminId);
      
      logger.info('Platform settings updated', {
        adminId,
        updatedFields: Object.keys(updates)
      });
      
      return settings;
    } catch (error) {
      logger.error('Failed to update platform settings', {
        error: error.message,
        adminId
      });
      throw error;
    }
  }
  
  /**
   * Get system health status
   * @returns {Promise<Object>} System health data
   */
  static async getSystemHealth() {
    try {
      const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
      
      // Check database performance
      const dbPerfStart = Date.now();
      await Business.findOne().limit(1);
      const dbResponseTime = Date.now() - dbPerfStart;
      
      // Get memory usage
      const memoryUsage = process.memoryUsage();
      
      // Get uptime
      const uptime = process.uptime();
      
      return {
        database: {
          status: dbStatus,
          responseTime: dbResponseTime
        },
        server: {
          uptime,
          memoryUsage: {
            rss: Math.round(memoryUsage.rss / 1024 / 1024), // MB
            heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024), // MB
            heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024) // MB
          },
          nodeVersion: process.version,
          platform: process.platform
        },
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      logger.error('Failed to get system health', {
        error: error.message
      });
      throw error;
    }
  }
  
  /**
   * Get business analytics by category
   * @returns {Promise<Array>} Business analytics by category
   */
  static async getBusinessAnalyticsByCategory() {
    try {
      const analytics = await Business.aggregate([
        {
          $match: { status: 'active' }
        },
        {
          $group: {
            _id: '$category',
            count: { $sum: 1 },
            totalRevenue: { $sum: '$analytics.revenue' },
            totalOrders: { $sum: '$analytics.orders' },
            avgRevenue: { $avg: '$analytics.revenue' }
          }
        },
        {
          $sort: { count: -1 }
        }
      ]);
      
      return analytics;
    } catch (error) {
      logger.error('Failed to get business analytics by category', {
        error: error.message
      });
      throw error;
    }
  }
  
  /**
   * Get user analytics by role
   * @returns {Promise<Array>} User analytics by role
   */
  static async getUserAnalyticsByRole() {
    try {
      const analytics = await User.aggregate([
        {
          $group: {
            _id: '$role',
            count: { $sum: 1 },
            approved: {
              $sum: { $cond: [{ $eq: ['$isApproved', true] }, 1, 0] }
            },
            active: {
              $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] }
            }
          }
        },
        {
          $sort: { count: -1 }
        }
      ]);
      
      return analytics;
    } catch (error) {
      logger.error('Failed to get user analytics by role', {
        error: error.message
      });
      throw error;
    }
  }
  
  /**
   * Get revenue analytics over time
   * @param {string} period - Time period ('7d', '30d', '90d', '1y')
   * @returns {Promise<Array>} Revenue analytics
   */
  static async getRevenueAnalytics(period = '30d') {
    try {
      const periodMap = {
        '7d': 7,
        '30d': 30,
        '90d': 90,
        '1y': 365
      };
      
      const days = periodMap[period] || 30;
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      
      const analytics = await Order.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate },
            status: { $in: ['completed', 'delivered'] }
          }
        },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' },
              day: { $dayOfMonth: '$createdAt' }
            },
            revenue: { $sum: '$total' },
            orders: { $sum: 1 }
          }
        },
        {
          $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 }
        }
      ]);
      
      return analytics;
    } catch (error) {
      logger.error('Failed to get revenue analytics', {
        error: error.message,
        period
      });
      throw error;
    }
  }
  
  /**
   * Create super admin user
   * @param {Object} adminData - Admin user data
   * @returns {Promise<Object>} Created admin user
   */
  static async createSuperAdmin(adminData) {
    try {
      // Check if super admin already exists
      const existingSuperAdmin = await User.findOne({ role: 'super_admin' });
      if (existingSuperAdmin) {
        throw new Error('Super admin already exists');
      }
      
      const superAdmin = new User({
        email: adminData.email,
        password: adminData.password,
        firstName: adminData.firstName,
        lastName: adminData.lastName,
        role: 'super_admin',
        isApproved: true,
        isActive: true
      });
      
      await superAdmin.save();
      
      logger.info('Super admin created', {
        adminId: superAdmin._id,
        email: superAdmin.email
      });
      
      return {
        id: superAdmin._id,
        email: superAdmin.email,
        fullName: superAdmin.fullName,
        role: superAdmin.role
      };
      
    } catch (error) {
      logger.error('Failed to create super admin', {
        error: error.message,
        email: adminData.email
      });
      throw error;
    }
  }
  
  /**
   * Get platform activity logs
   * @param {Object} filters - Filter options
   * @param {Object} pagination - Pagination options
   * @returns {Promise<Object>} Activity logs
   */
  static async getActivityLogs(filters = {}, pagination = {}) {
    try {
      // This would typically come from a dedicated logging system
      // For now, we'll return recent business registrations and approvals
      const { page = 1, limit = 50 } = pagination;
      const skip = (page - 1) * limit;
      
      const activities = await Business.find()
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('name status createdAt updatedAt')
        .lean();
      
      const total = await Business.countDocuments();
      
      return {
        activities: activities.map(business => ({
          id: business._id,
          type: 'business_registration',
          description: `Business "${business.name}" ${business.status}`,
          timestamp: business.updatedAt,
          data: business
        })),
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
      
    } catch (error) {
      logger.error('Failed to get activity logs', {
        error: error.message
      });
      throw error;
    }
  }
}

module.exports = PlatformService;
