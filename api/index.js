// Vercel serverless entry point
// This file ensures Vercel can properly route API requests

const app = require('../server/server');

// Export the Express API for Vercel
module.exports = app;
