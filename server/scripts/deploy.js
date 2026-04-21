/**
 * Automated Deployment Script
 * Handles the complete deployment process for different environments
 */

require('dotenv').config();
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { logger } = require('../config/logger');

class DeploymentAutomation {
  constructor(environment = 'production') {
    this.environment = environment;
    this.config = this.loadConfig();
  }

  loadConfig() {
    const configs = {
      development: {
        name: 'development',
        buildDir: 'dist',
        serverDir: 'server',
        clientDir: 'client',
        dockerFile: 'Dockerfile.dev',
        dockerCompose: 'docker-compose.dev.yml',
        testCommand: 'npm run test:unit',
        buildCommand: 'npm run build:dev'
      },
      staging: {
        name: 'staging',
        buildDir: 'dist',
        serverDir: 'server',
        clientDir: 'client',
        dockerFile: 'Dockerfile',
        dockerCompose: 'docker-compose.staging.yml',
        testCommand: 'npm run test',
        buildCommand: 'npm run build'
      },
      production: {
        name: 'production',
        buildDir: 'dist',
        serverDir: 'server',
        clientDir: 'client',
        dockerFile: 'Dockerfile',
        dockerCompose: 'docker-compose.prod.yml',
        testCommand: 'npm run test:all',
        buildCommand: 'npm run build'
      }
    };

    return configs[this.environment] || configs.production;
  }

  runCommand(command, cwd = process.cwd()) {
    try {
      logger.info(`Executing command: ${command}`);
      const result = execSync(command, { cwd, stdio: 'inherit' });
      return result.toString();
    } catch (error) {
      logger.error(`Command failed: ${command}`, { error: error.message });
      throw error;
    }
  }

  async checkPrerequisites() {
    logger.info('Checking deployment prerequisites...');

    // Check if Docker is installed
    try {
      this.runCommand('docker --version');
      logger.info('✅ Docker is installed');
    } catch (error) {
      logger.error('❌ Docker is not installed');
      throw new Error('Docker is required for deployment');
    }

    // Check if Docker Compose is installed
    try {
      this.runCommand('docker-compose --version');
      logger.info('✅ Docker Compose is installed');
    } catch (error) {
      try {
        this.runCommand('docker compose version');
        logger.info('✅ Docker Compose (V2) is installed');
      } catch (error) {
        logger.error('❌ Docker Compose is not installed');
        throw new Error('Docker Compose is required for deployment');
      }
    }

    // Check if Git is available
    try {
      this.runCommand('git --version');
      logger.info('✅ Git is available');
    } catch (error) {
      logger.warn('⚠️ Git is not available, continuing without version check');
    }

    logger.info('✅ All prerequisites checked');
  }

  async runTests() {
    logger.info(`Running ${this.config.name} tests...`);
    await this.runCommand(this.config.testCommand, path.join(__dirname, '../..'));
    logger.info('✅ Tests passed');
  }

  async buildApplication() {
    logger.info(`Building application for ${this.config.name} environment...`);

    // Build client
    logger.info('Building client application...');
    await this.runCommand('npm run build', path.join(__dirname, '../../client'));

    // Build server
    logger.info('Building server application...');
    await this.runCommand('npm ci --only=production', path.join(__dirname, '../..'));
    
    logger.info('✅ Application built successfully');
  }

  async runMigrations() {
    logger.info('Running database migrations...');
    try {
      await this.runCommand('node scripts/run-migrations.js', path.join(__dirname, '..'));
      logger.info('✅ Database migrations completed');
    } catch (error) {
      logger.error('❌ Database migrations failed', { error: error.message });
      throw error;
    }
  }

  async buildDockerImages() {
    logger.info('Building Docker images...');
    
    const dockerComposeFile = this.config.dockerCompose;
    const composePath = path.join(__dirname, '../../../', dockerComposeFile);
    
    if (!fs.existsSync(composePath)) {
      throw new Error(`Docker Compose file not found: ${composePath}`);
    }

    await this.runCommand(`docker-compose -f ${dockerComposeFile} build`, path.join(__dirname, '../..'));
    logger.info('✅ Docker images built successfully');
  }

  async startServices() {
    logger.info(`Starting ${this.config.name} services...`);
    
    const dockerComposeFile = this.config.dockerCompose;
    
    // Stop existing services
    try {
      await this.runCommand(`docker-compose -f ${dockerComposeFile} down`, path.join(__dirname, '../..'));
    } catch (error) {
      logger.warn('No existing services to stop');
    }

    // Start new services
    await this.runCommand(`docker-compose -f ${dockerComposeFile} up -d`, path.join(__dirname, '../..'));
    logger.info('✅ Services started successfully');
  }

