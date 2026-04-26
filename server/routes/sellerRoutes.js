// sellerRoutes.js
const express = require('express');
const router = express.Router();
const Seller = require('../models/Seller');

// Simple auth check - get from auth middleware
const { requireUser } = require('./middleware/auth');

// Get all sellers - SCOPED TO CURRENT USER
router.get('/', requireUser, async (req, res) => {
  try {
    // Only return sellers created by the current user
    const sellers = await Seller.find({ userId: req.user.userId }).sort({ createdAt: -1 });
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

// Create new seller - SCOPED TO CURRENT USER
router.post('/', requireUser, async (req, res) => {
  try {
    const { name, email, phone, status } = req.body;
    
    // Check if seller with email already exists FOR THIS USER
    const existingSeller = await Seller.findOne({ userId: req.user.userId, contactEmail: email });
    if (existingSeller) {
      return res.status(400).json({ error: 'Seller with this email already exists' });
    }
    
    const seller = new Seller({
      userId: req.user.userId,  // CRITICAL: Link seller to current user
      businessName: name,
      contactEmail: email,
      contactPhone: phone,
      status: status || 'active'
    });
    await seller.save();
    res.status(201).json({ success: true, seller });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Update seller - WITH OWNERSHIP CHECK
router.put('/:id', requireUser, async (req, res) => {
  try {
    const { name, email, phone, status } = req.body;
    
    const seller = await Seller.findOne({ _id: req.params.id, userId: req.user.userId });
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

// Delete seller - WITH OWNERSHIP CHECK
router.delete('/:id', requireUser, async (req, res) => {
  try {
    const seller = await Seller.findOneAndDelete({ _id: req.params.id, userId: req.user.userId });
    if (!seller) return res.status(404).json({ error: 'Seller not found' });
    res.json({ success: true, message: 'Seller deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
