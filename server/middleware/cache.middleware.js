const CacheModel = require("../models/cache.models");

module.exports = (duration) => (req, res, next) => {
  const key = req.originalUrl; // unique cache key based on request URL

  if (CacheModel.has(key)) {
    console.log("Serving from cache:", key);
    return res.json(CacheModel.get(key));
  } else {
    // wrap res.json to store response in cache
    res.sendResponse = res.json;
    res.json = (body) => {
      try {
        CacheModel.set(key, body, duration);
      } catch (error) {
        console.error("Cache set error:", error); // Log but don't throw
      }
      res.sendResponse(body);
    };
    next();
  }
};
