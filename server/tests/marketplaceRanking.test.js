const StoreService = require('../services/storeService');
const User = require('../models/User');
const Business = require('../models/Business');
const Product = require('../models/Product');

async function createSeller(email, name, slug) {
  const user = await User.create({
    email,
    password: 'Password123!',
    role: 'business_admin',
    isApproved: true,
    isActive: true
  });
  const business = await Business.create({
    name,
    slug,
    email,
    category: 'retail',
    userId: user._id,
    status: 'active',
    isPublic: true
  });
  return { user, business };
}

async function createProduct(seller, name, code, overrides = {}) {
  return Product.create({
    name,
    code,
    barcode: code,
    price: 10,
    purchasePrice: 5,
    stock: 2,
    category: 'retail',
    userId: seller.user._id,
    businessId: seller.business._id,
    isPublished: true,
    status: 'active',
    ...overrides
  });
}

describe('Marketplace ranking', () => {
  it('is deterministic and gives relevant sellers discoverable positions without quotas', async () => {
    const large = await createSeller('large-ranking@test.com', 'Large Seller', 'large-ranking');
    const small = await createSeller('small-ranking@test.com', 'Small Seller', 'small-ranking');

    await Promise.all([
      createProduct(large, 'Large item one', 'L-1'),
      createProduct(large, 'Large item two', 'L-2'),
      createProduct(large, 'Large item three', 'L-3'),
      createProduct(large, 'Large item four', 'L-4'),
      createProduct(small, 'Small item one', 'S-1'),
      createProduct(small, 'Small item two', 'S-2')
    ]);

    const first = await StoreService.getMarketplaceProducts({ page: 1, limit: 4 });
    const second = await StoreService.getMarketplaceProducts({ page: 1, limit: 4 });

    expect(first.products.map(product => product._id.toString()))
      .toEqual(second.products.map(product => product._id.toString()));
    expect(first.products.map(product => product.storeSlug)).toContain('small-ranking');
    expect(first.products).toHaveLength(4);
    expect(new Set(first.products.map(product => product.storeSlug)).size).toBe(2);
  });

  it('keeps strong search matches ahead of weaker matches from another seller', async () => {
    const firstSeller = await createSeller('relevance-a@test.com', 'Relevance A', 'relevance-a');
    const secondSeller = await createSeller('relevance-b@test.com', 'Relevance B', 'relevance-b');

    await createProduct(firstSeller, 'Red running shoes', 'REL-A', { description: 'red shoes for running' });
    await createProduct(secondSeller, 'Red accessory', 'REL-B', { description: 'small red shoes accessory' });

    const result = await StoreService.getMarketplaceProducts({
      page: 1,
      limit: 10,
      search: 'red shoes'
    });

    expect(result.products[0].name).toBe('Red running shoes');
    expect(result.products.map(product => product.storeSlug)).toEqual(['relevance-a', 'relevance-b']);
  });

  it('keeps one-seller marketplaces normal and preserves category eligibility', async () => {
    const seller = await createSeller('one-ranking@test.com', 'One Seller', 'one-ranking');
    await createProduct(seller, 'Retail item', 'ONE-1', { category: 'retail' });
    await createProduct(seller, 'Shoe item', 'ONE-2', { category: 'shoes' });
    await createProduct(seller, 'Hidden item', 'ONE-3', { category: 'shoes', isPublished: false });

    const result = await StoreService.getMarketplaceProducts({ page: 1, limit: 10, category: 'shoes' });

    expect(result.pagination.total).toBe(1);
    expect(result.products.map(product => product.name)).toEqual(['Shoe item']);
    expect(result.products.every(product => product.storeSlug === 'one-ranking')).toBe(true);
  });

  it('keeps page boundaries stable across the ranked result set', async () => {
    const sellerA = await createSeller('page-a@test.com', 'Page A', 'page-a');
    const sellerB = await createSeller('page-b@test.com', 'Page B', 'page-b');
    for (let i = 1; i <= 4; i += 1) {
      await createProduct(sellerA, `A item ${i}`, `PAGE-A-${i}`);
      await createProduct(sellerB, `B item ${i}`, `PAGE-B-${i}`);
    }

    const pages = await Promise.all([1, 2, 3, 4].map(page =>
      StoreService.getMarketplaceProducts({ page, limit: 2 })
    ));
    const repeatedPages = await Promise.all([1, 2, 3, 4].map(page =>
      StoreService.getMarketplaceProducts({ page, limit: 2 })
    ));
    const ids = pages.flatMap(page => page.products.map(product => product._id.toString()));
    const repeatedIds = repeatedPages.flatMap(page => page.products.map(product => product._id.toString()));

    expect(ids).toEqual(repeatedIds);
    expect(new Set(ids).size).toBe(8);
    expect(ids).toHaveLength(8);
  });

  it('prioritizes active sponsorship during normal browsing without mutating products', async () => {
    const seller = await createSeller('sponsored-active@test.com', 'Sponsored Seller', 'sponsored-active');
    const organic = await createProduct(seller, 'Organic product', 'SP-ORGANIC', {
      createdAt: new Date('2026-01-02T00:00:00.000Z')
    });
    const sponsored = await createProduct(seller, 'Sponsored product', 'SP-ACTIVE', {
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      isSponsored: true,
      sponsoredUntil: new Date(Date.now() + 60 * 60 * 1000)
    });
    const before = await Product.findById(sponsored._id).select('isSponsored sponsoredUntil').lean();

    const result = await StoreService.getMarketplaceProducts({ page: 1, limit: 10 });
    const after = await Product.findById(sponsored._id).select('isSponsored sponsoredUntil').lean();

    expect(result.products.map(product => product._id.toString())).toEqual([
      sponsored._id.toString(),
      organic._id.toString()
    ]);
    expect(after.isSponsored).toBe(before.isSponsored);
    expect(after.sponsoredUntil.getTime()).toBe(before.sponsoredUntil.getTime());
  });

  it('does not prioritize inactive or expired sponsorship, while null expiry remains active', async () => {
    const seller = await createSeller('sponsored-expiry@test.com', 'Sponsored Expiry', 'sponsored-expiry');
    const organic = await createProduct(seller, 'Organic product', 'SP-EX-ORGANIC', {
      createdAt: new Date('2026-01-03T00:00:00.000Z')
    });
    const expired = await createProduct(seller, 'Expired sponsored', 'SP-EX-EXPIRED', {
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      isSponsored: true,
      sponsoredUntil: new Date(Date.now() - 60 * 60 * 1000)
    });
    const inactive = await createProduct(seller, 'Inactive sponsored', 'SP-EX-INACTIVE', {
      createdAt: new Date('2026-01-02T00:00:00.000Z'),
      isSponsored: false,
      sponsoredUntil: new Date(Date.now() + 60 * 60 * 1000)
    });
    const noExpiry = await createProduct(seller, 'No expiry sponsored', 'SP-EX-NULL', {
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      isSponsored: true,
      sponsoredUntil: null
    });

    const result = await StoreService.getMarketplaceProducts({ page: 1, limit: 10 });
    const names = result.products.map(product => product.name);

    expect(names.indexOf('No expiry sponsored')).toBeLessThan(names.indexOf('Organic product'));
    expect(names.indexOf('Organic product')).toBeLessThan(names.indexOf('Expired sponsored'));
    expect(names.indexOf('Organic product')).toBeLessThan(names.indexOf('Inactive sponsored'));
  });

  it('keeps search relevance ahead of unrelated sponsorship and uses sponsorship among relevant matches', async () => {
    const sellerA = await createSeller('sponsored-search-a@test.com', 'Sponsored Search A', 'sponsored-search-a');
    const sellerB = await createSeller('sponsored-search-b@test.com', 'Sponsored Search B', 'sponsored-search-b');
    const exact = await createProduct(sellerA, 'Red Nike shoes', 'SP-SEARCH-EXACT', {
      description: 'red shoes',
      createdAt: new Date('2026-01-01T00:00:00.000Z')
    });
    const unrelatedSponsored = await createProduct(sellerB, 'Sponsored cosmetics', 'SP-SEARCH-UNRELATED', {
      createdAt: new Date('2026-01-02T00:00:00.000Z'),
      isSponsored: true,
      sponsoredUntil: null
    });
    const relevantSponsored = await createProduct(sellerB, 'Red shoes', 'SP-SEARCH-RELEVANT', {
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      isSponsored: true,
      sponsoredUntil: null
    });

    const result = await StoreService.getMarketplaceProducts({
      page: 1,
      limit: 10,
      search: 'shoes'
    });
    const names = result.products.map(product => product.name);

    expect(names).not.toContain(unrelatedSponsored.name);
    expect(names[0]).toBe(relevantSponsored.name);
    expect(names).toContain(exact.name);
  });

  it('supports only explicit marketplace sort values with deterministic tie-breakers', async () => {
    const seller = await createSeller('sort-ranking@test.com', 'Sort Seller', 'sort-ranking');
    await createProduct(seller, 'Expensive', 'SORT-1', { price: 20 });
    await createProduct(seller, 'Cheap', 'SORT-2', { price: 10 });

    const priceResult = await StoreService.getMarketplaceProducts({
      page: 1,
      limit: 10,
      sortBy: 'price',
      sortOrder: 'asc'
    });
    const newestResult = await StoreService.getMarketplaceProducts({
      page: 1,
      limit: 10,
      sortBy: 'newest',
      sortOrder: 'desc'
    });

    expect(priceResult.products.map(product => product.name)).toEqual(['Cheap', 'Expensive']);
    expect(newestResult.products).toHaveLength(2);
    await expect(StoreService.getMarketplaceProducts({ sortBy: 'popular' })).rejects.toThrow('Unsupported marketplace sort');
  });
});
