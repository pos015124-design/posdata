/**
 * Phase 2D-2 — F-016 mounted-route tenant inventory and remaining boundaries.
 *
 * Two halves:
 *   1. Inventory completeness: every router the production entry point
 *      (server.js) mounts must carry an explicit security classification, and
 *      the reachability of the alternate entry points must be provable.
 *   2. Endpoint evidence for the tenant-sensitive surfaces that were not yet
 *      exercised: customers, settings, notifications, dashboard, billing,
 *      business ownership and the public catalog surface.
 *
 * All fixtures are disposable local documents. No production access.
 */

const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const customerRoutes = require('../routes/customerRoutes');
const settingsRoutes = require('../routes/settingsRoutes');
const notificationRoutes = require('../routes/notificationRoutes');
const dashboardRoutes = require('../routes/dashboardRoutes');
const billingRoutes = require('../routes/billingRoutes');
const businessRoutes = require('../routes/businessRoutes');
const catalogRoutes = require('../routes/catalogRoutes');

const User = require('../models/User');
const Business = require('../models/Business');
const Customer = require('../models/Customer');
const Notification = require('../models/Notification');
const Product = require('../models/Product');
const Sale = require('../models/Sale');

const uniq = () => `${Date.now()}${Math.floor(Math.random() * 10000)}`;

const userToken = (user) =>
  jwt.sign(
    {
      userId: String(user._id),
      role: user.role,
      businessId: user.businessId ? String(user.businessId) : undefined,
      tenantId: user.tenantId ? String(user.tenantId) : undefined
    },
    process.env.JWT_SECRET
  );

