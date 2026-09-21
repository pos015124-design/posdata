const express = require('express');
const request = require('supertest');
const mongoose = require('mongoose');
const Business = require('../models/Business');
const Product = require('../models/Product');
const Review = require('../models/Review');
const User = require('../models/User');
const CatalogService = require('../services/catalogService');
const SaleService = require('../services/saleService');
const storeRoutes = require('../routes/storeRoutes');
const cartRoutes = require('../routes/cartRoutes');
const reviewRoutes = require('../routes/reviewRoutes');
const StoreService = require('../services/storeService');
const Cart = require('../models/Cart');
const Sale = require('../models/Sale');

const createPublicApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/public', storeRoutes);
  app.use('/api/cart', cartRoutes);
  app.use('/api/reviews', reviewRoutes);
  return app;
};

async function createUser(email) {
  return User.create({
    email,
    password: 'Password123!',
    role: 'business_admin',
    isApproved: true,
    isActive: true
  });
}

async function createBusiness(name, slug, userId, overrides = {}) {
  return Business.create({
    name,
    slug,
    email: `${slug}@test.com`,
    category: 'retail',
    userId,
    status: 'active',
    isPublic: true,
    ...overrides
  });
}

async function createProduct(name, code, userId, overrides = {}) {
  return Product.create({
    name,
    slug: overrides.slug || code.toLowerCase(),
    code,
    barcode: code,
    price: 100,
    purchasePrice: 50,
    stock: 5,
    reorderPoint: 1,
    category: 'retail',
    userId,
    isPublished: true,
    status: 'active',
    ...overrides
  });
}

