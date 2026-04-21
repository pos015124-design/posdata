/**
 * Full Dukani Server (without WebSocket for testing)
 */

require('dotenv').config();
const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const { logger } = require('./config/logger');

// Import routes
const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes');
const customerRoutes = require('./routes/customerRoutes');
const salesRoutes = require('./routes/salesRoutes');
const simpleAnalyticsRoutes = require('./routes/simpleAnalyticsRoutes');
const simpleInventoryRoutes = require('./routes/simpleInventoryRoutes');
const simpleSettingsRoutes = require('./routes/simpleSettingsRoutes');
const simpleCategoryRoutes = require('./routes/simpleCategoryRoutes');
const staffRoutes = require('./routes/staffRoutes');
const expenseRoutes = require('./routes/expenseRoutes');
const sellerRoutes = require('./routes/sellerRoutes');
const sellerInventoryRoutes = require('./routes/sellerInventoryRoutes');
const webSocketService = require('./services/websocketService');

const app = express();
const server = http.createServer(app);
const port = process.env.PORT || 3000;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  crossOriginEmbedderPolicy: false
}));

// Compression
app.use(compression());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per windowMs
  message: {
    error: 'Too many requests',
    message: 'Please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files
app.use(express.static('public'));

// CORS configuration
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:3001'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Request logging
app.use((req, res, next) => {
  logger.info('Request received', {
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });
  next();
});

// Health check route
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: '2.0.0',
    features: [
      'authentication',
      'products',
      'customers', 
      'sales',
      'analytics',
      'dashboard',
      'exports',
      'caching',
      'security'
    ]
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/analytics', simpleAnalyticsRoutes);
app.use('/api/inventory', simpleInventoryRoutes);
app.use('/api/settings', simpleSettingsRoutes);
app.use('/api/categories', simpleCategoryRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/sellers', sellerRoutes);
app.use('/api/seller-inventory', sellerInventoryRoutes);

// Test route
app.get('/api/test', (req, res) => {
  res.json({
    message: 'Dukani System Full API is working!',
    timestamp: new Date().toISOString(),
    endpoints: [
      'GET /health',
      'GET /api/test',
      'POST /api/auth/register',
      'POST /api/auth/login',
      'GET /api/auth/profile',
      'GET /api/products',
      'GET /api/customers',
      'GET /api/sales',
      'GET /api/analytics/sales',
      'GET /api/dashboard/overview',
      'GET /api/export/sales/pdf'
    ]
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.originalUrl} not found`,
    suggestion: 'Check /api/test for available endpoints'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Express error', { 
    error: err.message, 
    stack: err.stack,
    url: req.url,
    method: req.method
  });
  
  res.status(err.status || 500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// Connect to MongoDB and start server
mongoose.connect(process.env.DATABASE_URL)
  .then(() => {
    console.log('✅ MongoDB Connected');
    logger.info('MongoDB connected successfully');
    
    // Initialize WebSocket service
    webSocketService.initialize(server);

    // Start server
    server.listen(port, () => {
      console.log(`🚀 Dukani System Full API running at http://localhost:${port}`);
      console.log(`📊 Health check: http://localhost:${port}/health`);
      console.log(`🧪 Test endpoints: http://localhost:${port}/api/test`);
      console.log(`🔐 Authentication: http://localhost:${port}/api/auth/*`);
      console.log(`📦 Products: http://localhost:${port}/api/products`);
      console.log(`👥 Customers: http://localhost:${port}/api/customers`);
      console.log(`💰 Sales: http://localhost:${port}/api/sales`);
      console.log(`📈 Analytics: http://localhost:${port}/api/analytics/*`);
      console.log(`📊 Dashboard: http://localhost:${port}/api/dashboard/*`);
      console.log(`📄 Exports: http://localhost:${port}/api/export/*`);
      logger.info('Dukani System Full API started successfully', { port });
    });
  })
  .catch((error) => {
    console.error('❌ MongoDB connection failed:', error.message);
    logger.error('MongoDB connection failed', { error: error.message });
    process.exit(1);
  });

// Error handling
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  logger.error('Uncaught Exception', { error: err.message, stack: err.stack });
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection:', reason);
  logger.error('Unhandled Rejection', { reason, promise });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  mongoose.connection.close(false, () => {
    console.log('MongoDB connection closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  mongoose.connection.close(false, () => {
    console.log('MongoDB connection closed');
    process.exit(0);
  });
});
