/**
 * Configuration Validator
 * Validates required environment variables and provides defaults
 */

const requiredEnvVars = [
  'DATABASE_URL',
  'JWT_SECRET',
  'REFRESH_TOKEN_SECRET',
  'NODE_ENV'
];

const optionalEnvVars = {
  'PORT': '3000',
  'BCRYPT_ROUNDS': '12',
  'MAX_LOGIN_ATTEMPTS': '5',
  'LOCKOUT_TIME': '900000', // 15 minutes
  'RATE_LIMIT_WINDOW': '900000', // 15 minutes
  'RATE_LIMIT_MAX': '100',
  'SESSION_SECRET': 'fallback_session_secret_for_dev',
  'ALLOWED_ORIGINS': 'http://localhost:5173,http://localhost:3000',
  'LOG_LEVEL': 'info',
  'DEFAULT_CURRENCY': 'USD',
  'DEFAULT_TAX_RATE': '0',
  'DEFAULT_TIMEZONE': 'UTC'
};

/**
 * Validates that all required environment variables are set
 * @returns {Array} Array of missing environment variables
 */
function validateRequiredEnvVars() {
  const missing = [];
  
  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      missing.push(envVar);
    }
  }
  
  return missing;
}

/**
 * Sets default values for optional environment variables
 */
function setOptionalEnvVars() {
  for (const [envVar, defaultValue] of Object.entries(optionalEnvVars)) {
    if (!process.env[envVar]) {
      process.env[envVar] = defaultValue;
    }
  }
}

/**
 * Validates the configuration and returns a report
 * @returns {Object} Configuration validation report
 */
function validateConfig() {
  const missingRequired = validateRequiredEnvVars();
  setOptionalEnvVars();
  
  const configReport = {
    isValid: missingRequired.length === 0,
    missingRequired,
    environment: process.env.NODE_ENV || 'development',
    port: process.env.PORT || 3000,
    databaseConfigured: !!process.env.DATABASE_URL,
    jwtConfigured: !!process.env.JWT_SECRET && process.env.JWT_SECRET.length >= 32,
    refreshTokenConfigured: !!process.env.REFRESH_TOKEN_SECRET && process.env.REFRESH_TOKEN_SECRET.length >= 32
  };
  
  return configReport;
}

/**
 * Validates JWT secret length
 * @returns {boolean} True if JWT secret is secure
 */
function validateJwtSecret() {
  const jwtSecret = process.env.JWT_SECRET;
  return jwtSecret && jwtSecret.length >= 32;
}

/**
 * Validates refresh token secret length
 * @returns {boolean} True if refresh token secret is secure
 */
function validateRefreshTokenSecret() {
  const refreshTokenSecret = process.env.REFRESH_TOKEN_SECRET;
  return refreshTokenSecret && refreshTokenSecret.length >= 32;
}

module.exports = {
  validateConfig,
  validateRequiredEnvVars,
  setOptionalEnvVars,
  validateJwtSecret,
  validateRefreshTokenSecret
};