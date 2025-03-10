const Sale = require('../models/Sale');
const Expense = require('../models/Expense');
const Product = require('../models/Product');
const mongoose = require('mongoose');

class AnalyticsService {
  /**
   * Get sales analytics
   * @param {string} dateRange - Optional date range filter ('day', 'week', 'month')
   * @returns {Promise<Object>} Sales analytics data
   */
  static async getSalesAnalytics(dateRange) {
    try {
      // Get current date and date ranges
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      
      const thisWeekStart = new Date(today);
      thisWeekStart.setDate(thisWeekStart.getDate() - thisWeekStart.getDay());
      const lastWeekStart = new Date(thisWeekStart);
      lastWeekStart.setDate(lastWeekStart.getDate() - 7);
      const lastWeekEnd = new Date(thisWeekStart);
      lastWeekEnd.setDate(lastWeekEnd.getDate() - 1);
      
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

      // Calculate 30 days ago for default range
      const thirtyDaysAgo = new Date(today);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      // Determine date range for filtering
      let startDate;
      let previousPeriodStart;
      let previousPeriodEnd;
      
      if (dateRange === 'day') {
        startDate = today;
        previousPeriodStart = yesterday;
        previousPeriodEnd = today;
      } else if (dateRange === 'week') {
        startDate = thisWeekStart;
        previousPeriodStart = lastWeekStart;
        previousPeriodEnd = lastWeekEnd;
      } else if (dateRange === 'month') {
        startDate = thisMonthStart;
        previousPeriodStart = lastMonthStart;
        previousPeriodEnd = lastMonthEnd;
      } else if (dateRange === 'year') {
        // Calculate this year's start date (January 1st of current year)
        const thisYearStart = new Date(now.getFullYear(), 0, 1);
        startDate = thisYearStart;
        
        // Calculate last year's start and end dates
        const lastYearStart = new Date(now.getFullYear() - 1, 0, 1);
        const lastYearEnd = new Date(now.getFullYear(), 0, 0);
        
        previousPeriodStart = lastYearStart;
        previousPeriodEnd = lastYearEnd;
      } else {
        // Default to 30 days if no valid dateRange is provided
        startDate = thirtyDaysAgo;
        previousPeriodStart = new Date(thirtyDaysAgo);
        previousPeriodStart.setDate(previousPeriodStart.getDate() - 30);
        previousPeriodEnd = new Date(thirtyDaysAgo);
        previousPeriodEnd.setDate(previousPeriodEnd.getDate() - 1);
      }
      
      const dailySales = await Sale.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate }
          }
        },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' },
              day: { $dayOfMonth: '$createdAt' }
            },
            amount: { $sum: '$total' }
          }
        },
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
            amount: 1
          }
        },
        { $sort: { date: 1 } }
      ]);

      // Get popular items
      const popularItems = await Sale.aggregate([
        { $unwind: '$items' },
        {
          $group: {
            _id: '$items.product',
            name: { $first: '$items.name' },
            sales: { $sum: '$items.quantity' }
          }
        },
        { $sort: { sales: -1 } },
        { $limit: 5 },
        {
          $project: {
            _id: 1,
            name: 1,
            sales: 1
          }
        }
      ]);

      // Calculate this year's start date (January 1st of current year)
      const thisYearStart = new Date(now.getFullYear(), 0, 1);
      
      // Calculate all time (no date filter)
      const allTimeStart = new Date(0); // January 1, 1970
      
      // Get revenue and tax data
      const [
        currentDayRevenue,
        currentWeekRevenue,
        currentMonthRevenue,
        currentYearRevenue,
        allTimeRevenue,
        currentDayTax,
        currentWeekTax,
        currentMonthTax,
        currentYearTax,
        allTimeTax
      ] = await Promise.all([
        // Revenue
        Sale.aggregate([
          { $match: { createdAt: { $gte: today } } },
          { $group: { _id: null, total: { $sum: '$total' } } }
        ]),
        Sale.aggregate([
          { $match: { createdAt: { $gte: thisWeekStart } } },
          { $group: { _id: null, total: { $sum: '$total' } } }
        ]),
        Sale.aggregate([
          { $match: { createdAt: { $gte: thisMonthStart } } },
          { $group: { _id: null, total: { $sum: '$total' } } }
        ]),
        Sale.aggregate([
          { $match: { createdAt: { $gte: thisYearStart } } },
          { $group: { _id: null, total: { $sum: '$total' } } }
        ]),
        Sale.aggregate([
          { $match: { } }, // No date filter for all time
          { $group: { _id: null, total: { $sum: '$total' } } }
        ]),
        // Tax
        Sale.aggregate([
          { $match: { createdAt: { $gte: today } } },
          { $group: { _id: null, tax: { $sum: '$tax' } } }
        ]),
        Sale.aggregate([
          { $match: { createdAt: { $gte: thisWeekStart } } },
          { $group: { _id: null, tax: { $sum: '$tax' } } }
        ]),
        Sale.aggregate([
          { $match: { createdAt: { $gte: thisMonthStart } } },
          { $group: { _id: null, tax: { $sum: '$tax' } } }
        ]),
        Sale.aggregate([
          { $match: { createdAt: { $gte: thisYearStart } } },
          { $group: { _id: null, tax: { $sum: '$tax' } } }
        ]),
        Sale.aggregate([
          { $match: { } }, // No date filter for all time
          { $group: { _id: null, tax: { $sum: '$tax' } } }
        ])
      ]);

      // Get profit and loss data
      const [
        currentPeriodSales,
        previousPeriodSales,
        currentPeriodExpenses,
        previousPeriodExpenses,
        currentPeriodOverages,
        previousPeriodOverages
      ] = await Promise.all([
        // Regular sales
        Sale.aggregate([
          { $match: { createdAt: { $gte: startDate } } },
          { $group: { _id: null, total: { $sum: '$total' } } }
        ]),
        Sale.aggregate([
          {
            $match: {
              createdAt: {
                $gte: previousPeriodStart,
                $lt: previousPeriodEnd
              }
            }
          },
          { $group: { _id: null, total: { $sum: '$total' } } }
        ]),
        // Regular expenses (excluding inventory overages)
        Expense.aggregate([
          {
            $match: {
              date: { $gte: startDate },
              category: { $ne: 'Inventory Overage Income' } // Exclude inventory overages
            }
          },
          { $group: { _id: null, total: { $sum: '$amount' } } }
        ]),
        Expense.aggregate([
          {
            $match: {
              date: {
                $gte: previousPeriodStart,
                $lt: previousPeriodEnd
              },
              category: { $ne: 'Inventory Overage Income' } // Exclude inventory overages
            }
          },
          { $group: { _id: null, total: { $sum: '$amount' } } }
        ]),
        // Inventory overages (to be added to revenue)
        Expense.aggregate([
          {
            $match: {
              date: { $gte: startDate },
              category: 'Inventory Overage Income' // Only inventory overages
            }
          },
          { $group: { _id: null, total: { $sum: '$amount' } } }
        ]),
        Expense.aggregate([
          {
            $match: {
              date: {
                $gte: previousPeriodStart,
                $lt: previousPeriodEnd
              },
              category: 'Inventory Overage Income' // Only inventory overages
            }
          },
          { $group: { _id: null, total: { $sum: '$amount' } } }
        ])
      ]);

      // Get inventory overage amounts
      const currentOverageAmount = currentPeriodOverages.length > 0 ? currentPeriodOverages[0].total : 0;
      const previousOverageAmount = previousPeriodOverages.length > 0 ? previousPeriodOverages[0].total : 0;
      
      // Add inventory overages to sales revenue
      const currentSalesTotal = (currentPeriodSales.length > 0 ? currentPeriodSales[0].total : 0) + currentOverageAmount;
      const previousSalesTotal = (previousPeriodSales.length > 0 ? previousPeriodSales[0].total : 0) + previousOverageAmount;

      // Calculate cost of goods sold (estimated as 50% of sales)
      const currentCOGS = currentSalesTotal * 0.5;
      const previousCOGS = previousSalesTotal * 0.5;

      // Calculate gross profit
      const currentGrossProfit = currentSalesTotal - currentCOGS;
      const previousGrossProfit = previousSalesTotal - previousCOGS;

      // Calculate net profit
      const currentNetProfit = currentGrossProfit - (currentPeriodExpenses.length > 0 ? currentPeriodExpenses[0].total : 0);
      const previousNetProfit = previousGrossProfit - (previousPeriodExpenses.length > 0 ? previousPeriodExpenses[0].total : 0);

      // Get revenue categories (product sales and inventory overages)
      const revenueCategories = [
        { name: 'Product Sales', amount: currentPeriodSales.length > 0 ? currentPeriodSales[0].total : 0 }
      ];
      
      // Add inventory overages as a revenue category if there are any
      if (currentOverageAmount > 0) {
        revenueCategories.push({ name: 'Inventory Overage Income', amount: currentOverageAmount });
      }

      // Get expense categories (excluding inventory overages)
      const expenseCategories = await Expense.aggregate([
        {
          $match: {
            date: { $gte: startDate },
            category: { $ne: 'Inventory Overage Income' } // Exclude inventory overages from expense categories
          }
        },
        {
          $group: {
            _id: '$category',
            amount: { $sum: '$amount' }
          }
        },
        {
          $project: {
            _id: 0,
            name: '$_id',
            amount: 1
          }
        },
        { $sort: { amount: -1 } }
      ]);

      // Calculate net revenue (total - tax)
      const dailyNet = (currentDayRevenue.length > 0 ? currentDayRevenue[0].total : 0) -
                      (currentDayTax.length > 0 ? currentDayTax[0].tax : 0);
      const weeklyNet = (currentWeekRevenue.length > 0 ? currentWeekRevenue[0].total : 0) -
                       (currentWeekTax.length > 0 ? currentWeekTax[0].tax : 0);
      const monthlyNet = (currentMonthRevenue.length > 0 ? currentMonthRevenue[0].total : 0) -
                        (currentMonthTax.length > 0 ? currentMonthTax[0].tax : 0);
      const yearlyNet = (currentYearRevenue.length > 0 ? currentYearRevenue[0].total : 0) -
                       (currentYearTax.length > 0 ? currentYearTax[0].tax : 0);
      const allTimeNet = (allTimeRevenue.length > 0 ? allTimeRevenue[0].total : 0) -
                        (allTimeTax.length > 0 ? allTimeTax[0].tax : 0);

      // Get cash in hand data
      const cashInHandData = await this.getCashInHandData(startDate);

      return {
        dailySales,
        popularItems,
        revenue: {
          daily: currentDayRevenue.length > 0 ? currentDayRevenue[0].total : 0,
          weekly: currentWeekRevenue.length > 0 ? currentWeekRevenue[0].total : 0,
          monthly: currentMonthRevenue.length > 0 ? currentMonthRevenue[0].total : 0,
          yearly: currentYearRevenue.length > 0 ? currentYearRevenue[0].total : 0,
          allTime: allTimeRevenue.length > 0 ? allTimeRevenue[0].total : 0
        },
        tax: {
          daily: currentDayTax.length > 0 ? currentDayTax[0].tax : 0,
          weekly: currentWeekTax.length > 0 ? currentWeekTax[0].tax : 0,
          monthly: currentMonthTax.length > 0 ? currentMonthTax[0].tax : 0,
          yearly: currentYearTax.length > 0 ? currentYearTax[0].tax : 0,
          allTime: allTimeTax.length > 0 ? allTimeTax[0].tax : 0
        },
        netRevenue: {
          daily: dailyNet,
          weekly: weeklyNet,
          monthly: monthlyNet,
          yearly: yearlyNet,
          allTime: allTimeNet
        },
        cashInHand: cashInHandData,
        profitAndLoss: {
          revenue: {
            current: currentSalesTotal, // Updated to include inventory overages
            previous: previousSalesTotal // Updated to include inventory overages
          },
          expenses: {
            current: currentPeriodExpenses.length > 0 ? currentPeriodExpenses[0].total : 0,
            previous: previousPeriodExpenses.length > 0 ? previousPeriodExpenses[0].total : 0
          },
          costOfGoods: {
            current: currentCOGS,
            previous: previousCOGS
          },
          grossProfit: {
            current: currentGrossProfit,
            previous: previousGrossProfit
          },
          netProfit: {
            current: currentNetProfit,
            previous: previousNetProfit
          },
          categories: {
            revenue: revenueCategories,
            expenses: expenseCategories
          }
        }
      };
    } catch (error) {
      throw new Error(`Error getting sales analytics: ${error.message}`);
    }
  }

  /**
   * Get inventory analytics
   * @param {string} dateRange - Optional date range filter ('day', 'week', 'month')
   * @returns {Promise<Object>} Inventory analytics data
   */
  static async getInventoryAnalytics(dateRange) {
    try {
      // Get current date and date ranges for filtering
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      const thisWeekStart = new Date(today);
      thisWeekStart.setDate(thisWeekStart.getDate() - thisWeekStart.getDay());
      
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      
      // Calculate 30 days ago for default range
      const thirtyDaysAgo = new Date(today);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      // Determine date range for filtering
      let startDate;
      
      if (dateRange === 'day') {
        startDate = today;
      } else if (dateRange === 'week') {
        startDate = thisWeekStart;
      } else if (dateRange === 'month') {
        startDate = thisMonthStart;
      } else if (dateRange === 'year') {
        // Calculate this year's start date (January 1st of current year)
        const thisYearStart = new Date(now.getFullYear(), 0, 1);
        startDate = thisYearStart;
      } else {
        // Default to 30 days if no valid dateRange is provided
        startDate = thirtyDaysAgo;
      }
      
      // Get inventory value
      const inventoryValue = await Product.aggregate([
        {
          $group: {
            _id: null,
            totalValue: { $sum: { $multiply: ['$stock', '$purchasePrice'] } },
            totalItems: { $sum: '$stock' },
            uniqueProducts: { $sum: 1 }
          }
        }
      ]);

      // Get low stock items
      const lowStockItems = await Product.find({
        $expr: { $lt: ['$stock', '$reorderPoint'] }
      })
      .select('_id name stock reorderPoint category')
      .sort({ stock: 1 });

      // Get stock by category
      const stockByCategory = await Product.aggregate([
        {
          $group: {
            _id: '$category',
            count: { $sum: 1 },
            totalStock: { $sum: '$stock' },
            value: { $sum: { $multiply: ['$stock', '$purchasePrice'] } }
          }
        },
        {
          $project: {
            _id: 0,
            category: '$_id',
            count: 1,
            totalStock: 1,
            value: 1
          }
        },
        { $sort: { value: -1 } }
      ]);

      return {
        inventoryValue: inventoryValue.length > 0 ? inventoryValue[0] : { totalValue: 0, totalItems: 0, uniqueProducts: 0 },
        lowStockItems,
        stockByCategory
      };
    } catch (error) {
      throw new Error(`Error getting inventory analytics: ${error.message}`);
    }
  }

  /**
   * Get cash in hand data
   * @param {Date} startDate - Start date for filtering
   * @returns {Promise<Object>} Cash in hand data
   */
  static async getCashInHandData(startDate) {
    try {
      // Get opening balance (assume it's the closing balance from the day before)
      const yesterday = new Date(startDate);
      yesterday.setDate(yesterday.getDate() - 1);
      
      // Get sales by payment method
      const [cashSales, cardSales, mobileSales, creditSales] = await Promise.all([
        // Cash sales
        Sale.aggregate([
          {
            $match: {
              createdAt: { $gte: startDate },
              paymentMethod: 'cash'
            }
          },
          {
            $group: {
              _id: null,
              total: { $sum: '$total' },
              count: { $sum: 1 }
            }
          }
        ]),
        // Card sales
        Sale.aggregate([
          {
            $match: {
              createdAt: { $gte: startDate },
              paymentMethod: 'card'
            }
          },
          {
            $group: {
              _id: null,
              total: { $sum: '$total' },
              count: { $sum: 1 }
            }
          }
        ]),
        // Mobile money sales
        Sale.aggregate([
          {
            $match: {
              createdAt: { $gte: startDate },
              paymentMethod: 'mobile'
            }
          },
          {
            $group: {
              _id: null,
              total: { $sum: '$total' },
              count: { $sum: 1 }
            }
          }
        ]),
        // Credit sales
        Sale.aggregate([
          {
            $match: {
              createdAt: { $gte: startDate },
              paymentMethod: 'credit'
            }
          },
          {
            $group: {
              _id: null,
              total: { $sum: '$total' },
              count: { $sum: 1 }
            }
          }
        ])
      ]);
      
      // Get cash payments (expenses paid in cash)
      const cashPayments = await Expense.aggregate([
        {
          $match: {
            date: { $gte: startDate },
            paymentMethod: 'cash'
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$amount' }
          }
        }
      ]);
      
      // Get cash deposits and withdrawals
      // Note: This is a placeholder. In a real system, you would have a dedicated
      // model for tracking cash deposits and withdrawals.
      const cashDeposits = 0;
      const cashWithdrawals = 0;
      
      // Calculate opening balance (placeholder value)
      const openingBalance = 5000; // Starting cash float
      
      // Calculate closing balance
      const closingBalance = openingBalance +
                           (cashSales.length > 0 ? cashSales[0].total : 0) +
                           cashDeposits -
                           (cashPayments.length > 0 ? cashPayments[0].total : 0) -
                           cashWithdrawals;
      
      // Get cash transactions
      // Note: In a real system, you would have a dedicated model for tracking all cash transactions
      const transactions = [
        {
          type: 'opening',
          amount: openingBalance,
          description: 'Opening balance',
          timestamp: startDate.toISOString()
        }
      ];
      
      // Add cash sales as transactions
      if (cashSales.length > 0 && cashSales[0].total > 0) {
        transactions.push({
          type: 'sales',
          amount: cashSales[0].total,
          description: 'Cash sales',
          timestamp: new Date().toISOString()
        });
      }
      
      // Add cash payments as transactions
      if (cashPayments.length > 0 && cashPayments[0].total > 0) {
        transactions.push({
          type: 'payment',
          amount: -cashPayments[0].total,
          description: 'Cash payments',
          timestamp: new Date().toISOString()
        });
      }
      
      // Get transactions with references for card and mobile payments
      const transactionsWithReferences = await Sale.find({
        createdAt: { $gte: startDate },
        paymentMethod: { $in: ['card', 'mobile'] },
        transactionNumber: { $exists: true, $ne: '' }
      })
      .select('_id paymentMethod total transactionNumber createdAt')
      .sort({ createdAt: -1 })
      .limit(50);

      // Format transactions for display
      const paymentTransactions = transactionsWithReferences.map(transaction => ({
        type: transaction.paymentMethod,
        amount: transaction.total,
        description: `${transaction.paymentMethod === 'card' ? 'Card payment' : 'Mobile money payment'}`,
        timestamp: transaction.createdAt.toISOString(),
        reference: transaction.transactionNumber || 'N/A'
      }));

      return {
        openingBalance,
        closingBalance,
        cashSales: cashSales.length > 0 ? cashSales[0].total : 0,
        cashPayments: cashPayments.length > 0 ? cashPayments[0].total : 0,
        cashDeposits,
        cashWithdrawals,
        salesByMethod: {
          cash: {
            total: cashSales.length > 0 ? cashSales[0].total : 0,
            count: cashSales.length > 0 ? cashSales[0].count : 0
          },
          card: {
            total: cardSales.length > 0 ? cardSales[0].total : 0,
            count: cardSales.length > 0 ? cardSales[0].count : 0
          },
          mobile: {
            total: mobileSales.length > 0 ? mobileSales[0].total : 0,
            count: mobileSales.length > 0 ? mobileSales[0].count : 0
          },
          credit: {
            total: creditSales.length > 0 ? creditSales[0].total : 0,
            count: creditSales.length > 0 ? creditSales[0].count : 0
          }
        },
        transactions,
        paymentTransactions
      };
    } catch (error) {
      throw new Error(`Error getting cash in hand data: ${error.message}`);
    }
  }
}

module.exports = AnalyticsService;