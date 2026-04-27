// Simple test endpoint to verify Vercel routing works
module.exports = (req, res) => {
  res.status(200).json({
    message: 'Vercel API routing is WORKING!',
    method: req.method,
    url: req.url,
    timestamp: new Date().toISOString(),
    note: 'If you see this, Vercel is correctly routing /api/* requests to serverless functions'
  });
};