describe('Public marketplace security boundaries', () => {
  it('isolates direct, legacy-single-owner, and ambiguous product ownership', async () => {
    const userA = await createUser('catalog-a@test.com');
    const userB = await createUser('catalog-b@test.com');
    const businessA = await createBusiness('Catalog A', 'catalog-a', userA._id);
    const businessB = await createBusiness('Catalog B', 'catalog-b', userB._id);

    await createProduct('A direct', 'CAT-A', userA._id, { businessId: businessA._id, category: 'a-only' });
    await createProduct('B direct', 'CAT-B', userB._id, { businessId: businessB._id, category: 'b-only' });
    await createProduct('A legacy', 'CAT-A-LEGACY', userA._id, { category: 'a-legacy' });

    const aProducts = await CatalogService.getBusinessProducts(businessA._id, {}, { page: 1, limit: 20 });
    const bProducts = await CatalogService.getBusinessProducts(businessB._id, {}, { page: 1, limit: 20 });
    expect(aProducts.products.map(p => p.name).sort()).toEqual(['A direct', 'A legacy']);
    expect(bProducts.products.map(p => p.name)).toEqual(['B direct']);

    const aCategories = await CatalogService.getBusinessCategories(businessA._id);
    const bCategories = await CatalogService.getBusinessCategories(businessB._id);
    expect(aCategories.map(c => c.name).sort()).toEqual(['a-legacy', 'a-only']);
    expect(bCategories.map(c => c.name)).toEqual(['b-only']);

    const ambiguousUser = await createUser('catalog-ambiguous@test.com');
    const ambiguousA = await createBusiness('Ambiguous A', 'ambiguous-a', ambiguousUser._id);
    await createBusiness('Ambiguous B', 'ambiguous-b', ambiguousUser._id);
    await createProduct('Ambiguous legacy', 'CAT-AMB', ambiguousUser._id, { category: 'ambiguous-only' });
    const ambiguousProducts = await CatalogService.getBusinessProducts(ambiguousA._id, {}, { page: 1, limit: 20 });
    expect(ambiguousProducts.products).toHaveLength(0);
  });

  it('scopes product detail by business and rejects duplicate cross-business slugs', async () => {
    const userA = await createUser('detail-a@test.com');
    const userB = await createUser('detail-b@test.com');
    const businessA = await createBusiness('Detail A', 'detail-a', userA._id);
    const businessB = await createBusiness('Detail B', 'detail-b', userB._id);
    await createProduct('A detail', 'DET-A', userA._id, { businessId: businessA._id, slug: 'shared-slug' });
    await createProduct('B detail', 'DET-B', userB._id, { businessId: businessB._id, slug: 'shared-slug' });

    const a = await CatalogService.getProductBySlug(businessA._id, 'shared-slug');
    const b = await CatalogService.getProductBySlug(businessB._id, 'shared-slug');
    expect(a.product.name).toBe('A detail');
    expect(b.product.name).toBe('B detail');
    await expect(CatalogService.getProductBySlug(businessA._id, 'missing-slug')).rejects.toThrow('Product not found');
  });

  it.each([
    ['private', { isPublic: false, status: 'active' }],
    ['inactive', { isPublic: true, status: 'inactive' }]
  ])('rejects public checkout for a %s business product without creating a sale', async (_label, businessOverrides) => {
    const user = await createUser(`checkout-${_label}@test.com`);
    const business = await createBusiness(`Checkout ${_label}`, `checkout-${_label}`, user._id, businessOverrides);
    const product = await createProduct(`Checkout ${_label} product`, `CHK-${_label.toUpperCase()}`, user._id, { businessId: business._id });
    const app = createPublicApp();

    const before = await require('../models/Sale').countDocuments();
    const response = await request(app)
      .post('/api/public/checkout')
      .send({
        items: [{ product: product._id, quantity: 1 }],
        paymentMethod: 'cash',
        customer: { name: 'Buyer', phone: '+255700000000' }
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Checkout failed');
    expect(response.body.message).toMatch(/public marketplace/i);
    expect(await require('../models/Sale').countDocuments()).toBe(before);
  });

  it('rejects adding a product through the public cart under a different business', async () => {
    const owner = await createUser('cart-owner@test.com');
    const otherOwner = await createUser('cart-other@test.com');
    const productBusiness = await createBusiness('Cart Product Store', 'cart-product-store', owner._id);
    const requestedBusiness = await createBusiness('Cart Requested Store', 'cart-requested-store', otherOwner._id);
    const product = await createProduct('Cart private boundary', 'CART-BOUNDARY', owner._id, { businessId: productBusiness._id });
    const app = createPublicApp();

    const response = await request(app)
      .post('/api/cart/add')
      .send({ productId: product._id, quantity: 1, businessId: requestedBusiness._id });
    expect(response.status).toBe(400);
    expect(response.body.message).toMatch(/public store/i);

    const eligibleResponse = await request(app)
      .post('/api/cart/add')
      .send({ productId: product._id, quantity: 1, businessId: productBusiness._id });
    expect(eligibleResponse.status).toBe(200);
  });

  it('allows checkout resolution for a direct eligible product and a legacy single-public-owner product', async () => {
    const user = await createUser('checkout-public@test.com');
    const business = await createBusiness('Checkout Public', 'checkout-public', user._id);
    const direct = await createProduct('Direct checkout', 'CHK-DIRECT', user._id, { businessId: business._id });
    const legacy = await createProduct('Legacy checkout', 'CHK-LEGACY', user._id);

    const resolved = await SaleService.resolveCartItems([
      { product: direct._id, quantity: 1 },
      { product: legacy._id, quantity: 1 }
    ]);
    expect(resolved.map(item => item.name).sort()).toEqual(['Direct checkout', 'Legacy checkout']);
  });

  it('requires an active public business for review submission', async () => {
    const publicBusiness = await createBusiness('Review Public', 'review-public', (await createUser('review-public@test.com'))._id);
    const privateBusiness = await createBusiness('Review Private', 'review-private', (await createUser('review-private@test.com'))._id, { isPublic: false });
    const inactiveBusiness = await createBusiness('Review Inactive', 'review-inactive', (await createUser('review-inactive@test.com'))._id, { status: 'inactive' });
    const app = createPublicApp();
    const payload = { reviewerName: 'Buyer', reviewerEmail: 'buyer@test.com', rating: 5, comment: 'Good' };

    await request(app).post(`/api/reviews/${publicBusiness.slug}`).send(payload).expect(201);
    await request(app).post(`/api/reviews/${privateBusiness.slug}`).send(payload).expect(404);
    await request(app).post(`/api/reviews/${inactiveBusiness.slug}`).send(payload).expect(404);
    expect(await Review.countDocuments()).toBe(1);
  });

  it('rejects cross-business product detail and isolates marketplace discovery, featured, and related products', async () => {
    const userA = await createUser('discovery-a@test.com');
    const userB = await createUser('discovery-b@test.com');
    const userPrivate = await createUser('discovery-private@test.com');
    const businessA = await createBusiness('Discovery A', 'discovery-a', userA._id);
    const businessB = await createBusiness('Discovery B', 'discovery-b', userB._id);
    const privateBusiness = await createBusiness('Discovery Private', 'discovery-private', userPrivate._id, { isPublic: false });

    const productA = await createProduct('Discovery A product', 'DISC-A', userA._id, {
      businessId: businessA._id,
      slug: 'discovery-a-product',
      category: 'shared-discovery',
      isFeatured: true
    });
    const productB = await createProduct('Discovery B product', 'DISC-B', userB._id, {
      businessId: businessB._id,
      slug: 'discovery-b-product',
      category: 'shared-discovery',
      isFeatured: true
    });
    await createProduct('Private discovery product', 'DISC-PRIVATE', userPrivate._id, {
      businessId: privateBusiness._id,
      category: 'private-only',
      isFeatured: true
    });

    await expect(CatalogService.getProductBySlug(businessA._id, productB.slug))
      .rejects.toThrow('Product not found');

    const marketplace = await StoreService.getMarketplaceProducts({ page: 1, limit: 20 });
    expect(marketplace.products.map(product => product.name)).toEqual(
      expect.arrayContaining([productA.name, productB.name])
    );
    expect(marketplace.products.map(product => product.name)).not.toContain('Private discovery product');

    const searched = await StoreService.getMarketplaceProducts({ page: 1, limit: 20, search: 'Private discovery' });
    expect(searched.products.map(product => product.name)).not.toContain('Private discovery product');

    const featured = await CatalogService.getFeaturedProducts({ page: 1, limit: 20 });
    expect(featured.products.map(product => product.name)).not.toContain('Private discovery product');

    const related = await CatalogService.getRelatedProducts(productA._id, 20);
    expect(related.map(product => product.name)).toContain(productB.name);
    expect(related.map(product => product.name)).not.toContain('Private discovery product');
  });

  it.each([
    ['another business', { businessId: new mongoose.Types.ObjectId() }],
    ['unpublished', { isPublished: false }],
    ['inactive', { status: 'inactive' }]
  ])('rejects public checkout for an %s product without creating a sale or changing stock', async (_label, productOverrides) => {
    const user = await createUser(`checkout-negative-${_label.replace(/\s/g, '-') }@test.com`);
    const business = await createBusiness(`Checkout negative ${_label}`, `checkout-negative-${_label.replace(/\s/g, '-')}`, user._id);
    const product = await createProduct(`Checkout negative ${_label}`, `CHK-NEG-${_label.toUpperCase().replace(/\s/g, '-')}`, user._id, productOverrides);
    const beforeStock = product.stock;
    const beforeSales = await Sale.countDocuments();

    await expect(SaleService.resolveCartItems([{ product: product._id, quantity: 1 }]))
      .rejects.toThrow();
    expect(await Sale.countDocuments()).toBe(beforeSales);
    expect((await Product.findById(product._id)).stock).toBe(beforeStock);
    void business;
  });

  it('rejects cart access for private and inactive businesses without creating carts', async () => {
    const userPrivate = await createUser('cart-private@test.com');
    const userInactive = await createUser('cart-inactive@test.com');
    const privateBusiness = await createBusiness('Cart Private', 'cart-private', userPrivate._id, { isPublic: false });
    const inactiveBusiness = await createBusiness('Cart Inactive', 'cart-inactive', userInactive._id, { status: 'inactive' });
    const privateProduct = await createProduct('Cart private product', 'CART-PRIVATE', userPrivate._id, { businessId: privateBusiness._id });
    const inactiveProduct = await createProduct('Cart inactive product', 'CART-INACTIVE', userInactive._id, { businessId: inactiveBusiness._id });
    const sessionId = 'guest-security-boundary';

    await expect(require('../services/cartService').addToCart(sessionId, privateBusiness._id, privateProduct._id, 1))
      .rejects.toThrow(/public store|not public/);
    await expect(require('../services/cartService').addToCart(sessionId, inactiveBusiness._id, inactiveProduct._id, 1))
      .rejects.toThrow(/public store|not public/);
    expect(await Cart.countDocuments({ sessionId })).toBe(0);
  });

  it('rejects legacy products when their owner has no eligible public business', async () => {
    const user = await createUser('legacy-hidden@test.com');
    const privateBusiness = await createBusiness('Legacy Hidden', 'legacy-hidden', user._id, { isPublic: false });
    const product = await createProduct('Legacy hidden product', 'LEGACY-HIDDEN', user._id);

    await expect(SaleService.resolveCartItems([{ product: product._id, quantity: 1 }]))
      .rejects.toThrow('public marketplace');
    expect(await CatalogService.getBusinessProducts(privateBusiness._id).catch(() => null)).toBeNull();
  });

  it('rejects invalid business identifiers without querying products', async () => {
    await expect(CatalogService.getBusinessProducts(new mongoose.Types.ObjectId(), {}, { page: 1, limit: 10 }))
      .rejects.toThrow('Business not found or not public');
  });
});
