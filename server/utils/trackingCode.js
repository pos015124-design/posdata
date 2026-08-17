/**
 * Short customer-facing tracking codes — TRK-XXXXX.
 *
 * Invoice numbers (INV-<timestamp>-<random>) are long and awkward to type on
 * mobile. Buyers get a short code instead (e.g. TRK-89A2F) that the public
 * tracking endpoints accept alongside the full invoice number.
 *
 * Uses crypto.randomBytes (not Math.random) with an unambiguous alphabet
 * (no 0/O, 1/I/L) so codes are easy to read back over the phone.
 */

const crypto = require('crypto');

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generateTrackingCode() {
  // Fixed length — Mongoose invokes schema defaults with the document as an
  // argument, so we deliberately ignore any parameters.
  const LENGTH = 5;
  const bytes = crypto.randomBytes(LENGTH);
  let code = '';
  for (let i = 0; i < LENGTH; i++) {
    code += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return `TRK-${code}`;
}

/** Validate a user-supplied tracking code (used when looking up by code). */
function isTrackingCode(value) {
  return typeof value === 'string' && /^TRK-[A-HJ-NP-Z2-9]{4,8}$/.test(value);
}

module.exports = { generateTrackingCode, isTrackingCode };
