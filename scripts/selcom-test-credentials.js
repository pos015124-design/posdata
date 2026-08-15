#!/usr/bin/env node
/**
 * Selcom credential diagnostic — isolates "is it the credentials?" from the
 * checkout flow. Signs a minimal create-order-minimal request exactly like
 * selcomService does and prints Selcom's RAW response so you can see whether
 * the failure is the API user, the vendor, the IP whitelist, or the HMAC.
 *
 * Usage (run on the VPS where server/.env has the real values):
 *   node scripts/selcom-test-credentials.js
 *
 * What each error means:
 *   "API User not found"  → SELCOM_API_KEY is wrong, OR it doesn't belong to
 *                           the vendor in SELCOM_VENDOR (they must be a pair).
 *   "vendor not found"    → SELCOM_VENDOR is wrong / doesn't match the API user.
 *   "IP not whitelisted"  → VPS outbound IP != 158.220.119.30 (or Selcom's
 *                           whitelist entry for this API user is different).
 *   "signature"/"digest"  → SELCOM_API_SECRET is wrong.
 *
 * NOTE: Selcom has no test mode — a SUCCESS here creates a real (unpaid)
 * collection order in their system. Use a tiny amount. That's the same call
 * the storefront checkout already makes, so this is no more harmful than one
 * real checkout attempt.
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', 'server', '.env') });

const axios = require('axios');
const { generateSelcomHeaders } = require('../server/utils/selcomHelper');

const BASE = (process.env.SELCOM_BASE_URL || 'https://apigw.selcommobile.com/v1')
  .replace(/\/+$/, '')
  .replace(/\/v1$/i, '');

function endpoint(p) {
  const clean = String(p || '').replace(/^\/+/, '');
  return `${BASE}/${clean.startsWith('v1/') || clean === 'v1' ? clean : `v1/${clean}`}`;
}

async function main() {
  const key = process.env.SELCOM_API_KEY;
  const secret = process.env.SELCOM_API_SECRET;
  const vendor = process.env.SELCOM_VENDOR;

  console.log('SELCOM_BASE_URL :', process.env.SELCOM_BASE_URL || '(default)');
  console.log('SELCOM_VENDOR   :', vendor ? `${vendor.slice(0, 4)}...${vendor.slice(-3)} (len ${vendor.length})` : '❌ NOT SET');
  console.log('SELCOM_API_KEY  :', key ? `set (len ${key.length})` : '❌ NOT SET');
  console.log('SELCOM_API_SECRET:', secret ? `set (len ${secret.length})` : '❌ NOT SET');
  console.log('');

  if (!key || !secret || !vendor) {
    console.error('❌ One or more Selcom env vars are missing in server/.env.');
    process.exit(1);
  }

  const orderId = `DIAG-${Date.now().toString(36).toUpperCase()}`;
  const amount = 100; // 100 TZS — smallest realistic order
  const payload = {
    vendor,
    order_id: orderId,
    buyer_email: 'diag@bhabygroup.co.tz',
    buyer_name: 'Credential Test',
    buyer_phone: '255700000000',
    amount,
    currency: 'TZS',
    no_of_items: 1,
    redirect_url: Buffer.from('https://e-shop.bhabygroup.co.tz/cart').toString('base64'),
    cancel_url: Buffer.from('https://e-shop.bhabygroup.co.tz/cart').toString('base64'),
    webhook: Buffer.from(process.env.SELCOM_CALLBACK_URL || 'https://e-shop.bhabygroup.co.tz/api/public/payments/selcom/callback').toString('base64')
  };

  const url = endpoint('checkout/create-order-minimal');
  console.log('POST', url);
  console.log('Authorization:', generateSelcomHeaders(payload).Authorization.slice(0, 40) + '...');
  console.log('');

  try {
    const res = await axios.post(url, payload, {
      headers: generateSelcomHeaders(payload),
      timeout: 20000
    });
    console.log('✅ HTTP', res.status);
    console.log(JSON.stringify(res.data, null, 2));
    if (String(res.data?.result || '').toUpperCase() === 'SUCCESS' || String(res.data?.resultcode || '') === '000') {
      console.log('\n✅ Credentials OK — order created (unpaid). This confirms API user + vendor + IP + HMAC are all valid.');
    }
  } catch (err) {
    const status = err?.response?.status;
    const data = err?.response?.data;
    console.log('❌ HTTP', status || 'no response');
    if (data) {
      console.log(JSON.stringify(data, null, 2));
      const msg = data.message || data.error || '';
      if (/api user not found/i.test(msg)) {
        console.log('\n🔑 This is a CREDENTIAL mismatch: SELCOM_API_KEY (or its pairing with SELCOM_VENDOR) is wrong.');
        console.log('   → Re-check the exact API user / access key and vendor code from your Selcom email.');
        console.log('   → They are issued as a PAIR — the key belongs to ONE vendor. Swap vendor code if needed.');
      } else if (/vendor/i.test(msg)) {
        console.log('\n🏪 SELCOM_VENDOR looks wrong or does not belong to this API user.');
      } else if (/ip|whitelist/i.test(msg)) {
        console.log('\n🌐 IP whitelist problem — your VPS outbound IP must be exactly what Selcom whitelisted.');
      } else if (/digest|signature|hmac|timestamp/i.test(msg)) {
        console.log('\n🔐 HMAC/signature problem — SELCOM_API_SECRET is wrong (or payload order changed).');
      }
    } else {
      console.log('No response body — check network / DNS / firewall:', err.message);
    }
  }
}

main().catch((e) => {
  console.error('Failed:', e.message);
  process.exit(1);
});
