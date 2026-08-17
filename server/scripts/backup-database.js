/**
 * Database Backup Script
 * Creates compressed, optionally encrypted MongoDB backups with off-site copy.
 *
 * Usage:
 *   node backup-database.js create              — create a backup
 *   node backup-database.js list                — list backups
 *   node backup-database.js verify <name>       — verify a backup with mongorestore --dryRun
 *   node backup-database.js restore <name>      — restore a backup (--drop)
 *   node backup-database.js cleanup [days]      — delete backups older than N days (default 7)
 *   node backup-database.js push <name>         — copy a backup to off-site storage
 *
 * Env vars:
 *   DATABASE_URL              — MongoDB connection string (required)
 *   DB_NAME                   — database name (default 'dukani')
 *   BACKUP_DIR                — backup directory (default server/backups)
 *   BACKUP_ENCRYPTION_KEY     — if set, archives are encrypted with AES-256-CBC (openssl -pbkdf2)
 *   BACKUP_S3_BUCKET          — if set with AWS credentials, `push` uses `aws s3 cp`
 *   BACKUP_RCLONE_REMOTE      — if set, `push` uses `rclone copy` (e.g. "s3:bucket/path")
 */

require('dotenv').config();
const { execFile } = require('child_process');
const fs = require('fs');
const path = require('path');
const { logger } = require('../config/logger');

const DATABASE_URL = process.env.DATABASE_URL;
const DB_NAME = process.env.DB_NAME || 'dukani';
const ENCRYPTION_KEY = process.env.BACKUP_ENCRYPTION_KEY;
const S3_BUCKET = process.env.BACKUP_S3_BUCKET;
const RCLONE_REMOTE = process.env.BACKUP_RCLONE_REMOTE;

if (!DATABASE_URL) {
  console.error('DATABASE_URL is required (set it in server/.env)');
  process.exit(1);
}
if (ENCRYPTION_KEY && ENCRYPTION_KEY.length < 16) {
  console.error('BACKUP_ENCRYPTION_KEY must be at least 16 characters');
  process.exit(1);
}

/** Run a command with an args array (no shell interpolation → no injection). */
function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    logger.info('Running command', { cmd, args });
    execFile(cmd, args, { maxBuffer: 1024 * 1024 * 64, ...opts }, (error, stdout, stderr) => {
      if (error) {
        logger.error('Command failed', { cmd, args, stderr: stderr || error.message });
        reject(new Error(`${cmd} failed: ${(stderr || error.message).slice(0, 500)}`));
        return;
      }
      resolve({ stdout, stderr });
    });
  });
}

