// utils/performanceMonitor.js
class PerformanceMonitor {
  constructor() {
    this.metrics = new Map();
  }

  startTimer(label) {
    this.metrics.set(label, {
      start: process.hrtime(),
      calls: (this.metrics.get(label)?.calls || 0) + 1,
    });
  }

  endTimer(label) {
    const metric = this.metrics.get(label);
    if (metric) {
      const diff = process.hrtime(metric.start);
      const duration = diff[0] * 1000 + diff[1] / 1000000; // milliseconds

      metric.totalTime = (metric.totalTime || 0) + duration;
      metric.averageTime = metric.totalTime / metric.calls;

      return duration;
    }
    return 0;
  }

  getMetrics() {
    return Array.from(this.metrics.entries()).map(([label, data]) => ({
      label,
      ...data,
    }));
  }
}

module.exports = new PerformanceMonitor();
