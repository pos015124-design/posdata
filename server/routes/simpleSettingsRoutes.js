const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { requireUser } = require('./middleware/auth');

const defaults = {
  business: {},
  tax: { defaultTaxRate: '18', taxIncluded: false, enableTax: true },
  receipt: { showLogo: true, showTaxId: true, footerText: 'Thank you for shopping with us!', receiptPrefix: 'INV-', printAutomatically: true },
  payment: { acceptCash: true, acceptCard: true, acceptMobile: true, acceptCredit: true, defaultPaymentMethod: 'cash' }
};

const mergeSettings = (settings = {}) => ({
  ...defaults,
  ...settings,
  tax: { ...defaults.tax, ...(settings.tax || {}) },
  receipt: { ...defaults.receipt, ...(settings.receipt || {}) },
  payment: { ...defaults.payment, ...(settings.payment || {}) }
});

// Legacy compatibility router: settings are stored on the authenticated user,
// never in a global storeId='default' document.
router.get('/', requireUser, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('settings').lean();
    res.json({ settings: mergeSettings(user?.settings) });
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ message: 'Failed to fetch settings' });
  }
});

router.put('/', requireUser, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });
    user.settings = mergeSettings({ ...(user.settings || {}), ...(req.body || {}) });
    await user.save();
    res.json(user.settings);
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({ message: 'Failed to update settings' });
  }
});

module.exports = router;
