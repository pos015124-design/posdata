/**
 * Selcom API helper — HMAC signing + webhook verification.
 *
 * Signing follows Selcom's official reference client (selcompaytechltd/selcom-apigw-client-nodejs):
 *   signing string  = "timestamp=<ts>&key1=value1&key2=value2..."   (timestamp FIRST, keys in payload order)
 *   Digest          = Base64( HMAC_SHA256(signing string, API_SECRET) )
 *   Headers         = Authorization: SELCOM <Base64(API_KEY)>, Digest-Method: HS256,
 *                     Digest, Timestamp, Signed-Fields (payload keys in order)
 *
 * NOTE: payload key ORDER matters — the body and the signing string must use identical ordering.
 */

const crypto = require('crypto');

/** ISO 8601 timestamp, UTC, no milliseconds (matches Selcom's expected TZD format). */
function selcomTimestamp(date = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}` +
    `T${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())}Z`;
}

/**
 * Build the signing string for a payload.
 * @param {Object} payload - request body keys in the exact order they are sent
 * @param {string} timestamp - ISO 8601 timestamp
 */
function buildSigningString(payload, timestamp) {
  let data = `timestamp=${timestamp}`;
  for (const key of Object.keys(payload)) {
    const value = payload[key];
    data += `&${key}=${value === undefined || value === null ? '' : value}`;
  }
  return data;
}

/** Generate the full set of auth headers for a Selcom request. */
function generateSelcomHeaders(payload = {}) {
  const apiKey = process.env.SELCOM_API_KEY;
  const apiSecret = process.env.SELCOM_API_SECRET;
  if (!apiKey || !apiSecret) {
    throw new Error('SELCOM_API_KEY / SELCOM_API_SECRET are not configured');
  }

  const timestamp = selcomTimestamp();
  const signingString = buildSigningString(payload, timestamp);
  const digest = crypto.createHmac('sha256', apiSecret).update(signingString).digest('base64');

  return {
    'Content-Type': 'application/json',
    Authorization: `SELCOM ${Buffer.from(apiKey, 'ascii').toString('base64')}`,
    'Digest-Method': 'HS256',
    Digest: digest,
    Timestamp: timestamp,
    'Signed-Fields': Object.keys(payload).join(',')
  };
}

/**
 * Verify an inbound webhook's HMAC signature (headers signed by Selcom with our secret).
 * @param {Object} payload  - parsed JSON body of the callback
 * @param {Object} headers  - request headers (lowercase keys)
 * @returns {boolean} true when signature is valid or no signature was sent
 */
function verifyWebhookSignature(payload = {}, headers = {}) {
  const apiSecret = process.env.SELCOM_API_SECRET;
  if (!apiSecret) return true; // not configured — caller decides policy

  const timestamp = headers['timestamp'];
  const digest = headers['digest'];
  const signedFields = headers['signed-fields'];

  // No signature headers sent by Selcom — cannot verify. Let caller enforce strict mode.
  if (!timestamp || !digest || !signedFields) return null;

  const fields = String(signedFields).split(',').map((f) => f.trim()).filter(Boolean);
  const ordered = {};
  for (const f of fields) {
    if (Object.prototype.hasOwnProperty.call(payload, f)) ordered[f] = payload[f];
  }

  const signingString = buildSigningString(ordered, timestamp);
  const expected = crypto.createHmac('sha256', apiSecret).update(signingString).digest('base64');

  // Constant-time compare to avoid timing attacks.
  const a = Buffer.from(String(expected), 'base64');
  const b = Buffer.from(String(digest), 'base64');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

/** Normalize a phone number to international format (2557XXXXXXXX) for USSD push. */
function normalizeMsisdn(phone) {
  if (!phone) return '';
  let p = String(phone).replace(/[^\d+]/g, '');
  if (p.startsWith('+')) p = p.slice(1);
  if (p.startsWith('255')) return p;
  if (p.startsWith('0')) return `255${p.slice(1)}`;
  return p;
}

module.exports = {
  selcomTimestamp,
  buildSigningString,
  generateSelcomHeaders,
  verifyWebhookSignature,
  normalizeMsisdn
};
