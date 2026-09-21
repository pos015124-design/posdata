/**
 * Phase 2D-2 adversarial evidence closure.
 *
 * Endpoint/service-level matrices for the remaining Phase 2D-2 findings:
 *   F-004  order / checkout authorization, tampering, side effects
 *   F-007  delivery state machine, concurrency, refund settlement integrity
 *   F-012  seller discovery actors, ownership, response fields
 *   F-014  file ownership actor + filename representation matrix
 *   F-016  tenant A/B read + write isolation across the production route surface
 *
 * Every assertion is derived from the behaviour the routes/services implement
 * today. Where a request is rejected we additionally assert the absence of
 * side effects (no order, no sale, no stock change, no ownership change).
 */

const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

const orderRoutes = require('../routes/orderRoutes');
const storeRoutes = require('../routes/storeRoutes');
const paymentRoutes = require('../routes/paymentRoutes');
const deliveryRoutes = require('../routes/deliveryRoutes');
const sellerRoutes = require('../routes/sellerRoutes');
const productRoutes = require('../routes/productRoutes');
const sellerInventoryRoutes = require('../routes/sellerInventoryRoutes');
const uploadRoutes = require('../routes/uploadRoutes');
const salesRoutes = require('../routes/salesRoutes');
const expenseRoutes = require('../routes/expenseRoutes');
const supplierRoutes = require('../routes/supplierRoutes');
const simpleCategoryRoutes = require('../routes/simpleCategoryRoutes');
const simpleAnalyticsRoutes = require('../routes/simpleAnalyticsRoutes');

const User = require('../models/User');
const Business = require('../models/Business');
const Product = require('../models/Product');
const Cart = require('../models/Cart');
const CustomerAccount = require('../models/CustomerAccount');
const Order = require('../models/Order');
const Sale = require('../models/Sale');
const Seller = require('../models/Seller');
const SellerInventory = require('../models/SellerInventory');
const Supplier = require('../models/Supplier');
const Rider = require('../models/Rider');
const PaymentSession = require('../models/PaymentSession');
const Category = require('../models/Category');
const Expense = require('../models/Expense');
const SaleService = require('../services/saleService');
const selcomService = require('../services/selcomService');

const fs = require('fs');
const path = require('path');

const userToken = (user, overrides = {}) =>
  jwt.sign(
    {
      userId: String(user._id),
      role: user.role,
      businessId: user.businessId ? String(user.businessId) : undefined,
      tenantId: user.tenantId ? String(user.tenantId) : undefined,
      ...overrides
    },
    process.env.JWT_SECRET
  );

const customerToken = (customer) =>
  jwt.sign({ customerId: String(customer._id), type: 'customer' }, process.env.JWT_SECRET);

const uniq = () => `${Date.now()}${Math.floor(Math.random() * 10000)}`;

async function makeUser(prefix, role = 'staff', overrides = {}) {
  return User.create({
    email: `${prefix}-${uniq()}@test.local`,
    password: 'Password123!',
    role,
    isApproved: true,
    isActive: true,
    ...overrides
  });
}

async function makeBusiness(prefix, user, overrides = {}) {
  return Business.create({
    name: `Biz ${prefix} ${uniq()}`,
    slug: `${prefix}-${uniq()}`,
    email: `${prefix}-${uniq()}@test.local`,
    category: 'retail',
    tenantId: overrides.tenantId || new mongoose.Types.ObjectId(),
    userId: user._id,
    status: 'active',
    isPublic: true,
    ...overrides
  });
}

async function makeProduct(prefix, user, business, overrides = {}) {
  return Product.create({
    name: `Product ${prefix} ${uniq()}`,
    code: `${prefix}-${uniq()}`,
    barcode: `${prefix}BAR-${uniq()}`,
    price: 100,
    purchasePrice: 40,
    stock: 5,
    reorderPoint: 1,
    trackInventory: true,
    category: 'retail',
    userId: user._id,
    businessId: business ? business._id : undefined,
    isPublished: true,
    status: 'active',
    ...overrides
  });
}

const appWith = (mountPath, router) => {
  const app = express();
  app.use(express.json());
  app.use(mountPath, router);
  return app;
};

