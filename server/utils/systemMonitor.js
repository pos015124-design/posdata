/**
 * System Monitoring Dashboard
 * Provides comprehensive system monitoring and metrics collection
 */

const os = require('os');
const { logger, securityLogger, auditLogger } = require('../config/logger');

class SystemMonitor {
  constructor() {
    this.metrics = {
      cpu: {
        usage: 0,
        count: os.cpus().length,
        model: os.cpus()[0].model,
        speed: os.cpus()[0].speed
      },
      memory: {
        total: os.totalmem(),
        free: os.freemem(),
        usage: 0
      },
      disk: {
        total: 0,
        free: 0,
        usage: 0
      },
      network: {
        interfaces: os.networkInterfaces(),
        connections: 0
      },
      process: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        pid: process.pid,
        title: process.title
      },
      system: {
        platform: os.platform(),
        release: os.release(),
        hostname: os.hostname(),
        uptime: os.uptime()
      }
    };
    
    this.performanceData = [];
    this.alerts = [];
    this.monitoringInterval = null;
    this.isMonitoring = false;
  }

  async collectMetrics() {
    // CPU usage
    const loadAvg = os.loadavg();
    this.metrics.cpu.loadAvg = loadAvg;
    
    // Memory usage
    const freeMem = os.freemem();
    const totalMem = os.totalmem();
    this.metrics.memory.free = freeMem;
    this.metrics.memory.total = totalMem;
    this.metrics.memory.used = totalMem - freeMem;
    this.metrics.memory.usage = ((totalMem - freeMem) / totalMem) * 100;
    
    // Process memory
    this.metrics.process.memory = process.memoryUsage();
    this.metrics.process.uptime = process.uptime();
    
    // System uptime
    this.metrics.system.uptime = os.uptime();
    
    // Add timestamp
    this.metrics.timestamp = new Date().toISOString();
    
    // Store performance data for trending
    this.performanceData.push({
      ...this.metrics,
      timestamp: new Date().toISOString()
    });
    
    // Keep only last 100 data points
    if (this.performanceData.length > 100) {
      this.performanceData = this.performanceData.slice(-100);
    }
    
    return this.metrics;
  }

  async getSystemHealth() {
    await this.collectMetrics();
    
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      metrics: {
        ...this.metrics,
        cpu: {
          ...this.metrics.cpu,
          usagePercent: this.getCurrentCpuUsage()
        },
        memory: {
          ...this.metrics.memory,
          usagePercent: this.metrics.memory.usage
        }
      },
      alerts: this.getRecentAlerts(10),
      recommendations: this.getRecommendations()
    };
    
    // Determine overall health status
    if (this.metrics.memory.usage > 90) {
      health.status = 'warning';
      health.recommendations.push('High memory usage detected');
    }
    
    if (this.getCurrentCpuUsage() > 90) {
      health.status = 'warning';
      health.recommendations.push('High CPU usage detected');
    }
    
    return health;
  }

  getCurrentCpuUsage() {
    // This is a simplified calculation
    // In a real system, you'd want to track CPU usage over time
    const cpus = os.cpus();
    let totalIdle = 0;
    let totalTick = 0;

    for (const cpu of cpus) {
      for (const type in cpu.times) {
        totalTick += cpu.times[type];
      }
      totalIdle += cpu.times.idle;
    }

    const usage = (totalTick - totalIdle) / totalTick * 100;
    return usage;
  }

  getRecommendations() {
    const recommendations = [];

    if (this.metrics.memory.usage > 80) {
      recommendations.push('Consider adding more RAM or optimizing memory usage');
    }

    if (this.getCurrentCpuUsage() > 80) {
      recommendations.push('Consider scaling up CPU resources');
    }

    if (process.uptime() > 7 * 24 * 60 * 60) { // 7 days
      recommendations.push('Consider restarting the service for optimal performance');
    }

    return recommendations;
  }

  async startMonitoring(interval = 30000) { // Default to 30 seconds
    if (this.isMonitoring) {
      logger.warn('System monitoring already started');
      return;
    }

    this.isMonitoring = true;
    
    this.monitoringInterval = setInterval(async () => {
      try {
        await this.collectMetrics();
        
        // Check for potential issues
        await this.checkForIssues();
        
        logger.debug('System metrics collected', {
          memoryUsage: this.metrics.memory.usage,
          cpuUsage: this.getCurrentCpuUsage(),
          timestamp: this.metrics.timestamp
        });
      } catch (error) {
        logger.error('Error collecting system metrics', { error: error.message });
      }
    }, interval);

    logger.info('System monitoring started', { interval: `${interval}ms` });
  }

  async stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.isMonitoring = false;
      logger.info('System monitoring stopped');
    }
  }

  async checkForIssues() {
    const issues = [];

    // Memory issues
    if (this.metrics.memory.usage > 90) {
      issues.push({
        type: 'high_memory',
        severity: 'critical',
        message: `Memory usage is ${this.metrics.memory.usage.toFixed(2)}%`,
        timestamp: new Date().toISOString()
      });
    } else if (this.metrics.memory.usage > 80) {
      issues.push({
        type: 'high_memory',
        severity: 'warning',
        message: `Memory usage is ${this.metrics.memory.usage.toFixed(2)}%`,
        timestamp: new Date().toISOString()
      });
    }

    // CPU issues
    const cpuUsage = this.getCurrentCpuUsage();
    if (cpuUsage > 90) {
      issues.push({
        type: 'high_cpu',
        severity: 'critical',
        message: `CPU usage is ${cpuUsage.toFixed(2)}%`,
        timestamp: new Date().toISOString()
      });
    } else if (cpuUsage > 80) {
      issues.push({
        type: 'high_cpu',
        severity: 'warning',
        message: `CPU usage is ${cpuUsage.toFixed(2)}%`,
        timestamp: new Date().toISOString()
      });
    }

    // Process memory issues
    const heapUsedPercent = (this.metrics.process.memory.heapUsed / this.metrics.process.memory.heapTotal) * 100;
    if (heapUsedPercent > 90) {
      issues.push({
        type: 'high_heap_usage',
        severity: 'critical',
        message: `Process heap usage is ${heapUsedPercent.toFixed(2)}%`,
        timestamp: new Date().toISOString()
      });
    } else if (heapUsedPercent > 80) {
      issues.push({
        type: 'high_heap_usage',
        severity: 'warning',
        message: `Process heap usage is ${heapUsedPercent.toFixed(2)}%`,
        timestamp: new Date().toISOString()
      });
    }

    // Add issues to alerts
    for (const issue of issues) {
      this.addAlert(issue);
      
      // Log based on severity
      if (issue.severity === 'critical') {
        logger.error('Critical system issue detected', issue);
        securityLogger.error('CRITICAL SYSTEM ISSUE', issue);
      } else if (issue.severity === 'warning') {
        logger.warn('System warning detected', issue);
      }
    }
  }

  addAlert(alert) {
    this.alerts.push(alert);
    
    // Keep only recent alerts (last 50)
    if (this.alerts.length > 50) {
      this.alerts = this.alerts.slice(-50);
    }
  }

  getRecentAlerts(limit = 10) {
    return this.alerts.slice(-limit).reverse();
  }

  getPerformanceTrend(hours = 24) {
    const since = new Date(Date.now() - (hours * 60 * 60 * 1000)).toISOString();
    return this.performanceData.filter(data => data.timestamp >= since);
  }

  getSystemReport() {
    return {
      summary: {
        status: this.metrics.memory.usage > 90 || this.getCurrentCpuUsage() > 90 ? 'warning' : 'healthy',
        monitoredSince: this.performanceData.length > 0 ? this.performanceData[0].timestamp : null,
        totalAlerts: this.alerts.length,
        monitoredItems: Object.keys(this.metrics).length
      },
      currentMetrics: this.metrics,
      recentAlerts: this.getRecentAlerts(5),
      performanceTrend: this.getPerformanceTrend(1), // Last hour
      recommendations: this.getRecommendations(),
      systemInfo: {
        platform: this.metrics.system.platform,
        release: this.metrics.system.release,
        hostname: this.metrics.system.hostname,
        cpuCount: this.metrics.cpu.count,
        totalMemory: this.metrics.memory.total
      }
    };
  }

  async generateHealthReport() {
    const health = await this.getSystemHealth();
    const report = {
      ...health,
      reportGeneratedAt: new Date().toISOString(),
      monitoredBy: 'Dukani System Monitor',
      version: process.env.npm_package_version || '1.0.0'
    };

    auditLogger.info('System health report generated', { 
      status: report.status,
      timestamp: report.timestamp
    });

    return report;
  }

  // Get metrics formatted for monitoring tools (Prometheus-style)
  getPrometheusMetrics() {
    const metrics = [];
    
    // Memory metrics
    metrics.push(`# HELP dukani_memory_usage_bytes Memory usage in bytes`);
    metrics.push(`# TYPE dukani_memory_usage_bytes gauge`);
    metrics.push(`dukani_memory_usage_bytes{type="total"} ${this.metrics.memory.total}`);
    metrics.push(`dukani_memory_usage_bytes{type="free"} ${this.metrics.memory.free}`);
    metrics.push(`dukani_memory_usage_bytes{type="used"} ${this.metrics.memory.used}`);
    
    // CPU metrics
    metrics.push(`\n# HELP dukani_cpu_usage_percent CPU usage percentage`);
    metrics.push(`# TYPE dukani_cpu_usage_percent gauge`);
    metrics.push(`dukani_cpu_usage_percent ${this.getCurrentCpuUsage()}`);
    
    // Process metrics
    metrics.push(`\n# HELP dukani_process_uptime_seconds Process uptime in seconds`);
    metrics.push(`# TYPE dukani_process_uptime_seconds gauge`);
    metrics.push(`dukani_process_uptime_seconds ${process.uptime()}`);
    
    // Process memory metrics
    const processMem = this.metrics.process.memory;
    metrics.push(`\n# HELP dukani_process_memory_bytes Process memory usage in bytes`);
    metrics.push(`# TYPE dukani_process_memory_bytes gauge`);
    metrics.push(`dukani_process_memory_bytes{type="rss"} ${processMem.rss}`);
    metrics.push(`dukani_process_memory_bytes{type="heapTotal"} ${processMem.heapTotal}`);
    metrics.push(`dukani_process_memory_bytes{type="heapUsed"} ${processMem.heapUsed}`);
    metrics.push(`dukani_process_memory_bytes{type="external"} ${processMem.external}`);
    
    return metrics.join('\n');
  }
}

// Create a singleton instance
const systemMonitor = new SystemMonitor();

module.exports = {
  SystemMonitor,
  systemMonitor
};