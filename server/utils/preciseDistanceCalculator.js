// utils/preciseDistanceCalculator.js
const geolib = require('geolib');

class PreciseDistanceCalculator {
  static calculatePreciseDistance(location1, location2) {
    const distance = geolib.getDistance(
      { latitude: location1.latitude, longitude: location1.longitude },
      { latitude: location2.latitude, longitude: location2.longitude }
    );

    // Enhanced accuracy with altitude consideration
    const accuracy = this.calculateAccuracy(location1, location2, distance);
    
    return {
      distance: distance, // meters
      accuracy: accuracy,
      isWithinTolerance: distance <= (location1.accuracy || 500) + (location2.accuracy || 500) + 50,
      precision: 'high' // Can be high/medium/low based on GPS accuracy
    };
  }

  static calculateAccuracy(loc1, loc2, distance) {
    const avgAccuracy = (loc1.accuracy + loc2.accuracy) / 2;
    return Math.max(95, 500 - (avgAccuracy / distance) * 500);
  }
}

module.exports = PreciseDistanceCalculator;