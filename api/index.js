// Vercel serverless entry point
// This file ensures Vercel can properly route API requests
// Rebuild: 2026-04-27

console.log('🔵 Loading Vercel API entry point...');

const app = require('../server/server');

console.log('✅ Vercel API loaded successfully');

// Export the Express API for Vercel
module.exports = app;
