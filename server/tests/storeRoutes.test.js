const request = require('supertest');
const express = require('express');
const Business = require('../models/Business');
const storeRoutes = require('../routes/storeRoutes');

const createApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/public', storeRoutes);
  return app;
};

describe('Public seller store route safety', () => {
  let app;

  beforeEach(() => {
    app = createApp();
  });

  async function createBusiness(overrides = {}) {
    return Business.create({
      name: 'Public Store',
      slug: `public-store-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      email: `public-${Date.now()}@test.com`,
      category: 'retail',
      status: 'active',
      isPublic: true,
      ...overrides
    });
  }

  it('keeps a valid public seller response unchanged', async () => {
    await createBusiness({ slug: 'valid-public-store' });

    const response = await request(app).get('/api/public/store/VALID-PUBLIC-STORE').expect(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.business.slug).toBe('valid-public-store');
    expect(response.body.availableStores).toBeUndefined();
  });

  it.each([
    ['private', { status: 'active', isPublic: false }],
    ['inactive', { status: 'inactive', isPublic: true }]
  ])('does not enumerate %s seller metadata', async (slugSuffix, overrides) => {
    await createBusiness({ slug: `${slugSuffix}-public-store`, ...overrides });

    const response = await request(app).get(`/api/public/store/${slugSuffix}-public-store`).expect(404);
    expect(response.body).toEqual({
      error: 'Store not found',
      message: 'This store does not exist or is not public'
    });
    expect(response.body.availableStores).toBeUndefined();
  });

  it('does not enumerate businesses for an invalid slug', async () => {
    await createBusiness({ slug: 'another-public-store' });

    const response = await request(app).get('/api/public/store/not-a-real-store').expect(404);
    expect(response.body.availableStores).toBeUndefined();
    expect(JSON.stringify(response.body)).not.toContain('another-public-store');
  });
});
