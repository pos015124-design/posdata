class Logger {
  constructor() {
    this.level = 'info';
    this.enabled = true;
    this.logToServer = true;
    this.maxLogSize = 1000; // Maximum number of logs to keep in memory
    this.logs = [];
  }

  setLevel(level) {
    this.level = level.toLowerCase();
  }

  enable() {
    this.enabled = true;
  }

  disable() {
    this.enabled = false;
  }

  shouldLog(level) {
    const levels = { error: 0, warn: 1, info: 2, debug: 3 };
    return this.enabled && levels[level] <= levels[this.level];
  }

  log(level, message, meta = {}) {
    if (!this.shouldLog(level)) return;

    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      meta,
      url: window.location.href,
      userAgent: navigator.userAgent,
      sessionId: this.getSessionId()
    };

    // Store in memory
    this.logs.push(logEntry);
    
    // Keep only the most recent logs
    if (this.logs.length > this.maxLogSize) {
      this.logs = this.logs.slice(-this.maxLogSize);
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console[level === 'error' ? 'error' : 
            level === 'warn' ? 'warn' : 
            level === 'debug' ? 'debug' : 'log'](
        `[${level.toUpperCase()}] ${message}`, 
        meta
      );
    }

    // Send to server in production
    if (this.logToServer && process.env.NODE_ENV === 'production') {
      this.sendToServer(logEntry);
    }
  }

  error(message, meta = {}) {
    this.log('error', message, meta);
  }

  warn(message, meta = {}) {
    this.log('warn', message, meta);
  }

  info(message, meta = {}) {
    this.log('info', message, meta);
  }

  debug(message, meta = {}) {
    this.log('debug', message, meta);
  }

  async sendToServer(logEntry) {
    try {
      await fetch('/api/logs/client', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(logEntry),
      });
    } catch (error) {
      // If server logging fails, at least keep it in memory
      console.warn('Failed to send log to server:', error);
    }
  }

  getSessionId() {
    let sessionId = localStorage.getItem('sessionId');
    if (!sessionId) {
      sessionId = this.generateSessionId();
      localStorage.setItem('sessionId', sessionId);
    }
    return sessionId;
  }

  generateSessionId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  getLogs() {
    return [...this.logs];
  }

  clearLogs() {
    this.logs = [];
  }

  // Performance logging
  time(label) {
    if (this.shouldLog('debug')) {
      performance.mark(`start-${label}`);
    }
  }

  timeEnd(label) {
    if (this.shouldLog('debug')) {
      performance.mark(`end-${label}`);
      performance.measure(label, `start-${label}`, `end-${label}`);
      const measure = performance.getEntriesByName(label).pop();
      if (measure) {
        this.debug(`${label} took ${measure.duration} milliseconds`);
        performance.clearMeasures(label);
      }
    }
  }

  // Error logging with stack trace
  logError(error, context = {}) {
    this.error(error.message || 'Unknown error', {
      ...context,
      stack: error.stack,
      name: error.name
    });
  }

  // User action logging
  logUserAction(action, details = {}) {
    this.info('User action', {
      action,
      ...details,
      timestamp: new Date().toISOString()
    });
  }

  // API call logging
  logApiCall(url, method, response, details = {}) {
    this.info('API call', {
      url,
      method,
      status: response.status,
      duration: response.duration,
      ...details
    });
  }

  // Navigation logging
  logNavigation(from, to) {
    this.info('Navigation', {
      from,
      to,
      timestamp: new Date().toISOString()
    });
  }
}

// Create a singleton instance
const logger = new Logger();

// Set up automatic error logging
window.addEventListener('error', (event) => {
  logger.logError(event.error, {
    type: 'window_error',
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno
  });
});

window.addEventListener('unhandledrejection', (event) => {
  logger.logError(event.reason, {
    type: 'unhandled_promise_rejection'
  });
});

export default logger;