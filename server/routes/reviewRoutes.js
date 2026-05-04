/**
 * Review Routes — public ratings and feedback for stores
 */
const express = require('express');
const router = express.Router();
const Review = require('../models/Review');
const Business = require('../models/Business');
const { body, validationResult } = require('express-validator');

const validate = [
  body('reviewerName').trim().isLength({ min: 2, max: 100 }).withMessage('Name required'),
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be 1–5'),
  body('comment').optional().trim().isLength({ max: 1000 })
];

/**
 * GET /api/reviews/:slug
 * Get approved reviews for a store by slug
 */
router.get('/:slug', async (req, res) => {
  try {
    const business = await Business.findOne({ slug: req.params.slug }).select('_id name');
    if (!business) return res.status(404).json({ error: 'Store not found' });

    const reviews = await Review.find({ businessId: business._id, isApproved: true })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    // Aggregate stats
    const total = reviews.length;
    const avgRating = total ? reviews.reduce((s, r) => s + r.rating, 0) / total : 0;
    const distribution = [5, 4, 3, 2, 1].map(star => ({
      star,
      count: reviews.filter(r => r.rating === star).length
    }));

    res.json({ success: true, data: { reviews, stats: { total, avgRating: Math.round(avgRating * 10) / 10, distribution } } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/reviews/:slug
 * Submit a review for a store (public — no auth required)
 */
router.post('/:slug', validate, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: 'Validation failed', details: errors.array() });

  try {
    const business = await Business.findOne({ slug: req.params.slug, status: 'active' }).select('_id slug');
    if (!business) return res.status(404).json({ error: 'Store not found' });

    const { reviewerName, reviewerEmail, rating, comment } = req.body;

    const review = new Review({
      businessId: business._id,
      businessSlug: business.slug,
      reviewerName,
      reviewerEmail,
      rating: parseInt(rating),
      comment
    });
    await review.save();

    res.status(201).json({ success: true, message: 'Review submitted successfully', data: review });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
