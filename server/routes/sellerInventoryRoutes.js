// sellerInventoryRoutes.js
const express = require('express');
const router = express.Router();
const SellerInventoryService = require('../services/SellerInventoryService');

// Get all seller inventories (optionally filter by seller or product)
router.get('/', async (req, res) => {
  try {
    const filter = {};
    if (req.query.seller) filter.seller = req.query.seller;
    if (req.query.product) filter.product = req.query.product;
    const inventories = await SellerInventoryService.getAllInventories(filter);
    res.json(inventories);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get inventory by ID
router.get('/:id', async (req, res) => {
  try {
    const inventory = await SellerInventoryService.getInventoryById(req.params.id);
    if (!inventory) return res.status(404).json({ error: 'Inventory not found' });
    res.json(inventory);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create new seller inventory
router.post('/', async (req, res) => {
  try {
    const inventory = await SellerInventoryService.createInventory(req.body);
    res.status(201).json(inventory);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Update seller inventory
router.put('/:id', async (req, res) => {
  try {
    const inventory = await SellerInventoryService.updateInventory(req.params.id, req.body);
    if (!inventory) return res.status(404).json({ error: 'Inventory not found' });
    res.json(inventory);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Delete seller inventory
router.delete('/:id', async (req, res) => {
  try {
    const inventory = await SellerInventoryService.deleteInventory(req.params.id);
    if (!inventory) return res.status(404).json({ error: 'Inventory not found' });
    res.json({ message: 'Inventory deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
