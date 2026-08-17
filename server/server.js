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
const uploadRoutes = require("./routes/uploadRoutes");
const sellerRoutes = require("./routes/sellerRoutes");
const importRoutes = require("./routes/importRoutes");
const sellerInventoryRoutes = require("./routes/sellerInventoryRoutes");
const reviewRoutes = require("./routes/reviewRoutes");

// Rate limiting
const skipPreflight = (req) => req.method === 'OPTIONS';

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  // 600 req / 15 min per IP (~40/min). High enough for the SPA's legit polling
  // (dashboard 30s, notification feed 45s, focus/event refreshes, multi-tab) yet
  // still blocks scrapers. The old 100/15min tripped 429s in normal use.
  max: 600,
  message: 'Too many requests from this IP, please try again later',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  skip: skipPreflight
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 login attempts per 15 minutes per IP
  message: 'Too many login attempts from this IP, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipPreflight
});

// Upload rate limiter - more generous for file uploads
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // limit each IP to 30 upload requests per 15 minutes
  message: 'Too many upload requests from this IP, please try again later',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false,
  skip: skipPreflight,
  handler: (req, res) => {
    res.status(429).json({
      error: 'Too many upload requests',
      message: 'You have exceeded the upload rate limit. Please wait a few minutes before trying again.',
      retryAfter: 900 // 15 minutes in seconds
    });
  }
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

// CRITICAL: Trust proxy for Render/Vercel deployment
// This allows express-rate-limit to correctly identify users behind load balancers
app.set('trust proxy', 1); // trust first proxy

// Essential middleware
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// CRITICAL: Disable browser caching for API responses to prevent data leakage
app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
    res.set({
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      'Surrogate-Control': 'no-store'
    });
  }
  next();
});

// CORS: list browser origins (scheme+host, no path). Omit all = permissive (reflect Origin).
// ALLOWED_ORIGINS=* also means permissive.
// You can set FRONTEND_URL / CLIENT_URL / SHOP_URL (single origin) on Render instead of a long ALLOWED_ORIGINS list.
const normalizeOrigin = (o) => (o || '').trim().replace(/\/+$/, '').toLowerCase();

/** Split comma-separated origins; also fix "host.https://other" (dot instead of comma between URLs). */
function splitOriginsParts(raw) {
  if (!raw || typeof raw !== 'string') return [];
  const healed = raw.replace(/\.(https?:\/\/)/gi, ',$1');
  if (healed !== raw) {
    console.warn(
      '[CORS] Origins string used a period before "https://" instead of a comma. Auto-split. Use commas in ALLOWED_ORIGINS, e.g. https://a.com,https://b.com'
    );
  }
  return healed
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function buildAllowedOriginsSet() {
  const primary = (process.env.ALLOWED_ORIGINS || '').trim();
  if (primary === '*') return null;

  const merged = [
    process.env.ALLOWED_ORIGINS,
    process.env.FRONTEND_URL,
    process.env.CLIENT_URL,
    process.env.SHOP_URL,
    process.env.VITE_APP_URL
  ]
    .filter(Boolean)
    .flatMap((s) => splitOriginsParts(s));

  if (!merged.length) return null;
  return new Set(merged.map(normalizeOrigin));
}

const ALLOWED_ORIGINS_SET = buildAllowedOriginsSet();

const corsShared = {
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With', 'X-Refresh-Token'],
  exposedHeaders: ['Content-Type'],
  optionsSuccessStatus: 204
};

app.use(
  cors(
    ALLOWED_ORIGINS_SET
      ? {
          ...corsShared,
          origin(origin, callback) {
            // Same-origin tools, curl, Postman — no Origin header
            if (!origin) return callback(null, true);
            const ok = ALLOWED_ORIGINS_SET.has(normalizeOrigin(origin));
            if (!ok) {
              console.warn(`[CORS] Blocked origin (add exact URL to ALLOWED_ORIGINS on the API host): ${origin}`);
            }
            return callback(null, ok);
          }
        }
      : {
          ...corsShared,
          origin: true
        }
  )
);

if (ALLOWED_ORIGINS_SET) {
  console.log('[CORS] Strict allowlist:', [...ALLOWED_ORIGINS_SET].join(', '));
} else {
  console.log('[CORS] Permissive (reflect Origin). Set ALLOWED_ORIGINS, FRONTEND_URL, or * to change.');
}

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", 'https://s3.us-east-1.amazonaws.com'],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https://res.cloudinary.com', 'blob:'],
      connectSrc: ["'self'", 'https://backend.bhabygroup.co.tz', 'https://e-shop.bhabygroup.co.tz'],
      fontSrc: ["'self'", 'data:'],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: []
    }
  }
}));
app.use(compression());
app.use(mongoSanitize());
app.use(hpp());

