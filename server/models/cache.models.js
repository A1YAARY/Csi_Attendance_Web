const NodeCache = require("node-cache");

// Default TTL = 5 min (300 sec), clean expired keys every 10 min
const cache = new NodeCache({ stdTTL: 300, checkperiod: 600 });

// IST helper function
const getISTDate = (date = new Date()) => {
  const istOffset = 5.5 * 60 * 60 * 1000;
  const utc = date.getTime() + date.getTimezoneOffset() * 60000;
  return new Date(utc + istOffset);
};

const formatISTDate = (date) => {
  return new Date(date).toLocaleString("en-IN", { 
    timeZone: "Asia/Kolkata",
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
};

class CacheModel {
  // Save key-value in cache with IST timestamp
  static set(key, value, ttl = 300) {
    const dataWithTimestamp = {
      data: value,
      cachedAt: getISTDate(),
      cachedAtIST: formatISTDate(getISTDate())
    };
    return cache.set(key, dataWithTimestamp, ttl);
  }

  // Get value by key
  static get(key) {
    const cached = cache.get(key);
    return cached ? cached.data : undefined;
  }

  // Get value with metadata
  static getWithMetadata(key) {
    return cache.get(key);
  }

  // Delete key
  static del(key) {
    return cache.del(key);
  }

  // Check if key exists
  static has(key) {
    return cache.has(key);
  }

  // Get cache statistics with IST
  static getStats() {
    const stats = cache.getStats();
    return {
      ...stats,
      currentTimeIST: formatISTDate(getISTDate())
    };
  }
}

module.exports = CacheModel;
