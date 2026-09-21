const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../models/User');
const Seller = require('../models/Seller');
const Business = require('../models/Business');
const Product = require('../models/Product');
const Sale = require('../models/Sale');
const Cart = require('../models/Cart');
const CartService = require('../services/cartService');
const PaymentSession = require('../models/PaymentSession');
const paymentRoutes = require('../routes/paymentRoutes');
const SaleService = require('../services/saleService');
const OrderService = require('../services/orderService');
const sellerRoutes = require('../routes/sellerRoutes');
const productRoutes = require('../routes/productRoutes');
const { requireSuperAdmin } = require('../routes/middleware/auth');

const tokenFor = (user, role = user.role) => jwt.sign({
  userId: String(user._id),
  role,
  businessId: user.businessId ? String(user.businessId) : undefined
}, process.env.JWT_SECRET);

async function makeUser(email, role = 'business_admin', overrides = {}) {
  return User.create({
    email,
    password: 'Password123!',
    role,
    isApproved: true,
    isActive: true,
    ...overrides
  });
}

async function makeBusiness(name, slug, user, overrides = {}) {
  return Business.create({
    name,
    slug,
    email: `${slug}@test.local`,
    category: 'retail',
    tenantId: 'tenant-test',
    userId: user._id,
    status: 'active',
    isPublic: true,
    ...overrides
  });
}

async function makeProduct(name, user, business, overrides = {}) {
  return Product.create({
    name,
    slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    code: `CODE-${new mongoose.Types.ObjectId()}`,
    barcode: `BAR-${new mongoose.Types.ObjectId()}`,
    price: 100,
    purchasePrice: 50,
    stock: 1,
    reorderPoint: 1,
    category: 'retail',
    userId: user._id,
    businessId: business?._id,
    isPublished: true,
    status: 'active',
    ...overrides
  });
}

