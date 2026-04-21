const express = require('express');
const router = express.Router();
const { requireAdmin } = require('./middleware/auth');
const { logger } = require('../config/logger');

// Mock configuration storage (in production, this would be in database)
let systemConfig = {
  general: {
    siteName: 'Dukani E-commerce',
    siteDescription: 'A comprehensive e-commerce platform',
    siteLogo: '',
    siteFavicon: '',
    timezone: 'UTC',
    dateFormat: 'YYYY-MM-DD',
    timeFormat: 'HH:mm:ss'
  },
  security: {
    passwordMinLength: 8,
    passwordRequireUppercase: true,
    passwordRequireLowercase: true,
    passwordRequireNumbers: true,
    passwordRequireSymbols: true,
    maxLoginAttempts: 5,
    lockoutTime: 900000, // 15 minutes in ms
    sessionTimeout: 3600000, // 1 hour in ms
    twoFactorAuth: false
  },
  email: {
    smtpHost: '',
    smtpPort: 587,
    smtpUser: '',
    smtpPass: '',
    fromEmail: 'noreply@dukani.com',
    fromName: 'Dukani Support'
  },
  payment: {
    defaultCurrency: 'USD',
    taxRate: 0.0,
    enableTax: false,
    enableShipping: true,
    shippingCost: 0.0,
    freeShippingThreshold: 50.0
  },
  features: {
    enableReviews: true,
    enableWishlist: true,
    enableCompare: true,
    enableNewsletter: true,
    enableSocialLogin: false
  }
};

// Get all configurations
router.get('/config', requireAdmin, (req, res) => {
  try {
    res.status(200).json({
      status: 'success',
      data: { config: systemConfig }
    });
  } catch (error) {
    logger.error('Error getting system config', { error: error.message, userId: req.user.userId });
    res.status(500).json({
      status: 'error',
      message: 'Failed to get system configuration'
    });
  }
});

// Get specific configuration section
router.get('/config/:section', requireAdmin, (req, res) => {
  try {
    const section = req.params.section;
    
    if (!systemConfig[section]) {
      return res.status(404).json({
        status: 'error',
        message: `Configuration section '${section}' not found`
      });
    }
    
    res.status(200).json({
      status: 'success',
      data: { 
        section,
        config: systemConfig[section] 
      }
    });
  } catch (error) {
    logger.error('Error getting config section', { 
      error: error.message, 
      userId: req.user.userId,
      section: req.params.section 
    });
    res.status(500).json({
      status: 'error',
      message: 'Failed to get configuration section'
    });
  }
});

// Update system configuration
router.put('/config', requireAdmin, (req, res) => {
  try {
    const updates = req.body;
    
    // Validate and update configurations
    for (const [section, values] of Object.entries(updates)) {
      if (systemConfig[section]) {
        systemConfig[section] = { ...systemConfig[section], ...values };
      }
    }
    
    logger.info('System configuration updated', {
      userId: req.user.userId,
      updatedSections: Object.keys(updates),
      ip: req.ip
    });
    
    res.status(200).json({
      status: 'success',
      message: 'Configuration updated successfully',
      data: { config: systemConfig }
    });
  } catch (error) {
    logger.error('Error updating system config', { error: error.message, userId: req.user.userId });
    res.status(500).json({
      status: 'error',
      message: 'Failed to update system configuration'
    });
  }
});

// Update specific configuration section
router.put('/config/:section', requireAdmin, (req, res) => {
  try {
    const section = req.params.section;
    const updates = req.body;
    
    if (!systemConfig[section]) {
      return res.status(404).json({
        status: 'error',
        message: `Configuration section '${section}' not found`
      });
    }
    
    systemConfig[section] = { ...systemConfig[section], ...updates };
    
    logger.info('Configuration section updated', {
      userId: req.user.userId,
      section,
      ip: req.ip
    });
    
    res.status(200).json({
      status: 'success',
      message: `Configuration section '${section}' updated successfully`,
      data: { 
        section,
        config: systemConfig[section] 
      }
    });
  } catch (error) {
    logger.error('Error updating config section', { 
      error: error.message, 
      userId: req.user.userId,
      section: req.params.section 
    });
    res.status(500).json({
      status: 'error',
      message: 'Failed to update configuration section'
    });
  }
});

