const mongoose = require('mongoose');

const businessSettingsSchema = new mongoose.Schema({
  name: { type: String, default: 'Dukani Store' },
  address: { type: String, default: '123 Main Street, Dar es Salaam' },
  phone: { type: String, default: '+255 123 456 789' },
  email: { type: String, default: 'info@dukanistore.com' },
  taxId: { type: String, default: 'TIN12345678' },
  logo: { type: String, default: '' }
});

const taxSettingsSchema = new mongoose.Schema({
  defaultTaxRate: { type: String, default: '0' },
  taxIncluded: { type: Boolean, default: false },
  enableTax: { type: Boolean, default: false }
});

const receiptSettingsSchema = new mongoose.Schema({
  showLogo: { type: Boolean, default: true },
  showTaxId: { type: Boolean, default: true },
  footerText: { type: String, default: 'Thank you for shopping with us!' },
  receiptPrefix: { type: String, default: 'INV-' },
  printAutomatically: { type: Boolean, default: true }
});

const paymentSettingsSchema = new mongoose.Schema({
  acceptCash: { type: Boolean, default: true },
  acceptCard: { type: Boolean, default: true },
  acceptMobile: { type: Boolean, default: true },
  acceptCredit: { type: Boolean, default: true },
  defaultPaymentMethod: { type: String, default: 'cash' }
});

const settingsSchema = new mongoose.Schema({
  business: { type: businessSettingsSchema, default: () => ({}) },
  tax: { type: taxSettingsSchema, default: () => ({}) },
  receipt: { type: receiptSettingsSchema, default: () => ({}) },
  payment: { type: paymentSettingsSchema, default: () => ({}) },
  storeId: { type: String, required: true, default: 'default' }
}, { timestamps: true });

// Ensure we only have one settings document per store
settingsSchema.index({ storeId: 1 }, { unique: true });

const Settings = mongoose.model('Settings', settingsSchema);

module.exports = Settings;