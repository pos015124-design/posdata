/**
 * Simple test server to debug startup issues
 */

require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const { logger } = require('./config/logger');

const app = express();
const port = process.env.PORT || 3000;

// Basic middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Test route
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Test API route
app.get('/api/test', (req, res) => {
  res.json({
    message: 'Dukani System API is working!',
    timestamp: new Date().toISOString()
  });
});

// Connect to MongoDB
mongoose.connect(process.env.DATABASE_URL)
  .then(() => {
    console.log('✅ MongoDB Connected');
    logger.info('MongoDB connected successfully');
    
    // Start server
    app.listen(port, () => {
      console.log(`🚀 Test server running at http://localhost:${port}`);
      console.log(`📊 Health check: http://localhost:${port}/health`);
      console.log(`🧪 Test API: http://localhost:${port}/api/test`);
      logger.info('Test server started successfully', { port });
    });
  })
  .catch((error) => {
    console.error('❌ MongoDB connection failed:', error.message);
    logger.error('MongoDB connection failed', { error: error.message });
    process.exit(1);
  });

// Error handling
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  logger.error('Express error', { error: err.message, stack: err.stack });
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message
  });
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection:', reason);
  process.exit(1);
});
