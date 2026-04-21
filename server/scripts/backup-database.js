/**
 * Database Backup Script
 * Creates a backup of the MongoDB database
 */

require('dotenv').config();
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const { logger } = require('../config/logger');

const BACKUP_DIR = path.join(__dirname, '../backups');
const DATABASE_URL = process.env.DATABASE_URL;
const DB_NAME = process.env.DB_NAME || 'dukani';

class DatabaseBackup {
  constructor() {
    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }
  }

  async createBackup() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupName = `${DB_NAME}-backup-${timestamp}`;
    const backupPath = path.join(BACKUP_DIR, backupName);

    return new Promise((resolve, reject) => {
      const mongodumpCommand = `mongodump --uri="${DATABASE_URL}" --out="${backupPath}"`;

      logger.info('Starting database backup', { backupPath });

      exec(mongodumpCommand, (error, stdout, stderr) => {
        if (error) {
          logger.error('Database backup failed', { error: error.message, stderr });
          reject(new Error(`Backup failed: ${error.message}`));
          return;
        }

        logger.info('Database backup completed successfully', { backupPath, stdout });

        // Create a summary file
        this.createBackupSummary(backupPath, backupName);

        resolve(backupPath);
      });
    });
  }

  async createBackupSummary(backupPath, backupName) {
    const summary = {
      backupName,
      timestamp: new Date().toISOString(),
      database: DB_NAME,
      environment: process.env.NODE_ENV || 'development',
      size: await this.getDirectorySize(backupPath),
      collections: await this.getCollectionList(backupPath)
    };

    const summaryPath = path.join(backupPath, 'backup-summary.json');
    fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));

    logger.info('Backup summary created', { summaryPath });
  }

  async getDirectorySize(dirPath) {
    const files = await this.getFiles(dirPath);
    let totalSize = 0;

    for (const file of files) {
      const stats = fs.statSync(path.join(dirPath, file));
      totalSize += stats.size;
    }

    return totalSize;
  }

  async getFiles(dirPath) {
    const files = [];
    const items = fs.readdirSync(dirPath);

    for (const item of items) {
      const itemPath = path.join(dirPath, item);
      const stat = fs.statSync(itemPath);

      if (stat.isDirectory()) {
        const subFiles = await this.getFiles(itemPath);
        files.push(...subFiles.map(f => path.join(item, f)));
      } else {
        files.push(item);
      }
    }

    return files;
  }

  async getCollectionList(backupPath) {
    try {
      const dbDir = path.join(backupPath, DB_NAME);
      if (!fs.existsSync(dbDir)) {
        return [];
      }

      const collections = fs.readdirSync(dbDir);
      return collections.map(collection => {
        const stats = fs.statSync(path.join(dbDir, collection));
        return {
          name: collection.replace('.bson', ''),
          size: stats.size,
          type: collection.endsWith('.bson') ? 'data' : 'metadata'
        };
      });
    } catch (error) {
      logger.error('Failed to get collection list', { error: error.message });
      return [];
    }
  }

  async listBackups() {
    try {
      const files = fs.readdirSync(BACKUP_DIR);
      const backups = [];

      for (const file of files) {
        const filePath = path.join(BACKUP_DIR, file);
        const stat = fs.statSync(filePath);

        if (stat.isDirectory()) {
          const summaryPath = path.join(filePath, 'backup-summary.json');
          let summary = null;

          if (fs.existsSync(summaryPath)) {
            summary = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
          }

          backups.push({
            name: file,
            path: filePath,
            size: stat.size,
            createdAt: stat.birthtime,
            summary
          });
        }
      }

      return backups.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } catch (error) {
      logger.error('Failed to list backups', { error: error.message });
      return [];
    }
  }

  async restoreBackup(backupName) {
    const backupPath = path.join(BACKUP_DIR, backupName);
    
    if (!fs.existsSync(backupPath)) {
      throw new Error(`Backup ${backupName} does not exist`);
    }

    return new Promise((resolve, reject) => {
      const restoreCommand = `mongorestore --uri="${DATABASE_URL}" --drop "${backupPath}/${DB_NAME}"`;

      logger.info('Starting database restore', { backupPath });

      exec(restoreCommand, (error, stdout, stderr) => {
        if (error) {
          logger.error('Database restore failed', { error: error.message, stderr });
          reject(new Error(`Restore failed: ${error.message}`));
          return;
        }

        logger.info('Database restore completed successfully', { backupPath, stdout });
        resolve(backupPath);
      });
    });
  }

  async cleanupOldBackups(keepDays = 7) {
    try {
      const backups = await this.listBackups();
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - keepDays);

      const oldBackups = backups.filter(backup => new Date(backup.createdAt) < cutoffDate);

      for (const backup of oldBackups) {
        fs.rmSync(backup.path, { recursive: true, force: true });
        logger.info('Old backup deleted', { backup: backup.name });
      }

      logger.info('Backup cleanup completed', { deleted: oldBackups.length, kept: backups.length - oldBackups.length });
    } catch (error) {
      logger.error('Backup cleanup failed', { error: error.message });
    }
  }
}

// CLI interface
async function main() {
  const backup = new DatabaseBackup();
  const args = process.argv.slice(2);
  const command = args[0];

  try {
    if (command === 'create') {
      await backup.createBackup();
      console.log('Backup completed successfully');
    } else if (command === 'list') {
      const backups = await backup.listBackups();
      console.log('Available backups:');
      backups.forEach(b => {
        console.log(`- ${b.name} (${b.createdAt})`);
        if (b.summary) {
          console.log(`  Size: ${b.summary.size} bytes, Collections: ${b.summary.collections.length}`);
        }
      });
    } else if (command === 'restore') {
      const backupName = args[1];
      if (!backupName) {
        console.error('Usage: node backup-database.js restore <backup_name>');
        process.exit(1);
      }
      await backup.restoreBackup(backupName);
      console.log('Restore completed successfully');
    } else if (command === 'cleanup') {
      const keepDays = parseInt(args[1]) || 7;
      await backup.cleanupOldBackups(keepDays);
      console.log('Backup cleanup completed');
    } else {
      console.log('Usage:');
      console.log('  node backup-database.js create    - Create a new backup');
      console.log('  node backup-database.js list      - List all backups');
      console.log('  node backup-database.js restore <backup_name> - Restore a backup');
      console.log('  node backup-database.js cleanup [days] - Clean up old backups (default: 7 days)');
    }
  } catch (error) {
    console.error('Backup operation failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(error => {
    console.error('Backup script failed:', error);
    process.exit(1);
  });
}

module.exports = DatabaseBackup;