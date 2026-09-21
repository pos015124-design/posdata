const StoreService = require('../services/storeService');
const User = require('../models/User');
const Business = require('../models/Business');
const Product = require('../models/Product');

describe('StoreService marketplace ownership', () => {
  it('attributes products by businessId and does not collapse same-user stores', async () => {
    const user = await User.create({
      email: 'multi-store@test.com',
      password: 'Password123!',
      role: 'business_admin',
      isApproved: true,
      isActive: true
    });
    const storeA = await Business.create({
      name: 'Store A', slug: 'store-a', email: 'a@test.com', category: 'retail',
      userId: user._id, status: 'active', isPublic: true
    });
    const storeB = await Business.create({
      name: 'Store B', slug: 'store-b', email: 'b@test.com', category: 'retail',
      userId: user._id, status: 'active', isPublic: true
    });

    await Product.create([
      {
        name: 'A product', code: 'A-1', barcode: 'A-1', price: 10, purchasePrice: 5,
        stock: 2, category: 'retail', userId: user._id, businessId: storeA._id,
        isPublished: true, status: 'active'
      },
      {
        name: 'B product', code: 'B-1', barcode: 'B-1', price: 20, purchasePrice: 8,
        stock: 3, category: 'retail', userId: user._id, businessId: storeB._id,
        isPublished: true, status: 'active'
      },
      {
        name: 'Ambiguous legacy product', code: 'LEGACY-1', barcode: 'LEGACY-1', price: 30, purchasePrice: 12,
        stock: 1, category: 'retail', userId: user._id,
        isPublished: true, status: 'active'
      }
    ]);

    const result = await StoreService.getMarketplaceProducts({ page: 1, limit: 20 });

    expect(result.pagination.total).toBe(2);
    expect(result.products.map(product => product.storeSlug).sort()).toEqual(['store-a', 'store-b']);
    expect(result.products.find(product => product.name === 'A product').storeName).toBe('Store A');
    expect(result.products.find(product => product.name === 'B product').storeName).toBe('Store B');
    expect(result.products.some(product => product.name === 'Ambiguous legacy product')).toBe(false);
  });

  it('keeps legacy products visible when an owner has one public store', async () => {
    const user = await User.create({
      email: 'single-store@test.com',
      password: 'Password123!',
      role: 'business_admin',
      isApproved: true,
      isActive: true
    });
    await Business.create({
      name: 'Only Store', slug: 'only-store', email: 'only@test.com', category: 'retail',
      userId: user._id, status: 'active', isPublic: true
    });
    await Product.create({
      name: 'Legacy product', code: 'ONLY-1', barcode: 'ONLY-1', price: 10, purchasePrice: 5,
      stock: 2, category: 'retail', userId: user._id, isPublished: true, status: 'active'
    });

    const result = await StoreService.getMarketplaceProducts({ page: 1, limit: 20 });

    expect(result.pagination.total).toBe(1);
    expect(result.products[0].storeSlug).toBe('only-store');
  });

  it('resolves public seller storefronts case-insensitively and excludes ineligible products', async () => {
    const user = await User.create({
      email: 'eligibility@test.com',
      password: 'Password123!',
      role: 'business_admin',
      isApproved: true,
      isActive: true
    });
    const store = await Business.create({
      name: 'Eligible Store', slug: 'eligible-store', email: 'eligible@test.com', category: 'retail',
      userId: user._id, status: 'active', isPublic: true
    });

    await Product.create([
      {
        name: 'Published active', code: 'ELIG-1', barcode: 'ELIG-1', price: 10, purchasePrice: 5,
        stock: 2, category: 'retail', userId: user._id, businessId: store._id,
        isPublished: true, status: 'active'
      },
      {
        name: 'Unpublished', code: 'ELIG-2', barcode: 'ELIG-2', price: 11, purchasePrice: 5,
        stock: 2, category: 'retail', userId: user._id, businessId: store._id,
        isPublished: false, status: 'active'
      },
      {
        name: 'Inactive', code: 'ELIG-3', barcode: 'ELIG-3', price: 12, purchasePrice: 5,
        stock: 2, category: 'retail', userId: user._id, businessId: store._id,
        isPublished: true, status: 'inactive'
      }
    ]);

    const result = await StoreService.getStoreBySlug('ELIGIBLE-STORE');
    expect(result.products.map(product => product.name)).toEqual(['Published active']);
    expect(result.products.every(product => product.storeSlug === 'eligible-store')).toBe(true);
  });

  it('does not expose inactive or private businesses by slug', async () => {
    await Business.create({
      name: 'Inactive Store', slug: 'inactive-store', email: 'inactive@test.com', category: 'retail',
      status: 'inactive', isPublic: true
    });
    await Business.create({
      name: 'Private Store', slug: 'private-store', email: 'private@test.com', category: 'retail',
      status: 'active', isPublic: false
    });

    await expect(StoreService.getStoreBySlug('inactive-store')).rejects.toThrow('Store not found');
    await expect(StoreService.getStoreBySlug('private-store')).rejects.toThrow('Store not found');
    await expect(StoreService.getStoreBySlug('missing-store')).rejects.toThrow('Store not found');
  });

  it('keeps direct businessId products isolated between same-owner stores', async () => {
    const user = await User.create({
      email: 'seller-isolation@test.com',
      password: 'Password123!',
      role: 'business_admin',
      isApproved: true,
      isActive: true
    });
    const storeA = await Business.create({
      name: 'Isolation A', slug: 'isolation-a', email: 'a-isolation@test.com', category: 'retail',
      userId: user._id, status: 'active', isPublic: true
    });
    const storeB = await Business.create({
      name: 'Isolation B', slug: 'isolation-b', email: 'b-isolation@test.com', category: 'retail',
      userId: user._id, status: 'active', isPublic: true
    });
    await Product.create([
      {
        name: 'A only', code: 'ISO-A', barcode: 'ISO-A', price: 10, purchasePrice: 5,
        stock: 2, category: 'shoes', userId: user._id, businessId: storeA._id,
        isPublished: true, status: 'active'
      },
      {
        name: 'B only', code: 'ISO-B', barcode: 'ISO-B', price: 10, purchasePrice: 5,
        stock: 2, category: 'shoes', userId: user._id, businessId: storeB._id,
        isPublished: true, status: 'active'
      }
    ]);

    const a = await StoreService.getStoreProducts('isolation-a', { search: 'only', category: 'shoes' }, { page: 1, limit: 10 });
    const b = await StoreService.getStoreProducts('isolation-b', { search: 'only', category: 'shoes' }, { page: 1, limit: 10 });
    expect(a.products.map(product => product.name)).toEqual(['A only']);
    expect(b.products.map(product => product.name)).toEqual(['B only']);
  });

  it('keeps legacy products out of both stores for a multi-business owner', async () => {
    const user = await User.create({
      email: 'legacy-ambiguous@test.com',
      password: 'Password123!',
      role: 'business_admin',
      isApproved: true,
      isActive: true
    });
    await Business.create({ name: 'Legacy A', slug: 'legacy-a', email: 'legacy-a@test.com', category: 'retail', userId: user._id, status: 'active', isPublic: true });
    await Business.create({ name: 'Legacy B', slug: 'legacy-b', email: 'legacy-b@test.com', category: 'retail', userId: user._id, status: 'active', isPublic: true });
    await Product.create({
      name: 'Ambiguous seller product', code: 'AMB-1', barcode: 'AMB-1', price: 10, purchasePrice: 5,
      stock: 1, category: 'retail', userId: user._id, isPublished: true, status: 'active'
    });

    const a = await StoreService.getStoreBySlug('legacy-a');
    const b = await StoreService.getStoreBySlug('legacy-b');
    expect(a.products).toHaveLength(0);
    expect(b.products).toHaveLength(0);
  });

  it('uses deterministic seller ordering and rejects unsupported sort fields', async () => {
    const user = await User.create({ email: 'sort@test.com', password: 'Password123!', role: 'business_admin', isApproved: true, isActive: true });
    const store = await Business.create({ name: 'Sort Store', slug: 'sort-store', email: 'sort@test.com', category: 'retail', userId: user._id, status: 'active', isPublic: true });
    await Product.create([
      { name: 'B product', code: 'SORT-B', barcode: 'SORT-B', price: 20, purchasePrice: 5, stock: 1, category: 'retail', userId: user._id, businessId: store._id, isPublished: true, status: 'active' },
      { name: 'A product', code: 'SORT-A', barcode: 'SORT-A', price: 10, purchasePrice: 5, stock: 1, category: 'retail', userId: user._id, businessId: store._id, isPublished: true, status: 'active' },
      { name: 'C product', code: 'SORT-C', barcode: 'SORT-C', price: 30, purchasePrice: 5, stock: 1, category: 'retail', userId: user._id, businessId: store._id, isPublished: true, status: 'active' }
    ]);

    const first = await StoreService.getStoreProducts('sort-store', {}, { page: 1, limit: 2, sortBy: 'name', sortOrder: 'asc' });
    const second = await StoreService.getStoreProducts('sort-store', {}, { page: 2, limit: 2, sortBy: 'name', sortOrder: 'asc' });
    expect(first.products.map(product => product.name)).toEqual(['A product', 'B product']);
    expect(second.products.map(product => product.name)).toEqual(['C product']);
    await expect(StoreService.getStoreProducts('sort-store', {}, { sortBy: 'businessId', sortOrder: 'asc' })).rejects.toThrow('Unsupported seller sort field');
    await expect(StoreService.getStoreProducts('sort-store', {}, { sortBy: 'name', sortOrder: 'sideways' })).rejects.toThrow('Unsupported seller sort order');
  });
});
