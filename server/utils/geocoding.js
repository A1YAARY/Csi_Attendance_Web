const axios = require('axios');
const { ApiError } = require('../utils/errorHandler'); // New import

// Configuration for multiple geocoding providers
const PROVIDERS = {
  google: {
    key: process.env.GOOGLE_MAPS_API_KEY,
    baseUrl: 'https://maps.googleapis.com/maps/api/geocode/json',
    priority: 1,
  },
  openstreet: {
    baseUrl: 'https://nominatim.openstreetmap.org/search',
    priority: 2,
  },
  // Add more providers as needed
};

// Cache for geocoding results (avoid rate limits)
const geocodingCache = new Map();
const CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days for addresses

  // 🌍 LocationIQ (Free 5k/day)
  async geocodeWithLocationIQ(address) {
    try {
      const response = await axios.get(
        "https://us1.locationiq.com/v1/search.php",
        {
          params: {
            key: process.env.LOCATIONIQ_KEY, // put your free key in .env
            q: address,
            format: "json",
            limit: 1,
            countrycodes: "in",
          },
          timeout: 8000,
        }
      );
      if (response.data && response.data[0]) {
        const r = response.data[0];
        return {
          latitude: parseFloat(r.lat),
          longitude: parseFloat(r.lon),
          formatted_address: r.display_name,
          provider: "locationiq",
          confidence: parseFloat(r.importance || 0.8),
          accuracy: this.determineAccuracy(r.type, r.class),
        };
      }
      return null;
    } catch {
      return null;
    }
  }

  // 🌍 Geoapify (Free 3k/day)
  async geocodeWithGeoapify(address) {
    try {
      const response = await axios.get(
        "https://api.geoapify.com/v1/geocode/search",
        {
          params: {
            apiKey: process.env.GEOAPIFY_KEY,
            text: address,
            limit: 1,
            filter: "countrycode:in",
          },
          timeout: 8000,
        }
      );
      if (response.data.features?.length > 0) {
        const r = response.data.features[0];
        return {
          latitude: r.geometry.coordinates[1],
          longitude: r.geometry.coordinates[0],
          formatted_address: r.properties.formatted,
          provider: "geoapify",
          confidence: r.properties.rank.confidence || 0.7,
          accuracy:
            r.properties.rank.match_type === "exact" ? "exact" : "street",
        };
      }
      return null;
    } catch (err) {
       console.error("Geoapify error:", err.message);
      return null;
    }
  }

  // 🌍 Nominatim (OpenStreetMap)
  async geocodeWithNominatim(address) {
    try {
      const response = await axios.get(
        "https://nominatim.openstreetmap.org/search",
        {
          params: {
            q: address,
            format: "json",
            limit: 1,
            addressdetails: 1,
            countrycodes: "in",
          },
          headers: { "User-Agent": "EnhancedGeocoder/1.0" },
          timeout: 8000,
        }
      );
      if (response.data.length > 0) {
        const r = response.data[0];
        return {
          latitude: parseFloat(r.lat),
          longitude: parseFloat(r.lon),
          formatted_address: r.display_name,
          provider: "nominatim",
          confidence: parseFloat(r.importance || 0.6),
          accuracy: this.determineAccuracy(r.type, r.class),
        };
      }
      return null;
    } catch {
      return null;
    }
  }

  // 🌍 Photon (OSM-based, no key)
  async geocodeWithPhoton(address) {
    try {
      const response = await axios.get("https://photon.komoot.io/api/", {
        params: { q: address, limit: 1 },
        timeout: 8000,
      });
    }

    const cleanAddress = address.trim();
    const cacheKey = `geocode_${cleanAddress.toLowerCase()}`;

    // Check cache first
    const cached = geocodingCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
      return {
        ...cached.result,
        fromCache: true,
      };
    }

    // Try providers in priority order
    for (const [provider, config] of Object.entries(PROVIDERS)) {
      try {
        const result = await callGeocodingProvider(provider, config, cleanAddress, options);
        if (result && result.latitude && result.longitude) {
          // Cache successful result
          const cacheData = { result, timestamp: Date.now() };
          geocodingCache.set(cacheKey, cacheData);
          return {
            ...result,
            fromCache: false,
            provider: provider,
          };
        }
      } catch (providerError) {
        console.warn(`Provider ${provider} failed:`, providerError.message);
        // Continue to next provider
      }
    }

    // All providers failed
    throw new ApiError(404, 'Unable to geocode address. No valid coordinates found.', {
      code: 'GEOCODING_FAILED',
      address: cleanAddress,
      triedProviders: Object.keys(PROVIDERS),
    });
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(500, 'Geocoding service error', {
      code: 'GEOCODING_SERVICE_ERROR',
      address: address,
    });
  }
}

