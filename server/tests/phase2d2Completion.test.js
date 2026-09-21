const { isSafeImageFilename } = require('../routes/uploadRoutes');
const uploadRoutes = require('../routes/uploadRoutes');
const simpleSettingsRoutes = require('../routes/simpleSettingsRoutes');
const deliveryRoutes = require('../routes/deliveryRoutes');
const productRoutes = require('../routes/productRoutes');
const sellerInventoryRoutes = require('../routes/sellerInventoryRoutes');
const storeRoutes = require('../routes/storeRoutes');
const supplierRoutes = require('../routes/supplierRoutes');
const { logger, securityLogger, auditLogger, redactSensitive } = require('../config/logger');
const User = require('../models/User');
const Product = require('../models/Product');
const Rider = require('../models/Rider');
const Supplier = require('../models/Supplier');
const Seller = require('../models/Seller');
const SellerInventory = require('../models/SellerInventory');
const Sale = require('../models/Sale');
const fs = require('fs');
const path = require('path');
const winston = require('winston');
const { Writable } = require('stream');
const jwt = require('jsonwebtoken');
const express = require('express');
const request = require('supertest');

describe('Phase 2D-2 completion security primitives', () => {
  describe('upload filename safety', () => {
    test.each([
      ['product-image.png', true],
      ['../product-image.png', false],
      ['..\\product-image.png', false],
      ['%2e%2e%2fproduct-image.png', false],
      ['/absolute/product-image.png', false],
      ['C:\\absolute\\product-image.png', false],
      ['product-image.png\0.txt', false],
      ['..hidden.png', false]
    ])('%s => %s', (filename, expected) => {
      expect(isSafeImageFilename(filename)).toBe(expected);
    });
  });

  test('enforces HTTP ownership before local file deletion', async () => {
    const owner = await User.create({ email: 'upload-owner@test.local', password: 'Password123!', role: 'staff', isApproved: true, isActive: true });
    const foreign = await User.create({ email: 'upload-foreign@test.local', password: 'Password123!', role: 'staff', isApproved: true, isActive: true });
    const product = await Product.create({
      name: 'Owned image', code: `IMG-${Date.now()}`, barcode: `BAR-${Date.now()}`,
      price: 10, purchasePrice: 5, stock: 1, category: 'retail', userId: owner._id,
      images: [{ url: '/uploads/products/owned-image.png' }]
    });
    const app = express();
    app.use(express.json());
    app.use('/uploads', uploadRoutes);
    const token = (user) => jwt.sign({ userId: String(user._id), role: user.role }, process.env.JWT_SECRET);

    const traversal = await request(app)
      .delete('/uploads/product-image/%2e%2e%2fowned-image.png')
      .set('Authorization', `Bearer ${token(owner)}`);
    expect(traversal.status).toBe(400);

    const foreignDelete = await request(app)
      .delete('/uploads/product-image/owned-image.png')
      .set('Authorization', `Bearer ${token(foreign)}`);
    expect(foreignDelete.status).toBe(404);
    expect(await Product.findById(product._id)).not.toBeNull();
  });

  test('legacy settings route is scoped to the authenticated user', async () => {
    const owner = await User.create({ email: 'settings-owner@test.local', password: 'Password123!', role: 'staff', isApproved: true, isActive: true, settings: { tax: { defaultTaxRate: '11' } } });
    const other = await User.create({ email: 'settings-other@test.local', password: 'Password123!', role: 'staff', isApproved: true, isActive: true, settings: { tax: { defaultTaxRate: '22' } } });
    const app = express();
    app.use('/settings', simpleSettingsRoutes);
    const token = (user) => jwt.sign({ userId: String(user._id), role: user.role }, process.env.JWT_SECRET);
    const response = await request(app).get('/settings').set('Authorization', `Bearer ${token(other)}`);
    expect(response.status).toBe(200);
    expect(response.body.settings.tax.defaultTaxRate).toBe('22');
    expect(response.body.settings.tax.defaultTaxRate).not.toBe('11');
  });

  test('rejects tampered public quantities and recomputes tampered prices', async () => {
    const owner = await User.create({ email: 'order-integrity-owner@test.local', password: 'Password123!', role: 'staff', isApproved: true, isActive: true });
    const business = await require('../models/Business').create({ name: 'Order Integrity', slug: `order-integrity-${Date.now()}`, email: 'order-integrity@test.local', category: 'retail', tenantId: 'tenant-test', userId: owner._id, status: 'active', isPublic: true });
    const product = await Product.create({ name: 'Authoritative price', code: `ORD-${Date.now()}`, barcode: `ORDBAR-${Date.now()}`, price: 25, purchasePrice: 10, stock: 2, category: 'retail', userId: owner._id, businessId: business._id, isPublished: true, status: 'active' });
    const SaleService = require('../services/saleService');

    await expect(SaleService.processPublicMultiSellerOrder({
      items: [{ product: product._id, quantity: 0, price: 0, total: 0 }],
      customer: { name: 'Attacker' }
    })).rejects.toThrow(/Invalid quantity/);
    expect(await Sale.countDocuments()).toBe(0);
    expect((await Product.findById(product._id)).stock).toBe(2);

    const result = await SaleService.processPublicMultiSellerOrder({
      items: [{ product: product._id, quantity: 1, price: 0, total: 0 }],
      customer: { name: 'Buyer' }
    });
    expect(result.sales[0].items[0].price).toBe(25);
    expect(result.sales[0].total).toBe(25);
  });

  test('partitions mixed-business public checkout into isolated sales', async () => {
    const ownerA = await User.create({ email: 'mixed-owner-a@test.local', password: 'Password123!', role: 'staff', isApproved: true, isActive: true });
    const ownerB = await User.create({ email: 'mixed-owner-b@test.local', password: 'Password123!', role: 'staff', isApproved: true, isActive: true });
    const Business = require('../models/Business');
    const businessA = await Business.create({ name: 'Mixed A', slug: `mixed-a-${Date.now()}`, email: 'mixed-a@test.local', category: 'retail', tenantId: 'mixed-a', userId: ownerA._id, status: 'active', isPublic: true });
    const businessB = await Business.create({ name: 'Mixed B', slug: `mixed-b-${Date.now()}`, email: 'mixed-b@test.local', category: 'retail', tenantId: 'mixed-b', userId: ownerB._id, status: 'active', isPublic: true });
    const productA = await Product.create({ name: 'Mixed A product', code: `MIXA-${Date.now()}`, barcode: `MIXABAR-${Date.now()}`, price: 10, purchasePrice: 5, stock: 1, category: 'retail', userId: ownerA._id, businessId: businessA._id, isPublished: true, status: 'active' });
    const productB = await Product.create({ name: 'Mixed B product', code: `MIXB-${Date.now()}`, barcode: `MIXBBAR-${Date.now()}`, price: 20, purchasePrice: 8, stock: 1, category: 'retail', userId: ownerB._id, businessId: businessB._id, isPublished: true, status: 'active' });
    const app = express();
    app.use(express.json());
    app.use('/public', storeRoutes);

    const before = await Sale.countDocuments();
    const response = await request(app).post('/public/checkout').send({
      items: [{ product: productA._id, quantity: 1, price: 1 }, { product: productB._id, quantity: 1, price: 1, businessId: businessA._id }],
      customer: { name: 'Mixed buyer' }, paymentMethod: 'cash'
    });
    expect(response.status).toBe(201);
    expect(response.body.sellersCount).toBe(2);
    expect(await Sale.countDocuments()).toBe(before + 2);
    expect((await Product.findById(productA._id)).stock).toBe(0);
    expect((await Product.findById(productB._id)).stock).toBe(0);
    const created = await Sale.find({ invoiceNumber: { $in: response.body.invoiceNumbers } });
    expect(created).toHaveLength(2);
    expect(created.map(s => String(s.createdBy)).sort()).toEqual([String(ownerA._id), String(ownerB._id)].sort());
  });

  test('enforces delivery transitions and rejects duplicate delivery', async () => {
    const admin = await User.create({ email: 'delivery-admin@test.local', password: 'Password123!', role: 'super_admin', isApproved: true, isActive: true });
    const rider = await Rider.create({ name: 'Test Rider', phone: '+255700000000', createdBy: admin._id });
    const sale = await Sale.create({
      invoiceNumber: `INV-DELIVERY-${Date.now()}`, source: 'storefront', paymentStatus: 'paid', status: 'completed',
      subtotal: 100, total: 100, paymentMethod: 'mobile', createdBy: admin._id,
      items: [{ productName: 'Delivery item', quantity: 1, price: 100, total: 100 }]
    });
    const app = express();
    app.use(express.json());
    app.use('/delivery', deliveryRoutes);
    const token = jwt.sign({ userId: String(admin._id), role: 'super_admin' }, process.env.JWT_SECRET);
    const auth = { Authorization: `Bearer ${token}` };

    const assigned = await request(app).put(`/delivery/orders/${sale._id}/assign`).set(auth).send({ riderId: rider._id });
    expect(assigned.status).toBe(200);
    const duplicate = await request(app).put(`/delivery/orders/${sale._id}/assign`).set(auth).send({ riderId: rider._id });
    expect(duplicate.status).toBe(400);
    const collected = await request(app).put(`/delivery/orders/${sale._id}/collect`).set(auth).send({});
    expect(collected.status).toBe(200);
    const delivered = await request(app).put(`/delivery/orders/${sale._id}/deliver`).set(auth).send({});
    expect(delivered.status).toBe(200);
    const duplicateDelivery = await request(app).put(`/delivery/orders/${sale._id}/deliver`).set(auth).send({});
    expect(duplicateDelivery.status).toBe(400);
    expect((await Sale.findById(sale._id)).deliveryStatus).toBe('delivered');
  });

  test('allows only one winner for concurrent assignment and delivery transitions', async () => {
    const admin = await User.create({ email: 'delivery-race-admin@test.local', password: 'Password123!', role: 'super_admin', isApproved: true, isActive: true });
    const rider = await Rider.create({ name: 'Race Rider', phone: '+255700000010', createdBy: admin._id });
    const sale = await Sale.create({ invoiceNumber: `INV-RACE-A-${Date.now()}`, source: 'storefront', paymentStatus: 'paid', status: 'completed', deliveryStatus: 'unassigned', subtotal: 100, total: 100, paymentMethod: 'mobile', createdBy: admin._id, items: [{ productName: 'Race', quantity: 1, price: 100, total: 100 }] });
    const deliverySale = await Sale.create({ invoiceNumber: `INV-RACE-D-${Date.now()}`, source: 'storefront', paymentStatus: 'paid', status: 'completed', deliveryStatus: 'out_for_delivery', subtotal: 100, total: 100, paymentMethod: 'mobile', createdBy: admin._id, items: [{ productName: 'Race', quantity: 1, price: 100, total: 100 }] });
    const app = express();
    app.use(express.json());
    app.use('/delivery', deliveryRoutes);
    const auth = { Authorization: `Bearer ${jwt.sign({ userId: String(admin._id), role: 'super_admin' }, process.env.JWT_SECRET)}` };

    const assignment = await Promise.all([
      request(app).put(`/delivery/orders/${sale._id}/assign`).set(auth).send({ riderId: rider._id }),
      request(app).put(`/delivery/orders/${sale._id}/assign`).set(auth).send({ riderId: rider._id })
    ]);
    expect(assignment.filter(r => r.status === 200)).toHaveLength(1);
    expect(assignment.filter(r => r.status === 400)).toHaveLength(1);
    expect((await Rider.findById(rider._id)).totalDeliveries).toBe(1);

    const deliveries = await Promise.all([
      request(app).put(`/delivery/orders/${deliverySale._id}/deliver`).set(auth).send({}),
      request(app).put(`/delivery/orders/${deliverySale._id}/deliver`).set(auth).send({})
    ]);
    expect(deliveries.filter(r => r.status === 200)).toHaveLength(1);
    expect(deliveries.filter(r => r.status === 400)).toHaveLength(1);
    expect((await Sale.findById(deliverySale._id)).deliveryStatus).toBe('delivered');
  });

  test('serializes concurrent failure transitions in both request arrangements', async () => {
    const admin = await User.create({ email: 'delivery-failure-race@test.local', password: 'Password123!', role: 'super_admin', isApproved: true, isActive: true });
    const app = express();
    app.use(express.json());
    app.use('/delivery', deliveryRoutes);
    const auth = { Authorization: `Bearer ${jwt.sign({ userId: String(admin._id), role: 'super_admin' }, process.env.JWT_SECRET)}` };
    for (const suffix of ['first', 'second']) {
      const sale = await Sale.create({ invoiceNumber: `INV-FAIL-RACE-${suffix}-${Date.now()}`, source: 'storefront', paymentStatus: 'paid', status: 'completed', deliveryStatus: 'assigned', subtotal: 20, total: 20, paymentMethod: 'mobile', createdBy: admin._id, items: [{ productName: 'Failure race', quantity: 1, price: 20, total: 20 }] });
      const requests = [
        request(app).put(`/delivery/orders/${sale._id}/fail`).set(auth).send({ reason: suffix }),
        request(app).put(`/delivery/orders/${sale._id}/fail`).set(auth).send({ reason: suffix })
      ];
      if (suffix === 'second') requests.reverse();
      const results = await Promise.all(requests);
      expect(results.filter(r => r.status === 200)).toHaveLength(1);
      expect(results.filter(r => r.status === 400)).toHaveLength(1);
      expect((await Sale.findById(sale._id)).deliveryStatus).toBe('failed');
    }
  });

  test('covers delivery failure states, payment/source guards, and unauthorized roles', async () => {
    const admin = await User.create({ email: 'delivery-matrix-admin@test.local', password: 'Password123!', role: 'super_admin', isApproved: true, isActive: true });
    const ordinary = await User.create({ email: 'delivery-matrix-user@test.local', password: 'Password123!', role: 'customer', isApproved: true, isActive: true });
    const rider = await Rider.create({ name: 'Matrix Rider', phone: '+255700000011', createdBy: admin._id });
    const app = express();
    app.use(express.json());
    app.use('/delivery', deliveryRoutes);
    const adminAuth = { Authorization: `Bearer ${jwt.sign({ userId: String(admin._id), role: 'super_admin' }, process.env.JWT_SECRET)}` };
    const ordinaryAuth = { Authorization: `Bearer ${jwt.sign({ userId: String(ordinary._id), role: 'customer' }, process.env.JWT_SECRET)}` };

    for (const [index, state] of ['unassigned', 'assigned', 'out_for_delivery'].entries()) {
      const sale = await Sale.create({ invoiceNumber: `INV-FAIL-${Date.now()}-${index}`, source: 'storefront', paymentStatus: 'paid', status: 'completed', deliveryStatus: state, subtotal: 20, total: 20, paymentMethod: 'mobile', createdBy: admin._id, riderId: state === 'unassigned' ? null : rider._id, items: [{ productName: 'Failure', quantity: 1, price: 20, total: 20 }] });
      const response = await request(app).put(`/delivery/orders/${sale._id}/fail`).set(adminAuth).send({ reason: 'Unavailable' });
      expect(response.status).toBe(200);
      expect((await Sale.findById(sale._id)).deliveryStatus).toBe('failed');
      const duplicate = await request(app).put(`/delivery/orders/${sale._id}/fail`).set(adminAuth).send({});
      expect(duplicate.status).toBe(400);
    }

    const unpaid = await Sale.create({ invoiceNumber: `INV-UNPAID-${Date.now()}`, source: 'storefront', paymentStatus: 'pending', status: 'pending', deliveryStatus: 'unassigned', subtotal: 20, total: 20, paymentMethod: 'mobile', createdBy: admin._id, items: [{ productName: 'Unpaid', quantity: 1, price: 20, total: 20 }] });
    expect((await request(app).put(`/delivery/orders/${unpaid._id}/fail`).set(adminAuth).send({})).status).toBe(400);
    const wrongSource = await Sale.create({ invoiceNumber: `INV-POS-${Date.now()}`, source: 'pos', paymentStatus: 'paid', status: 'completed', deliveryStatus: 'unassigned', subtotal: 20, total: 20, paymentMethod: 'cash', createdBy: admin._id, items: [{ productName: 'POS', quantity: 1, price: 20, total: 20 }] });
    expect((await request(app).put(`/delivery/orders/${wrongSource._id}/fail`).set(adminAuth).send({})).status).toBe(400);
    const unauthorized = await request(app).put(`/delivery/orders/${unpaid._id}/fail`).set(ordinaryAuth).send({});
    expect(unauthorized.status).toBe(403);
  });

  test('serializes conflicting delivery and failure transitions', async () => {
    const admin = await User.create({ email: 'delivery-terminal-race@test.local', password: 'Password123!', role: 'super_admin', isApproved: true, isActive: true });
    const sale = await Sale.create({
      invoiceNumber: `INV-TERMINAL-RACE-${Date.now()}`,
      source: 'storefront', paymentStatus: 'paid', status: 'completed', deliveryStatus: 'out_for_delivery',
      subtotal: 20, total: 20, paymentMethod: 'mobile', createdBy: admin._id,
      items: [{ productName: 'Terminal race', quantity: 1, price: 20, total: 20 }]
    });
    const app = express();
    app.use(express.json());
    app.use('/delivery', deliveryRoutes);
    const auth = { Authorization: `Bearer ${jwt.sign({ userId: String(admin._id), role: 'super_admin' }, process.env.JWT_SECRET)}` };

    const [deliver, fail] = await Promise.all([
      request(app).put(`/delivery/orders/${sale._id}/deliver`).set(auth).send({}),
      request(app).put(`/delivery/orders/${sale._id}/fail`).set(auth).send({ reason: 'Race' })
    ]);
    expect([deliver.status, fail.status].sort()).toEqual([200, 400]);
    expect(['delivered', 'failed']).toContain((await Sale.findById(sale._id)).deliveryStatus);
  });

  test('enforces file deletion roles and preserves foreign assets', async () => {
    const owner = await User.create({ email: 'file-role-owner@test.local', password: 'Password123!', role: 'staff', isApproved: true, isActive: true });
    const foreignAdmin = await User.create({ email: 'file-role-admin@test.local', password: 'Password123!', role: 'business_admin', isApproved: true, isActive: true });
    const customer = await User.create({ email: 'file-role-customer@test.local', password: 'Password123!', role: 'customer', isApproved: true, isActive: true });
    const filename = `phase2d2-role-${Date.now()}.png`;
    const uploadDir = path.join(__dirname, '..', 'uploads', 'products');
    fs.mkdirSync(uploadDir, { recursive: true });
    fs.writeFileSync(path.join(uploadDir, filename), 'role-fixture');
    await Product.create({ name: 'Role file product', code: `ROL-${Date.now()}`, barcode: `ROLBAR-${Date.now()}`, price: 10, purchasePrice: 5, stock: 1, category: 'retail', userId: owner._id, images: [{ url: `/uploads/products/${filename}` }] });
    const app = express();
    app.use(express.json());
    app.use('/uploads', uploadRoutes);
    const token = user => jwt.sign({ userId: String(user._id), role: user.role }, process.env.JWT_SECRET);
    try {
      for (const actor of [foreignAdmin, customer]) {
        const denied = await request(app).delete(`/uploads/product-image/${filename}`).set('Authorization', `Bearer ${token(actor)}`);
        expect(denied.status).toBe(404);
        expect(fs.existsSync(path.join(uploadDir, filename))).toBe(true);
      }
    } finally {
      const target = path.join(uploadDir, filename);
      if (fs.existsSync(target)) fs.unlinkSync(target);
    }
  });

  test('isolates seller inventory discovery by authenticated seller', async () => {
    const userA = await User.create({ email: 'inventory-seller-a@test.local', password: 'Password123!', role: 'staff', isApproved: true, isActive: true });
    const userB = await User.create({ email: 'inventory-seller-b@test.local', password: 'Password123!', role: 'staff', isApproved: true, isActive: true });
    const sellerA = await Seller.create({ userId: userA._id, businessName: 'Inventory A', contactEmail: 'inventory-a@test.local' });
    const sellerB = await Seller.create({ userId: userB._id, businessName: 'Inventory B', contactEmail: 'inventory-b@test.local' });
    const productB = await Product.create({ name: 'Inventory B product', code: `INVB-${Date.now()}`, barcode: `INVBBAR-${Date.now()}`, price: 12, purchasePrice: 6, stock: 1, category: 'retail', userId: userB._id, status: 'active' });
    await SellerInventory.create({ seller: sellerB._id, product: productB._id, price: 12, purchasePrice: 6, stock: 1 });
    const app = express();
    app.use(express.json());
    app.use('/seller-inventory', sellerInventoryRoutes);
    const token = user => jwt.sign({ userId: String(user._id), role: user.role }, process.env.JWT_SECRET);
    const own = await request(app).get('/seller-inventory').set('Authorization', `Bearer ${token(userA)}`);
    expect(own.status).toBe(200);
    expect(own.body.inventory).toHaveLength(0);
    const crossMutation = await request(app).put(`/seller-inventory/${(await SellerInventory.findOne({ seller: sellerB._id }))._id}`).set('Authorization', `Bearer ${token(userA)}`).send({ stock: 99 });
    expect(crossMutation.status).toBe(404);
    const anonymous = await request(app).get('/seller-inventory');
    expect(anonymous.status).toBe(401);
  });

  test('rolls back supplier mutation when a later product mutation fails', async () => {
    const owner = await User.create({ email: 'supplier-rollback@test.local', password: 'Password123!', role: 'staff', isApproved: true, isActive: true });
    const supplier = await Supplier.create({ userId: owner._id, name: 'Rollback Supplier' });
    const product = await Product.create({ name: 'Rollback product', code: `ROLL-${Date.now()}`, barcode: `ROLLBAR-${Date.now()}`, price: 10, purchasePrice: 5, stock: 3, category: 'retail', userId: owner._id });
    const spy = jest.spyOn(Product, 'findOneAndUpdate').mockImplementationOnce(() => null);
    const app = express();
    app.use(express.json());
    app.use('/suppliers', supplierRoutes);
    const token = jwt.sign({ userId: String(owner._id), role: 'staff' }, process.env.JWT_SECRET);

    const response = await request(app).post(`/suppliers/${supplier._id}/stock-in`).set('Authorization', `Bearer ${token}`).send({ items: [{ productId: String(product._id), quantity: 2, unitCost: 5 }] });
    spy.mockRestore();
    expect(response.status).toBe(500);
    const persistedSupplier = await Supplier.findById(supplier._id);
    const persistedProduct = await Product.findById(product._id);
    expect(persistedSupplier.stockIns).toHaveLength(0);
    expect(persistedSupplier.totalSpent).toBe(0);
    expect(persistedProduct.stock).toBe(3);
  });

  test('allows only same-owner seller discovery and permits super-admin visibility', async () => {
    const adminA = await User.collection.insertOne({ email: 'discovery-a@test.local', password: 'Password123!', role: 'admin', isApproved: true, isActive: true });
    const adminB = await User.collection.insertOne({ email: 'discovery-b@test.local', password: 'Password123!', role: 'admin', isApproved: true, isActive: true });
    const superAdmin = await User.create({ email: 'discovery-super@test.local', password: 'Password123!', role: 'super_admin', isApproved: true, isActive: true });
    adminA._id = adminA.insertedId;
    adminB._id = adminB.insertedId;
    const sellerA = await Seller.create({ userId: adminA._id, businessName: 'Seller A', contactEmail: 'a@test.local' });
    const sellerB = await Seller.create({ userId: adminB._id, businessName: 'Seller B', contactEmail: 'b@test.local' });
    const productB = await Product.create({ name: 'Product B', code: `DISC-${Date.now()}`, barcode: `DISCBAR-${Date.now()}`, price: 20, purchasePrice: 10, stock: 2, category: 'retail', userId: adminB._id, isPublished: true, status: 'active' });
    await SellerInventory.create({ seller: sellerB._id, product: productB._id, price: 20, purchasePrice: 10, stock: 2 });
    const app = express();
    app.use(express.json());
    app.use('/products', productRoutes);
    const token = user => jwt.sign({ userId: String(user._id), role: user.role }, process.env.JWT_SECRET);

    const foreignFromA = await request(app).get(`/products/by-seller/${sellerB._id}`).set('Authorization', `Bearer ${token(adminA)}`);
    expect(foreignFromA.status).toBe(404);
    const ownFromB = await request(app).get(`/products/by-seller/${sellerB._id}`).set('Authorization', `Bearer ${token(adminB)}`);
    expect(ownFromB.status).toBe(200);
    expect(ownFromB.body.products).toHaveLength(1);
    const productFromA = await request(app).get(`/products/${productB._id}/sellers`).set('Authorization', `Bearer ${token(adminA)}`);
    expect(productFromA.status).toBe(200);
    expect(productFromA.body.sellers).toHaveLength(0);
    const productFromSuper = await request(app).get(`/products/${productB._id}/sellers`).set('Authorization', `Bearer ${token(superAdmin)}`);
    expect(productFromSuper.status).toBe(200);
    expect(productFromSuper.body.sellers).toHaveLength(1);

    const anonymous = await request(app).get(`/products/by-seller/${sellerB._id}`);
    expect(anonymous.status).toBe(401);
    const customer = await User.create({ email: 'discovery-customer@test.local', password: 'Password123!', role: 'customer', isApproved: true, isActive: true });
    const customerResponse = await request(app).get(`/products/by-seller/${sellerB._id}`).set('Authorization', `Bearer ${token(customer)}`);
    expect(customerResponse.status).toBe(403);
  });

  test('applies the existing super-admin file deletion contract', async () => {
    const owner = await User.create({ email: 'file-super-owner@test.local', password: 'Password123!', role: 'staff', isApproved: true, isActive: true });
    const superAdmin = await User.create({ email: 'file-super-admin@test.local', password: 'Password123!', role: 'super_admin', isApproved: true, isActive: true });
    const filename = `phase2d2-super-${Date.now()}.png`;
    const unrelated = `phase2d2-super-unrelated-${Date.now()}.png`;
    const uploadDir = path.join(__dirname, '..', 'uploads', 'products');
    fs.mkdirSync(uploadDir, { recursive: true });
    fs.writeFileSync(path.join(uploadDir, filename), 'super-fixture');
    fs.writeFileSync(path.join(uploadDir, unrelated), 'unrelated');
    await Product.create({ name: 'Super file product', code: `SUPFILE-${Date.now()}`, barcode: `SUPFILEBAR-${Date.now()}`, price: 10, purchasePrice: 5, stock: 1, category: 'retail', userId: owner._id, images: [{ url: `/uploads/products/${filename}` }] });
    const app = express();
    app.use(express.json());
    app.use('/uploads', uploadRoutes);
    const token = jwt.sign({ userId: String(superAdmin._id), role: 'super_admin' }, process.env.JWT_SECRET);
    try {
      const response = await request(app).delete(`/uploads/product-image/${filename}`).set('Authorization', `Bearer ${token}`);
      expect(response.status).toBe(200);
      expect(fs.existsSync(path.join(uploadDir, filename))).toBe(false);
      expect(fs.existsSync(path.join(uploadDir, unrelated))).toBe(true);
    } finally {
      for (const file of [filename, unrelated]) {
        const target = path.join(uploadDir, file);
        if (fs.existsSync(target)) fs.unlinkSync(target);
      }
    }
  });

  test('allows owner file deletion and preserves unrelated files', async () => {
    const owner = await User.create({ email: 'file-owner@test.local', password: 'Password123!', role: 'staff', isApproved: true, isActive: true });
    const filename = `phase2d2-owner-${Date.now()}.png`;
    const unrelated = `phase2d2-unrelated-${Date.now()}.png`;
    const uploadDir = path.join(__dirname, '..', 'uploads', 'products');
    fs.mkdirSync(uploadDir, { recursive: true });
    fs.writeFileSync(path.join(uploadDir, filename), 'fixture');
    fs.writeFileSync(path.join(uploadDir, unrelated), 'unrelated');
    await Product.create({ name: 'File owner product', code: `FILE-${Date.now()}`, barcode: `FILEBAR-${Date.now()}`, price: 10, purchasePrice: 5, stock: 1, category: 'retail', userId: owner._id, images: [{ url: `/uploads/products/${filename}` }] });
    const app = express();
    app.use(express.json());
    app.use('/uploads', uploadRoutes);
    const token = jwt.sign({ userId: String(owner._id), role: owner.role }, process.env.JWT_SECRET);
    try {
      const response = await request(app).delete(`/uploads/product-image/${filename}`).set('Authorization', `Bearer ${token}`);
      expect(response.status).toBe(200);
      expect(fs.existsSync(path.join(uploadDir, filename))).toBe(false);
      expect(fs.existsSync(path.join(uploadDir, unrelated))).toBe(true);
      const repeated = await request(app).delete(`/uploads/product-image/${filename}`).set('Authorization', `Bearer ${token}`);
      expect(repeated.status).toBe(404);
      const missing = await request(app).delete('/uploads/product-image/no-such-file.png').set('Authorization', `Bearer ${token}`);
      expect(missing.status).toBe(404);
    } finally {
      for (const file of [filename, unrelated]) {
        const target = path.join(uploadDir, file);
        if (fs.existsSync(target)) fs.unlinkSync(target);
      }
    }
  });

  test('captures redaction in the real logger transport', async () => {
    let output = '';
    const stream = new Writable({ write(chunk, _encoding, callback) { output += chunk.toString(); callback(); } });
    const transport = new winston.transports.Stream({ stream });
    const securityTransport = new winston.transports.Stream({ stream });
    const auditTransport = new winston.transports.Stream({ stream });
    logger.add(transport);
    securityLogger.add(securityTransport);
    auditLogger.add(auditTransport);
    try {
      const metadata = {
        route: '/login', userId: 'safe-user', password: 'TEST_PASSWORD_123',
        authorization: 'Bearer TEST_JWT_123', refreshToken: 'TEST_REFRESH_123',
        apiKey: 'TEST_API_KEY_123', signature: 'TEST_SIGNATURE_123'
      };
      logger.error('auth failure', metadata);
      securityLogger.error('authorization failure', metadata);
      auditLogger.error('payment failure', metadata);
      for (let tick = 0; tick < 10; tick += 1) {
        await new Promise(resolve => setImmediate(resolve));
      }
    } finally {
      logger.remove(transport);
      securityLogger.remove(securityTransport);
      auditLogger.remove(auditTransport);
    }
    expect(output).toContain('auth failure');
    expect(output).toContain('safe-user');
    expect(output).not.toContain('TEST_PASSWORD_123');
    expect(output).not.toContain('TEST_JWT_123');
    expect(output).not.toContain('TEST_REFRESH_123');
    expect(output).not.toContain('TEST_API_KEY_123');
    expect(output).not.toContain('TEST_SIGNATURE_123');
  });

  test('allows concurrent supplier stock-in requests to preserve both updates', async () => {
    const owner = await User.create({ email: 'supplier-owner@test.local', password: 'Password123!', role: 'staff', isApproved: true, isActive: true });
    const supplier = await Supplier.create({ userId: owner._id, name: 'Test Supplier' });
    const product = await Product.create({
      name: 'Supplier product', code: `SUP-${Date.now()}`, barcode: `SUPBAR-${Date.now()}`,
      price: 10, purchasePrice: 5, stock: 0, category: 'retail', userId: owner._id
    });
    const app = express();
    app.use(express.json());
    app.use('/suppliers', supplierRoutes);
    const token = jwt.sign({ userId: String(owner._id), role: 'staff' }, process.env.JWT_SECRET);
    const body = { items: [{ productId: String(product._id), quantity: 2, unitCost: 5 }], amountPaid: 0 };
    const [one, two] = await Promise.all([
      request(app).post(`/suppliers/${supplier._id}/stock-in`).set('Authorization', `Bearer ${token}`).send(body),
      request(app).post(`/suppliers/${supplier._id}/stock-in`).set('Authorization', `Bearer ${token}`).send(body)
    ]);
    expect([one.status, two.status].sort()).toEqual([201, 201]);
    const finalProduct = await Product.findById(product._id);
    const finalSupplier = await Supplier.findById(supplier._id);
    expect(finalProduct.stock).toBe(4);
    expect(finalSupplier.stockIns).toHaveLength(2);
  });

  test('applies redaction through the configured logger format', () => {
    const outputInfo = logger.format.transform({
      level: 'error',
      message: 'test security event',
      userId: 'user-a',
      authorization: 'Bearer fake-jwt',
      refreshToken: 'fake-refresh-token',
      password: 'fake-password',
      route: '/api/payment'
    });
    const output = JSON.stringify(outputInfo);
    expect(output).toContain('user-a');
    expect(output).toContain('/api/payment');
    expect(output).not.toContain('fake-jwt');
    expect(output).not.toContain('fake-refresh-token');
    expect(output).not.toContain('fake-password');
  });

  test('redacts credential-bearing logger metadata while preserving safe context', () => {
    const output = JSON.stringify(redactSensitive({
      userId: 'user-a',
      route: '/api/payment',
      password: 'fake-password',
      authorization: 'Bearer fake-jwt',
      nested: { refreshToken: 'fake-refresh-token' }
    }));
    expect(output).toContain('user-a');
    expect(output).toContain('/api/payment');
    expect(output).not.toContain('fake-password');
    expect(output).not.toContain('fake-jwt');
    expect(output).not.toContain('fake-refresh-token');
  });

  test('redacts filesystem paths from emitted stack metadata', () => {
    const output = redactSensitive({
      stack: 'Error: failure\\n    at handler (D:\\\\deploy\\\\server\\\\routes\\\\paymentRoutes.js:42:7)'
    });
    expect(output.stack).toContain('[REDACTED_PATH]');
    expect(output.stack).not.toContain('D:\\\\deploy');
    expect(output.stack).toContain(':42:7');
  });
});
