/**
 * Deployment Configuration
 * Configuration for different deployment environments
 */

const path = require('path');

class DeploymentConfig {
  static getEnvironmentConfig() {
    const env = process.env.NODE_ENV || 'development';
    
    const configs = {
      development: {
        name: 'development',
        port: process.env.PORT || 3000,
        database: {
          url: process.env.DATABASE_URL || 'mongodb://localhost:27017/dukani_dev',
          options: {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
          }
        },
        logging: {
          level: 'debug',
          file: 'logs/development.log'
        },
        security: {
          cors: {
            origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : ['http://localhost:5173', 'http://localhost:3000'],
            credentials: true
          },
          helmet: {
            contentSecurityPolicy: {
              directives: {
                defaultSrc: ["'self'"],
                styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
                fontSrc: ["'self'", "https://fonts.gstatic.com"],
                imgSrc: ["'self'", "data:", "https:", "http:"],
                scriptSrc: ["'self'", "'unsafe-inline'"],
                connectSrc: ["'self'", "http://localhost:*", "ws://localhost:*"],
                frameSrc: ["'none'"],
                objectSrc: ["'none'"],
                upgradeInsecureRequests: [],
              },
            },
            hsts: {
              maxAge: 31536000,
              includeSubDomains: true,
              preload: false // Don't preload in development
            }
          }
        },
        features: {
          enableDebugging: true,
          enableDetailedErrors: true,
          enableCaching: false,
          enableRateLimiting: false // Usually disabled in development
        }
      },
      
      staging: {
        name: 'staging',
        port: process.env.PORT || 3000,
        database: {
          url: process.env.DATABASE_URL,
          options: {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
            // Additional options for staging
            bufferCommands: false,
            bufferMaxEntries: 0
          }
        },
        logging: {
          level: 'info',
          file: 'logs/staging.log'
        },
        security: {
          cors: {
            origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : ['https://staging.dukani.com'],
            credentials: true
          },
          helmet: {
            contentSecurityPolicy: {
              directives: {
                defaultSrc: ["'self'"],
                styleSrc: ["'self'", "'unsafe-inline'"],
                fontSrc: ["'self'"],
                imgSrc: ["'self'", "data:", "https:"],
                scriptSrc: ["'self'"],
                connectSrc: ["'self'"],
                frameSrc: ["'none'"],
                objectSrc: ["'none'"],
                upgradeInsecureRequests: [],
              },
            },
            hsts: {
              maxAge: 31536000,
              includeSubDomains: true,
              preload: false // Don't preload for staging
            }
          }
        },
        features: {
          enableDebugging: false,
          enableDetailedErrors: false,
          enableCaching: true,
          enableRateLimiting: true
        }
      },
      
      production: {
        name: 'production',
        port: process.env.PORT || 3000,
        database: {
          url: process.env.DATABASE_URL,
          options: {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
            // Production-specific options
            bufferCommands: false,
            bufferMaxEntries: 0,
            maxPoolSize: 10,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
          }
        },
        logging: {
          level: 'warn',
          file: 'logs/production.log'
        },
        security: {
          cors: {
            origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : ['https://dukani.com'],
            credentials: true
          },
          helmet: {
            contentSecurityPolicy: {
              directives: {
                defaultSrc: ["'self'"],
                styleSrc: ["'self'"],
                fontSrc: ["'self'"],
                imgSrc: ["'self'", "data:", "https:"],
                scriptSrc: ["'self'"],
                connectSrc: ["'self'"],
                frameSrc: ["'none'"],
                objectSrc: ["'none'"],
                upgradeInsecureRequests: [],
              },
            },
            hsts: {
              maxAge: 31536000,
              includeSubDomains: true,
              preload: true
            }
          }
        },
        features: {
          enableDebugging: false,
          enableDetailedErrors: false,
          enableCaching: true,
          enableRateLimiting: true,
          enableCompression: true,
          enableMinification: true
        }
      }
    };
    
    const config = configs[env];
    
    if (!config) {
      throw new Error(`Unknown environment: ${env}`);
    }
    
    return config;
  }
  
  static validateConfig(config) {
    const errors = [];
    
    // Validate required environment variables
    const requiredEnvVars = [
      'NODE_ENV',
      'JWT_SECRET',
      'DATABASE_URL'
    ];
    
    if (config.name === 'production' || config.name === 'staging') {
      requiredEnvVars.push(
        'ALLOWED_ORIGINS',
        'JWT_REFRESH_SECRET',
        'EMAIL_HOST',
        'EMAIL_USER',
        'EMAIL_PASS'
      );
    }
    
    for (const envVar of requiredEnvVars) {
      if (!process.env[envVar]) {
        errors.push(`Missing required environment variable: ${envVar}`);
      }
    }
    
    // Validate database URL
    if (!config.database.url) {
      errors.push('Database URL is required');
    }
    
    // Validate JWT secrets
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
      errors.push('JWT_SECRET must be at least 32 characters long');
    }
    
    if (config.name === 'production' || config.name === 'staging') {
      if (!process.env.JWT_REFRESH_SECRET || process.env.JWT_REFRESH_SECRET.length < 32) {
        errors.push('JWT_REFRESH_SECRET must be at least 32 characters long');
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
  
  static async setupEnvironment() {
    const config = this.getEnvironmentConfig();
    const validation = this.validateConfig(config);
    
    if (!validation.isValid) {
      console.error('❌ Configuration validation failed:');
      validation.errors.forEach(error => console.error(`  - ${error}`));
      process.exit(1);
    }
    
    console.log(`✅ Environment configuration loaded: ${config.name}`);
    console.log(`🚀 Server will run on port: ${config.port}`);
    console.log(`📊 Database: ${config.database.url}`);
    
    return config;
  }
}

module.exports = DeploymentConfig;