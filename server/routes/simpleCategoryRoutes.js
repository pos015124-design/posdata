const express = require('express');
const router = express.Router();
const Category = require('../models/Category');
const { requireUser } = require('./middleware/auth');

// Get all categories
router.get('/', requireUser, async (req, res) => {
  try {
    const categories = await Category.find().sort({ name: 1 });
    res.json({ categories });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ message: 'Failed to fetch categories' });
  }
});

// Create a new category
router.post('/', requireUser, async (req, res) => {
  try {
    const category = await Category.create(req.body);
    res.status(201).json(category);
  } catch (error) {
    console.error('Error creating category:', error);
    res.status(500).json({ message: 'Failed to create category' });
  }
});

module.exports = router;
