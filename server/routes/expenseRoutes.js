const express = require('express');
const router = express.Router();
const Expense = require('../models/Expense');
const { requireUser } = require('./middleware/auth');

// Get all expenses with optional date range filter
router.get('/', requireUser, async (req, res) => {
  try {
    const { dateRange } = req.query;
    let query = { createdBy: req.user.userId };

    // Apply date range filter
    if (dateRange && dateRange !== 'all') {
      const now = new Date();
      let startDate;

      switch (dateRange) {
        case 'day':
          startDate = new Date(now.setHours(0, 0, 0, 0));
          break;
        case 'week':
          startDate = new Date(now.setDate(now.getDate() - 7));
          break;
        case 'month':
          startDate = new Date(now.setMonth(now.getMonth() - 1));
          break;
        default:
          startDate = new Date(0);
      }

      query.date = { $gte: startDate };
    }

    const expenses = await Expense.find(query)
      .sort({ date: -1 })
      .lean();

    // Format response
    const formattedExpenses = expenses.map(exp => ({
      _id: exp._id,
      description: exp.title || exp.description,
      amount: exp.amount,
      category: exp.category || 'Other',
      date: exp.date,
      notes: exp.description,
      paymentMethod: exp.paymentMethod,
      createdAt: exp.createdAt
    }));

    res.json({ expenses: formattedExpenses });
  } catch (error) {
    console.error('Error fetching expenses:', error);
    res.status(500).json({ message: 'Failed to fetch expenses' });
  }
});

// Add new expense
router.post('/', requireUser, async (req, res) => {
  try {
    const { description, amount, category, date, notes, paymentMethod } = req.body;

    if (!description || !amount) {
      return res.status(400).json({ message: 'Description and amount are required' });
    }

    const expense = new Expense({
      title: description,
      description: notes || description,
      amount: parseFloat(amount),
      category: category || 'Other',
      date: date ? new Date(date) : new Date(),
      paymentMethod: paymentMethod || 'cash',
      createdBy: req.user.userId
    });

    await expense.save();

    res.status(201).json({
      success: true,
      expense: {
        _id: expense._id,
        description: expense.title,
        amount: expense.amount,
        category: expense.category,
        date: expense.date,
        notes: expense.description
      }
    });
  } catch (error) {
    console.error('Error adding expense:', error);
    res.status(500).json({ message: 'Failed to add expense' });
  }
});

// Update expense
router.put('/:id', requireUser, async (req, res) => {
  try {
    const { description, amount, category, date, notes } = req.body;

    const expense = await Expense.findOne({ _id: req.params.id, createdBy: req.user.userId });

    if (!expense) {
      return res.status(404).json({ message: 'Expense not found' });
    }

    // Update fields
    if (description) expense.title = description;
    if (notes || description) expense.description = notes || description;
    if (amount) expense.amount = parseFloat(amount);
    if (category) expense.category = category;
    if (date) expense.date = new Date(date);

    await expense.save();

    res.json({
      success: true,
      expense: {
        _id: expense._id,
        description: expense.title,
        amount: expense.amount,
        category: expense.category,
        date: expense.date,
        notes: expense.description
      }
    });
  } catch (error) {
    console.error('Error updating expense:', error);
    res.status(500).json({ message: 'Failed to update expense' });
  }
});

// Delete expense
router.delete('/:id', requireUser, async (req, res) => {
  try {
    const expense = await Expense.findOneAndDelete({ _id: req.params.id, createdBy: req.user.userId });

    if (!expense) {
      return res.status(404).json({ message: 'Expense not found' });
    }

    res.json({ success: true, message: 'Expense deleted successfully' });
  } catch (error) {
    console.error('Error deleting expense:', error);
    res.status(500).json({ message: 'Failed to delete expense' });
  }
});

// Get expenses by date range
router.get('/range/:startDate/:endDate', requireUser, async (req, res) => {
  try {
    const { startDate, endDate } = req.params;

    const expenses = await Expense.find({
      createdBy: req.user.userId,
      date: {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      }
    }).sort({ date: -1 });

    res.json({ expenses });
  } catch (error) {
    console.error('Error fetching expenses by range:', error);
    res.status(500).json({ message: 'Failed to fetch expenses' });
  }
});

// Get expenses by category
router.get('/category/:category', requireUser, async (req, res) => {
  try {
    const expenses = await Expense.find({
      createdBy: req.user.userId,
      category: req.params.category
    }).sort({ date: -1 });

    res.json({ expenses });
  } catch (error) {
    console.error('Error fetching expenses by category:', error);
    res.status(500).json({ message: 'Failed to fetch expenses' });
  }
});

// Get expense summary by category
router.get('/summary/:startDate/:endDate', requireUser, async (req, res) => {
  try {
    const { startDate, endDate } = req.params;

    const summary = await Expense.aggregate([
      {
        $match: {
          createdBy: req.user.userId,
          date: {
            $gte: new Date(startDate),
            $lte: new Date(endDate)
          }
        }
      },
      {
        $group: {
          _id: '$category',
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          category: '$_id',
          total: 1,
          count: 1,
          _id: 0
        }
      }
    ]);

    res.json({ summary });
  } catch (error) {
    console.error('Error fetching expense summary:', error);
    res.status(500).json({ message: 'Failed to fetch expense summary' });
  }
});

module.exports = router;