// Rate limiting
// authLimiter guards ONLY the credential endpoints (the brute-force surface). Mounting
// it on the whole /api/auth prefix throttled legit traffic — notification-prefs,
// pending-users, /me — to 10 requests per 15 min, which the SPA trips in normal use.
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/forgot-password', authLimiter);
app.use('/api/auth/reset-password', authLimiter);
app.use('/api/auth/change-password', authLimiter);
// TOTP codes are 6 digits — without a tight limiter an attacker could brute-force
// the code space. 10 tries / 15 min per IP makes that infeasible.
app.use('/api/auth/2fa/verify', authLimiter);
app.use('/api/uploads', uploadLimiter);
app.use('/api', apiLimiter);

// Serve static files (uploaded images) with CORS headers
app.use('/uploads', (req, res, next) => {
  res.header('Cross-Origin-Resource-Policy', 'cross-origin');
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET');
  next();
}, express.static(path.join(__dirname, 'uploads')));

// API Routes
app.use(basicRoutes);
app.use('/api/auth', authRoutes);

// ── TWA / Digital Asset Links ─────────────────────────────────────────────────
// Required for Trusted Web Activity (Play Store) domain verification.
// Android verifies this file on every TWA launch to confirm the app owns the domain.
// The SHA-256 fingerprint below must match your release keystore.
// Replace YOUR_SHA256_FINGERPRINT_HERE after running:
//   keytool -list -v -keystore eshop-release.keystore -alias eshop
// See PLAYSTORE_CHECKLIST.md for full instructions.
app.get('/.well-known/assetlinks.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.json([{
    relation: ['delegate_permission/common.handle_all_urls'],
    target: {
      namespace: 'android_app',
      package_name: 'co.tz.bhabygroup.eshop',
      sha256_cert_fingerprints: [
        process.env.TWA_SHA256_FINGERPRINT || 'YOUR_SHA256_FINGERPRINT_HERE'
      ]
    }
  }]);
});
app.use('/api/products', productRoutes);
app.use('/api/customers', customerRoutes);
// app.use('/api/customer-payments', customerPaymentRoutes);
// app.use('/api/inventory', inventoryRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/expenses', expenseRoutes);
// app.use('/api/staff', staffRoutes);
app.use('/api/analytics', simpleAnalyticsRoutes);
app.use('/api/settings', require('./routes/settingsRoutes'));
app.use('/api/categories', simpleCategoryRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/business', businessRoutes);
app.use('/api/platform', platformRoutes);
app.use('/api/customer-auth', customerAuthRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/catalog', catalogRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/migrate', require('./routes/migrationRoutes'));
app.use('/api/public', require('./routes/storeRoutes'));
app.use('/api/public/payments', require('./routes/paymentRoutes'));
// GET /api/public/products is defined in routes/storeRoutes.js (marketplace: active public stores only)

app.use('/api/sellers', sellerRoutes);
app.use('/api/products/import', importRoutes);
app.use('/api/seller-inventory', sellerInventoryRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/billing', require('./routes/billingRoutes'));
app.use('/api/suppliers', require('./routes/supplierRoutes'));
app.use('/api/delivery', require('./routes/deliveryRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));
app.use('/api/reports', require('./routes/reportRoutes'));

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
    
    // CRITICAL FIX: Do NOT start Express if database fails
    // This prevents the 10-second buffering timeout on every query
    if (process.env.VERCEL !== '1') {
      // Exit if not on Vercel (serverless handles it gracefully)
      console.error('🛑 Stopping server startup - database connection is required');
      process.exit(1);
    } else {
      // On Vercel, log but return (serverless will handle requests)
      console.warn('⚠️ Running on Vercel without database connection');
      return;
    }
  }

  // CRITICAL: Only start listening if NOT on Vercel (serverless)
  // Vercel handles routing automatically, we just export the app
  if (process.env.VERCEL !== '1') {
    // Start server for local development or traditional hosting
    const server = http.createServer(app);
    server.listen(port, '0.0.0.0', () => {
      console.log(`🚀 Server running at http://0.0.0.0:${port}`);
      console.log(`✅ Registration endpoint available at http://0.0.0.0:${port}/api/auth/register`);
      console.log(`✅ Login endpoint available at http://0.0.0.0:${port}/api/auth/login`);
      console.log('✅ Server started successfully!');
    });

    // Real-time WebSocket service — guarded so a socket failure never crashes the API
    try {
      const webSocketService = require('./services/websocketService');
      webSocketService.initialize(server);
    } catch (err) {
      console.error('WebSocket init failed (non-fatal):', err.message);
    }

    return server;
  } else {
    console.log('🔵 Running on Vercel - serverless mode (no app.listen)');
  }
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