// Call specific provider
async function callGeocodingProvider(provider, config, address, options) {
  switch (provider) {
    case 'google':
      if (!config.key) {
        throw new Error('Google API key missing');
      }
      const googleParams = {
        address: address,
        key: config.key,
        components: options.country ? `country:${options.country}` : undefined,
      };
      const googleResponse = await axios.get(config.baseUrl, {
        params: googleParams,
        timeout: 10000,
      });

      if (googleResponse.data.status === 'OK' && googleResponse.data.results.length > 0) {
        const result = googleResponse.data.results[0];
        return {
          latitude: parseFloat(result.geometry.location.lat),
          longitude: parseFloat(result.geometry.location.lng),
          formattedAddress: result.formatted_address,
          accuracy: result.geometry.location_type, // e.g., 'ROOFTOP', 'APPROXIMATE'
          confidence: 0.9, // High for Google
          provider: 'google',
          placeId: result.place_id,
          components: result.address_components,
        };
      }
      throw new Error('No results from Google');

    case 'openstreet':
      const osmParams = {
        q: address,
        format: 'json',
        limit: 1,
        addressdetails: 1,
      };
      if (options.country) {
        osmParams.countrycodes = options.country.toLowerCase();
      }
      const osmResponse = await axios.get(config.baseUrl, {
        params: osmParams,
        headers: { 'User-Agent': 'CSI-Attendance-App/1.0' },
        timeout: 10000,
      });

      if (osmResponse.data.length > 0) {
        const result = osmResponse.data[0];
        return {
          latitude: parseFloat(result.lat),
          longitude: parseFloat(result.lon),
          formattedAddress: result.display_name,
          accuracy: result.type, // e.g., 'house', 'street'
          confidence: 0.7, // Medium for OSM
          provider: 'openstreet',
          placeId: result.place_id,
          components: result.address,
        };
      }
      throw new Error('No results from OpenStreetMap');

    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}

// Reverse geocoding: Get address from coordinates
async function reverseGeocode(latitude, longitude, options = {}) {
  try {
    if (!latitude || !longitude) {
      throw new ApiError(400, 'Latitude and longitude are required', {
        code: 'INVALID_COORDS',
      });
    }

    // Similar multi-provider logic...
    // Implementation similar to geocodeAddress but with lat/lng params
    // For brevity, using Google as example

    const googleParams = {
      latlng: `${latitude},${longitude}`,
      key: PROVIDERS.google.key,
      result_type: options.type || 'street_address',
    };

    const response = await axios.get(PROVIDERS.google.baseUrl, {
      params: googleParams,
      timeout: 10000,
    });

    if (response.data.status === 'OK' && response.data.results.length > 0) {
      const result = response.data.results[0];
      return {
        formattedAddress: result.formatted_address,
        addressComponents: result.address_components,
        provider: 'google',
        confidence: 0.95,
      };
    }

    throw new ApiError(404, 'Unable to reverse geocode coordinates', {
      code: 'REVERSE_GEOCODING_FAILED',
      lat: latitude,
      lng: longitude,
    });
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(500, 'Reverse geocoding service error', {
      code: 'REVERSE_GEOCODING_ERROR',
    });
  }
}

module.exports = {
  geocodeAddress,
  reverseGeocode,
};