describe('Phase 2D-2 remediation boundaries', () => {
  it('rejects a stale super-admin JWT after persisted role revocation', async () => {
    const user = await makeUser('revoked-admin@test.local', 'super_admin');
    const app = express();
    app.get('/admin', requireSuperAdmin, (_req, res) => res.json({ ok: true }));
    const token = tokenFor(user, 'super_admin');

    await User.findByIdAndUpdate(user._id, { role: 'business_admin' });
    const response = await request(app).get('/admin').set('Authorization', `Bearer ${token}`);
    expect(response.status).toBe(403);
  });

  it('prevents a seller from reading another seller by ID', async () => {
    const owner = await makeUser('seller-owner@test.local');
    const other = await makeUser('seller-other@test.local');
    const seller = await Seller.create({
      userId: other._id,
      businessName: 'Other Seller',
      contactEmail: 'other@test.local',
      contactPhone: '+255700000001'
    });
    const app = express();
    app.use(express.json());
    app.use('/sellers', sellerRoutes);

    const response = await request(app)
      .get(`/sellers/${seller._id}`)
      .set('Authorization', `Bearer ${tokenFor(owner)}`);
    expect(response.status).toBe(404);
  });

  it('binds cart validation to the guest session capability', async () => {
    const owner = await makeUser('cart-validation@test.local');
    const business = await makeBusiness('Cart Validation', 'cart-validation', owner);
    const product = await makeProduct('Cart Validation Product', owner, business);
    const cart = await Cart.create({
      sessionId: 'session-owner',
      businessId: business._id,
      tenantId: 'tenant-test',
      items: [{ product: product._id, productName: product.name, productCode: product.code, price: product.price, quantity: 1, subtotal: product.price }]
    });

    await expect(CartService.validateCart(cart._id, 'session-foreign')).rejects.toThrow('Cart not found');
    const validation = await CartService.validateCart(cart._id, 'session-owner');
    expect(validation.isValid).toBe(true);
  });

  it('uses canonical marketplace eligibility for the authenticated catalog endpoint', async () => {
    const owner = await makeUser('catalog-owner@test.local');
    const privateOwner = await makeUser('catalog-private@test.local');
    const publicBusiness = await makeBusiness('Public Catalog', 'public-catalog', owner);
    const privateBusiness = await makeBusiness('Private Catalog', 'private-catalog', privateOwner, { isPublic: false });
    const visible = await makeProduct('Visible Catalog Product', owner, publicBusiness);
    const hidden = await makeProduct('Hidden Catalog Product', privateOwner, privateBusiness);
    const app = express();
    app.use(express.json());
    app.use('/products', productRoutes);

    const response = await request(app)
      .get('/products/catalog/public')
      .set('Authorization', `Bearer ${tokenFor(owner)}`);
    expect(response.status).toBe(200);
    const ids = response.body.products.map(product => String(product._id));
    expect(ids).toContain(String(visible._id));
    expect(ids).not.toContain(String(hidden._id));
  });

  it('allows only one concurrent buyer to reserve the final unit', async () => {
    const owner = await makeUser('stock-owner@test.local');
    const business = await makeBusiness('Stock Store', 'stock-store', owner);
    const product = await makeProduct('Single Unit Product', owner, business, { stock: 1 });

    const attempts = await Promise.allSettled([
      SaleService.processPublicMultiSellerOrder({ items: [{ product: product._id, quantity: 1 }], customer: { name: 'A' } }),
      SaleService.processPublicMultiSellerOrder({ items: [{ product: product._id, quantity: 1 }], customer: { name: 'B' } })
    ]);

    const successful = attempts.filter(result => result.status === 'fulfilled');
    const current = await Product.findById(product._id);
    expect(successful).toHaveLength(1);
    expect(current.stock).toBe(0);
    expect(current.stock).toBeGreaterThanOrEqual(0);
    expect(await Sale.countDocuments({ productId: product._id })).toBe(0);
    expect(await Sale.countDocuments({ status: 'completed' })).toBe(1);
  });

  it('requires the payment-session capability for status and cancellation', async () => {
    const capability = 'capability-test-123';
    const session = await PaymentSession.create({
      selcomOrderId: `SEL-STATUS-${Date.now()}`,
      sessionCapability: capability,
      amount: 250,
      method: 'mobile',
      status: 'paid',
      reference: 'private-provider-reference',
      redirectUrl: 'https://provider.invalid/private'
    });
    const app = express();
    app.use(express.json());
    app.use('/payments', paymentRoutes);

    const wrong = await request(app).get(`/payments/selcom/status?orderId=${session.selcomOrderId}&capability=wrong`);
    expect(wrong.status).toBe(404);
    const correct = await request(app).get(`/payments/selcom/status?orderId=${session.selcomOrderId}&capability=${capability}`);
    expect(correct.status).toBe(200);
    expect(correct.body.reference).toBeUndefined();
    expect(correct.body.redirectUrl).toBeUndefined();

    const cancel = await request(app).post('/payments/selcom/cancel').send({ orderId: session.selcomOrderId, capability: 'wrong' });
    expect(cancel.status).toBe(404);
    const unchanged = await PaymentSession.findById(session._id).select('+sessionCapability');
    expect(unchanged.status).toBe('paid');
  });

  it('settles a pending sale exactly once under concurrent callbacks', async () => {
    const owner = await makeUser('payment-owner@test.local');
    const sale = await Sale.create({
      invoiceNumber: `INV-SETTLE-${Date.now()}`,
      items: [{ productId: new mongoose.Types.ObjectId(), productName: 'Settled', quantity: 1, price: 100, total: 100 }],
      subtotal: 100,
      total: 100,
      paymentMethod: 'mobile',
      paymentStatus: 'pending',
      status: 'pending',
      createdBy: owner._id,
      source: 'storefront'
    });

    const results = await Promise.all([
      SaleService.confirmSalesPaid({ saleIds: [sale._id], transactionId: 'TX-1', selcomOrderId: 'SEL-1' }),
      SaleService.confirmSalesPaid({ saleIds: [sale._id], transactionId: 'TX-1', selcomOrderId: 'SEL-1' })
    ]);

    expect(results.map(result => result.count).sort()).toEqual([0, 1]);
    const settled = await Sale.findById(sale._id);
    expect(settled.paymentStatus).toBe('paid');
    expect(settled.status).toBe('completed');
  });

  it('rejects illegal order state transitions and permits the existing pending-to-confirmed path', async () => {
    const business = await Business.create({ name: 'Order State', slug: `order-state-${Date.now()}`, email: 'state@test.local', category: 'retail', tenantId: 'tenant-test' });
    const order = await require('../models/Order').create({
      customerEmail: 'buyer@test.local',
      customerName: 'Buyer',
      businessId: business._id,
      tenantId: 'tenant-test',
      items: [{ product: new mongoose.Types.ObjectId(), productName: 'Item', productCode: 'ITEM', price: 10, quantity: 1, subtotal: 10 }],
      subtotal: 10,
      taxAmount: 0,
      shippingAmount: 0,
      discountAmount: 0,
      total: 10,
      fulfillmentMethod: 'pickup',
      paymentMethod: 'cash',
      status: 'pending'
    });

    await expect(OrderService.updateOrderStatus(order._id, 'delivered')).rejects.toThrow(/Invalid order status transition/);
    const confirmed = await OrderService.updateOrderStatus(order._id, 'confirmed');
    expect(confirmed.status).toBe('confirmed');
    await expect(OrderService.updateOrderStatus(order._id, 'pending')).rejects.toThrow(/Invalid order status transition/);
  });
});