async function makeUser(prefix, role, overrides = {}) {
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
    tenantId: new mongoose.Types.ObjectId(),
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

/**
 * Security classification of every router the production entry point mounts.
 * A router that is mounted but absent from this map fails the inventory test,
 * so a new surface cannot be added without stating its boundary.
 */
const ROUTER_CLASSIFICATION = {
  authRoutes: 'PUBLIC-AUTH (rate limited, session issuing)',
  importRoutes: 'TENANT-SCOPED (user-scoped product import)',
  productRoutes: 'TENANT-SCOPED (owner-scoped reads/writes, admin discovery)',
  customerRoutes: 'USER-SCOPED (owner-scoped customer PII)',
  salesRoutes: 'USER-SCOPED (owner-scoped sale records)',
  expenseRoutes: 'USER-SCOPED (owner-scoped expenses)',
  simpleAnalyticsRoutes: 'USER-SCOPED (owner-scoped analytics)',
  settingsRoutes: 'USER-SCOPED (settings stored on the authenticated user)',
  simpleCategoryRoutes: 'TENANT-SCOPED (tenantId-scoped categories)',
  dashboardRoutes: 'USER-SCOPED (owner-scoped dashboard aggregation)',
  exportRoutes: 'USER-SCOPED (owner-scoped exports)',
  businessRoutes: 'PUBLIC-READ + OWNER-WRITE + SUPER-ADMIN',
  platformRoutes: 'SUPER-ADMIN GLOBAL',
  customerAuthRoutes: 'PUBLIC-AUTH + CUSTOMER-SESSION',
  cartRoutes: 'CUSTOMER-SESSION (guest capability bound)',
  orderRoutes: 'CUSTOMER-SESSION + BUSINESS-ADMIN + SUPER-ADMIN',
  catalogRoutes: 'PUBLIC CATALOG (published products of public businesses)',
  uploadRoutes: 'OWNER-SCOPED (asset ownership enforced server-side)',
  migrationRoutes: 'ADMIN GLOBAL (operator tooling)',
  storeRoutes: 'PUBLIC STOREFRONT',
  paymentRoutes: 'PUBLIC PAYMENT (session capability bound)',
  sellerRoutes: 'USER-SCOPED (owner-scoped sellers)',
  sellerInventoryRoutes: 'OWNER-SCOPED (own seller inventory)',
  reviewRoutes: 'PUBLIC READ + TENANT-SCOPED WRITE',
  billingRoutes: 'SELF-READ + SUPER-ADMIN',
  supplierRoutes: 'USER-SCOPED (owner-scoped suppliers)',
  deliveryRoutes: 'SUPER-ADMIN ONLY',
  notificationRoutes: 'USER-SCOPED (own notifications)',
  reportRoutes: 'PUBLIC TOKEN (scheduled report unsubscribe)'
};

/** Legacy routers that exist on disk but are not mounted by server.js. */
const LEGACY_UNMOUNTED = ['simpleInventoryRoutes'];

describe('F-016 mounted route inventory', () => {
  const serverSrc = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');

  const mountedRouters = () => {
    const found = new Set();
    for (const line of serverSrc.split('\n')) {
      const trimmed = line.trim();
      if (trimmed.startsWith('//')) continue; // commented-out mounts are not reachable
      const match = trimmed.match(/^app\.use\('\/api[^']*',\s*(.+?)\);?$/);
      if (!match) continue;
      const target = match[1];
      const required = target.match(/require\('\.\/routes\/(\w+)'\)/);
      if (required) {
        found.add(required[1]);
        continue;
      }
      const bare = target.match(/(\w+Routes)/);
      if (bare) found.add(bare[1]);
    }
    return [...found];
  };

  test('every router mounted by the production entry point is classified', () => {
    const mounted = mountedRouters();
    expect(mounted.length).toBeGreaterThanOrEqual(25);

    const unclassified = mounted.filter((name) => !ROUTER_CLASSIFICATION[name]);
    expect(unclassified).toEqual([]);

    // Each classified router must exist on disk as an Express router module.
    for (const name of mounted) {
      const file = path.join(__dirname, '..', 'routes', `${name}.js`);
      expect(fs.existsSync(file)).toBe(true);
    }
  });

  test('documents that legacy routers are not reachable through the production entry point', () => {
    for (const name of LEGACY_UNMOUNTED) {
      expect(fs.existsSync(path.join(__dirname, '..', 'routes', `${name}.js`))).toBe(true);
      expect(serverSrc).not.toContain(`${name}.js`);
      expect(serverSrc).not.toContain(name);
    }
    // The canonical settings router is the one the production entry point uses.
    expect(serverSrc).toContain("require('./routes/settingsRoutes')");
    expect(serverSrc).not.toContain('simpleSettingsRoutes');
  });

  test('proves which entry point is production and that alternates are dead code', () => {
    const repoRoot = path.join(__dirname, '..', '..');
    const serverPkg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));
    const rootPkg = JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8'));
    const procfile = fs.readFileSync(path.join(repoRoot, 'Procfile'), 'utf8');
    const renderYaml = fs.readFileSync(path.join(repoRoot, 'render.yaml'), 'utf8');

    // Production start path is server/server.js for every deployment definition.
    expect(serverPkg.main).toBe('server.js');
    expect(serverPkg.scripts.start).toBe('node server.js');
    expect(rootPkg.scripts.start).toBe('cd server && node server.js');
    expect(procfile).toContain('npm start');
    expect(renderYaml).toContain('cd server && npm start');

    // full-server.js is a complete alternate app but no deployment definition
    // references it, and it is the only file that mounts the legacy routers.
    const fullServer = fs.readFileSync(path.join(__dirname, '..', 'full-server.js'), 'utf8');
    expect(fullServer).toMatch(/\.listen\(/);
    expect(fullServer).toContain('simpleSettingsRoutes');
    expect(procfile).not.toContain('full-server');
    expect(renderYaml).not.toContain('full-server');
    expect(rootPkg.scripts.start).not.toContain('full-server');
    expect(serverPkg.scripts.start).not.toContain('full-server');

    // server_temp.js is a fragment: no app, no express require, no listener.
    const tempServer = fs.readFileSync(path.join(__dirname, '..', 'server_temp.js'), 'utf8');
    expect(tempServer).not.toMatch(/const app\s*=/);
    expect(tempServer).not.toMatch(/require\(['"]express['"]\)/);
    expect(tempServer).not.toMatch(/\.listen\(/);
  });
});

describe('F-016 remaining tenant boundaries', () => {
  async function tenantFixture() {
    const tenantA = new mongoose.Types.ObjectId();
    const tenantB = new mongoose.Types.ObjectId();
    const userA = await makeUser('inv-a', 'business_admin', { tenantId: tenantA });
    const userB = await makeUser('inv-b', 'business_admin', { tenantId: tenantB });
    const superAdmin = await makeUser('inv-super', 'super_admin');
    const businessA = await makeBusiness('inv-a', userA, { tenantId: tenantA });
    const businessB = await makeBusiness('inv-b', userB, { tenantId: tenantB });
    userA.businessId = businessA._id;
    userB.businessId = businessB._id;
    await userA.save();
    await userB.save();
    return { tenantA, tenantB, userA, userB, superAdmin, businessA, businessB };
  }

  test('scopes customer records to their owning user', async () => {
    const fx = await tenantFixture();
    const customerA = await Customer.create({ name: 'Customer A', email: `ca-${uniq()}@test.local`, userId: fx.userA._id });
    const customerB = await Customer.create({ name: 'Customer B', email: `cb-${uniq()}@test.local`, userId: fx.userB._id });
    const app = appWith('/customers', customerRoutes);
    const authA = { Authorization: `Bearer ${userToken(fx.userA)}` };

    const list = await request(app).get('/customers').set(authA);
    expect(list.status).toBe(200);
    const listedIds = list.body.customers.map((c) => String(c._id));
    expect(listedIds).toContain(String(customerA._id));
    expect(listedIds).not.toContain(String(customerB._id));

    const crossRead = await request(app).get(`/customers/${customerB._id}`).set(authA);
    expect(crossRead.status).toBe(404);
    expect(JSON.stringify(crossRead.body)).not.toContain(customerB.email);

    const crossUpdate = await request(app)
      .put(`/customers/${customerB._id}`)
      .set(authA)
      .send({ name: 'Hijacked', email: customerB.email });
    expect([400, 403, 404]).toContain(crossUpdate.status);
    expect((await Customer.findById(customerB._id)).name).toBe('Customer B');

    const crossDelete = await request(app).delete(`/customers/${customerB._id}`).set(authA);
    expect([400, 403, 404]).toContain(crossDelete.status);
    expect(await Customer.findById(customerB._id)).not.toBeNull();

    const anonymous = await request(app).get('/customers');
    expect(anonymous.status).toBe(401);
  });

  test('keeps workspace settings per authenticated user', async () => {
    const fx = await tenantFixture();
    const app = appWith('/settings', settingsRoutes);
    const authA = { Authorization: `Bearer ${userToken(fx.userA)}` };
    const authB = { Authorization: `Bearer ${userToken(fx.userB)}` };

    const saved = await request(app)
      .put('/settings')
      .set(authA)
      .send({ settings: { tax: { defaultTaxRate: '7', enableTax: true, taxIncluded: false } } });
    expect(saved.status).toBe(200);

    const ownRead = await request(app).get('/settings').set(authA);
    expect(ownRead.status).toBe(200);
    expect(ownRead.body.settings.tax.defaultTaxRate).toBe('7');

    const otherRead = await request(app).get('/settings').set(authB);
    expect(otherRead.status).toBe(200);
    expect(otherRead.body.settings.tax.defaultTaxRate).not.toBe('7');

    // B's write must not change A's stored settings.
    await request(app)
      .put('/settings')
      .set(authB)
      .send({ settings: { tax: { defaultTaxRate: '3', enableTax: true, taxIncluded: false } } });
    const afterCrossWrite = await request(app).get('/settings').set(authA);
    expect(afterCrossWrite.body.settings.tax.defaultTaxRate).toBe('7');
  });

  test('scopes notifications and their read state to the owning user', async () => {
    const fx = await tenantFixture();
    const notifA = await Notification.create({ userId: fx.userA._id, type: 'system', title: `A-${uniq()}`, message: 'a', read: false });
    const notifB = await Notification.create({ userId: fx.userB._id, type: 'system', title: `B-${uniq()}`, message: 'b', read: false });
    const app = appWith('/notifications', notificationRoutes);
    const authA = { Authorization: `Bearer ${userToken(fx.userA)}` };

    const list = await request(app).get('/notifications').set(authA);
    expect(list.status).toBe(200);
    const ids = list.body.notifications.map((n) => String(n._id));
    expect(ids).toEqual([String(notifA._id)]);
    expect(list.body.unreadCount).toBe(1);
    expect(JSON.stringify(list.body)).not.toContain(notifB.title);

    const crossRead = await request(app).put(`/notifications/${notifB._id}/read`).set(authA);
    expect(crossRead.status).toBe(404);
    expect((await Notification.findById(notifB._id)).read).toBe(false);

    const ownRead = await request(app).put(`/notifications/${notifA._id}/read`).set(authA);
    expect(ownRead.status).toBe(200);
    expect((await Notification.findById(notifA._id)).read).toBe(true);
  });

  test('aggregates the dashboard only from the authenticated owner sales', async () => {
    const fx = await tenantFixture();
    await Sale.create({
      invoiceNumber: `INV-DASH-A-${uniq()}`,
      items: [{ productName: 'A', quantity: 1, price: 10, total: 10 }],
      subtotal: 10, total: 10, paymentMethod: 'cash',
      createdBy: fx.userA._id, source: 'pos', paymentStatus: 'paid', status: 'completed'
    });
    await Sale.create({
      invoiceNumber: `INV-DASH-B-${uniq()}`,
      items: [{ productName: 'B', quantity: 1, price: 999, total: 999 }],
      subtotal: 999, total: 999, paymentMethod: 'cash',
      createdBy: fx.userB._id, source: 'pos', paymentStatus: 'paid', status: 'completed'
    });
    const app = appWith('/dashboard', dashboardRoutes);
    const auth = { Authorization: `Bearer ${userToken(fx.userA)}` };

    const overview = await request(app).get('/dashboard/overview?dateRange=day').set(auth);
    expect(overview.status).toBe(200);
    expect(overview.body.data.sales.totalRevenue).toBe(10);
    expect(overview.body.data.sales.totalSales).toBe(1);
  });

  test('requires super admin for platform-wide billing and business approval', async () => {
    const fx = await tenantFixture();
    const app = express();
    app.use(express.json());
    app.use('/billing', billingRoutes);
    app.use('/business', businessRoutes);
    const authBiz = { Authorization: `Bearer ${userToken(fx.userA)}` };
    const authSuper = { Authorization: `Bearer ${userToken(fx.superAdmin)}` };

    const billing = await request(app).get('/billing/all').set(authBiz);
    expect(billing.status).toBe(403);
    expect(JSON.stringify(billing.body)).not.toContain('invoice');

    const billingSuper = await request(app).get('/billing/all').set(authSuper);
    expect(billingSuper.status).toBe(200);

    const pending = await request(app).get('/business/pending').set(authBiz);
    expect(pending.status).toBe(403);
    const pendingSuper = await request(app).get('/business/pending').set(authSuper);
    expect(pendingSuper.status).toBe(200);
  });

  test('enforces business ownership on profile updates', async () => {
    const fx = await tenantFixture();
    const app = appWith('/business', businessRoutes);
    const authA = { Authorization: `Bearer ${userToken(fx.userA)}` };
    const authB = { Authorization: `Bearer ${userToken(fx.userB)}` };

    const foreign = await request(app)
      .put(`/business/${fx.businessB._id}`)
      .set(authA)
      .send({ name: 'Hijacked business' });
    expect(foreign.status).toBe(403);
    expect((await Business.findById(fx.businessB._id)).name).toBe(fx.businessB.name);

    const own = await request(app)
      .put(`/business/${fx.businessA._id}`)
      .set(authA)
      .send({ name: 'Own renamed business' });
    expect(own.status).toBe(200);
    expect((await Business.findById(fx.businessA._id)).name).toBe('Own renamed business');

    const anonymous = await request(app).put(`/business/${fx.businessB._id}`).send({ name: 'x' });
    expect(anonymous.status).toBe(401);

    // A foreign owner cannot claim another business through the owner endpoint either.
    const claimByB = await request(app)
      .put(`/business/${fx.businessA._id}`)
      .set(authB)
      .send({ name: 'B claims A' });
    expect(claimByB.status).toBe(403);
    expect((await Business.findById(fx.businessA._id)).name).toBe('Own renamed business');
  });

  test('keeps the public catalog surface to published products of public businesses', async () => {
    const fx = await tenantFixture();
    const publicBusiness = fx.businessA;
    const privateBusiness = await makeBusiness('inv-priv', fx.userB, { isPublic: false, status: 'active' });
    const published = await makeProduct('cat-pub', fx.userA, publicBusiness, { isPublished: true });
    const unpublished = await makeProduct('cat-unpub', fx.userA, publicBusiness, { isPublished: false });
    const privateProduct = await makeProduct('cat-priv', fx.userB, privateBusiness, { isPublished: true });
    const app = appWith('/catalog', catalogRoutes);

    const catalog = await request(app).get(`/catalog/business/${publicBusiness._id}/products`);
    expect(catalog.status).toBe(200);
    const names = catalog.body.data.products.map((p) => p.name);
    expect(names).toContain(published.name);
    expect(names).not.toContain(unpublished.name);
    expect(names).not.toContain(privateProduct.name);

    // The public projection must not carry owner cost or ownership identifiers.
    const payload = JSON.stringify(catalog.body);
    expect(payload).not.toContain('purchasePrice');
    expect(payload).not.toContain(String(fx.userA._id));

    // A non-public business is not discoverable at all.
    const privateCatalog = await request(app).get(`/catalog/business/${privateBusiness._id}/products`);
    expect(privateCatalog.status).toBe(404);
    expect(JSON.stringify(privateCatalog.body)).not.toContain(privateProduct.name);
  });
});
