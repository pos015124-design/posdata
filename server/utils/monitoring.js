/**
 * Monitoring and Alerting System
 * Provides comprehensive monitoring and alerting for the Dukani system
 */

const { logger, securityLogger, auditLogger } = require('../config/logger');
const { sendEmail } = require('./emailService'); // Assuming this exists

class MonitoringSystem {
  constructor() {
    this.alertThresholds = {
      errorRate: 0.05, // 5% error rate threshold
      responseTime: 5000, // 5 seconds response time threshold
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
    
    this.alerts = [];
    this.isMonitoringActive = false; // Default to not active
  }

  startMonitoring() {
    // Monitor system performance every 60 seconds
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
  }

  async checkSystemHealth() {
    try {
      const healthData = await this.getSystemHealth();
      
      // Check for potential issues
      if (healthData.errorRate > this.alertThresholds.errorRate) {
        await this.sendAlert('High Error Rate', `Error rate is ${healthData.errorRate * 100}%`, 'warning');
      }
      
      if (healthData.avgResponseTime > this.alertThresholds.responseTime) {
        await this.sendAlert('High Response Time', `Average response time is ${healthData.avgResponseTime}ms`, 'warning');
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
    const totalMemory = require('os').totalmem();
    const freeMemory = require('os').freemem();
    const usedMemory = totalMemory - freeMemory;
    
    return {
      errorRate: this.metrics.errors / Math.max(this.metrics.requests, 1),
      avgResponseTime: this.calculateAvgResponseTime(),
      memoryUsage: usedMemory / totalMemory,
      cpuUsage: this.calculateCpuUsage(),
      dbFailures: this.metrics.dbFailures,
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    };
  }

  calculateAvgResponseTime() {
    // This would need to track response times from middleware
    // For now, return a placeholder
    return 0;
  }

  calculateCpuUsage() {
    // This would need to track CPU usage
    // For now, return a placeholder
    return 0.1; // 10% as placeholder
  }

  logSystemMetrics() {
    const metrics = {
      requests: this.metrics.requests,
      errors: this.metrics.errors,
      errorRate: (this.metrics.errors / Math.max(this.metrics.requests, 1)).toFixed(4),
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

    // Send email alert for critical issues
    if (severity === 'critical' || severity === 'warning') {
      try {
        await this.sendEmailAlert(alert);
      } catch (error) {
        logger.error('Failed to send email alert', { error: error.message });
      }
    }

    // Keep only recent alerts (last 100)
    if (this.alerts.length > 100) {
      this.alerts = this.alerts.slice(-100);
    }
  }

  async sendEmailAlert(alert) {
    // In a real implementation, this would send an email to system administrators
    // For now, we'll just log it
    logger.info('Email alert would be sent', {
      alert,
      recipients: process.env.ALERT_EMAIL_RECIPIENTS || 'admin@dukani.com'
    });
  }

  // Middleware to track requests and responses
  requestTrackingMiddleware() {
    return (req, res, next) => {
      const startTime = Date.now();
      this.metrics.requests++;

      // Track the response
      const originalSend = res.send;
      res.send = function(data) {
        const duration = Date.now() - startTime;
        
        // Log slow requests
        if (duration > this.alertThresholds.responseTime) {
          logger.warn('Slow request detected', {
            method: req.method,
            url: req.url,
            duration,
            ip: req.ip
          });
        }
        
        originalSend.call(this, data);
      };

      next();
    };
  }

  // Error tracking middleware
  errorTrackingMiddleware() {
    return (err, req, res, next) => {
      this.metrics.errors++;
      
      // Track specific error types
      if (err.name === 'MongoError' || err.name === 'MongooseError') {
        this.metrics.dbFailures++;
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
    return {
      ...this.metrics,
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