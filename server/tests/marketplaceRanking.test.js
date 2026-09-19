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
