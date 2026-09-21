const request = require('supertest');
const express = require('express');
const Business = require('../models/Business');
const Review = require('../models/Review');
const reviewRoutes = require('../routes/reviewRoutes');

const createApp = () => {
  const app = express();
  app.use('/api/reviews', reviewRoutes);
  return app;
};

describe('Public review visibility', () => {
  let app;

  beforeEach(() => {
    app = createApp();
  });

  async function createBusiness(overrides = {}) {
    return Business.create({
      name: 'Review Store',
      slug: `review-store-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      email: `review-${Date.now()}@test.com`,
      category: 'retail',
      status: 'active',
      isPublic: true,
      ...overrides
    });
  }

  it('returns approved reviews for an active public business', async () => {
    const business = await createBusiness({ slug: 'public-review-store' });
    await Review.create({
      businessId: business._id,
      businessSlug: business.slug,
      reviewerName: 'Buyer',
      rating: 5,
      comment: 'Good store',
      isApproved: true
    });

    const response = await request(app).get('/api/reviews/public-review-store').expect(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.reviews).toHaveLength(1);
  });

  it.each([
    ['private', { status: 'active', isPublic: false }],
    ['inactive', { status: 'inactive', isPublic: true }]
  ])('does not expose reviews for %s businesses', async (slugSuffix, overrides) => {
    const business = await createBusiness({ slug: `${slugSuffix}-review-store`, ...overrides });
    await Review.create({
      businessId: business._id,
      businessSlug: business.slug,
      reviewerName: 'Buyer',
      rating: 5,
      comment: 'Hidden review',
      isApproved: true
    });

    const response = await request(app).get(`/api/reviews/${business.slug}`).expect(404);
    expect(response.body.error).toBe('Store not found');
  });

  it('returns generic not-found behavior for a missing slug', async () => {
    const response = await request(app).get('/api/reviews/missing-review-store').expect(404);
    expect(response.body.error).toBe('Store not found');
  });
});
