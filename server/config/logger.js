const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');

// Create logs directory if it doesn't exist
const fs = require('fs');
const logDir = 'logs';
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

const SENSITIVE_KEY = /(password|token|secret|authorization|cookie|api[-_]?key|signature|credential|privatekey|refresh)/i;
const redactSensitive = (value, key = '') => {
  if (SENSITIVE_KEY.test(key)) return '[REDACTED]';
  if (typeof value === 'string') {
    const redacted = value.replace(/Bearer\s+[^\s]+/gi, 'Bearer [REDACTED]');
    // Stack traces are useful for diagnosis, but must not expose deployment
    // filesystem paths through API/application logs.
    if (key === 'stack') {
      return redacted.replace(/(?:[A-Za-z]:\\|\/)[^()\r\n]+?(?=:\d+:\d+\)?)/g, '[REDACTED_PATH]');
    }
    return redacted;
  }
  if (Array.isArray(value)) return value.map((item) => redactSensitive(item));
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([childKey, childValue]) => [
      childKey,
      redactSensitive(childValue, childKey)
    ]));
  }
  return value;
};
const redactionFormat = winston.format((info) => {
  // Mutate the Winston info object in place so its non-enumerable level
  // symbols remain intact and transports still receive the event.
  Object.assign(info, redactSensitive(info));
  return info;
});

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.errors({ stack: true }),
  redactionFormat(),
  winston.format.json(),
  winston.format.prettyPrint()
);

// Define console format for development
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({
    format: 'HH:mm:ss'
  }),
  redactionFormat(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    return `${timestamp} [${level}]: ${message} ${Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''}`;
  })
);

// Create the logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: { service: 'dukani-system' },
  transports: [
    // Error log file
    new DailyRotateFile({
      filename: path.join(logDir, 'error-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      maxSize: '20m',
      maxFiles: '14d',
      zippedArchive: true
    }),

    // Combined log file
    new DailyRotateFile({
      filename: path.join(logDir, 'combined-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '30d',
      zippedArchive: true
    }),

    // Security log file for authentication and authorization events
    new DailyRotateFile({
      filename: path.join(logDir, 'security-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      level: 'warn',
      maxSize: '20m',
      maxFiles: '90d',
      zippedArchive: true,
      format: winston.format.combine(
        winston.format.timestamp(),
        redactionFormat(),
        winston.format.json(),
        winston.format.label({ label: 'SECURITY' })
      )
    })
  ],

  // Handle exceptions and rejections
  exceptionHandlers: [
    new DailyRotateFile({
      filename: path.join(logDir, 'exceptions-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '30d',
      zippedArchive: true
    })
  ],

  rejectionHandlers: [
    new DailyRotateFile({
      filename: path.join(logDir, 'rejections-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '30d',
      zippedArchive: true
    })
  ]
});

// Add console transport for development
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: consoleFormat
  }));
}

// Security logger for authentication and authorization events
const securityLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    redactionFormat(),
    winston.format.json(),
    winston.format.label({ label: 'SECURITY' })
  ),
  transports: [
    new DailyRotateFile({
      filename: path.join(logDir, 'security-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '90d',
      zippedArchive: true
    })
  ]
});

// Audit logger for business operations
const auditLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    redactionFormat(),
    winston.format.json(),
    winston.format.label({ label: 'AUDIT' })
  ),
  transports: [
    new DailyRotateFile({
      filename: path.join(logDir, 'audit-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '365d',
      zippedArchive: true
    })
  ]
});

module.exports = {  logger,
  securityLogger,
  auditLogger,
  redactSensitive
};
