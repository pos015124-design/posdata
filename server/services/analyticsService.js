/**
 * Optimized Analytics Service
 * Provides high-performance analytics with efficient aggregation pipelines
 */

const Sale = require('../models/Sale');
const Expense = require('../models/Expense');
const Product = require('../models/Product');
const Customer = require('../models/Customer');
const Inventory = require('../models/Inventory');
const mongoose = require('mongoose');
const { cacheService } = require('../config/cache');
const { logger } = require('../config/logger');

class AnalyticsService {
  
  /**
   * Get optimized sales analytics with caching
   * @param {Object} filters - Date range and other filters
   * @returns {Promise<Object>} Sales analytics data
   */
  static async getSalesAnalytics(filters = {}) {
    const cacheKey = `sales_analytics:${JSON.stringify(filters)}`;
    
    try {
      // Try to get from cache first
      const cached = await cacheService.get(cacheKey);
      if (cached) {
        logger.debug('Sales analytics served from cache');
        return cached;
      }
      
      const { startDate, endDate, staff, paymentMethod, dateRange } = filters;
      
      // Calculate date ranges
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      let queryStartDate, queryEndDate, previousPeriodStart, previousPeriodEnd;
      
      if (startDate && endDate) {
        queryStartDate = new Date(startDate);
        queryEndDate = new Date(endDate);
        const periodLength = queryEndDate - queryStartDate;
        previousPeriodStart = new Date(queryStartDate.getTime() - periodLength);
        previousPeriodEnd = new Date(queryStartDate);
      } else {
        // Default date range logic
        switch (dateRange) {
          case 'day':
            queryStartDate = today;
            queryEndDate = new Date(today.getTime() + 24 * 60 * 60 * 1000);
            previousPeriodStart = new Date(today.getTime() - 24 * 60 * 60 * 1000);
            previousPeriodEnd = today;
            break;
          case 'week':
            queryStartDate = new Date(today);
            queryStartDate.setDate(queryStartDate.getDate() - queryStartDate.getDay());
            queryEndDate = new Date();
            previousPeriodStart = new Date(queryStartDate.getTime() - 7 * 24 * 60 * 60 * 1000);
            previousPeriodEnd = queryStartDate;
            break;
          case 'month':
            queryStartDate = new Date(now.getFullYear(), now.getMonth(), 1);
            queryEndDate = new Date();
            previousPeriodStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            previousPeriodEnd = queryStartDate;
            break;
          default:
            queryStartDate = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
            queryEndDate = new Date();
            previousPeriodStart = new Date(queryStartDate.getTime() - 30 * 24 * 60 * 60 * 1000);
            previousPeriodEnd = queryStartDate;
        }
      }
      
      // Build match stage
      const matchStage = {
        createdAt: {
          $gte: queryStartDate,
          $lte: queryEndDate
        }
      };
      
      if (staff) matchStage.staff = new mongoose.Types.ObjectId(staff);
      if (paymentMethod) matchStage.paymentMethod = paymentMethod;
      
      // Optimized aggregation pipeline using $facet for multiple operations
      const pipeline = [
        { $match: matchStage },
        {
          $facet: {
            // Total sales metrics
            totals: [
              {
                $group: {
                  _id: null,
                  totalRevenue: { $sum: '$total' },
                  totalSales: { $sum: 1 },
                  averageOrderValue: { $avg: '$total' },
                  totalTax: { $sum: '$tax' },
                  totalDiscount: { 
                    $sum: { 
                      $reduce: {
                        input: '$discounts',
                        initialValue: 0,
                        in: { $add: ['$$value', '$$this.amount'] }
                      }
                    }
                  }
                }
              }
            ],
            
            // Sales by payment method
            paymentMethods: [
              {
                $group: {
                  _id: '$paymentMethod',
                  count: { $sum: 1 },
                  total: { $sum: '$total' }
                }
              },
              { $sort: { total: -1 } }
            ],
            
            // Daily sales trend
            dailyTrend: [
              {
                $group: {
                  _id: {
                    year: { $year: '$createdAt' },
                    month: { $month: '$createdAt' },
                    day: { $dayOfMonth: '$createdAt' }
                  },
                  revenue: { $sum: '$total' },
                  sales: { $sum: 1 }
                }
              },
              { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
              {
                $project: {
                  _id: 0,
                  date: {
                    $dateToString: {
                      format: '%Y-%m-%d',
                      date: {
                        $dateFromParts: {
                          year: '$_id.year',
                          month: '$_id.month',
                          day: '$_id.day'
                        }
                      }
                    }
                  },
                  revenue: 1,
                  sales: 1
                }
              },
              { $limit: 30 }
            ],
            
            // Top selling products
            topProducts: [
              { $unwind: '$items' },
              {
                $group: {
                  _id: '$items.product',
                  productName: { $first: '$items.name' },
                  totalQuantity: { $sum: '$items.quantity' },
                  totalRevenue: { $sum: '$items.total' },
                  salesCount: { $sum: 1 }
                }
              },
              { $sort: { totalRevenue: -1 } },
              { $limit: 10 }
            ],
            
            // Staff performance
            staffPerformance: [
              {
                $group: {
                  _id: '$staff',
                  salesCount: { $sum: 1 },
                  totalRevenue: { $sum: '$total' },
                  averageOrderValue: { $avg: '$total' }
                }
              },
              { $sort: { totalRevenue: -1 } },
              { $limit: 10 }
            ],
            
            // Hourly sales pattern
            hourlySales: [
              {
                $group: {
                  _id: { $hour: '$createdAt' },
                  count: { $sum: 1 },
                  revenue: { $sum: '$total' }
                }
              },
              { $sort: { '_id': 1 } }
            ]
          }
        }
      ];
      
      const [result] = await Sale.aggregate(pipeline);
      
      // Get previous period data for comparison
      const previousPeriodPipeline = [
        {
          $match: {
            createdAt: {
              $gte: previousPeriodStart,
              $lt: previousPeriodEnd
            }
          }
        },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$total' },
            totalSales: { $sum: 1 },
            averageOrderValue: { $avg: '$total' }
          }
        }
      ];
      
      const [previousPeriodResult] = await Sale.aggregate(previousPeriodPipeline);
      
      // Get expense data for the current period
      const expenseData = await Expense.aggregate([
        {
          $match: {
            date: {
              $gte: queryStartDate,
              $lte: queryEndDate
            }
          }
        },
        {
          $facet: {
            totals: [
              {
                $group: {
                  _id: null,
                  totalExpenses: { $sum: '$amount' }
                }
              }
            ],
            categories: [
              {
                $group: {
                  _id: '$category',
                  amount: { $sum: '$amount' },
                  count: { $sum: 1 }
                }
              },
              { $sort: { amount: -1 } },
              { $limit: 10 }
            ]
          }
        }
      ]);
      
      // Format the response
      const currentTotals = result.totals[0] || {
        totalRevenue: 0,
        totalSales: 0,
        averageOrderValue: 0,
        totalTax: 0,
        totalDiscount: 0
      };
      
      const previousTotals = previousPeriodResult || {
        totalRevenue: 0,
        totalSales: 0,
        averageOrderValue: 0
      };
      
      const expenseTotals = expenseData[0]?.totals[0] || { totalExpenses: 0 };
      
      // Calculate growth percentages
      const revenueGrowth = previousTotals.totalRevenue > 0 
        ? ((currentTotals.totalRevenue - previousTotals.totalRevenue) / previousTotals.totalRevenue) * 100 
        : 0;
      
      const salesGrowth = previousTotals.totalSales > 0 
        ? ((currentTotals.totalSales - previousTotals.totalSales) / previousTotals.totalSales) * 100 
        : 0;
      
      const analytics = {
        summary: {
          totalRevenue: currentTotals.totalRevenue,
          totalSales: currentTotals.totalSales,
          averageOrderValue: currentTotals.averageOrderValue,
          totalTax: currentTotals.totalTax,
          totalDiscount: currentTotals.totalDiscount,
          totalExpenses: expenseTotals.totalExpenses,
          netProfit: currentTotals.totalRevenue - expenseTotals.totalExpenses,
          revenueGrowth,
          salesGrowth
        },
        comparison: {
          current: currentTotals,
          previous: previousTotals
        },
        paymentMethods: result.paymentMethods,
        dailyTrend: result.dailyTrend,
        topProducts: result.topProducts,
        staffPerformance: result.staffPerformance,
        hourlySales: result.hourlySales,
        expenseCategories: expenseData[0]?.categories || [],
        generatedAt: new Date().toISOString(),
        period: {
          startDate: queryStartDate,
          endDate: queryEndDate
        }
      };
      
      // Cache for 5 minutes
      await cacheService.set(cacheKey, analytics, 300);
      
      return analytics;
      
    } catch (error) {
      logger.error('Failed to get sales analytics', { error: error.message, filters });
      throw new Error('Failed to generate sales analytics');
    }
  }

  /**
   * Get inventory analytics
   * @param {Object} filters - Filters for inventory analysis
   * @returns {Promise<Object>} Inventory analytics data
   */
  static async getInventoryAnalytics(filters = {}) {
    const cacheKey = `inventory_analytics:${JSON.stringify(filters)}`;

    try {
      const cached = await cacheService.get(cacheKey);
      if (cached) {
        return cached;
      }

      const { category, lowStockOnly } = filters;

      // Build match stage for products
      const productMatch = {};
      if (category) productMatch.category = category;

      const pipeline = [
        { $match: productMatch },
        {
          $facet: {
            // Stock overview
            stockOverview: [
              {
                $group: {
                  _id: null,
                  totalProducts: { $sum: 1 },
                  totalStockValue: { $sum: { $multiply: ['$stock', '$purchasePrice'] } },
                  lowStockItems: {
                    $sum: {
                      $cond: [{ $lte: ['$stock', '$reorderPoint'] }, 1, 0]
                    }
                  },
                  outOfStockItems: {
                    $sum: {
                      $cond: [{ $eq: ['$stock', 0] }, 1, 0]
                    }
                  }
                }
              }
            ],

            // Stock by category
            categoryBreakdown: [
              {
                $group: {
                  _id: '$category',
                  productCount: { $sum: 1 },
                  totalStock: { $sum: '$stock' },
                  totalValue: { $sum: { $multiply: ['$stock', '$purchasePrice'] } },
                  lowStockCount: {
                    $sum: {
                      $cond: [{ $lte: ['$stock', '$reorderPoint'] }, 1, 0]
                    }
                  }
                }
              },
              { $sort: { totalValue: -1 } }
            ],

            // Low stock items
            lowStockItems: [
              {
                $match: {
                  $expr: { $lte: ['$stock', '$reorderPoint'] }
                }
              },
              {
                $project: {
                  name: 1,
                  category: 1,
                  stock: 1,
                  reorderPoint: 1,
                  supplier: 1,
                  purchasePrice: 1
                }
              },
              { $sort: { stock: 1 } },
              { $limit: 20 }
            ],

            // Top value products
            topValueProducts: [
              {
                $addFields: {
                  stockValue: { $multiply: ['$stock', '$purchasePrice'] }
                }
              },
              { $sort: { stockValue: -1 } },
              {
                $project: {
                  name: 1,
                  category: 1,
                  stock: 1,
                  purchasePrice: 1,
                  stockValue: 1
                }
              },
              { $limit: 10 }
            ]
          }
        }
      ];

      const [result] = await Product.aggregate(pipeline);

      const analytics = {
        stockOverview: result.stockOverview[0] || {
          totalProducts: 0,
          totalStockValue: 0,
          lowStockItems: 0,
          outOfStockItems: 0
        },
        categoryBreakdown: result.categoryBreakdown,
        lowStockItems: result.lowStockItems,
        topValueProducts: result.topValueProducts,
        generatedAt: new Date().toISOString()
      };

      // Cache for 10 minutes
      await cacheService.set(cacheKey, analytics, 600);

      return analytics;

    } catch (error) {
      logger.error('Failed to get inventory analytics', { error: error.message, filters });
      throw new Error('Failed to generate inventory analytics');
    }
  }
}

module.exports = AnalyticsService;