// Reset configuration to defaults
router.delete('/config/:section', requireAdmin, (req, res) => {
  try {
    const section = req.params.section;
    
    if (!systemConfig[section]) {
      return res.status(404).json({
        status: 'error',
        message: `Configuration section '${section}' not found`
      });
    }
    
    // Reset to default values (in a real system, you'd have predefined defaults)
    const defaultConfigs = {
      general: {
        siteName: 'Dukani E-commerce',
        siteDescription: 'A comprehensive e-commerce platform',
        siteLogo: '',
        siteFavicon: '',
        timezone: 'UTC',
        dateFormat: 'YYYY-MM-DD',
        timeFormat: 'HH:mm:ss'
      },
      security: {
        passwordMinLength: 8,
        passwordRequireUppercase: true,
        passwordRequireLowercase: true,
        passwordRequireNumbers: true,
        passwordRequireSymbols: true,
        maxLoginAttempts: 5,
        lockoutTime: 900000,
        sessionTimeout: 3600000,
        twoFactorAuth: false
      },
      email: {
        smtpHost: '',
        smtpPort: 587,
        smtpUser: '',
        smtpPass: '',
        fromEmail: 'noreply@dukani.com',
        fromName: 'Dukani Support'
      },
      payment: {
        defaultCurrency: 'USD',
        taxRate: 0.0,
        enableTax: false,
        enableShipping: true,
        shippingCost: 0.0,
        freeShippingThreshold: 50.0
      },
      features: {
        enableReviews: true,
        enableWishlist: true,
        enableCompare: true,
        enableNewsletter: true,
        enableSocialLogin: false
      }
    };
    
    if (defaultConfigs[section]) {
      systemConfig[section] = defaultConfigs[section];
      
      logger.info('Configuration section reset to defaults', {
        userId: req.user.userId,
        section,
        ip: req.ip
      });
      
      res.status(200).json({
        status: 'success',
        message: `Configuration section '${section}' reset to defaults`,
        data: { 
          section,
          config: systemConfig[section] 
        }
      });
    } else {
      res.status(400).json({
        status: 'error',
        message: `Cannot reset section '${section}' - no default values defined`
      });
    }
  } catch (error) {
    logger.error('Error resetting config section', { 
      error: error.message, 
      userId: req.user.userId,
      section: req.params.section 
    });
    res.status(500).json({
      status: 'error',
      message: 'Failed to reset configuration section'
    });
  }
});

// Get configuration schema for UI validation
router.get('/config/schema', requireAdmin, (req, res) => {
  try {
    const schema = {
      general: {
        siteName: { type: 'string', required: true, maxLength: 100 },
        siteDescription: { type: 'string', required: false, maxLength: 500 },
        siteLogo: { type: 'string', required: false, format: 'url' },
        timezone: { type: 'string', required: true, default: 'UTC' },
        dateFormat: { type: 'string', required: true, default: 'YYYY-MM-DD' }
      },
      security: {
        passwordMinLength: { type: 'number', required: true, min: 6, max: 128 },
        maxLoginAttempts: { type: 'number', required: true, min: 1, max: 10 },
        lockoutTime: { type: 'number', required: true, min: 60000, max: 3600000 }
      },
      email: {
        smtpHost: { type: 'string', required: false, format: 'hostname' },
        smtpPort: { type: 'number', required: true, min: 1, max: 65535 },
        fromEmail: { type: 'string', required: true, format: 'email' }
      },
      payment: {
        defaultCurrency: { type: 'string', required: true, enum: ['USD', 'EUR', 'GBP', 'KES', 'GHS'] },
        taxRate: { type: 'number', required: true, min: 0, max: 1 },
        shippingCost: { type: 'number', required: true, min: 0 }
      },
      features: {
        enableReviews: { type: 'boolean', required: false, default: true },
        enableWishlist: { type: 'boolean', required: false, default: true }
      }
    };
    
    res.status(200).json({
      status: 'success',
      data: { schema }
    });
  } catch (error) {
    logger.error('Error getting config schema', { error: error.message, userId: req.user.userId });
    res.status(500).json({
      status: 'error',
      message: 'Failed to get configuration schema'
    });
  }
});

module.exports = router;