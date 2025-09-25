// utils/advancedCache.js
const NodeCache = require('node-cache');

class AdvancedCache {
  constructor() {
    this.cache = new NodeCache({
      stdTTL: 3600, // 1 hour default
      checkperiod: 600, // cleanup every 10 minutes
      useClones: false, // better performance
      maxKeys: 10000 // prevent memory leaks
    });
  }

  set(key, value, ttl = 3600) {
    return this.cache.set(key, value, ttl);
  }

  get(key) {
    return this.cache.get(key);
  }

  del(key) {
    return this.cache.del(key);
  }

  flush() {
    return this.cache.flushAll();
  }

  stats() {
    return this.cache.getStats();
  }

  // Pattern-based deletion for cache invalidation
  deletePattern(pattern) {
    const keys = this.cache.keys();
    const matchingKeys = keys.filter(key => key.includes(pattern));
    matchingKeys.forEach(key => this.del(key));
    return matchingKeys.length;
  }
}

module.exports = new AdvancedCache();