class DatabaseBackup {
  constructor() {
    this.backupDir = process.env.BACKUP_DIR || path.join(__dirname, '..', 'backups');
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }
  }

  /** Archive filename (without .enc) + absolute path for a new backup. */
  buildBackupName() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    return { name: `${DB_NAME}-backup-${timestamp}`, path: path.join(this.backupDir, `${DB_NAME}-backup-${timestamp}`) };
  }

  /** Encrypt a .gz archive in place: file.gz → file.gz.enc (openssl AES-256-CBC). */
  async encryptArchive(gzPath, encPath) {
    if (!ENCRYPTION_KEY) return { encrypted: false, path: gzPath };
    await run('openssl', [
      'enc', '-aes-256-cbc', '-salt', '-pbkdf2', '-iter', '100000',
      '-pass', `env:BACKUP_ENCRYPTION_KEY`,
      '-in', gzPath, '-out', encPath
    ], { env: { ...process.env } });
    fs.unlinkSync(gzPath);
    return { encrypted: true, path: encPath };
  }

  /** Decrypt a .enc archive back to a .gz file (used by restore/verify). */
  async decryptArchive(encPath, gzPath) {
    await run('openssl', [
      'enc', '-d', '-aes-256-cbc', '-pbkdf2', '-iter', '100000',
      '-pass', `env:BACKUP_ENCRYPTION_KEY`,
      '-in', encPath, '-out', gzPath
    ], { env: { ...process.env } });
    return gzPath;
  }

  /**
   * Create a backup: mongodump --archive --gzip, optional encryption,
   * optional immediate off-site push, and a JSON sidecar summary.
   */
  async createBackup() {
    const { name, path: archivePath } = this.buildBackupName();
    const gzPath = `${archivePath}.gz`;

    logger.info('Starting database backup', { name });

    // Archive mode writes a single gzip-compressed file (atomic, restorable)
    await run('mongodump', [
      '--uri', DATABASE_URL,
      '--archive', gzPath,
      '--gzip',
      '--db', DB_NAME
    ]);

    const { encrypted, path: finalPath } = await this.encryptArchive(gzPath, `${gzPath}.enc`);

    const size = fs.statSync(finalPath).size;
    await this.writeSummary(name, {
      name,
      timestamp: new Date().toISOString(),
      database: DB_NAME,
      environment: process.env.NODE_ENV || 'development',
      encrypted: !!encrypted,
      sizeBytes: size,
      fileName: path.basename(finalPath)
    });

    logger.info('Backup created', { name, encrypted, sizeBytes: size });

    // Optional: push immediately when off-site storage is configured
    if (S3_BUCKET || RCLONE_REMOTE) {
      await this.pushBackup(name);
    }

    return { name, path: finalPath, encrypted, sizeBytes: size };
  }

  async writeSummary(name, summary) {
    fs.writeFileSync(path.join(this.backupDir, `${name}.json`), JSON.stringify(summary, null, 2));
  }

  async readSummary(name) {
    const summaryPath = path.join(this.backupDir, `${name}.json`);
    if (fs.existsSync(summaryPath)) {
      return JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
    }
    return null;
  }

  /** Verify a backup with mongorestore --dryRun (decrypts first if needed). */
  async verifyBackup(name) {
    const info = await this.resolveBackupFile(name);
    if (!info) throw new Error(`Backup ${name} does not exist`);

    const fileToCheck = await this.prepareForRestore(info);
    try {
      await run('mongorestore', [
        '--uri', DATABASE_URL,
        '--archive', fileToCheck,
        '--gzip',
        '--dryRun'
      ]);
      logger.info('Backup verified OK', { name });
      return { name, valid: true };
    } finally {
      this.cleanupTemp(fileToCheck, info);
    }
  }

  /** Restore a backup (drops existing data in the target DB). */
  async restoreBackup(name) {
    const info = await this.resolveBackupFile(name);
    if (!info) throw new Error(`Backup ${name} does not exist`);

    const fileToRestore = await this.prepareForRestore(info);
    try {
      await run('mongorestore', [
        '--uri', DATABASE_URL,
        '--archive', fileToRestore,
        '--gzip',
        '--drop'
      ]);
      logger.info('Backup restored', { name });
      return { name, restored: true };
    } finally {
      this.cleanupTemp(fileToRestore, info);
    }
  }

  /** Copy a backup to off-site storage (S3 via aws cli, or rclone). */
  async pushBackup(name) {
    const info = await this.resolveBackupFile(name);
    if (!info) throw new Error(`Backup ${name} does not exist`);

    const file = path.join(this.backupDir, info.fileName);
    if (S3_BUCKET) {
      const dest = `${S3_BUCKET}/${info.fileName}`;
      await run('aws', ['s3', 'cp', file, dest]);
      logger.info('Backup pushed to S3', { name, dest });
      return { name, pushed: true, destination: dest };
    }
    if (RCLONE_REMOTE) {
      const dest = `${RCLONE_REMOTE.replace(/\/$/, '')}/${info.fileName}`;
      await run('rclone', ['copy', file, dest]);
      logger.info('Backup pushed via rclone', { name, dest });
      return { name, pushed: true, destination: dest };
    }
    throw new Error('No off-site storage configured (set BACKUP_S3_BUCKET or BACKUP_RCLONE_REMOTE)');
  }

  /**
   * Resolve a backup name to its archive file, handling .gz / .gz.enc / bare
   * name inputs (e.g. "dukani-backup-2026-08-17" or "dukani-backup-...gz.enc").
   */
  async resolveBackupFile(name) {
    const candidates = [
      path.join(this.backupDir, name),
      path.join(this.backupDir, `${name}.gz`),
      path.join(this.backupDir, `${name}.gz.enc`)
    ];
    const existing = candidates.find((c) => fs.existsSync(c));
    if (!existing) return null;
    const summary = await this.readSummary(name.replace(/\.gz(\.enc)?$/, ''));
    return { path: existing, encrypted: existing.endsWith('.enc'), summary };
  }

  /** Return the .gz file to feed mongorestore, decrypting to a temp file if needed. */
  async prepareForRestore(info) {
    if (!info.encrypted) return info.path;
    const gzTemp = `${info.path}.tmp.gz`;
    await this.decryptArchive(info.path, gzTemp);
    return gzTemp;
  }

  cleanupTemp(file, info) {
    // Only remove temp decrypted files, never the real archive
    if (info && info.encrypted && file.endsWith('.tmp.gz') && fs.existsSync(file)) {
      fs.unlinkSync(file);
    }
  }

  async listBackups() {
    const files = fs.readdirSync(this.backupDir);
    const backups = [];

    for (const file of files) {
      if (!file.endsWith('.json') && !file.endsWith('.tmp.gz')) {
        const name = file.replace(/\.gz(\.enc)?$/, '');
        if (backups.some((b) => b.name === name)) continue;
        const summary = await this.readSummary(name);
        const stat = fs.statSync(path.join(this.backupDir, file));
        backups.push({
          name,
          fileName: file,
          sizeBytes: stat.size,
          createdAt: stat.birthtime,
          encrypted: summary ? summary.encrypted : file.endsWith('.enc'),
          summary
        });
      }
    }

    return backups.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  async cleanupOldBackups(keepDays = 7) {
    const backups = await this.listBackups();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - keepDays);

    const oldBackups = backups.filter((backup) => new Date(backup.createdAt) < cutoffDate);

    for (const backup of oldBackups) {
      for (const suffix of ['', '.gz', '.gz.enc', '.json']) {
        const candidate = path.join(this.backupDir, `${backup.name}${suffix}`);
        if (fs.existsSync(candidate)) fs.rmSync(candidate);
      }
      logger.info('Old backup deleted', { backup: backup.name });
    }

    logger.info('Backup cleanup completed', { deleted: oldBackups.length, kept: backups.length - oldBackups.length });
  }
}

