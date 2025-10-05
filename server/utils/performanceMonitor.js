// utils/performanceMonitor.js
const logger = require('./logger'); // Assuming logger.js exists

class PerformanceMonitor {
  constructor() {
    this.metrics = new Map();
    this.intervalId = null;

    // Periodic flush (every 5 min) - log slow operations
    this.startPeriodicFlush();
  }

  startTimer(label) {
    try {
      const existing = this.metrics.get(label) || { calls: 0, totalTime: 0 };
      existing.calls = existing.calls + 1;
      existing.start = process.hrtime();
      this.metrics.set(label, existing);
    } catch (error) {
      logger.error(`Performance timer start failed for ${label}: ${error.message}`);
    }
  }

  endTimer(label) {
    try {
      const metric = this.metrics.get(label);
      if (metric && metric.start) {
        const diff = process.hrtime(metric.start);
        const duration = diff[0] * 1000 + diff[1] / 1000000; // ms
        metric.totalTime = (metric.totalTime || 0) + duration;
        metric.averageTime = metric.totalTime / metric.calls;
        metric.lastDuration = duration;
        this.metrics.set(label, metric);
        return duration;
      }
      return 0;
    } catch (error) {
      logger.error(`Performance timer end failed for ${label}: ${error.message}`);
      return 0;
    }
  }

  getMetrics() {
    return Array.from(this.metrics.entries()).map(([label, data]) => ({
      label,
      calls: data.calls,
      totalTime: data.totalTime?.toFixed(2) || 0,
      averageTime: data.averageTime?.toFixed(2) || 0,
      lastDuration: data.lastDuration?.toFixed(2) || 0,
    }));
  }

  clearMetrics(label) {
    if (label) {
      this.metrics.delete(label);
    } else {
      this.metrics.clear();
    }
  }

  startPeriodicFlush() {
    if (this.intervalId) return;
    this.intervalId = setInterval(() => {
      const metrics = this.getMetrics();
      const slowOps = metrics.filter(m => m.averageTime > 100); // Log slow ops >100ms
      if (slowOps.length > 0) {
        logger.warn('Slow performance metrics detected:', { slowOps });
      }
    }, 5 * 60 * 1000); // 5 min
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}

const monitor = new PerformanceMonitor();
module.exports = monitor;
