const express = require('express');
const router = express.Router();
const { requireUser } = require('./middleware/auth');
const settingsService = require('../services/settingsService');

/**
 * @route GET /api/settings
 * @desc Get all system settings
 * @access Private
 */
router.get('/', requireUser, async (req, res) => {
  try {
    // Get store ID from user (for multi-store support in the future)
    const storeId = req.user.storeId || 'default';
    
    const result = await settingsService.getSettings(storeId);
    res.json(result);
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch settings' });
  }
});

/**
 * @route PUT /api/settings
 * @desc Update all system settings
 * @access Private
 */
router.put('/', requireUser, async (req, res) => {
  try {
    // Get store ID from user (for multi-store support in the future)
    const storeId = req.user.storeId || 'default';
    
    // Validate request body
    if (!req.body.settings) {
      return res.status(400).json({ success: false, message: 'Settings data is required' });
    }
    
    const result = await settingsService.updateSettings(req.body.settings, storeId);
    res.json(result);
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({ success: false, message: 'Failed to update settings' });
  }
});

/**
 * @route PUT /api/settings/business
 * @desc Update business settings
 * @access Private
 */
router.put('/business', requireUser, async (req, res) => {
  try {
    // Get store ID from user (for multi-store support in the future)
    const storeId = req.user.storeId || 'default';
    
    // Validate request body
    if (!req.body.settings) {
      return res.status(400).json({ success: false, message: 'Business settings data is required' });
    }
    
    const result = await settingsService.updateBusinessSettings(req.body.settings, storeId);
    res.json(result);
  } catch (error) {
    console.error('Error updating business settings:', error);
    res.status(500).json({ success: false, message: 'Failed to update business settings' });
  }
});

/**
 * @route PUT /api/settings/tax
 * @desc Update tax settings
 * @access Private
 */
router.put('/tax', requireUser, async (req, res) => {
  try {
    // Get store ID from user (for multi-store support in the future)
    const storeId = req.user.storeId || 'default';
    
    // Validate request body
    if (!req.body.settings) {
      return res.status(400).json({ success: false, message: 'Tax settings data is required' });
    }
    
    const result = await settingsService.updateTaxSettings(req.body.settings, storeId);
    res.json(result);
  } catch (error) {
    console.error('Error updating tax settings:', error);
    res.status(500).json({ success: false, message: 'Failed to update tax settings' });
  }
});

/**
 * @route PUT /api/settings/receipt
 * @desc Update receipt settings
 * @access Private
 */
router.put('/receipt', requireUser, async (req, res) => {
  try {
    // Get store ID from user (for multi-store support in the future)
    const storeId = req.user.storeId || 'default';
    
    // Validate request body
    if (!req.body.settings) {
      return res.status(400).json({ success: false, message: 'Receipt settings data is required' });
    }
    
    const result = await settingsService.updateReceiptSettings(req.body.settings, storeId);
    res.json(result);
  } catch (error) {
    console.error('Error updating receipt settings:', error);
    res.status(500).json({ success: false, message: 'Failed to update receipt settings' });
  }
});

/**
 * @route PUT /api/settings/payment
 * @desc Update payment settings
 * @access Private
 */
router.put('/payment', requireUser, async (req, res) => {
  try {
    // Get store ID from user (for multi-store support in the future)
    const storeId = req.user.storeId || 'default';
    
    // Validate request body
    if (!req.body.settings) {
      return res.status(400).json({ success: false, message: 'Payment settings data is required' });
    }
    
    const result = await settingsService.updatePaymentSettings(req.body.settings, storeId);
    res.json(result);
  } catch (error) {
    console.error('Error updating payment settings:', error);
    res.status(500).json({ success: false, message: 'Failed to update payment settings' });
  }
});

module.exports = router;