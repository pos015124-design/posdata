// Print all uncaught errors and unhandled promise rejections for debugging
process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION:', err);
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('UNHANDLED REJECTION:', reason);
});
// Load environment variables
require('dotenv').config();

// Import core modules
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const hpp = require('hpp');
const compression = require('compression');
const path = require('path');
const rateLimit = require('express-rate-limit');
const http = require('http');

// Import logging
const { logger, securityLogger, auditLogger } = require('./config/logger');

// Import database config
const { connectDB } = require("./config/database");

// Import error handling
const { globalErrorHandler } = require('./utils/errorHandler');

// Import routes
const basicRoutes = require("./routes/index");
const authRoutes = require("./routes/authRoutes");
const productRoutes = require("./routes/productRoutes");
const customerRoutes = require("./routes/customerRoutes");
// const customerPaymentRoutes = require("./routes/customerPaymentRoutes");
// const inventoryRoutes = require("./routes/inventoryRoutes");
const salesRoutes = require("./routes/salesRoutes");
const expenseRoutes = require("./routes/expenseRoutes");
// const staffRoutes = require("./routes/staffRoutes");
const simpleAnalyticsRoutes = require("./routes/simpleAnalyticsRoutes");
// const settingsRoutes = require("./routes/settingsRoutes");
const simpleCategoryRoutes = require("./routes/simpleCategoryRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const exportRoutes = require("./routes/exportRoutes");
const businessRoutes = require("./routes/businessRoutes");
const platformRoutes = require("./routes/platformRoutes");
const { router: customerAuthRoutes } = require("./routes/customerAuthRoutes");
const cartRoutes = require("./routes/cartRoutes");
const orderRoutes = require("./routes/orderRoutes");
const catalogRoutes = require("./routes/catalogRoutes");

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later'
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // increased for development
  message: 'Too many login attempts from this IP, please try again later'
});

// Environment validation - skip exit for Vercel serverless
const requiredEnvVars = ['DATABASE_URL', 'JWT_SECRET'];
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  console.error(`Warning: Missing required environment variables: ${missingEnvVars.join(', ')}`);
  // Don't exit in Vercel serverless environment, let it fail gracefully
  if (process.env.VERCEL !== '1') {
    console.error('Server cannot start without these variables');
    process.exit(-1);
  }
}

// Initialize Express app
const app = express();
const port = process.env.PORT || 3001;

// Essential middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cors());

// Security middleware
app.use(helmet());
app.use(compression());
app.use(mongoSanitize());
app.use(hpp());

// Rate limiting
app.use('/api/auth', authLimiter);
app.use('/api', apiLimiter);

// API Routes
app.use(basicRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/customers', customerRoutes);
// app.use('/api/customer-payments', customerPaymentRoutes);
// app.use('/api/inventory', inventoryRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/expenses', expenseRoutes);
// app.use('/api/staff', staffRoutes);
app.use('/api/analytics', simpleAnalyticsRoutes);
// app.use('/api/settings', settingsRoutes);
app.use('/api/categories', simpleCategoryRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/business', businessRoutes);
app.use('/api/platform', platformRoutes);
app.use('/api/customer-auth', customerAuthRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/catalog', catalogRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Setup API documentation
try {
  const { setupSwagger } = require('./docs/api-docs');
  setupSwagger(app);
  console.log('📚 API documentation available at /api/docs');
} catch (error) {
  console.log('⚠️ API documentation not available');
}

// Serve static files from React build (only in production)
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/dist')));

  // Catch-all handler for React routes
  app.get('*', (req, res) => {
    // Skip API routes
    if (req.path.startsWith('/api/')) {
      return res.status(404).json({ error: 'API endpoint not found' });
    }

    // Serve React app for all other routes
    res.sendFile(path.join(__dirname, '../client/dist/index.html'));
  });
}

// 404 handler
app.use((req, res) => {
  logger.warn('404 Not Found', {
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  res.status(404).json({
    error: 'Not Found',
    message: 'The requested resource was not found',
    path: req.url
  });
});

// Use centralized error handler
app.use(globalErrorHandler);

// Connect to MongoDB and start server
const startServer = async () => {
  try {
    await connectDB();
    console.log('✅ Database connected successfully');
  } catch (err) {
    console.error('❌ Database connection failed:', err.message);
    console.log('⚠️ Server will start without database connection');
  }

  // Start server
  const server = http.createServer(app);
  server.listen(port, () => {
    console.log(`🚀 Server running at http://localhost:${port}`);
    console.log(`✅ Registration endpoint available at http://localhost:${port}/api/auth/register`);
    console.log(`✅ Login endpoint available at http://localhost:${port}/api/auth/login`);
    console.log('✅ Server started successfully!');
  });

  return server;
};

// Start the server
const server = startServer();

module.exports = app;

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception', { error: err.message, stack: err.stack });
  process.exit(1);
});

// Handle unhandled promise rejections - log but don't exit during development
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Promise Rejection:', reason);
  // Don't exit in development mode
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
});
