const Expense = require('../models/Expense');

class ExpenseService {
  /**
   * Get all expenses
   * @param {string} dateRange - Optional date range filter ('all', 'day', 'week', 'month')
   * @returns {Promise<Array>} Array of expenses
   */
  static async getAllExpenses(dateRange) {
    try {
      // Get current date and date ranges
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
      } else if (dateRange === 'all') {
        // No date filter for 'all'
        startDate = null;
      }
      
      // Apply date filter if dateRange is provided and not 'all'
      let query = {};
      if (startDate) {
        query.date = { $gte: startDate };
      }
      
      return await Expense.find(query)
        .sort({ date: -1 })
        .populate('staff', 'name email');
    } catch (error) {
      throw new Error(`Error fetching expenses: ${error.message}`);
    }
  }

  /**
   * Get expense by ID
   * @param {string} id - Expense ID
   * @returns {Promise<Object>} Expense object
   */
  static async getExpenseById(id) {
    try {
      const expense = await Expense.findById(id)
        .populate('staff', 'name email');
      
      if (!expense) {
        throw new Error('Expense not found');
      }
      
      return expense;
    } catch (error) {
      throw new Error(`Error fetching expense: ${error.message}`);
    }
  }

  /**
   * Create a new expense
   * @param {Object} expenseData - Expense data
   * @param {string} userId - User ID creating the expense
   * @returns {Promise<Object>} Created expense
   */
  static async createExpense(expenseData, userId) {
    try {
      const expense = new Expense({
        ...expenseData,
        staff: userId
      });
      
      await expense.save();
      return expense;
    } catch (error) {
      throw new Error(`Error creating expense: ${error.message}`);
    }
  }

  /**
   * Update an expense
   * @param {string} id - Expense ID
   * @param {Object} expenseData - Updated expense data
   * @returns {Promise<Object>} Updated expense
   */
  static async updateExpense(id, expenseData) {
    try {
      const expense = await Expense.findByIdAndUpdate(
        id,
        { ...expenseData, updatedAt: Date.now() },
        { new: true, runValidators: true }
      );

      if (!expense) {
        throw new Error('Expense not found');
      }

      return expense;
    } catch (error) {
      throw new Error(`Error updating expense: ${error.message}`);
    }
  }

  /**
   * Delete an expense
   * @param {string} id - Expense ID
   * @returns {Promise<boolean>} True if deleted successfully
   */
  static async deleteExpense(id) {
    try {
      const result = await Expense.findByIdAndDelete(id);
      if (!result) {
        throw new Error('Expense not found');
      }
      return true;
    } catch (error) {
      throw new Error(`Error deleting expense: ${error.message}`);
    }
  }

  /**
   * Get expenses by date range
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Array>} Array of expenses in date range
   */
  static async getExpensesByDateRange(startDate, endDate) {
    try {
      return await Expense.find({
        date: {
          $gte: startDate,
          $lte: endDate
        }
      })
      .sort({ date: -1 })
      .populate('staff', 'name email');
    } catch (error) {
      throw new Error(`Error fetching expenses by date range: ${error.message}`);
    }
  }

  /**
   * Get expenses by category
   * @param {string} category - Expense category
   * @returns {Promise<Array>} Array of expenses in category
   */
  static async getExpensesByCategory(category) {
    try {
      return await Expense.find({ category })
        .sort({ date: -1 })
        .populate('staff', 'name email');
    } catch (error) {
      throw new Error(`Error fetching expenses by category: ${error.message}`);
    }
  }

  /**
   * Get expense summary by category
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Array>} Array of expense totals by category
   */
  static async getExpenseSummaryByCategory(startDate, endDate) {
    try {
      return await Expense.aggregate([
        {
          $match: {
            date: {
              $gte: startDate,
              $lte: endDate
            }
          }
        },
        {
          $group: {
            _id: '$category',
            total: { $sum: '$amount' }
          }
        },
        {
          $project: {
            category: '$_id',
            total: 1,
            _id: 0
          }
        },
        {
          $sort: { total: -1 }
        }
      ]);
    } catch (error) {
      throw new Error(`Error getting expense summary by category: ${error.message}`);
    }
  }
}

module.exports = ExpenseService;