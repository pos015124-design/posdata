const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const { requireUser } = require('./middleware/auth');

// Get low stock alerts
router.get('/alerts', requireUser, async (req, res) => {
  try {
    const lowStockProducts = await Product.find({
      $expr: { $lte: ['$stock', '$reorderPoint'] }
    }).select('name stock reorderPoint');

    const alerts = lowStockProducts.map(product => ({
      _id: product._id,
      name: product.name,
      stock: product.stock,
      threshold: product.reorderPoint
    }));

    res.json({ alerts });
  } catch (error) {
    console.error('Error fetching low stock alerts:', error);
    res.status(500).json({ message: 'Failed to fetch low stock alerts' });
  }
});

// Get restock history (placeholder)
router.get('/restock-history', requireUser, async (req, res) => {
  try {
    // For now, return empty array since we don't have restock history yet
    res.json({ history: [] });
  } catch (error) {
    console.error('Error fetching restock history:', error);
    res.status(500).json({ message: 'Failed to fetch restock history' });
  }
});

module.exports = router;
