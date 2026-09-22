/**
 * Phase 2D-2 transaction integrity.
 *
 * These suites exist because order creation, business registration and supplier
 * stock-in rely on multi-document MongoDB transactions. They only work when the
 * server is a replica set (or mongos) — tests/setup.js provisions a single-node
 * replica set for exactly this reason.
 *
 *   F-004  order creation: replay, rollback, concurrent oversell protection
 *   F-015  supplier stock-in atomicity (see phase2d2Completion for the
 *          concurrency + rollback matrix already covered there)
 */

const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

const orderRoutes = require('../routes/orderRoutes');
const OrderService = require('../services/orderService');

const User = require('../models/User');
const Business = require('../models/Business');
const Product = require('../models/Product');
const Cart = require('../models/Cart');
const CustomerAccount = require('../models/CustomerAccount');
const Order = require('../models/Order');

const uniq = () => `${Date.now()}${Math.floor(Math.random() * 10000)}`;

const customerToken = (customer) =>
  jwt.sign({ customerId: String(customer._id), type: 'customer' }, process.env.JWT_SECRET);

const appWith = (mountPath, router) => {
  const app = express();
  app.use(express.json());
  app.use(mountPath, router);
  return app;
};

async function makeOwner(prefix) {
  return User.create({
    email: `${prefix}-${uniq()}@test.local`,
    password: 'Password123!',
    role: 'business_admin',
    isApproved: true,
    isActive: true
  });
}

async function makeBusiness(prefix, user) {
  return Business.create({
    name: `Biz ${prefix} ${uniq()}`,
    slug: `${prefix}-${uniq()}`,
    email: `${prefix}-${uniq()}@test.local`,
    category: 'retail',
    tenantId: new mongoose.Types.ObjectId(),
    userId: user._id,
    status: 'active',
    isPublic: true,
    ecommerce: { enabled: true, currency: 'USD', taxRate: 0 }
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
    businessId: business._id,
    isPublished: true,
    status: 'active',
    ...overrides
  });
}

async function makeCustomer(business, prefix = 'cust') {
  return CustomerAccount.create({
    email: `${prefix}-${uniq()}@test.local`,
    firstName: 'Buyer',
    lastName: 'Test',
    password: 'Password123!',
    businessId: business._id
  });
}

async function makeCart(customer, business, items) {
  const subtotal = items.reduce((sum, i) => sum + i.product.price * i.quantity, 0);
  return Cart.create({
    customerId: customer._id,
    sessionId: `session-${uniq()}`,
    businessId: business._id,
    tenantId: business.tenantId,
    items: items.map((i) => ({
      product: i.product._id,
      productName: i.product.name,
      productCode: i.product.code,
      price: i.product.price,
      quantity: i.quantity,
      subtotal: i.product.price * i.quantity
    })),
    subtotal,
    taxRate: 0,
    currency: 'USD'
  });
}

const orderBody = (cart, email) => ({
  cartId: String(cart._id),
  customerEmail: email,
  customerName: 'Buyer',
  fulfillmentMethod: 'pickup',
  paymentMethod: 'cash'
});

