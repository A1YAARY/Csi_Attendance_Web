const geolib = require('geolib');

exports.isLocationWithin = (orgLocation, userLocation, tolerance = 500) => {
  const distance = geolib.getDistance(
    { latitude: orgLocation.latitude, longitude: orgLocation.longitude },
    { latitude: userLocation.latitude, longitude: userLocation.longitude }
  );
  
  return {
    isWithin: distance <= tolerance,
    distance: distance,
    tolerance: tolerance
  };
};

exports.calculateDistance = (location1, location2) => {
  return geolib.getDistance(
    { latitude: location1.latitude, longitude: location1.longitude },
    { latitude: location2.latitude, longitude: location2.longitude }
  );
};
