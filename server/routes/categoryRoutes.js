const express = require('express');
const router = express.Router();
const Category = require('../models/Category');
const { requireUser } = require('./middleware/auth');

// Get all categories
// GET /api/categories
router.get('/', requireUser, async (req, res) => {
  try {
    const categories = await Category.find().sort({ name: 1 });
    res.json({ categories });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ message: 'Failed to fetch categories' });
  }
});

// Add a new category
// POST /api/categories
router.post('/', requireUser, async (req, res) => {
  try {
    const { name, description, color } = req.body;
    
    // Check if category with the same name already exists
    const existingCategory = await Category.findOne({ name });
    if (existingCategory) {
      return res.status(400).json({ message: 'A category with this name already exists' });
    }
    
    const category = new Category({
      name,
      description,
      color
    });
    
    const savedCategory = await category.save();
    res.status(201).json({ success: true, category: savedCategory });
  } catch (error) {
    console.error('Error adding category:', error);
    res.status(500).json({ message: 'Failed to add category' });
  }
});

// Update a category
// PUT /api/categories/:id
router.put('/:id', requireUser, async (req, res) => {
  try {
    const { name, description, color } = req.body;
    
    // Check if another category with the same name already exists
    if (name) {
      const existingCategory = await Category.findOne({ 
        name, 
        _id: { $ne: req.params.id } 
      });
      
      if (existingCategory) {
        return res.status(400).json({ message: 'Another category with this name already exists' });
      }
    }
    
    const updatedCategory = await Category.findByIdAndUpdate(
      req.params.id,
      { name, description, color },
      { new: true, runValidators: true }
    );
    
    if (!updatedCategory) {
      return res.status(404).json({ message: 'Category not found' });
    }
    
    res.json({ success: true, category: updatedCategory });
  } catch (error) {
    console.error('Error updating category:', error);
    res.status(500).json({ message: 'Failed to update category' });
  }
});

// Delete a category
// DELETE /api/categories/:id
router.delete('/:id', requireUser, async (req, res) => {
  try {
    const deletedCategory = await Category.findByIdAndDelete(req.params.id);
    
    if (!deletedCategory) {
      return res.status(404).json({ message: 'Category not found' });
    }
    
    res.json({ success: true, message: 'Category deleted successfully' });
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({ message: 'Failed to delete category' });
  }
});

// Get a single category by ID
// GET /api/categories/:id
router.get('/:id', requireUser, async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }
    
    res.json({ category });
  } catch (error) {
    console.error('Error fetching category:', error);
    res.status(500).json({ message: 'Failed to fetch category' });
  }
});

module.exports = router;