describe('Phase 2D-2 adversarial closure', () => {
  // ───────────────────────────────────────────────────────────────────────────
  // F-004 — authenticated order creation
  // ───────────────────────────────────────────────────────────────────────────
  describe('F-004 authenticated order creation', () => {
    async function fixture() {
      const ownerA = await makeUser('order-owner-a', 'business_admin');
      const ownerB = await makeUser('order-owner-b', 'business_admin');
      const businessA = await makeBusiness('order-a', ownerA);
      const businessB = await makeBusiness('order-b', ownerB);
      const productA = await makeProduct('ordA', ownerA, businessA, { stock: 10 });
      const productB = await makeProduct('ordB', ownerB, businessB, { stock: 10 });
      const customerA = await CustomerAccount.create({
        email: `cust-a-${uniq()}@test.local`,
        firstName: 'Alice',
        lastName: 'A',
        password: 'Password123!',
        businessId: businessA._id
      });
      const customerB = await CustomerAccount.create({
        email: `cust-b-${uniq()}@test.local`,
        firstName: 'Bob',
        lastName: 'B',
        password: 'Password123!',
        businessId: businessB._id
      });
      const cartFor = (customer, business, product) =>
        Cart.create({
          customerId: customer._id,
          sessionId: `session-${uniq()}`,
          businessId: business._id,
          tenantId: business.tenantId,
          items: [
            {
              product: product._id,
              productName: product.name,
              productCode: product.code,
              price: product.price,
              quantity: 1,
              subtotal: product.price
            }
          ],
          subtotal: product.price,
          taxRate: 0,
          currency: 'USD'
        });
      const cartA = await cartFor(customerA, businessA, productA);
      const cartB = await cartFor(customerB, businessB, productB);
      return {
        ownerA, ownerB, businessA, businessB, productA, productB, customerA, customerB, cartA, cartB
      };
    }

    const orderBody = (cart, email) => ({
      cartId: String(cart._id),
      customerEmail: email,
      customerName: 'Buyer',
      fulfillmentMethod: 'pickup',
      paymentMethod: 'cash'
    });

    test('rejects unauthenticated and customer-token order creation', async () => {
      const app = appWith('/orders', orderRoutes);
      const fx = await fixture();
      const anonymous = await request(app).post('/orders').send(orderBody(fx.cartA, fx.customerA.email));
      expect(anonymous.status).toBe(401);

      const wrongTokenType = await request(app)
        .post('/orders')
        .set('Authorization', `Bearer ${userToken(fx.ownerA)}`)
        .send(orderBody(fx.cartA, fx.customerA.email));
      expect([401, 403]).toContain(wrongTokenType.status);
      expect(await Order.countDocuments()).toBe(0);
    });

    test('denies customer A creating an order from customer B cart without side effects', async () => {
      const app = appWith('/orders', orderRoutes);
      const fx = await fixture();
      const stockBefore = (await Product.findById(fx.productB._id)).stock;
      const response = await request(app)
        .post('/orders')
        .set('Authorization', `Bearer ${customerToken(fx.customerA)}`)
        .send(orderBody(fx.cartB, fx.customerA.email));

      expect(response.status).toBe(400);
      expect(await Order.countDocuments()).toBe(0);
      expect((await Product.findById(fx.productB._id)).stock).toBe(stockBefore);
      expect(await Cart.countDocuments({ _id: fx.cartB._id })).toBe(1);
    });

    test('denies mismatched customer email and ignores client-supplied identity', async () => {
      const app = appWith('/orders', orderRoutes);
      const fx = await fixture();
      const mismatched = await request(app)
        .post('/orders')
        .set('Authorization', `Bearer ${customerToken(fx.customerA)}`)
        .send(orderBody(fx.cartA, fx.customerB.email));
      expect(mismatched.status).toBe(403);
      expect(await Order.countDocuments()).toBe(0);

      const tampered = await request(app)
        .post('/orders')
        .set('Authorization', `Bearer ${customerToken(fx.customerA)}`)
        .send({
          ...orderBody(fx.cartA, fx.customerA.email),
          customerId: String(fx.customerB._id),
          businessId: String(fx.businessB._id),
          tenantId: String(fx.businessB.tenantId),
          total: 1,
          subtotal: 1
        });
      expect(tampered.status).toBe(201);
      const created = await Order.findById(tampered.body.data.orderId);
      expect(String(created.customerId)).toBe(String(fx.customerA._id));
      expect(String(created.businessId)).toBe(String(fx.businessA._id));
      expect(created.total).not.toBe(1);
    });

    test('denies customer B creating an order from customer A cart and unknown carts', async () => {
      const app = appWith('/orders', orderRoutes);
      const fx = await fixture();
      const crossCart = await request(app)
        .post('/orders')
        .set('Authorization', `Bearer ${customerToken(fx.customerB)}`)
        .send(orderBody(fx.cartA, fx.customerB.email));
      expect(crossCart.status).toBe(400);

      const unknownCart = await request(app)
        .post('/orders')
        .set('Authorization', `Bearer ${customerToken(fx.customerA)}`)
        .send(orderBody({ _id: new mongoose.Types.ObjectId() }, fx.customerA.email));
      expect(unknownCart.status).toBe(400);
      expect(await Order.countDocuments()).toBe(0);

      const ownOrder = await request(app)
        .post('/orders')
        .set('Authorization', `Bearer ${customerToken(fx.customerA)}`)
        .send(orderBody(fx.cartA, fx.customerA.email));
      expect(ownOrder.status).toBe(201);
      expect(await Order.countDocuments()).toBe(1);

      const foreignOrderRead = await request(app)
        .get(`/orders/${ownOrder.body.data.orderId}`)
        .set('Authorization', `Bearer ${customerToken(fx.customerB)}`);
      const foreignBody = JSON.stringify(foreignOrderRead.body);
      expect(foreignBody).not.toContain(String(fx.customerA.email));
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // F-004 — public checkout failure paths
  // ───────────────────────────────────────────────────────────────────────────
  describe('F-004 public checkout failure paths', () => {
    async function publicFixture() {
      const owner = await makeUser('public-owner', 'business_admin');
      const business = await makeBusiness('public-biz', owner);
      const product = await makeProduct('pub', owner, business, { stock: 3 });
      return { owner, business, product };
    }

    test('rejects a mixed batch atomically when any line is invalid', async () => {
      const app = appWith('/public', storeRoutes);
      const fx = await publicFixture();
      const stockBefore = (await Product.findById(fx.product._id)).stock;

      const response = await request(app)
        .post('/public/checkout')
        .send({
          items: [
            { product: String(fx.product._id), quantity: 1 },
            { product: String(new mongoose.Types.ObjectId()), quantity: 1 }
          ],
          customer: { name: 'Buyer' },
          paymentMethod: 'cash'
        });

      expect(response.status).toBe(400);
      expect(await Sale.countDocuments()).toBe(0);
      expect((await Product.findById(fx.product._id)).stock).toBe(stockBefore);
    });

    test('rejects a mixed batch when the second line exceeds stock', async () => {
      const app = appWith('/public', storeRoutes);
      const fx = await publicFixture();
      const second = await makeProduct('pub2', fx.owner, fx.business, { stock: 1 });

      const response = await request(app)
        .post('/public/checkout')
        .send({
          items: [
            { product: String(fx.product._id), quantity: 1 },
            { product: String(second._id), quantity: 5 }
          ],
          customer: { name: 'Buyer' },
          paymentMethod: 'cash'
        });

      expect(response.status).toBe(400);
      expect(await Sale.countDocuments()).toBe(0);
      expect((await Product.findById(fx.product._id)).stock).toBe(3);
      expect((await Product.findById(second._id)).stock).toBe(1);
    });

    test.each([
      ['zero quantity', 0],
      ['negative quantity', -2],
      ['fractional quantity', 1.5],
      ['string quantity', 'abc'],
      ['excessive quantity', 101]
    ])('rejects %s without creating a sale or moving stock', async (_label, quantity) => {
      const app = appWith('/public', storeRoutes);
      const fx = await publicFixture();
      const response = await request(app)
        .post('/public/checkout')
        .send({
          items: [{ product: String(fx.product._id), quantity }],
          customer: { name: 'Buyer' },
          paymentMethod: 'cash'
        });

      expect(response.status).toBe(400);
      expect(await Sale.countDocuments()).toBe(0);
      expect((await Product.findById(fx.product._id)).stock).toBe(3);
    });

    test('ignores client price/business/seller tampering on a valid batch', async () => {
      const app = appWith('/public', storeRoutes);
      const fx = await publicFixture();
      const response = await request(app)
        .post('/public/checkout')
        .send({
          items: [
            {
              product: String(fx.product._id),
              quantity: 2,
              price: 1,
              total: 2,
              businessId: String(new mongoose.Types.ObjectId()),
              sellerId: String(new mongoose.Types.ObjectId())
            }
          ],
          customer: { name: 'Buyer' },
          paymentMethod: 'cash',
          total: 2
        });

      expect(response.status).toBe(201);
      const sale = await Sale.findOne({ invoiceNumber: response.body.invoiceNumbers[0] });
      expect(sale.items[0].price).toBe(fx.product.price);
      expect(sale.total).toBe(fx.product.price * 2);
      expect(String(sale.createdBy)).toBe(String(fx.owner._id));
      expect((await Product.findById(fx.product._id)).stock).toBe(1);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // F-004 — Selcom initiation
  // ───────────────────────────────────────────────────────────────────────────
  describe('F-004 selcom initiation', () => {
    let initiateSpy;
    let createOrderSpy;

    beforeEach(() => {
      // Stub only the external payment provider boundary.
      initiateSpy = jest.spyOn(selcomService, 'isConfigured').mockReturnValue(true);
      createOrderSpy = jest.spyOn(selcomService, 'createOrder').mockResolvedValue({ result: 'SUCCESS', resultcode: '000' });
      jest.spyOn(selcomService, 'walletPayment').mockResolvedValue({ result: 'SUCCESS', resultcode: '000', reference: 'REF-STUB' });
      jest.spyOn(selcomService, 'createTillAlias').mockResolvedValue({ redirectUrl: 'https://provider.invalid/x', raw: { result: 'SUCCESS', resultcode: '000' } });
    });

    afterEach(() => {
      initiateSpy.mockRestore();
      createOrderSpy.mockRestore();
    });

    async function payableFixture(stock = 5) {
      const owner = await makeUser('selcom-owner', 'business_admin');
      const business = await makeBusiness('selcom-biz', owner);
      const product = await makeProduct('sel', owner, business, { stock, price: 1000 });
      return { owner, business, product };
    }

    test('creates a pending sale, reserves stock, and uses the server-authoritative amount', async () => {
      const app = appWith('/payments', paymentRoutes);
      const fx = await payableFixture();
      const response = await request(app)
        .post('/payments/selcom/initiate')
        .send({
          items: [{ product: String(fx.product._id), quantity: 2, price: 1, total: 2 }],
          paymentMethod: 'mobile',
          customer: { name: 'Buyer', phone: '+255700111111' },
          amount: 1,
          total: 1
        });

      expect(response.status).toBe(201);
      expect(response.body.sessionCapability).toMatch(/^[0-9a-f]{64}$/);
      const session = await PaymentSession.findOne({ selcomOrderId: response.body.orderId });
      expect(session.amount).toBe(2000);
      expect((await Product.findById(fx.product._id)).stock).toBe(3);
      const sale = await Sale.findById(session.sales[0].saleId);
      expect(sale.paymentStatus).toBe('pending');
      expect(sale.items[0].price).toBe(1000);
    });

    test('rejects a tampered product without creating a session, sale, or reservation', async () => {
      const app = appWith('/payments', paymentRoutes);
      const fx = await payableFixture();
      const foreignOwner = await makeUser('selcom-foreign', 'business_admin');
      const foreignBusiness = await makeBusiness('selcom-foreign', foreignOwner, { isPublic: false });
      const foreignProduct = await makeProduct('selfor', foreignOwner, foreignBusiness);

      const response = await request(app)
        .post('/payments/selcom/initiate')
        .send({
          items: [{ product: String(foreignProduct._id), quantity: 1 }],
          paymentMethod: 'mobile',
          customer: { name: 'Buyer', phone: '+255700111112' }
        });

      expect(response.status).toBe(400);
      expect(await PaymentSession.countDocuments()).toBe(0);
      expect(await Sale.countDocuments()).toBe(0);
      expect((await Product.findById(foreignProduct._id)).stock).toBe(5);
      const stockBefore = (await Product.findById(fx.product._id)).stock;
      expect(stockBefore).toBe(5);
    });

    test('requires the session capability for status and never leaks provider internals', async () => {
      const app = appWith('/payments', paymentRoutes);
      const fx = await payableFixture();
      const created = await request(app)
        .post('/payments/selcom/initiate')
        .send({
          items: [{ product: String(fx.product._id), quantity: 1 }],
          paymentMethod: 'mobile',
          customer: { name: 'Buyer', phone: '+255700111113' }
        });
      expect(created.status).toBe(201);

      const foreign = await request(app).get(
        `/payments/selcom/status?orderId=${created.body.orderId}&capability=${'f'.repeat(64)}`
      );
      expect(foreign.status).toBe(404);

      const owned = await request(app).get(
        `/payments/selcom/status?orderId=${created.body.orderId}&capability=${created.body.sessionCapability}`
      );
      expect(owned.status).toBe(200);
      expect(owned.body.redirectUrl).toBeUndefined();
      expect(owned.body.reference).toBeUndefined();
      expect(JSON.stringify(owned.body)).not.toContain('+255700111113');
    });

    test('bounds replayed initiations to independent sessions without losing reserved stock', async () => {
      const app = appWith('/payments', paymentRoutes);
      const fx = await payableFixture();
      const body = {
        items: [{ product: String(fx.product._id), quantity: 2 }],
        paymentMethod: 'mobile',
        customer: { name: 'Buyer', phone: '+255700111114' }
      };

      // The initiation contract has no idempotency key: every request is a new
      // payment attempt with its own session, capability and reservation.
      const first = await request(app).post('/payments/selcom/initiate').send(body);
      const replay = await request(app).post('/payments/selcom/initiate').send(body);
      expect(first.status).toBe(201);
      expect(replay.status).toBe(201);
      expect(replay.body.orderId).not.toBe(first.body.orderId);
      expect(replay.body.sessionCapability).not.toBe(first.body.sessionCapability);

      expect(await PaymentSession.countDocuments()).toBe(2);
      expect(await Sale.countDocuments({ paymentStatus: 'pending' })).toBe(2);
      expect((await Product.findById(fx.product._id)).stock).toBe(1);

      // A capability is bound to its own session and cannot read the other one.
      const crossed = await request(app).get(
        `/payments/selcom/status?orderId=${first.body.orderId}&capability=${replay.body.sessionCapability}`
      );
      expect(crossed.status).toBe(404);

      // Expiry releases every reservation exactly once, so no stock is lost and
      // none is returned twice.
      await PaymentSession.updateMany({}, { $set: { expiresAt: new Date(Date.now() - 60000) } });
      const firstRelease = await request(app).get(
        `/payments/selcom/status?orderId=${first.body.orderId}&capability=${first.body.sessionCapability}`
      );
      const replayRelease = await request(app).get(
        `/payments/selcom/status?orderId=${replay.body.orderId}&capability=${replay.body.sessionCapability}`
      );
      expect(firstRelease.body.status).toBe('expired');
      expect(replayRelease.body.status).toBe('expired');
      expect((await Product.findById(fx.product._id)).stock).toBe(5);

      const rePoll = await request(app).get(
        `/payments/selcom/status?orderId=${first.body.orderId}&capability=${first.body.sessionCapability}`
      );
      expect(rePoll.body.status).toBe('expired');
      expect((await Product.findById(fx.product._id)).stock).toBe(5);
      expect((await Product.findById(fx.product._id)).stock).not.toBeGreaterThan(5);
    });

    test('releases reserved stock exactly once when a pending session expires', async () => {
      const app = appWith('/payments', paymentRoutes);
      const fx = await payableFixture();
      const sale = await Sale.create({
        invoiceNumber: `INV-EXPIRE-${uniq()}`,
        source: 'storefront',
        paymentStatus: 'pending',
        status: 'pending',
        items: [
          { productId: fx.product._id, productName: fx.product.name, quantity: 2, price: 1000, total: 2000 }
        ],
        subtotal: 2000,
        total: 2000,
        paymentMethod: 'mobile',
        createdBy: fx.owner._id
      });
      await Product.findByIdAndUpdate(fx.product._id, { $inc: { stock: -2 } });
      const capability = 'c'.repeat(64);
      const orderId = `SEL-EXPIRE-${uniq()}`;
      await PaymentSession.create({
        selcomOrderId: orderId,
        sessionCapability: capability,
        amount: 2000,
        method: 'mobile',
        status: 'pending',
        expiresAt: new Date(Date.now() - 60000),
        sales: [{ saleId: sale._id, invoiceNumber: sale.invoiceNumber, total: 2000, sellerId: fx.owner._id }]
      });

      const first = await request(app).get(`/payments/selcom/status?orderId=${orderId}&capability=${capability}`);
      expect(first.status).toBe(200);
      expect(first.body.status).toBe('expired');
      expect((await Product.findById(fx.product._id)).stock).toBe(5);

      const second = await request(app).get(`/payments/selcom/status?orderId=${orderId}&capability=${capability}`);
      expect(second.body.status).toBe('expired');
      expect((await Product.findById(fx.product._id)).stock).toBe(5);
      expect((await Sale.findById(sale._id)).paymentStatus).toBe('failed');
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // F-007 — delivery concurrency, actors, and refund settlement integrity
  // ───────────────────────────────────────────────────────────────────────────
  describe('F-007 delivery and refund integrity', () => {
    async function paidStorefrontSale(user, overrides = {}) {
      return Sale.create({
        invoiceNumber: `INV-DLV-${uniq()}`,
        source: 'storefront',
        paymentStatus: 'paid',
        status: 'completed',
        deliveryStatus: 'unassigned',
        items: [{ productName: 'Item', quantity: 1, price: 100, total: 100 }],
        subtotal: 100,
        total: 100,
        paymentMethod: 'mobile',
        createdBy: user._id,
        ...overrides
      });
    }

    test('allows exactly one winner for concurrent collection', async () => {
      const admin = await makeUser('collect-admin', 'super_admin');
      const rider = await Rider.create({ name: 'Collect Rider', phone: '+255700222222', createdBy: admin._id });
      const sale = await paidStorefrontSale(admin, { deliveryStatus: 'assigned', riderId: rider._id });
      const app = appWith('/delivery', deliveryRoutes);
      const auth = { Authorization: `Bearer ${userToken(admin)}` };

      const results = await Promise.all([
        request(app).put(`/delivery/orders/${sale._id}/collect`).set(auth).send({}),
        request(app).put(`/delivery/orders/${sale._id}/collect`).set(auth).send({})
      ]);

      expect(results.filter(r => r.status === 200)).toHaveLength(1);
      expect(results.filter(r => r.status === 400)).toHaveLength(1);
      expect((await Sale.findById(sale._id)).deliveryStatus).toBe('out_for_delivery');
    });

    test('enforces the super-admin-only delivery contract for every actor', async () => {
      const admin = await makeUser('actor-admin', 'super_admin');
      const seller = await makeUser('actor-seller', 'staff');
      const bizAdmin = await makeUser('actor-biz', 'business_admin');
      const customer = await makeUser('actor-customer', 'customer');
      const sale = await paidStorefrontSale(admin, { deliveryStatus: 'unassigned' });
      const app = appWith('/delivery', deliveryRoutes);

      const anonymous = await request(app).get('/delivery/orders');
      expect(anonymous.status).toBe(401);

      for (const actor of [seller, bizAdmin, customer]) {
        const response = await request(app)
          .put(`/delivery/orders/${sale._id}/fail`)
          .set('Authorization', `Bearer ${userToken(actor)}`)
          .send({});
        expect(response.status).toBe(403);
      }
      expect((await Sale.findById(sale._id)).deliveryStatus).toBe('unassigned');

      const allowed = await request(app)
        .put(`/delivery/orders/${sale._id}/fail`)
        .set('Authorization', `Bearer ${userToken(admin)}`)
        .send({ reason: 'actor-matrix' });
      expect(allowed.status).toBe(200);
    });

    test('rejects tampered rider and order identifiers without state change', async () => {
      const admin = await makeUser('tamper-admin', 'super_admin');
      const rider = await Rider.create({ name: 'Tamper Rider', phone: '+255700222223', createdBy: admin._id });
      const sale = await paidStorefrontSale(admin, { deliveryStatus: 'unassigned' });
      const app = appWith('/delivery', deliveryRoutes);
      const auth = { Authorization: `Bearer ${userToken(admin)}` };

      const badRider = await request(app)
        .put(`/delivery/orders/${sale._id}/assign`)
        .set(auth)
        .send({ riderId: String(new mongoose.Types.ObjectId()) });
      expect(badRider.status).toBe(404);

      const missingOrder = await request(app)
        .put(`/delivery/orders/${new mongoose.Types.ObjectId()}/assign`)
        .set(auth)
        .send({ riderId: String(rider._id) });
      expect(missingOrder.status).toBe(404);

      const stillUnassigned = await Sale.findById(sale._id);
      expect(stillUnassigned.deliveryStatus).toBe('unassigned');
      expect(stillUnassigned.riderId).toBeFalsy();
      expect((await Rider.findById(rider._id)).totalDeliveries || 0).toBe(0);
    });

    test('refunds a paid sale exactly once under concurrent requests', async () => {
      const admin = await makeUser('refund-admin', 'super_admin');
      const owner = await makeUser('refund-seller', 'business_admin');
      const product = await makeProduct('refund', owner, null, { stock: 0, trackInventory: true });
      // Simulate the analytics the original sale contributed so the refund
      // reversal can be proven to run exactly once.
      await Product.findByIdAndUpdate(product._id, {
        $inc: { 'analytics.sales': 2, 'analytics.revenue': 100 }
      });
      const sale = await Sale.create({
        invoiceNumber: `INV-REFUND-${uniq()}`,
        source: 'storefront',
        paymentStatus: 'paid',
        status: 'completed',
        deliveryStatus: 'out_for_delivery',
        items: [{ productId: product._id, productName: product.name, quantity: 2, price: 50, total: 100 }],
        subtotal: 100,
        total: 100,
        paymentMethod: 'mobile',
        createdBy: owner._id
      });
      const app = appWith('/delivery', deliveryRoutes);
      const auth = { Authorization: `Bearer ${userToken(admin)}` };

      const results = await Promise.all([
        request(app).post(`/delivery/orders/${sale._id}/refund`).set(auth).send({ reason: 'race-a' }),
        request(app).post(`/delivery/orders/${sale._id}/refund`).set(auth).send({ reason: 'race-b' })
      ]);

      expect(results.every(r => r.status === 200)).toBe(true);
      const restocked = results.filter(r => /stock restored/i.test(r.body.message || ''));
      expect(restocked).toHaveLength(1);

      const product_ = await Product.findById(product._id);
      expect(product_.stock).toBe(2); // restored exactly once, never doubled
      const refunded = await Sale.findById(sale._id);
      expect(refunded.paymentStatus).toBe('refunded');
      expect(refunded.status).toBe('refunded');
      expect(Number(product_.analytics?.sales || 0)).toBe(0);
    });

    test('releases pending stock exactly once under concurrent release', async () => {
      const owner = await makeUser('release-seller', 'business_admin');
      const product = await makeProduct('release', owner, null, { stock: 0, trackInventory: true });
      const sale = await Sale.create({
        invoiceNumber: `INV-RELEASE-${uniq()}`,
        source: 'storefront',
        paymentStatus: 'pending',
        status: 'pending',
        items: [{ productId: product._id, productName: product.name, quantity: 3, price: 20, total: 60 }],
        subtotal: 60,
        total: 60,
        paymentMethod: 'mobile',
        createdBy: owner._id
      });

      await Promise.all([
        SaleService.releasePendingSales([sale._id]),
        SaleService.releasePendingSales([sale._id])
      ]);

      expect((await Product.findById(product._id)).stock).toBe(3);
      expect((await Sale.findById(sale._id)).paymentStatus).toBe('failed');
    });

    test('refund and delivery guards agree on a refunded sale', async () => {
      const admin = await makeUser('refund-guard-admin', 'super_admin');
      const owner = await makeUser('refund-guard-seller', 'business_admin');
      const product = await makeProduct('refund-guard', owner, null, { stock: 0 });
      const sale = await Sale.create({
        invoiceNumber: `INV-REFUND-GUARD-${uniq()}`,
        source: 'storefront',
        paymentStatus: 'paid',
        status: 'completed',
        deliveryStatus: 'out_for_delivery',
        items: [{ productId: product._id, productName: product.name, quantity: 1, price: 30, total: 30 }],
        subtotal: 30,
        total: 30,
        paymentMethod: 'mobile',
        createdBy: owner._id
      });
      const app = appWith('/delivery', deliveryRoutes);
      const auth = { Authorization: `Bearer ${userToken(admin)}` };

      const refund = await request(app).post(`/delivery/orders/${sale._id}/refund`).set(auth).send({ reason: 'first' });
      expect(refund.status).toBe(200);

      // Delivering after the refund must not resurrect a paid storefront order.
      const deliver = await request(app).put(`/delivery/orders/${sale._id}/deliver`).set(auth).send({});
      expect(deliver.status).toBe(400);
      const final = await Sale.findById(sale._id);
      expect(final.paymentStatus).toBe('refunded');
      expect(final.status).toBe('refunded');
      expect(final.deliveryStatus).toBe('out_for_delivery');

      // A second refund is reported as already refunded, never re-restocked.
      const repeated = await request(app).post(`/delivery/orders/${sale._id}/refund`).set(auth).send({});
      expect(repeated.status).toBe(200);
      expect(repeated.body.message).toMatch(/already refunded/i);
      expect((await Product.findById(product._id)).stock).toBe(1);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // F-012 — seller discovery
  // ───────────────────────────────────────────────────────────────────────────
  describe('F-012 seller discovery', () => {
    async function discoveryFixture() {
      const adminA = await makeUser('disc-a', 'business_admin');
      const adminB = await makeUser('disc-b', 'business_admin');
      const superAdmin = await makeUser('disc-super', 'super_admin');
      const sellerA = await Seller.create({ userId: adminA._id, businessName: `Seller A ${uniq()}`, contactEmail: 'seller-a@test.local', contactPhone: '+255700333331' });
      const sellerB = await Seller.create({ userId: adminB._id, businessName: `Seller B ${uniq()}`, contactEmail: 'seller-b@test.local', contactPhone: '+255700333332' });
      const productB = await makeProduct('discB', adminB, null);
      await SellerInventory.create({ seller: sellerB._id, product: productB._id, price: 100, purchasePrice: 40, stock: 2 });
      return { adminA, adminB, superAdmin, sellerA, sellerB, productB };
    }

    test('scopes the seller list to the authenticated owner only', async () => {
      const fx = await discoveryFixture();
      const app = appWith('/sellers', sellerRoutes);

      const anonymous = await request(app).get('/sellers');
      expect(anonymous.status).toBe(401);

      const listA = await request(app).get('/sellers').set('Authorization', `Bearer ${userToken(fx.adminA)}`);
      expect(listA.status).toBe(200);
      expect(JSON.stringify(listA.body)).toContain(fx.sellerA.businessName);
      expect(JSON.stringify(listA.body)).not.toContain(fx.sellerB.businessName);
      expect(JSON.stringify(listA.body)).not.toContain(fx.sellerB.contactEmail);
    });

    test('prevents a seller from reading or mutating another seller', async () => {
      const fx = await discoveryFixture();
      const app = appWith('/sellers', sellerRoutes);
      const authA = { Authorization: `Bearer ${userToken(fx.adminA)}` };

      const read = await request(app).get(`/sellers/${fx.sellerB._id}`).set(authA);
      expect(read.status).toBe(404);

      const update = await request(app).put(`/sellers/${fx.sellerB._id}`).set(authA).send({ name: 'Hijacked' });
      expect(update.status).toBe(404);
      expect((await Seller.findById(fx.sellerB._id)).businessName).toBe(fx.sellerB.businessName);

      const remove = await request(app).delete(`/sellers/${fx.sellerB._id}`).set(authA);
      expect(remove.status).toBe(404);
      expect(await Seller.findById(fx.sellerB._id)).not.toBeNull();

      const own = await request(app).get(`/sellers/${fx.sellerA._id}`).set(authA);
      expect(own.status).toBe(200);
      expect(String(own.body.seller._id)).toBe(String(fx.sellerA._id));
    });

    test('keeps seller-discovery product responses free of foreign tenant data', async () => {
      const fx = await discoveryFixture();
      const app = appWith('/products', productRoutes);
      const authA = { Authorization: `Bearer ${userToken(fx.adminA)}` };
      const authSuper = { Authorization: `Bearer ${userToken(fx.superAdmin)}` };
      const customer = await makeUser('disc-customer', 'customer');
      const authCustomer = { Authorization: `Bearer ${userToken(customer)}` };

      // Both discovery routes sit behind requireAdmin, whose accepted roles are
      // ['admin', 'super_admin'] — 'admin' is not a valid User role, so the
      // effective contract is super-admin only. Every other actor is denied
      // before any tenant data is read.
      const anonymous = await request(app).get(`/products/by-seller/${fx.sellerB._id}`);
      expect(anonymous.status).toBe(401);

      for (const auth of [authCustomer, authA]) {
        const bySeller = await request(app).get(`/products/by-seller/${fx.sellerB._id}`).set(auth);
        expect(bySeller.status).toBe(403);
        expect(JSON.stringify(bySeller.body)).not.toContain(fx.productB.name);
        expect(JSON.stringify(bySeller.body)).not.toContain(fx.sellerB.businessName);

        const sellers = await request(app).get(`/products/${fx.productB._id}/sellers`).set(auth);
        expect(sellers.status).toBe(403);
        expect(JSON.stringify(sellers.body)).not.toContain(fx.sellerB.businessName);
        expect(JSON.stringify(sellers.body)).not.toContain(fx.sellerB.contactEmail);
        expect(JSON.stringify(sellers.body)).not.toContain(fx.productB.name);
      }

      // The sole authorised discovery actor sees the marketplace-wide view.
      const superBySeller = await request(app).get(`/products/by-seller/${fx.sellerB._id}`).set(authSuper);
      expect(superBySeller.status).toBe(200);
      expect(superBySeller.body.products).toHaveLength(1);
      expect(String(superBySeller.body.products[0]._id)).toBe(String(fx.productB._id));

      const superSellers = await request(app).get(`/products/${fx.productB._id}/sellers`).set(authSuper);
      expect(superSellers.status).toBe(200);
      expect(superSellers.body.sellers).toHaveLength(1);
      expect(String(superSellers.body.sellers[0]._id)).toBe(String(fx.sellerB._id));

      // Unknown identifiers stay a clean not-found for the authorised actor.
      const unknownSeller = await request(app)
        .get(`/products/by-seller/${new mongoose.Types.ObjectId()}`)
        .set(authSuper);
      expect(unknownSeller.status).toBe(404);
      expect(JSON.stringify(unknownSeller.body)).not.toContain(fx.sellerB.businessName);
    });

    test('scopes seller inventory discovery and mutation to the owning seller', async () => {
      const userA = await makeUser('inv-a', 'staff');
      const userB = await makeUser('inv-b', 'staff');
      const sellerA = await Seller.create({ userId: userA._id, businessName: `Inv A ${uniq()}`, contactEmail: 'inv-a@test.local' });
      const sellerB = await Seller.create({ userId: userB._id, businessName: `Inv B ${uniq()}`, contactEmail: 'inv-b@test.local' });
      const productB = await makeProduct('invB', userB, null);
      const inventoryB = await SellerInventory.create({ seller: sellerB._id, product: productB._id, price: 100, purchasePrice: 40, stock: 2 });
      await SellerInventory.create({ seller: sellerA._id, product: (await makeProduct('invA', userA, null))._id, price: 5, purchasePrice: 1, stock: 1 });
      const app = appWith('/seller-inventory', sellerInventoryRoutes);
      const authA = { Authorization: `Bearer ${userToken(userA)}` };

      const own = await request(app).get('/seller-inventory').set(authA);
      expect(own.status).toBe(200);
      expect(own.body.inventory).toHaveLength(1);
      expect(String(own.body.inventory[0].seller)).toBe(String(sellerA._id));

      const crossUpdate = await request(app).put(`/seller-inventory/${inventoryB._id}`).set(authA).send({ stock: 99 });
      expect(crossUpdate.status).toBe(404);
      expect((await SellerInventory.findById(inventoryB._id)).stock).toBe(2);

      const crossDelete = await request(app).delete(`/seller-inventory/${inventoryB._id}`).set(authA);
      expect(crossDelete.status).toBe(404);
      expect(await SellerInventory.findById(inventoryB._id)).not.toBeNull();

      const anonymous = await request(app).get('/seller-inventory');
      expect(anonymous.status).toBe(401);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // F-014 — file ownership
  // ───────────────────────────────────────────────────────────────────────────
  describe('F-014 file ownership matrix', () => {
    const uploadDir = path.join(__dirname, '..', 'uploads', 'products');
    const created = [];

    afterEach(() => {
      while (created.length) {
        const file = created.pop();
        const target = path.join(uploadDir, file);
        if (fs.existsSync(target)) fs.unlinkSync(target);
      }
    });

    function writeFile(name) {
      fs.mkdirSync(uploadDir, { recursive: true });
      fs.writeFileSync(path.join(uploadDir, name), 'fixture');
      created.push(name);
      return name;
    }

    test('completes the actor and business matrix without touching foreign files', async () => {
      const ownerA = await makeUser('file-a', 'staff');
      const ownerB = await makeUser('file-b', 'staff');
      const bizAdminA = await makeUser('file-biz-a', 'business_admin');
      const bizAdminB = await makeUser('file-biz-b', 'business_admin');
      const fileA = writeFile(`closure-a-${uniq()}.png`);
      const fileB = writeFile(`closure-b-${uniq()}.png`);
      await Product.create({
        name: 'Closure A', code: `CA-${uniq()}`, barcode: `CAB-${uniq()}`, price: 1, purchasePrice: 1,
        stock: 1, category: 'retail', userId: ownerA._id, images: [{ url: `/uploads/products/${fileA}` }]
      });
      await Product.create({
        name: 'Closure B', code: `CB-${uniq()}`, barcode: `CBB-${uniq()}`, price: 1, purchasePrice: 1,
        stock: 1, category: 'retail', userId: ownerB._id, images: [{ url: `/uploads/products/${fileB}` }]
      });
      const app = appWith('/uploads', uploadRoutes);

      const anonymous = await request(app).delete(`/uploads/product-image/${fileA}`);
      expect(anonymous.status).toBe(401);

      for (const actor of [ownerB, bizAdminB]) {
        const denied = await request(app)
          .delete(`/uploads/product-image/${fileA}`)
          .set('Authorization', `Bearer ${userToken(actor)}`);
        expect(denied.status).toBe(404);
        expect(fs.existsSync(path.join(uploadDir, fileA))).toBe(true);
      }

      // A business admin acting as themselves is not the asset owner.
      const bizAdminDelete = await request(app)
        .delete(`/uploads/product-image/${fileA}`)
        .set('Authorization', `Bearer ${userToken(bizAdminA)}`);
      expect(bizAdminDelete.status).toBe(404);
      expect(fs.existsSync(path.join(uploadDir, fileA))).toBe(true);

      const ownerDelete = await request(app)
        .delete(`/uploads/product-image/${fileA}`)
        .set('Authorization', `Bearer ${userToken(ownerA)}`);
      expect(ownerDelete.status).toBe(200);
      expect(fs.existsSync(path.join(uploadDir, fileA))).toBe(false);
      expect(fs.existsSync(path.join(uploadDir, fileB))).toBe(true);
    });

    test('rejects encoded and alternate filename representations', async () => {
      const owner = await makeUser('file-enc', 'staff');
      const file = writeFile(`closure-enc-${uniq()}.png`);
      await Product.create({
        name: 'Encoded', code: `EN-${uniq()}`, barcode: `ENB-${uniq()}`, price: 1, purchasePrice: 1,
        stock: 1, category: 'retail', userId: owner._id, images: [{ url: `/uploads/products/${file}` }]
      });
      const app = appWith('/uploads', uploadRoutes);
      const auth = { Authorization: `Bearer ${userToken(owner)}` };

      // Unsafe representations are rejected outright by the filename guard.
      for (const attempt of [
        '%252e%252e%252fpath.png',
        'nested%2ffile.png',
        'nested%5Cfile.png',
        'null%00byte.png',
        '..%2fescape.png',
        'control%01char.png',
        'file..png'
      ]) {
        const response = await request(app).delete(`/uploads/product-image/${attempt}`).set(auth);
        expect(response.status).toBe(400);
      }

      // A double-encoded but harmless name is not a traversal attempt: it is
      // simply not an asset this user owns, so it must be a clean 404 and must
      // never touch any file on disk.
      const harmless = await request(app).delete('/uploads/product-image/double%252dencoded.png').set(auth);
      expect(harmless.status).toBe(404);

      expect(fs.existsSync(path.join(uploadDir, file))).toBe(true);
      expect(fs.existsSync(path.join(uploadDir, 'path.png'))).toBe(false);
      expect(fs.existsSync(path.join(uploadDir, 'escape.png'))).toBe(false);
      expect(fs.existsSync(path.join(uploadDir, 'double%2dencoded.png'))).toBe(false);
      expect(fs.existsSync(path.join(__dirname, '..', 'uploads', 'escape.png'))).toBe(false);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // F-016 — tenant A/B isolation across the production route surface
  // ───────────────────────────────────────────────────────────────────────────
  describe('F-016 tenant isolation matrix', () => {
    async function tenantFixture() {
      const tenantA = new mongoose.Types.ObjectId();
      const tenantB = new mongoose.Types.ObjectId();
      const userA = await makeUser('ten-a', 'business_admin', { tenantId: tenantA });
      const userB = await makeUser('ten-b', 'business_admin', { tenantId: tenantB });
      const businessA = await makeBusiness('ten-a', userA, { tenantId: tenantA });
      const businessB = await makeBusiness('ten-b', userB, { tenantId: tenantB });
      userA.businessId = businessA._id;
      userB.businessId = businessB._id;
      await userA.save();
      await userB.save();
      const productA = await makeProduct('tenA', userA, businessA);
      const productB = await makeProduct('tenB', userB, businessB);
      return { tenantA, tenantB, userA, userB, businessA, businessB, productA, productB };
    }

    test('isolates sales reads and by-id lookups between tenants', async () => {
      const fx = await tenantFixture();
      const saleA = await Sale.create({
        invoiceNumber: `INV-A-${uniq()}`, items: [{ productId: fx.productA._id, productName: 'A', quantity: 1, price: 10, total: 10 }],
        subtotal: 10, total: 10, paymentMethod: 'cash', createdBy: fx.userA._id, source: 'pos', paymentStatus: 'paid', status: 'completed'
      });
      const saleB = await Sale.create({
        invoiceNumber: `INV-B-${uniq()}`, items: [{ productId: fx.productB._id, productName: 'B', quantity: 1, price: 99, total: 99 }],
        subtotal: 99, total: 99, paymentMethod: 'cash', createdBy: fx.userB._id, source: 'pos', paymentStatus: 'paid', status: 'completed'
      });
      const app = appWith('/sales', salesRoutes);
      const authA = { Authorization: `Bearer ${userToken(fx.userA)}` };

      const list = await request(app).get('/sales').set(authA);
      expect(list.status).toBe(200);
      expect(list.body.sales.map(s => String(s._id))).toEqual([String(saleA._id)]);

      const crossRead = await request(app).get(`/sales/${saleB._id}`).set(authA);
      expect(crossRead.status).toBe(404);
      expect(JSON.stringify(crossRead.body)).not.toContain(saleB.invoiceNumber);

      const ownRead = await request(app).get(`/sales/${saleA._id}`).set(authA);
      expect(ownRead.status).toBe(200);
    });

    test('isolates expense reads, updates, and deletes between tenants', async () => {
      const fx = await tenantFixture();
      const expenseA = await Expense.create({ title: 'A expense', amount: 5, createdBy: fx.userA._id });
      const expenseB = await Expense.create({ title: 'B expense', amount: 7, createdBy: fx.userB._id });
      const app = appWith('/expenses', expenseRoutes);
      const authA = { Authorization: `Bearer ${userToken(fx.userA)}` };

      const list = await request(app).get('/expenses').set(authA);
      expect(list.status).toBe(200);
      expect(list.body.expenses.map(e => String(e._id))).toEqual([String(expenseA._id)]);

      const crossUpdate = await request(app).put(`/expenses/${expenseB._id}`).set(authA).send({ amount: 1 });
      expect(crossUpdate.status).toBe(404);
      expect((await Expense.findById(expenseB._id)).amount).toBe(7);

      const crossDelete = await request(app).delete(`/expenses/${expenseB._id}`).set(authA);
      expect(crossDelete.status).toBe(404);
      expect(await Expense.findById(expenseB._id)).not.toBeNull();
    });

    test('isolates supplier reads and mutations between tenants', async () => {
      const fx = await tenantFixture();
      const supplierA = await Supplier.create({ userId: fx.userA._id, name: 'Supplier A' });
      const supplierB = await Supplier.create({ userId: fx.userB._id, name: 'Supplier B' });
      const app = appWith('/suppliers', supplierRoutes);
      const authA = { Authorization: `Bearer ${userToken(fx.userA)}` };

      const list = await request(app).get('/suppliers').set(authA);
      expect(list.status).toBe(200);
      expect(list.body.suppliers.map(s => String(s._id))).toEqual([String(supplierA._id)]);

      const crossRead = await request(app).get(`/suppliers/${supplierB._id}`).set(authA);
      expect(crossRead.status).toBe(404);

      const crossUpdate = await request(app).put(`/suppliers/${supplierB._id}`).set(authA).send({ name: 'Hijacked' });
      expect(crossUpdate.status).toBe(404);
      expect((await Supplier.findById(supplierB._id)).name).toBe('Supplier B');

      const crossDelete = await request(app).delete(`/suppliers/${supplierB._id}`).set(authA);
      expect(crossDelete.status).toBe(404);
      expect(await Supplier.findById(supplierB._id)).not.toBeNull();
    });

    test('isolates categories by tenant and never trusts a client tenantId', async () => {
      const fx = await tenantFixture();
      await Category.create({ name: `Cat A ${uniq()}`, tenantId: fx.tenantA });
      const categoryB = await Category.create({ name: `Cat B ${uniq()}`, tenantId: fx.tenantB });
      const app = appWith('/categories', simpleCategoryRoutes);
      const authA = { Authorization: `Bearer ${userToken(fx.userA)}` };

      const list = await request(app).get('/categories').set(authA);
      expect(list.status).toBe(200);
      expect(list.body.categories.some(c => String(c._id) === String(categoryB._id))).toBe(false);

      const created = await request(app)
        .post('/categories')
        .set(authA)
        .send({ name: `Injected ${uniq()}`, tenantId: String(fx.tenantB) });
      expect(created.status).toBe(201);
      expect(String(created.body.tenantId)).toBe(String(fx.tenantA));
    });

    test('isolates analytics and product reads between tenants', async () => {
      const fx = await tenantFixture();
      const app = express();
      app.use(express.json());
      app.use('/analytics', simpleAnalyticsRoutes);
      app.use('/products', productRoutes);
      const authA = { Authorization: `Bearer ${userToken(fx.userA)}` };

      const salesAnalytics = await request(app).get('/analytics/sales').set(authA);
      expect(salesAnalytics.status).toBe(200);
      expect(salesAnalytics.body.totalRevenue).toBe(0);

      const inventoryAnalytics = await request(app).get('/analytics/inventory').set(authA);
      expect(inventoryAnalytics.status).toBe(200);
      expect(inventoryAnalytics.body.inventoryValue.uniqueProducts).toBe(1);

      const productList = await request(app).get('/products').set(authA);
      expect(productList.status).toBe(200);
      expect(productList.body.products.map(p => String(p._id))).toEqual([String(fx.productA._id)]);

      const crossRead = await request(app).get(`/products/${fx.productB._id}`).set(authA);
      expect(crossRead.status).toBe(404);

      const crossUpdate = await request(app).put(`/products/${fx.productB._id}`).set(authA).send({ price: 1 });
      expect(crossUpdate.status).toBe(404);
      expect((await Product.findById(fx.productB._id)).price).toBe(100);

      const crossDelete = await request(app).delete(`/products/${fx.productB._id}`).set(authA);
      expect(crossDelete.status).toBe(404);
      expect(await Product.findById(fx.productB._id)).not.toBeNull();

      const ownUpdate = await request(app).put(`/products/${fx.productA._id}`).set(authA).send({ price: 7 });
      expect(ownUpdate.status).toBe(200);
      expect((await Product.findById(fx.productA._id)).price).toBe(7);

      // Unknown ids are not-found, never a 500 that discloses internal errors.
      const unknown = await request(app)
        .get(`/products/${new mongoose.Types.ObjectId()}`)
        .set(authA);
      expect(unknown.status).toBe(404);
    });

    test('denies cross-business order listing for a business admin', async () => {
      const fx = await tenantFixture();
      const app = appWith('/orders', orderRoutes);
      const authA = { Authorization: `Bearer ${userToken(fx.userA)}` };

      const own = await request(app).get(`/orders/business/${fx.businessA._id}`).set(authA);
      expect(own.status).toBe(200);

      const foreign = await request(app).get(`/orders/business/${fx.businessB._id}`).set(authA);
      expect(foreign.status).toBe(403);
    });

    test('does not disclose another tenant private cost through product cloning', async () => {
      const fx = await tenantFixture();
      const app = appWith('/products', productRoutes);
      const authA = { Authorization: `Bearer ${userToken(fx.userA)}` };

      const clone = await request(app).post(`/products/${fx.productB._id}/clone`).set(authA).send({});
      const payload = JSON.stringify(clone.body);
      expect(payload).not.toContain(`"purchasePrice":${fx.productB.purchasePrice}`);
      expect(clone.status).not.toBe(500);
      if (clone.status === 201) {
        expect(String(clone.body.product.userId)).toBe(String(fx.userA._id));
        expect(Number(clone.body.product.purchasePrice || 0)).toBe(0);
      }
    });
  });
});