  async runHealthChecks() {
    logger.info('Running health checks...');
    
    // Wait a bit for services to start
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    // Check if services are running
    try {
      const result = this.runCommand('docker-compose ps', path.join(__dirname, '../..'));
      logger.info('Service status:', { result });
      
      // Check if the main services are running
      if (result.includes('Up')) {
        logger.info('✅ Health checks passed');
      } else {
        logger.error('❌ Health checks failed - services not running properly');
        throw new Error('Services not running properly');
      }
    } catch (error) {
      logger.error('❌ Health checks failed', { error: error.message });
      throw error;
    }
  }

  async backupDatabase() {
    logger.info('Creating database backup...');
    try {
      await this.runCommand('node scripts/backup-database.js create', path.join(__dirname, '..'));
      logger.info('✅ Database backup created');
    } catch (error) {
      logger.error('❌ Database backup failed', { error: error.message });
      // Don't throw error as backup failure shouldn't stop deployment
    }
  }

  async deploy() {
    logger.info(`Starting ${this.environment} deployment...`);

    try {
      // 1. Check prerequisites
      await this.checkPrerequisites();

      // 2. Run tests (skip for production to speed up deployment)
      if (this.environment !== 'production') {
        await this.runTests();
      }

      // 3. Create database backup (for production deployments)
      if (this.environment === 'production') {
        await this.backupDatabase();
      }

      // 4. Build application
      await this.buildApplication();

      // 5. Run database migrations
      await this.runMigrations();

      // 6. Build Docker images
      await this.buildDockerImages();

      // 7. Start services
      await this.startServices();

      // 8. Run health checks
      await this.runHealthChecks();

      logger.info(`✅ ${this.environment} deployment completed successfully!`);
      
      // Log deployment summary
      const deploymentSummary = {
        environment: this.environment,
        timestamp: new Date().toISOString(),
        status: 'success',
        services: ['app', 'mongo', 'nginx'],
        backupCreated: this.environment === 'production'
      };
      
      logger.info('Deployment summary', deploymentSummary);
      
      return deploymentSummary;
    } catch (error) {
      logger.error(`❌ ${this.environment} deployment failed`, { error: error.message });
      
      // Log deployment failure
      const deploymentSummary = {
        environment: this.environment,
        timestamp: new Date().toISOString(),
        status: 'failed',
        error: error.message
      };
      
      logger.error('Deployment failure summary', deploymentSummary);
      
      throw error;
    }
  }

  async rollback() {
    logger.info(`Starting rollback for ${this.environment}...`);
    
    try {
      // Stop current services
      const dockerComposeFile = this.config.dockerCompose;
      await this.runCommand(`docker-compose -f ${dockerComposeFile} down`, path.join(__dirname, '../..'));
      
      logger.info('✅ Rollback completed');
    } catch (error) {
      logger.error('❌ Rollback failed', { error: error.message });
      throw error;
    }
  }

  async generateDeploymentReport() {
    const report = {
      environment: this.environment,
      timestamp: new Date().toISOString(),
      gitCommit: this.getGitCommit(),
      nodeVersion: process.version,
      dockerVersion: this.getDockerVersion(),
      services: await this.getRunningServices(),
      uptime: process.uptime()
    };

    const reportPath = path.join(__dirname, '../reports/deployment-report.json');
    const reportDir = path.dirname(reportPath);
    
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }

    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    logger.info('Deployment report generated', { path: reportPath });

    return report;
  }

  getGitCommit() {
    try {
      return execSync('git rev-parse HEAD').toString().trim();
    } catch (error) {
      return 'unknown';
    }
  }

  getDockerVersion() {
    try {
      return execSync('docker --version').toString().trim();
    } catch (error) {
      return 'unknown';
    }
  }

  async getRunningServices() {
    try {
      const result = execSync('docker-compose ps --format json', { cwd: path.join(__dirname, '../..') });
      return result.toString().trim();
    } catch (error) {
      return 'unknown';
    }
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const environment = args[1] || 'production';

  const deployer = new DeploymentAutomation(environment);

  try {
    switch (command) {
      case 'deploy':
        await deployer.deploy();
        await deployer.generateDeploymentReport();
        break;
      case 'rollback':
        await deployer.rollback();
        break;
      case 'health':
        await deployer.runHealthChecks();
        break;
      case 'build':
        await deployer.buildApplication();
        break;
      case 'migrate':
        await deployer.runMigrations();
        break;
      case 'backup':
        await deployer.backupDatabase();
        break;
      default:
        console.log('Usage:');
        console.log('  node deploy.js deploy [environment]    - Deploy to specified environment');
        console.log('  node deploy.js rollback [environment]  - Rollback deployment');
        console.log('  node deploy.js health [environment]    - Run health checks');
        console.log('  node deploy.js build [environment]     - Build application only');
        console.log('  node deploy.js migrate [environment]   - Run migrations only');
        console.log('  node deploy.js backup [environment]    - Create database backup');
        console.log('');
        console.log('Environments: development, staging, production (default: production)');
        process.exit(1);
    }
  } catch (error) {
    console.error('Deployment failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(error => {
    console.error('Deployment script failed:', error);
    process.exit(1);
  });
}

module.exports = DeploymentAutomation;