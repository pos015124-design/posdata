const express = require('express');
const router = express.Router();
const ExpenseService = require('../services/expenseService');
const { requireUser } = require('./middleware/auth');

// Get all expenses
router.get('/', requireUser, async (req, res) => {
  try {
    const { dateRange } = req.query;
    const expenses = await ExpenseService.getAllExpenses(dateRange);
    res.json({ expenses });
  } catch (error) {
    console.error('Error fetching expenses:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get expense by ID
router.get('/:id', requireUser, async (req, res) => {
  try {
    const expense = await ExpenseService.getExpenseById(req.params.id);
    res.json({ expense });
  } catch (error) {
    console.error('Error fetching expense:', error);
    if (error.message === 'Expense not found') {
      return res.status(404).json({ message: error.message });
    }
    res.status(500).json({ message: error.message });
  }
});

// Create a new expense
router.post('/', requireUser, async (req, res) => {
  try {
    const expense = await ExpenseService.createExpense(req.body, req.user.userId);
    res.status(201).json({ 
      success: true,
      expense 
    });
  } catch (error) {
    console.error('Error creating expense:', error);
    res.status(400).json({ message: error.message });
  }
});

// Update an expense
router.put('/:id', requireUser, async (req, res) => {
  try {
    const expense = await ExpenseService.updateExpense(req.params.id, req.body);
    res.json({ 
      success: true,
      expense 
    });
  } catch (error) {
    console.error('Error updating expense:', error);
    if (error.message === 'Expense not found') {
      return res.status(404).json({ message: error.message });
    }
    res.status(400).json({ message: error.message });
  }
});

// Delete an expense
router.delete('/:id', requireUser, async (req, res) => {
  try {
    await ExpenseService.deleteExpense(req.params.id);
    res.json({ 
      success: true,
      message: 'Expense deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting expense:', error);
    if (error.message === 'Expense not found') {
      return res.status(404).json({ message: error.message });
    }
    res.status(500).json({ message: error.message });
  }
});

// Get expenses by date range
router.get('/range/:startDate/:endDate', requireUser, async (req, res) => {
  try {
    const { startDate, endDate } = req.params;
    
    if (!startDate || !endDate) {
      return res.status(400).json({ message: 'Start date and end date are required' });
    }
    
    const expenses = await ExpenseService.getExpensesByDateRange(
      new Date(startDate),
      new Date(endDate)
    );
    
    res.json({ expenses });
  } catch (error) {
    console.error('Error fetching expenses by date range:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get expenses by category
router.get('/category/:category', requireUser, async (req, res) => {
  try {
    const { category } = req.params;
    
    if (!category) {
      return res.status(400).json({ message: 'Category is required' });
    }
    
    const expenses = await ExpenseService.getExpensesByCategory(category);
    res.json({ expenses });
  } catch (error) {
    console.error('Error fetching expenses by category:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get expense summary by category
router.get('/summary/:startDate/:endDate', requireUser, async (req, res) => {
  try {
    const { startDate, endDate } = req.params;
    
    if (!startDate || !endDate) {
      return res.status(400).json({ message: 'Start date and end date are required' });
    }
    
    const summary = await ExpenseService.getExpenseSummaryByCategory(
      new Date(startDate),
      new Date(endDate)
    );
    
    res.json({ summary });
  } catch (error) {
    console.error('Error fetching expense summary:', error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;