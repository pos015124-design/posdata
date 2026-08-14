#!/usr/bin/env node
/**
 * Smoke check for the in-app notification feed + notification preferences.
 * Run against a STAGING environment first — this reads/writes real data for the
 * token's user (marks notifications read, toggles prefs, then restores them).
 *
 * Usage:
 *   TOKEN=<jwt> node scripts/smoke-notifications.mjs
 *   TOKEN=<jwt> node scripts/smoke-notifications.mjs https://staging.example.com
 *
 * Manual follow-up checks (need real users — do these by hand in the UI):
 *   1. Register a new seller  → super-admin bell shows "New seller registration"
 *   2. Approve them           → their bell shows "Account approved" + they get an email
 *   3. Place a storefront order → seller bell shows "New order received" + email
 *   4. Set a product below its reorder point → one low-stock notification + email
 *   5. Toggle "Order Alerts" off in Settings → no new order notifications (bell or email)
 */

const base = (process.argv[2] || process.env.API_URL || 'http://localhost:3001').replace(/\/$/, '');
const token = process.env.TOKEN;

if (!token) {
  console.error('Set TOKEN=<jwt> (log in, then copy the accessToken).');
  process.exit(1);
}

let failed = false;

const call = async (path, options = {}) => {
  const res = await fetch(`${base}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.headers || {})
    }
  });
  let body = null;
  try { body = await res.json(); } catch { /* non-JSON */ }
  return { res, body };
};

const ok = (label, cond, detail = '') => {
  if (!cond) failed = true;
  console.log(`${cond ? '✓' : '✗'} ${label}${detail ? ` — ${detail}` : ''}`);
};

async function run() {
  console.log(`Notification smoke test against ${base}\n`);

  // 1. Unread count
  let r = await call('/api/notifications/unread-count');
  ok('GET /api/notifications/unread-count', r.res.ok && typeof r.body?.unreadCount === 'number', `status ${r.res.status}, unread=${r.body?.unreadCount}`);

  // 2. Feed list
  r = await call('/api/notifications?limit=5');
  const list = Array.isArray(r.body?.notifications) ? r.body.notifications : null;
  ok('GET /api/notifications?limit=5', r.res.ok && list !== null, `status ${r.res.status}, ${list ? list.length : 0} items`);

  // 3. Mark one read (if any unread exist)
  if (list && list.some(n => !n.read)) {
    const id = list.find(n => !n.read)._id;
    r = await call(`/api/notifications/${id}/read`, { method: 'PUT' });
    ok('PUT /api/notifications/:id/read', r.res.ok && r.body?.notification?.read === true, `status ${r.res.status}`);
  } else {
    console.log('— no unread notifications to mark read (fine)');
  }

  // 4. Read all
  r = await call('/api/notifications/read-all', { method: 'PUT' });
  ok('PUT /api/notifications/read-all', r.res.ok, `status ${r.res.status}`);

  // 5. Preferences round-trip (toggle off → verify → restore)
  r = await call('/api/auth/notification-prefs');
  const prefs = r.body?.notificationPrefs || {};
  ok('GET /api/auth/notification-prefs', r.res.ok && typeof prefs === 'object', `status ${r.res.status}`);

  const original = {
    email: prefs.email !== false,
    orders: prefs.orders !== false,
    lowStock: prefs.lowStock !== false,
    reports: prefs.reports === true
  };

  r = await call('/api/auth/notification-prefs', {
    method: 'PUT',
    body: JSON.stringify({ ...original, lowStock: !original.lowStock })
  });
  const saved = r.body?.notificationPrefs;
  ok('PUT /api/auth/notification-prefs (toggle lowStock)', r.res.ok && saved?.lowStock === !original.lowStock, `status ${r.res.status}, lowStock=${saved?.lowStock}`);

  r = await call('/api/auth/notification-prefs', { method: 'PUT', body: JSON.stringify(original) });
  ok('PUT /api/auth/notification-prefs (restore)', r.res.ok, `status ${r.res.status}`);

  console.log(failed ? '\nSome checks failed.' : '\nAll checks completed.');
  process.exit(failed ? 1 : 0);
}

run().catch(e => {
  console.error('Fatal:', e.message);
  process.exit(1);
});
