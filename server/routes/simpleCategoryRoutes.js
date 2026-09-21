const express = require('express');
const router = express.Router();
const Category = require('../models/Category');
const { requireUser } = require('./middleware/auth');

const tenantScope = (req) => {
  if (req.user.role === 'super_admin') return {};
  if (!req.user.tenantId) return null;
  return { tenantId: req.user.tenantId };
};

// Get categories only from the authenticated tenant.
router.get('/', requireUser, async (req, res) => {
  try {
    const scope = tenantScope(req);
    if (!scope) return res.status(403).json({ message: 'Tenant access required' });
    const categories = await Category.find(scope).sort({ name: 1 });
    res.json({ categories });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ message: 'Failed to fetch categories' });
  }
});

// Create a category in the authenticated tenant; never trust a client tenantId.
router.post('/', requireUser, async (req, res) => {
  try {
    const scope = tenantScope(req);
    if (!scope) return res.status(403).json({ message: 'Tenant access required' });
    const category = await Category.create({
      ...req.body,
      ...(req.user.role === 'super_admin' && req.body.tenantId
        ? { tenantId: req.body.tenantId }
        : { tenantId: req.user.tenantId })
    });
    res.status(201).json(category);
  } catch (error) {
    console.error('Error creating category:', error);
    res.status(500).json({ message: 'Failed to create category' });
  }
});

module.exports = router;
