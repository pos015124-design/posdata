/**
 * Database Migration Runner
 * Executes all pending database migrations
 */

require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const { logger } = require('../config/logger');

const MIGRATIONS_DIR = path.join(__dirname, '../migrations');
const MIGRATION_HISTORY_FILE = path.join(__dirname, '../data/migration-history.json');

class MigrationRunner {
  constructor() {
    this.migrations = [];
    this.appliedMigrations = [];
  }

  async initialize() {
    // Connect to database
    try {
      await mongoose.connect(process.env.DATABASE_URL, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });
      logger.info('Connected to database for migrations');
    } catch (error) {
      logger.error('Failed to connect to database for migrations', { error: error.message });
      throw error;
    }

    // Load migration files
    this.loadMigrations();

    // Load applied migrations history
    this.loadMigrationHistory();
  }

  loadMigrations() {
    const files = fs.readdirSync(MIGRATIONS_DIR);
    this.migrations = files
      .filter(file => file.endsWith('.js') && file.startsWith('00'))
      .map(file => {
        const migrationPath = path.join(MIGRATIONS_DIR, file);
        const MigrationClass = require(migrationPath);
        const number = parseInt(file.split('-')[0]);
        return { number, file, MigrationClass };
      })
      .sort((a, b) => a.number - b.number);

    logger.info('Loaded migrations', { count: this.migrations.length, migrations: this.migrations.map(m => m.file) });
  }

  loadMigrationHistory() {
    try {
      if (fs.existsSync(MIGRATION_HISTORY_FILE)) {
        const history = JSON.parse(fs.readFileSync(MIGRATION_HISTORY_FILE, 'utf8'));
        this.appliedMigrations = history.map(m => m.number);
      } else {
        this.appliedMigrations = [];
      }
    } catch (error) {
      logger.error('Failed to load migration history', { error: error.message });
      this.appliedMigrations = [];
    }
  }

  saveMigrationHistory(migrationNumber, action) {
    const historyEntry = {
      number: migrationNumber,
      timestamp: new Date().toISOString(),
      action: action
    };

    let history = [];
    if (fs.existsSync(MIGRATION_HISTORY_FILE)) {
      history = JSON.parse(fs.readFileSync(MIGRATION_HISTORY_FILE, 'utf8'));
    }

    if (action === 'up') {
      history.push(historyEntry);
    } else if (action === 'down') {
      history = history.filter(m => m.number !== migrationNumber);
    }

    fs.writeFileSync(MIGRATION_HISTORY_FILE, JSON.stringify(history, null, 2));
    this.appliedMigrations = history.map(m => m.number);
  }

  getPendingMigrations() {
    return this.migrations.filter(migration => !this.appliedMigrations.includes(migration.number));
  }

  async runMigrations(direction = 'up') {
    try {
      const pendingMigrations = direction === 'up' ? this.getPendingMigrations() : this.migrations.filter(m => this.appliedMigrations.includes(m.number));

      if (pendingMigrations.length === 0) {
        logger.info(`No ${direction === 'up' ? 'pending' : 'applied'} migrations to run`);
        return;
      }

      logger.info(`Running ${pendingMigrations.length} ${direction} migrations`, {
        migrations: pendingMigrations.map(m => m.file)
      });

      for (const migration of pendingMigrations) {
        try {
          logger.info(`Running migration ${migration.file} (${direction})`);
          
          await migration.MigrationClass[direction]();
          
          this.saveMigrationHistory(migration.number, direction);
          
          logger.info(`Migration ${migration.file} completed successfully`);
        } catch (error) {
          logger.error(`Migration ${migration.file} failed`, { error: error.message });
          throw error;
        }
      }

      logger.info(`${direction === 'up' ? 'Applied' : 'Rolled back'} ${pendingMigrations.length} migrations successfully`);
    } catch (error) {
      logger.error(`Migration process failed`, { error: error.message });
      throw error;
    }
  }

  async run() {
    try {
      await this.initialize();
      await this.runMigrations('up');
      logger.info('All migrations completed successfully');
    } catch (error) {
      logger.error('Migration process failed', { error: error.message });
      process.exit(1);
    } finally {
      await mongoose.connection.close();
      logger.info('Database connection closed');
    }
  }

  async rollback(migrationNumber) {
    try {
      await this.initialize();
      
      const migration = this.migrations.find(m => m.number === migrationNumber);
      if (!migration) {
        throw new Error(`Migration ${migrationNumber} not found`);
      }

      if (!this.appliedMigrations.includes(migrationNumber)) {
        throw new Error(`Migration ${migrationNumber} has not been applied`);
      }

      logger.info(`Rolling back migration ${migration.file}`);
      await migration.MigrationClass.down();
      this.saveMigrationHistory(migrationNumber, 'down');
      logger.info(`Migration ${migration.file} rolled back successfully`);
    } catch (error) {
      logger.error(`Rollback failed`, { error: error.message });
      throw error;
    } finally {
      await mongoose.connection.close();
      logger.info('Database connection closed');
    }
  }
}

// CLI interface
async function main() {
  const runner = new MigrationRunner();
  
  const args = process.argv.slice(2);
  const command = args[0];

  if (command === 'rollback') {
    const migrationNumber = parseInt(args[1]);
    if (isNaN(migrationNumber)) {
      console.error('Usage: node run-migrations.js rollback <migration_number>');
      process.exit(1);
    }
    await runner.rollback(migrationNumber);
  } else {
    await runner.run();
  }
}

if (require.main === module) {
  main().catch(error => {
    console.error('Migration runner failed:', error);
    process.exit(1);
  });
}

module.exports = MigrationRunner;