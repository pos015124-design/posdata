const { encrypt, decrypt, decryptFields, isEncrypted, encryptionEnabled } = require('../utils/fieldEncryption');

// A fixed 32-byte key (64 hex chars) for deterministic tests.
const TEST_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

describe('fieldEncryption (AES-256-GCM PII at rest)', () => {
  const originalKey = process.env.PII_ENCRYPTION_KEY;

  afterEach(() => {
    // Restore whatever key was set before the suite ran
    if (originalKey === undefined) delete process.env.PII_ENCRYPTION_KEY;
    else process.env.PII_ENCRYPTION_KEY = originalKey;
  });

  describe('with a key configured', () => {
    beforeEach(() => { process.env.PII_ENCRYPTION_KEY = TEST_KEY; });

    it('encrypts and decrypts a value round-trip', () => {
      const plain = '+255 712 345 678';
      const cipher = encrypt(plain);
      expect(cipher).not.toBe(plain);
      expect(cipher.startsWith('enc:v1:')).toBe(true);
      expect(decrypt(cipher)).toBe(plain);
    });

    it('is non-deterministic (random IV per encryption)', () => {
      expect(encrypt('same value')).not.toBe(encrypt('same value'));
    });

    it('never double-encrypts an already-encrypted value', () => {
      const cipher = encrypt('value');
      expect(encrypt(cipher)).toBe(cipher);
    });

    it('passes through empty and null values', () => {
      expect(encrypt('')).toBe('');
      expect(encrypt(null)).toBeNull();
      expect(decrypt('')).toBe('');
      expect(decrypt(null)).toBeNull();
    });

    it('returns legacy plaintext as-is on decrypt', () => {
      expect(decrypt('legacy-plaintext')).toBe('legacy-plaintext');
    });

    it('returns tampered ciphertext as-is instead of throwing', () => {
      const bad = `enc:v1:${Buffer.from('x'.repeat(12)).toString('base64')}:AA:AA`;
      expect(decrypt(bad)).toBe(bad);
    });

    it('decrypts nested fields on lean docs in place', () => {
      const doc = {
        customerPhone: encrypt('12345'),
        shippingAddress: { street: encrypt('123 Main St'), city: encrypt('Dar es Salaam') }
      };
      decryptFields(doc, ['customerPhone', 'shippingAddress.street', 'shippingAddress.city']);
      expect(doc.customerPhone).toBe('12345');
      expect(doc.shippingAddress.street).toBe('123 Main St');
      expect(doc.shippingAddress.city).toBe('Dar es Salaam');
      // untouched fields stay as-is
      const untouched = { other: 'x' };
      decryptFields(untouched, ['customerPhone']);
      expect(untouched.other).toBe('x');
    });

    it('reports encryption as enabled', () => {
      expect(encryptionEnabled()).toBe(true);
      expect(isEncrypted('enc:v1:abc')).toBe(true);
      expect(isEncrypted('plain')).toBe(false);
    });
  });

  describe('without a key configured', () => {
    beforeEach(() => { delete process.env.PII_ENCRYPTION_KEY; });

    it('passes through plaintext (dev/CI mode)', () => {
      expect(encrypt('value')).toBe('value');
      expect(decrypt('value')).toBe('value');
      expect(encryptionEnabled()).toBe(false);
    });
  });
});
