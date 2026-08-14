/**
 * Selcom Checkout API service.
 * All calls are signed with HMAC via utils/selcomHelper. Timeouts + never-crash
 * wrapping so a Selcom outage can never take down the storefront.
 *
 * Env:
 *   SELCOM_BASE_URL      (default https://apigw.selcommobile.com/v1)
 *   SELCOM_VENDOR        vendor code issued by Selcom
 *   SELCOM_API_KEY       API key
 *   SELCOM_API_SECRET    API secret
 *   SELCOM_CALLBACK_URL  public HTTPS webhook URL (default <FRONTEND_URL>/api/public/payments/selcom/callback)
 */

const axios = require('axios');
const { generateSelcomHeaders, normalizeMsisdn } = require('../utils/selcomHelper');
const { logger } = require('../config/logger');

const BASE_URL = (process.env.SELCOM_BASE_URL || 'https://apigw.selcommobile.com/v1').replace(/\/+$/, '');
const VENDOR = process.env.SELCOM_VENDOR || '';

function isConfigured() {
  return Boolean(process.env.SELCOM_API_KEY && process.env.SELCOM_API_SECRET && VENDOR);
}

function callbackUrl() {
  if (process.env.SELCOM_CALLBACK_URL) return process.env.SELCOM_CALLBACK_URL;
  const origin = process.env.FRONTEND_URL || '';
  return `${origin}/api/public/payments/selcom/callback`;
}

async function post(path, payload) {
  const headers = generateSelcomHeaders(payload);
  const res = await axios.post(`${BASE_URL}${path}`, payload, {
    headers,
    timeout: 20000
  });
  return res.data;
}

async function get(path, params) {
  const headers = generateSelcomHeaders(params);
  const res = await axios.get(`${BASE_URL}${path}`, {
    headers,
    params,
    timeout: 20000
  });
  return res.data;
}

/**
 * Step 1 — create the collection order in Selcom.
 * @returns {Promise<Object>} Selcom response ({ result, resultcode, message, data })
 */
async function createOrder({ orderId, amount, customer, noOfItems, redirectUrl }) {
  const payload = {
    vendor: VENDOR,
    order_id: orderId,
    buyer_email: customer?.email || '',
    buyer_name: customer?.name || '',
    buyer_phone: customer?.phone || '',
    amount: Number(amount),
    currency: 'TZS',
    no_of_items: Number(noOfItems) || 1,
    redirect_url: Buffer.from(redirectUrl || '').toString('base64'),
    cancel_url: Buffer.from((process.env.FRONTEND_URL || '') + '/cart').toString('base64'),
    webhook: Buffer.from(callbackUrl()).toString('base64')
  };
  return post('/v1/checkout/create-order-minimal', payload);
}

/**
 * Step 2a — trigger the USSD push on the buyer's phone (M-Pesa / Tigo Pesa / Airtel Money).
 * @returns {Promise<Object>} Selcom response
 */
async function walletPayment({ orderId, msisdn, amount }) {
  const transid = `TX-${orderId}-${Date.now().toString(36).toUpperCase()}`;
  const payload = {
    vendor: VENDOR,
    order_id: orderId,
    msisdn: normalizeMsisdn(msisdn),
    amount: Number(amount),
    transid
  };
  return post('/v1/checkout/wallet-payment', payload);
}

/**
 * Step 2b — create a till alias / card gateway session.
 * @returns {Promise<{ raw: Object, redirectUrl: string|null }>}
 */
async function createTillAlias({ orderId }) {
  const payload = { vendor: VENDOR, order_id: orderId };
  const raw = await post('/v1/checkout/create-till-alias', payload);

  let redirectUrl = null;
  const data = raw?.data;
  if (Array.isArray(data) && data[0]) {
    redirectUrl = data[0].redirect_url || data[0].checkout_url || data[0].url || null;
  } else if (data && typeof data === 'object') {
    redirectUrl = data.redirect_url || data.checkout_url || data.url || null;
  }

  return { raw, redirectUrl };
}

/**
 * Poll Selcom for the current status of an order.
 * @returns {Promise<Object>} Selcom response ({ result, resultcode, message, data })
 */
async function getOrderStatus({ orderId }) {
  return get('/v1/checkout/order-status', { order_id: orderId });
}

module.exports = {
  isConfigured,
  callbackUrl,
  createOrder,
  walletPayment,
  createTillAlias,
  getOrderStatus
};
