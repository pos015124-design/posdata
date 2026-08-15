/**
 * Per-seller store settings (Settings → Tax / Receipt / Payment tabs).
 * Stored on the User document so each seller's preferences are isolated.
 * Mounted at /api/settings.
 *
 *   GET /api/settings            → current user's tax/receipt/payment prefs
 *   PUT /api/settings            → wholesale update (tax/receipt/payment)
 *   PUT /api/settings/tax        → update the tax section
 *   PUT /api/settings/receipt    → update the receipt section
 *   PUT /api/settings/payment    → update the payment section
 *
 * The client sends { settings: {...} } for PUTs; responses return the saved section.
 */

const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { requireUser } = require('./middleware/auth');

const DEFAULTS = {
  tax: { defaultTaxRate: '18', taxIncluded: false, enableTax: true },
  receipt: {
    showLogo: true,
    showTaxId: true,
    footerText: '',
    receiptPrefix: 'INV',
    printAutomatically: false
  },
  payment: {
    acceptCash: true,
    acceptCard: true,
    acceptMobile: true,
    acceptCredit: false,
    defaultPaymentMethod: 'cash'
  }
};

// Merge stored settings over defaults so old documents (or partial saves) always
// come back complete.
const mergeSettings = (current = {}) => ({
  tax: { ...DEFAULTS.tax, ...(current.tax || {}) },
  receipt: { ...DEFAULTS.receipt, ...(current.receipt || {}) },
  payment: { ...DEFAULTS.payment, ...(current.payment || {}) }
});

// Drop keys that weren't sent (undefined) so partial updates never wipe defaults.
const clean = (obj) => Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));

const sectionHandlers = {
  tax: {
    validate: (s) => ({
      defaultTaxRate: s.defaultTaxRate !== undefined ? String(s.defaultTaxRate) : undefined,
      taxIncluded: s.taxIncluded !== undefined ? !!s.taxIncluded : undefined,
      enableTax: s.enableTax !== undefined ? !!s.enableTax : undefined
    })
  },
  receipt: {
    validate: (s) => ({
      showLogo: s.showLogo !== undefined ? !!s.showLogo : undefined,
      showTaxId: s.showTaxId !== undefined ? !!s.showTaxId : undefined,
      footerText: s.footerText !== undefined ? String(s.footerText) : undefined,
      receiptPrefix: s.receiptPrefix !== undefined ? String(s.receiptPrefix) : undefined,
      printAutomatically: s.printAutomatically !== undefined ? !!s.printAutomatically : undefined
    })
  },
  payment: {
    validate: (s) => ({
      acceptCash: s.acceptCash !== undefined ? !!s.acceptCash : undefined,
      acceptCard: s.acceptCard !== undefined ? !!s.acceptCard : undefined,
      acceptMobile: s.acceptMobile !== undefined ? !!s.acceptMobile : undefined,
      acceptCredit: s.acceptCredit !== undefined ? !!s.acceptCredit : undefined,
      defaultPaymentMethod: ['cash', 'card', 'credit', 'mobile', 'online'].includes(s.defaultPaymentMethod)
        ? s.defaultPaymentMethod
        : undefined
    })
  }
};

/** GET /api/settings — current user's tax/receipt/payment preferences. */
router.get('/', requireUser, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('settings').lean();
    res.json({ success: true, settings: mergeSettings(user?.settings) });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load settings', message: error.message });
  }
});

/** PUT /api/settings — wholesale update of tax/receipt/payment. */
router.put('/', requireUser, async (req, res) => {
  try {
    const { settings } = req.body || {};
    if (!settings || typeof settings !== 'object') {
      return res.status(400).json({ error: 'settings object is required' });
    }

    const user = await User.findById(req.user.userId);
    user.settings = mergeSettings({
      tax: { ...(user.settings?.tax || {}), ...(settings.tax || {}) },
      receipt: { ...(user.settings?.receipt || {}), ...(settings.receipt || {}) },
      payment: { ...(user.settings?.payment || {}), ...(settings.payment || {}) }
    });
    await user.save();
    res.json({ success: true, settings: user.settings });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save settings', message: error.message });
  }
});

/** PUT /api/settings/:section — update one section (tax | receipt | payment). */
router.put('/:section', requireUser, async (req, res) => {
  try {
    const handler = sectionHandlers[req.params.section];
    if (!handler) {
      return res.status(404).json({ error: 'Unknown settings section' });
    }

    const { settings } = req.body || {};
    if (!settings || typeof settings !== 'object') {
      return res.status(400).json({ error: 'settings object is required' });
    }

    const updates = clean(handler.validate(settings));
    const user = await User.findById(req.user.userId);
    user.settings = {
      ...(user.settings || {}),
      [req.params.section]: {
        ...DEFAULTS[req.params.section],
        ...(user.settings?.[req.params.section] || {}),
        ...updates
      }
    };
    await user.save();
    res.json({ success: true, settings: user.settings[req.params.section] });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save settings', message: error.message });
  }
});

module.exports = router;