describe('Phase 2D-2 transaction integrity', () => {
  afterEach(async () => {
    await Promise.all([
      Order.deleteMany({}),
      Cart.deleteMany({}),
      Product.deleteMany({}),
      CustomerAccount.deleteMany({}),
      User.deleteMany({}),
      Business.deleteMany({})
    ]);
  });

  describe('F-004 order creation atomicity', () => {
    test('rejects replay of an already-converted cart without duplicating the order or stock', async () => {
      const app = appWith('/orders', orderRoutes);
      const owner = await makeOwner('replay-owner');
      const business = await makeBusiness('replay', owner);
      const product = await makeProduct('replay', owner, business, { stock: 10 });
      const customer = await makeCustomer(business, 'replay');
      const cart = await makeCart(customer, business, [{ product, quantity: 2 }]);

      const first = await request(app)
        .post('/orders')
        .set('Authorization', `Bearer ${customerToken(customer)}`)
        .send(orderBody(cart, customer.email));
      expect(first.status).toBe(201);

      const stockAfterFirst = (await Product.findById(product._id)).stock;
      expect(stockAfterFirst).toBe(8);
      expect(await Order.countDocuments()).toBe(1);

      // Identical replay of the same converted cart must not create a second order.
      const replay = await request(app)
        .post('/orders')
        .set('Authorization', `Bearer ${customerToken(customer)}`)
        .send(orderBody(cart, customer.email));

      expect(replay.status).toBeGreaterThanOrEqual(400);
      expect(await Order.countDocuments()).toBe(1);
      expect((await Product.findById(product._id)).stock).toBe(stockAfterFirst);
    });

    test('rolls back the entire order when a later write inside the transaction fails', async () => {
      const owner = await makeOwner('rollback-owner');
      const business = await makeBusiness('rollback', owner);
      const productA = await makeProduct('rbA', owner, business, { stock: 10 });
      const productB = await makeProduct('rbB', owner, business, { stock: 10 });
      const customer = await makeCustomer(business, 'rollback');
      const cart = await makeCart(customer, business, [
        { product: productA, quantity: 1 },
        { product: productB, quantity: 1 }
      ]);

      const orderHistoryBefore = (await CustomerAccount.findById(customer._id))
        .orderHistory?.totalOrders ?? 0;
      const analyticsBefore = (await Business.findById(business._id)).analytics?.orders ?? 0;

      const original = Product.findByIdAndUpdate.bind(Product);
      let calls = 0;
      const spy = jest
        .spyOn(Product, 'findByIdAndUpdate')
        .mockImplementation((...args) => {
          calls += 1;
          // Fail on the second product update so the first product decrement and
          // the order insert must both roll back.
          if (calls === 2) throw new Error('forced product update failure');
          return original(...args);
        });

      let error = null;
      try {
        await OrderService.createOrderFromCart(
          String(cart._id),
          {
            customerEmail: customer.email,
            customerName: 'Buyer',
            fulfillmentMethod: 'pickup',
            paymentMethod: 'cash'
          },
          String(customer._id)
        );
      } catch (err) {
        error = err;
      } finally {
        spy.mockRestore();
      }

      expect(error).not.toBeNull();

      // Nothing partially persisted.
      expect(await Order.countDocuments()).toBe(0);
      expect((await Product.findById(productA._id)).stock).toBe(10);
      expect((await Product.findById(productB._id)).stock).toBe(10);
      expect((await Cart.findById(cart._id)).status).toBe('active');

      const orderHistoryAfter = (await CustomerAccount.findById(customer._id))
        .orderHistory?.totalOrders ?? 0;
      const analyticsAfter = (await Business.findById(business._id)).analytics?.orders ?? 0;
      expect(orderHistoryAfter).toBe(orderHistoryBefore);
      expect(analyticsAfter).toBe(analyticsBefore);
    });

    test('never oversells when two orders are submitted concurrently for the last unit', async () => {
      const owner = await makeOwner('race-owner');
      const business = await makeBusiness('race', owner);
      const product = await makeProduct('race', owner, business, { stock: 1 });

      const customerA = await makeCustomer(business, 'race-a');
      const customerB = await makeCustomer(business, 'race-b');
      const cartA = await makeCart(customerA, business, [{ product, quantity: 1 }]);
      const cartB = await makeCart(customerB, business, [{ product, quantity: 1 }]);

      const payload = (cart, customer) => ({
        customerEmail: customer.email,
        customerName: 'Buyer',
        fulfillmentMethod: 'pickup',
        paymentMethod: 'cash'
      });

      const results = await Promise.allSettled([
        OrderService.createOrderFromCart(String(cartA._id), payload(cartA, customerA), String(customerA._id)),
        OrderService.createOrderFromCart(String(cartB._id), payload(cartB, customerB), String(customerB._id))
      ]);

      const fulfilled = results.filter((r) => r.status === 'fulfilled');
      expect(fulfilled).toHaveLength(1);
      expect(await Order.countDocuments()).toBe(1);

      const finalStock = (await Product.findById(product._id)).stock;
      expect(finalStock).toBe(0);
      expect(finalStock).toBeGreaterThanOrEqual(0);
    });
  });
});
