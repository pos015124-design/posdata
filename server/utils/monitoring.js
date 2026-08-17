/**
 * Monitoring and Alerting System
 * Provides real system monitoring: request volume, response times, error
 * rates, CPU/memory usage, and threshold-based alerts.
 *
 * Wired into server.js via requestTrackingMiddleware / errorTrackingMiddleware
 * and the 60s health-check loop.
 */

const os = require('os');
const { logger, securityLogger, auditLogger } = require('../config/logger');

class MonitoringSystem {
  constructor() {
    this.alertThresholds = {
      errorRate: 0.05, // 5% error rate threshold
      responseTime: 5000, // 5 seconds p95 response time threshold
      memoryUsage: 0.8, // 80% memory usage threshold
      cpuUsage: 0.85, // 85% CPU usage threshold
      dbConnectionFailures: 5 // 5 consecutive failures threshold
    };

    this.metrics = {
      requests: 0,
      errors: 0,
      startTime: Date.now(),
      dbConnections: 0,
      dbFailures: 0
    };

    // Rolling window of recent response times (ms) — used for p95 / avg
    this.responseTimes = [];
    this.maxResponseSamples = 5000;

    // CPU sampling state — real usage % requires deltas over an interval
    this._lastCpuUsage = process.cpuUsage();
    this._lastCpuSampleAt = Date.now();
    this._cpuPercent = 0;

    this.alerts = [];
    this.isMonitoringActive = true; // Real metrics, on by default
  }

  startMonitoring() {
    // Monitor system health every 60 seconds
    this.healthCheckInterval = setInterval(() => {
      if (this.isMonitoringActive) {
        this.checkSystemHealth();
      }
    }, 60000); // 60 seconds

    // Log system metrics every 5 minutes
    this.metricsInterval = setInterval(() => {
      if (this.isMonitoringActive) {
        this.logSystemMetrics();
      }
    }, 300000); // 5 minutes

    logger.info('Monitoring started (60s health checks, 5min metric snapshots)');
  }

  async checkSystemHealth() {
    try {
      const healthData = await this.getSystemHealth();

      // Check for potential issues
      if (healthData.errorRate > this.alertThresholds.errorRate) {
        await this.sendAlert('High Error Rate', `Error rate is ${(healthData.errorRate * 100).toFixed(2)}%`, 'warning');
      }

      if (healthData.p95ResponseTime > this.alertThresholds.responseTime) {
        await this.sendAlert('High Response Time', `p95 response time is ${healthData.p95ResponseTime}ms`, 'warning');
      }

      if (healthData.memoryUsage > this.alertThresholds.memoryUsage) {
        await this.sendAlert('High Memory Usage', `Memory usage is ${(healthData.memoryUsage * 100).toFixed(2)}%`, 'critical');
      }

      if (healthData.cpuUsage > this.alertThresholds.cpuUsage) {
        await this.sendAlert('High CPU Usage', `CPU usage is ${(healthData.cpuUsage * 100).toFixed(2)}%`, 'warning');
      }

      if (healthData.dbFailures > this.alertThresholds.dbConnectionFailures) {
        await this.sendAlert('Database Connection Issues', `Multiple database failures detected (${healthData.dbFailures})`, 'critical');
      }
    } catch (error) {
      logger.error('Monitoring system health check failed', { error: error.message });
    }
  }

  async getSystemHealth() {
    const memoryUsage = process.memoryUsage();
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;
    const { avgResponseTime, p95ResponseTime } = this.calculateResponseTimeStats();

    return {
      requests: this.metrics.requests,
      errors: this.metrics.errors,
      errorRate: this.metrics.errors / Math.max(this.metrics.requests, 1),
      avgResponseTime,
      p95ResponseTime,
      memoryUsage: usedMemory / totalMemory,
      cpuUsage: this.calculateCpuUsage(),
      dbFailures: this.metrics.dbFailures,
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    };
  }

  /** Record a completed request's duration (ms) into the rolling window. */
  recordResponseTime(durationMs) {
    this.responseTimes.push(durationMs);
    if (this.responseTimes.length > this.maxResponseSamples) {
      this.responseTimes = this.responseTimes.slice(-this.maxResponseSamples);
    }
  }

