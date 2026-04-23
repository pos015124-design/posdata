// sellerRoutes.js
const express = require('express');
const router = express.Router();
const Seller = require('../models/Seller');
const { requireUser } = require('../middleware/validation');

// Get all sellers
router.get('/', requireUser, async (req, res) => {
  try {
    const sellers = await Seller.find().sort({ createdAt: -1 });
    res.json({ sellers });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get seller by ID
router.get('/:id', requireUser, async (req, res) => {
  try {
    const seller = await Seller.findById(req.params.id);
    if (!seller) return res.status(404).json({ error: 'Seller not found' });
    res.json({ seller });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create new seller
router.post('/', requireUser, async (req, res) => {
  try {
    const { name, email, phone, status } = req.body;
    
    // Check if seller with email already exists
    const existingSeller = await Seller.findOne({ contactEmail: email });
    if (existingSeller) {
      return res.status(400).json({ error: 'Seller with this email already exists' });
    }
    
    const seller = new Seller({
      businessName: name,
      contactEmail: email,
      contactPhone: phone,
      status: status || 'pending'
    });
    await seller.save();
    res.status(201).json({ success: true, seller });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Update seller
router.put('/:id', requireUser, async (req, res) => {
  try {
    const { name, email, phone, status } = req.body;
    
    const seller = await Seller.findById(req.params.id);
    if (!seller) {
      return res.status(404).json({ error: 'Seller not found' });
    }
    
    // Update fields
    if (name) seller.businessName = name;
    if (email) seller.contactEmail = email;
    if (phone !== undefined) seller.contactPhone = phone;
    if (status) seller.status = status;
    
    await seller.save();
    res.json({ success: true, seller });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Delete seller
router.delete('/:id', requireUser, async (req, res) => {
  try {
    const seller = await Seller.findByIdAndDelete(req.params.id);
    if (!seller) return res.status(404).json({ error: 'Seller not found' });
    res.json({ success: true, message: 'Seller deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
