const Settings = require('../models/Settings');

/**
 * Get system settings
 * @param {string} storeId - Store ID
 * @returns {Promise<Object>} Settings object
 */
const getSettings = async (storeId = 'default') => {
  try {
    // Find settings or create default if not exists
    let settings = await Settings.findOne({ storeId });
    
    if (!settings) {
      settings = await Settings.create({ storeId });
    }
    
    return { success: true, settings };
  } catch (error) {
    console.error('Error getting settings:', error);
    throw error;
  }
};

/**
 * Update all system settings
 * @param {Object} settingsData - Complete settings object
 * @param {string} storeId - Store ID
 * @returns {Promise<Object>} Updated settings
 */
const updateSettings = async (settingsData, storeId = 'default') => {
  try {
    // Find settings or create default if not exists
    let settings = await Settings.findOne({ storeId });
    
    if (!settings) {
      settings = await Settings.create({ storeId });
    }
    
    // Update all settings
    settings.business = settingsData.business;
    settings.tax = settingsData.tax;
    settings.receipt = settingsData.receipt;
    settings.payment = settingsData.payment;
    
    await settings.save();
    
    return { success: true, settings };
  } catch (error) {
    console.error('Error updating settings:', error);
    throw error;
  }
};

/**
 * Update business settings
 * @param {Object} businessSettings - Business settings object
 * @param {string} storeId - Store ID
 * @returns {Promise<Object>} Updated settings
 */
const updateBusinessSettings = async (businessSettings, storeId = 'default') => {
  try {
    // Find settings or create default if not exists
    let settings = await Settings.findOne({ storeId });
    
    if (!settings) {
      settings = await Settings.create({ storeId });
    }
    
    // Update business settings
    settings.business = businessSettings;
    await settings.save();
    
    return { success: true, settings: settings.business };
  } catch (error) {
    console.error('Error updating business settings:', error);
    throw error;
  }
};

/**
 * Update tax settings
 * @param {Object} taxSettings - Tax settings object
 * @param {string} storeId - Store ID
 * @returns {Promise<Object>} Updated settings
 */
const updateTaxSettings = async (taxSettings, storeId = 'default') => {
  try {
    // Find settings or create default if not exists
    let settings = await Settings.findOne({ storeId });
    
    if (!settings) {
      settings = await Settings.create({ storeId });
    }
    
    // Update tax settings
    settings.tax = taxSettings;
    await settings.save();
    
    return { success: true, settings: settings.tax };
  } catch (error) {
    console.error('Error updating tax settings:', error);
    throw error;
  }
};

/**
 * Update receipt settings
 * @param {Object} receiptSettings - Receipt settings object
 * @param {string} storeId - Store ID
 * @returns {Promise<Object>} Updated settings
 */
const updateReceiptSettings = async (receiptSettings, storeId = 'default') => {
  try {
    // Find settings or create default if not exists
    let settings = await Settings.findOne({ storeId });
    
    if (!settings) {
      settings = await Settings.create({ storeId });
    }
    
    // Update receipt settings
    settings.receipt = receiptSettings;
    await settings.save();
    
    return { success: true, settings: settings.receipt };
  } catch (error) {
    console.error('Error updating receipt settings:', error);
    throw error;
  }
};

/**
 * Update payment settings
 * @param {Object} paymentSettings - Payment settings object
 * @param {string} storeId - Store ID
 * @returns {Promise<Object>} Updated settings
 */
const updatePaymentSettings = async (paymentSettings, storeId = 'default') => {
  try {
    // Find settings or create default if not exists
    let settings = await Settings.findOne({ storeId });
    
    if (!settings) {
      settings = await Settings.create({ storeId });
    }
    
    // Update payment settings
    settings.payment = paymentSettings;
    await settings.save();
    
    return { success: true, settings: settings.payment };
  } catch (error) {
    console.error('Error updating payment settings:', error);
    throw error;
  }
};

module.exports = {
  getSettings,
  updateSettings,
  updateBusinessSettings,
  updateTaxSettings,
  updateReceiptSettings,
  updatePaymentSettings
};