  calculateResponseTimeStats() {
    const times = this.responseTimes;
    if (times.length === 0) {
      return { avgResponseTime: 0, p95ResponseTime: 0 };
    }
    const sorted = [...times].sort((a, b) => a - b);
    const sum = sorted.reduce((acc, t) => acc + t, 0);
    const avg = sum / sorted.length;
    // p95: 95th percentile index
    const p95Index = Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95));
    return { avgResponseTime: Math.round(avg), p95ResponseTime: sorted[p95Index] };
  }

  /**
   * Real CPU usage percentage, computed from process.cpuUsage() deltas
   * between samples (total CPU time across all cores / wall-clock elapsed).
   */
  calculateCpuUsage() {
    const now = Date.now();
    const elapsedMs = now - this._lastCpuSampleAt;
    if (elapsedMs <= 0) return this._cpuPercent;

    const current = process.cpuUsage();
    const userDelta = current.user - this._lastCpuUsage.user;
    const sysDelta = current.system - this._lastCpuUsage.system;
    const totalDeltaUs = userDelta + sysDelta;

    this._lastCpuUsage = current;
    this._lastCpuSampleAt = now;

    // Convert to percentage of a single core (process usage, not host-wide):
    // totalDeltaUs / (elapsedMs * 1000) gives fraction of ONE core.
    const coreCount = Math.max(os.cpus().length, 1);
    this._cpuPercent = Math.min(100, (totalDeltaUs / (elapsedMs * 1000 * coreCount)) * 100);
    return this._cpuPercent;
  }

  logSystemMetrics() {
    const { avgResponseTime, p95ResponseTime } = this.calculateResponseTimeStats();
    const metrics = {
      requests: this.metrics.requests,
      errors: this.metrics.errors,
      errorRate: +(this.metrics.errors / Math.max(this.metrics.requests, 1)).toFixed(4),
      avgResponseTime,
      p95ResponseTime,
      cpuUsage: +this.calculateCpuUsage().toFixed(2),
      dbConnections: this.metrics.dbConnections,
      dbFailures: this.metrics.dbFailures,
      uptime: Math.round(process.uptime()),
      timestamp: new Date().toISOString()
    };

    logger.info('System metrics', metrics);
    auditLogger.info('System metrics snapshot', metrics);
  }

  async sendAlert(alertType, message, severity = 'info') {
    const alert = {
      type: alertType,
      message,
      severity,
      timestamp: new Date().toISOString(),
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };

    this.alerts.push(alert);

    // Log the alert
    switch (severity) {
      case 'critical':
        logger.error('CRITICAL ALERT', alert);
        securityLogger.error('CRITICAL SYSTEM ALERT', alert);
        break;
      case 'warning':
        logger.warn('WARNING ALERT', alert);
        break;
      default:
        logger.info('SYSTEM ALERT', alert);
    }

    // Keep only recent alerts (last 100)
    if (this.alerts.length > 100) {
      this.alerts = this.alerts.slice(-100);
    }
  }

  // Middleware to track requests and responses
  requestTrackingMiddleware() {
    const self = this; // eslint-disable-line consistent-this
    return (req, res, next) => {
      const startTime = Date.now();
      self.metrics.requests++;

      // Track the response
      const originalSend = res.send;
      res.send = function (data) {
        const duration = Date.now() - startTime;
        self.recordResponseTime(duration);

        // Log slow requests (p95 check is handled by the health loop)
        if (duration > self.alertThresholds.responseTime) {
          logger.warn('Slow request detected', {
            method: req.method,
            url: req.url,
            duration,
            ip: req.ip
          });
        }

        return originalSend.call(this, data);
      };

      // Count 5xx responses as errors for the error-rate metric
      res.on('finish', () => {
        if (res.statusCode >= 500) {
          self.metrics.errors++;
        }
      });

      next();
    };
  }

  // Error tracking middleware (must run before the global error handler)
  errorTrackingMiddleware() {
    const self = this; // eslint-disable-line consistent-this
    return (err, req, res, next) => {
      self.metrics.errors++;

      // Track specific error types
      if (err.name === 'MongoError' || err.name === 'MongooseError') {
        self.metrics.dbFailures++;
      }

      next(err);
    };
  }

  // Database connection tracking
  trackDbConnection(success) {
    if (success) {
      this.metrics.dbConnections++;
      this.metrics.dbFailures = 0; // Reset failures on successful connection
    } else {
      this.metrics.dbFailures++;
    }
  }

  // Get system alerts
  getAlerts(limit = 10) {
    return this.alerts.slice(-limit).reverse();
  }

  // Get system metrics
  getMetrics() {
    const { avgResponseTime, p95ResponseTime } = this.calculateResponseTimeStats();
    return {
      ...this.metrics,
      avgResponseTime,
      p95ResponseTime,
      cpuUsage: +this.calculateCpuUsage().toFixed(2),
      errorRate: this.metrics.errors / Math.max(this.metrics.requests, 1),
      uptime: process.uptime()
    };
  }

  // Toggle monitoring on/off
  toggleMonitoring(active) {
    this.isMonitoringActive = active;
    logger.info(`Monitoring ${active ? 'enabled' : 'disabled'}`);
  }

  // Get monitoring status
  getStatus() {
    return {
      isActive: this.isMonitoringActive,
      lastCheck: new Date().toISOString(),
      totalAlerts: this.alerts.length,
      metrics: this.getMetrics()
    };
  }
}

// Create a singleton instance
const monitoringSystem = new MonitoringSystem();

module.exports = {
  MonitoringSystem,
  monitoringSystem,
  requestTrackingMiddleware: monitoringSystem.requestTrackingMiddleware.bind(monitoringSystem),
  errorTrackingMiddleware: monitoringSystem.errorTrackingMiddleware.bind(monitoringSystem)
};
