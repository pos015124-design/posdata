const express = require("express");
const router = express.Router();
const { logger } = require("../config/logger");

// Import services
const userService = require("../services/userService");
const { requireUser } = require("./middleware/auth");

// Home route
router.get("/", (req, res) => {
  res.json({
    message: "Welcome to the Dukani API",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
    endpoints: {
      auth: "/api/auth",
      products: "/api/products", 
      customers: "/api/customers",
      orders: "/api/orders",
      inventory: "/api/inventory"
    }
  });
});

// Health check
router.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Client-side logging endpoint
router.post("/logs/client", (req, res) => {
  try {
    const { level, message, meta, url, userAgent, sessionId, timestamp } = req.body;
    
    // Validate required fields
    if (!level || !message) {
      return res.status(400).json({
        error: "Missing required fields: level and message"
      });
    }

    // Log to server logs based on level
    switch (level.toLowerCase()) {
      case 'error':
        logger.error('Client-side error', { 
          message, 
          meta, 
          url, 
          userAgent, 
          sessionId, 
          timestamp 
        });
        break;
      case 'warn':
        logger.warn('Client-side warning', { 
          message, 
          meta, 
          url, 
          userAgent, 
          sessionId, 
          timestamp 
        });
        break;
      case 'info':
        logger.info('Client-side info', { 
          message, 
          meta, 
          url, 
          userAgent, 
          sessionId, 
          timestamp 
        });
        break;
      case 'debug':
        logger.debug('Client-side debug', { 
          message, 
          meta, 
          url, 
          userAgent, 
          sessionId, 
          timestamp 
        });
        break;
      default:
        logger.info('Client-side log', { 
          level,
          message, 
          meta, 
          url, 
          userAgent, 
          sessionId, 
          timestamp 
        });
    }

    res.status(200).json({
      status: "logged",
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error handling client log', { error: error.message });
    res.status(500).json({
      error: "Failed to process log entry"
    });
  }
});

// Error logging endpoint for client-side errors
router.post("/logs/error", requireUser, (req, res) => {
  try {
    const { error, errorInfo, url, userAgent, timestamp } = req.body;
    
    // Log security-relevant information
    logger.error('Client-side application error', {
      userId: req.user.userId,
      error,
      errorInfo,
      url,
      userAgent,
      timestamp,
      ip: req.ip
    });

    res.status(200).json({
      status: "error logged",
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    logger.error('Error handling client error log', { error: err.message });
    res.status(500).json({
      error: "Failed to process error log"
    });
  }
});

module.exports = router;