const crypto = require('crypto');

/**
 * AES-256-GCM field-level encryption for PII at rest.
 *
 * Key: PII_ENCRYPTION_KEY — a 32-byte secret, supplied either as 64 hex chars
 * or base64. When the key is unset the helpers pass through plaintext so local
 * dev and CI keep working; production should always set it (server.js logs a
 * startup warning when it is missing).
 *
 * Encrypted values carry the `enc:v1:` prefix so they are self-describing and
 * can coexist with legacy plaintext rows during a gradual migration — old rows
 * read back as plaintext, new writes are encrypted.
 */
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // GCM recommended IV size
const PREFIX = 'enc:v1:';

function getKey() {
  const raw = process.env.PII_ENCRYPTION_KEY;
  if (!raw) return null;
  let key = /^[0-9a-fA-F]{64}$/.test(raw) ? Buffer.from(raw, 'hex') : Buffer.from(raw, 'base64');
  if (key.length !== 32) {
    throw new Error('PII_ENCRYPTION_KEY must decode to 32 bytes (64 hex chars or base64)');
  }
  return key;
}

const isEncrypted = (value) => typeof value === 'string' && value.startsWith(PREFIX);

/**
 * Encrypt a value. Passthrough for empty values, already-encrypted values, and
 * when no key is configured. AES-256-GCM is non-deterministic (random IV), so
 * encrypted fields are NOT searchable — fields used as query keys must stay
 * plaintext or use a separate hash.
 */
function encrypt(plaintext) {
  if (plaintext == null || plaintext === '' || isEncrypted(plaintext)) return plaintext;
  const key = getKey();
  if (!key) return plaintext; // encryption disabled
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const data = Buffer.concat([cipher.update(String(plaintext), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${PREFIX}${iv.toString('base64')}:${tag.toString('base64')}:${data.toString('base64')}`;
}

/**
 * Decrypt a value. Passthrough for plaintext/legacy values and when no key is
 * configured. Tampered or undecryptable values are returned as-is rather than
 * crashing a request.
 */
function decrypt(value) {
  if (value == null || value === '' || !isEncrypted(value)) return value;
  const key = getKey();
  if (!key) return value;
  try {
    const body = value.slice(PREFIX.length);
    const [ivB64, tagB64, dataB64] = body.split(':');
    const decipher = crypto.createDecipheriv(ALGORITHM, key, Buffer.from(ivB64, 'base64'));
    decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
    const decrypted = Buffer.concat([decipher.update(Buffer.from(dataB64, 'base64')), decipher.final()]);
    return decrypted.toString('utf8');
  } catch {
    return value; // undecryptable — return as-is
  }
}

/**
 * Decrypt named fields on a plain (`.lean()`) document in place. Supports
 * nested paths, e.g. decryptFields(doc, ['shippingAddress.street']).
 * `.lean()` bypasses Mongoose getters, so routes that read docs with `.lean()`
 * must call this before exposing PII fields.
 */
function decryptFields(doc, fields = []) {
  if (!doc || typeof doc !== 'object') return doc;
  for (const field of fields) {
    const parts = field.split('.');
    let cur = doc;
    let i = 0;
    for (; i < parts.length - 1; i++) {
      if (cur[parts[i]] == null) break;
      cur = cur[parts[i]];
    }
    if (i !== parts.length - 1) continue; // path missing — nothing to decrypt
    const leaf = parts[parts.length - 1];
    if (cur && typeof cur === 'object' && cur[leaf] !== undefined) {
      cur[leaf] = decrypt(cur[leaf]);
    }
  }
  return doc;
}

module.exports = { encrypt, decrypt, decryptFields, isEncrypted, encryptionEnabled: () => !!getKey() };
