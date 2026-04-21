const express = require('express');
const router = express.Router();
const Settings = require('../models/Settings');
const { requireUser } = require('./middleware/auth');

// Get settings
router.get('/', requireUser, async (req, res) => {
  try {
    let settings = await Settings.findOne({ storeId: 'default' });
    
    if (!settings) {
      // Create default settings if none exist
      settings = await Settings.create({
        business: {
          name: 'Dukani Store',
          address: '123 Main Street, Dar es Salaam',
          phone: '+255 123 456 789',
          email: 'info@dukanistore.com',
          taxId: 'TIN12345678'
        },
        tax: {
          defaultTaxRate: '18',
          taxIncluded: false,
          enableTax: true
        },
        receipt: {
          showLogo: true,
          showTaxId: true,
          footerText: 'Thank you for shopping with us!',
          receiptPrefix: 'INV-',
          printAutomatically: true
        },
        payment: {
          acceptCash: true,
          acceptCard: true,
          acceptMobile: true,
          acceptCredit: true,
          defaultPaymentMethod: 'cash'
        },
        storeId: 'default'
      });
    }

    res.json({ settings });
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ message: 'Failed to fetch settings' });
  }
});

// Update settings
router.put('/', requireUser, async (req, res) => {
  try {
    const settings = await Settings.findOneAndUpdate(
      { storeId: 'default' },
      req.body,
      { new: true, upsert: true }
    );

    res.json(settings);
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({ message: 'Failed to update settings' });
  }
});

module.exports = router;
