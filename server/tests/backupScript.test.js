/**
 * Backup Script Tests
 * Verifies archive encryption round-trip (openssl AES-256-CBC) and listing.
 */

process.env.BACKUP_ENCRYPTION_KEY = 'test-backup-encryption-key-1234567890';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { DatabaseBackup } = require('../scripts/backup-database');

describe('DatabaseBackup encryption', () => {
  let backup;
  let tempDir;

  beforeAll(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'backup-test-'));
    process.env.BACKUP_DIR = tempDir;
    backup = new DatabaseBackup();
  });

  afterAll(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
    delete process.env.BACKUP_ENCRYPTION_KEY;
  });

  test('encryptArchive produces a .enc file and removes the plaintext', async () => {
    const gzPath = path.join(tempDir, 'test.gz');
    fs.writeFileSync(gzPath, 'fake mongodump archive content');

    const encPath = `${gzPath}.enc`;
    const result = await backup.encryptArchive(gzPath, encPath);

    expect(result.encrypted).toBe(true);
    expect(fs.existsSync(encPath)).toBe(true);
    expect(fs.existsSync(gzPath)).toBe(false);
    // Ciphertext must not contain the plaintext
    expect(fs.readFileSync(encPath, 'utf8')).not.toContain('fake mongodump');
  });

  test('decryptArchive restores the original content', async () => {
    const original = 'fake mongodump archive content';
    const gzPath = path.join(tempDir, 'roundtrip.gz');
    const encPath = `${gzPath}.enc`;
    fs.writeFileSync(gzPath, original);

    await backup.encryptArchive(gzPath, encPath);

    const restoredPath = path.join(tempDir, 'roundtrip-restored.gz');
    await backup.decryptArchive(encPath, restoredPath);

    expect(fs.readFileSync(restoredPath, 'utf8')).toBe(original);
  });

  test('resolveBackupFile handles .gz.enc and bare names', async () => {
    const gzPath = path.join(tempDir, 'dukani-backup-2026-08-17.gz');
    fs.writeFileSync(gzPath, 'x');
    await backup.encryptArchive(gzPath, `${gzPath}.enc`);
    fs.writeFileSync(path.join(tempDir, 'dukani-backup-2026-08-17.json'), JSON.stringify({ name: 'dukani-backup-2026-08-17', encrypted: true }));

    const byEnc = await backup.resolveBackupFile('dukani-backup-2026-08-17.gz.enc');
    expect(byEnc).not.toBeNull();
    expect(byEnc.encrypted).toBe(true);

    const byBare = await backup.resolveBackupFile('dukani-backup-2026-08-17');
    expect(byBare).not.toBeNull();
    expect(byBare.encrypted).toBe(true);
  });

  test('listBackups returns created backups with metadata', async () => {
    fs.writeFileSync(path.join(tempDir, 'dukani-backup-2026-08-16.gz'), 'x');
    fs.writeFileSync(path.join(tempDir, 'dukani-backup-2026-08-16.json'), JSON.stringify({ name: 'dukani-backup-2026-08-16', encrypted: false }));

    const backups = await backup.listBackups();
    expect(backups.some((b) => b.name === 'dukani-backup-2026-08-16')).toBe(true);
  });
});
