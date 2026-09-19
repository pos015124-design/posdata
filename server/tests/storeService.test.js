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
});
