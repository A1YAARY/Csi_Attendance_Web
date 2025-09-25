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
      CacheModel.set(key, body, duration);
      res.sendResponse(body);
    };
    next();
  }
};