// CLI interface
async function main() {
  const backup = new DatabaseBackup();
  const args = process.argv.slice(2);
  const command = args[0];

  try {
    if (command === 'create') {
      const result = await backup.createBackup();
      console.log(`Backup created: ${result.name}${result.encrypted ? ' (encrypted)' : ''} (${result.sizeBytes} bytes)`);
    } else if (command === 'list') {
      const backups = await backup.listBackups();
      console.log('Available backups:');
      backups.forEach((b) => {
        console.log(`- ${b.name} (${b.createdAt}) ${b.encrypted ? '[encrypted]' : ''} ${b.sizeBytes} bytes`);
      });
      if (backups.length === 0) console.log('  (none)');
    } else if (command === 'verify') {
      const name = args[1];
      if (!name) {
        console.error('Usage: node backup-database.js verify <backup_name>');
        process.exit(1);
      }
      await backup.verifyBackup(name);
      console.log('Backup verified OK');
    } else if (command === 'restore') {
      const name = args[1];
      if (!name) {
        console.error('Usage: node backup-database.js restore <backup_name>');
        process.exit(1);
      }
      await backup.restoreBackup(name);
      console.log('Restore completed successfully');
    } else if (command === 'push') {
      const name = args[1];
      if (!name) {
        console.error('Usage: node backup-database.js push <backup_name>');
        process.exit(1);
      }
      const result = await backup.pushBackup(name);
      console.log(`Backup pushed to ${result.destination}`);
    } else if (command === 'cleanup') {
      const keepDays = parseInt(args[1]) || 7;
      await backup.cleanupOldBackups(keepDays);
      console.log('Backup cleanup completed');
    } else {
      console.log('Usage:');
      console.log('  node backup-database.js create                  - Create a new backup');
      console.log('  node backup-database.js list                    - List all backups');
      console.log('  node backup-database.js verify <backup_name>    - Verify a backup (dry run)');
      console.log('  node backup-database.js restore <backup_name>   - Restore a backup');
      console.log('  node backup-database.js push <backup_name>      - Copy to off-site storage');
      console.log('  node backup-database.js cleanup [days]          - Clean up old backups (default: 7)');
    }
  } catch (error) {
    console.error('Backup operation failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error('Backup script failed:', error);
    process.exit(1);
  });
}

module.exports = { DatabaseBackup, run };
