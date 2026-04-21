// Vercel serverless entry point
// This file is specifically for Vercel deployment

const server = require('./server');

// Export the Express app for Vercel serverless functions
module.exports = server;
