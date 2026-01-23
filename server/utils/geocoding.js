const axios = require("axios");

class EnhancedGeocodingService {
  constructor() {
    this.providers = [];
    this.setupProviders();
  }

  setupProviders() {
    this.providers = [
      this.geocodeWithLocationIQ.bind(this),
      this.geocodeWithGeoapify.bind(this),
      this.geocodeWithNominatim.bind(this),
      this.geocodeWithPhoton.bind(this),
    ];
    console.log(`🌍 Using ${this.providers.length} providers dynamically`);
  }

  // 🌍 LocationIQ (Free 5k/day)
  async geocodeWithLocationIQ(address) {
    try {
      const response = await axios.get(
        "https://us1.locationiq.com/v1/search.php",
        {
          params: {
            key: process.env.LOCATIONIQ_API_KEY, // put your free key in .env
            q: address,
            format: "json",
            limit: 1,
            countrycodes: "in",
          },
          timeout: 8000,
        },
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
            apiKey: process.env.GEOAPIFY_API_KEY,
            text: address,
            limit: 1,
            filter: "countrycode:in",
          },
          timeout: 8000,
        },
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
        },
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
      if (response.data.features?.length > 0) {
        const r = response.data.features[0];
        return {
          latitude: r.geometry.coordinates[1],
          longitude: r.geometry.coordinates[0],
          formatted_address: r.properties.name || address,
          provider: "photon",
          confidence: 0.5,
          accuracy: "street",
        };
      }
      return null;
    } catch {
      return null;
    }
  }

  // Main geocode method
  async geocodeAddress(address) {
    console.log(`🎯 Geocoding: "${address}"`);
    const results = [];

    for (const provider of this.providers) {
      const result = await provider(address);
      if (result) {
        results.push(result);

        // If very confident → return immediately
        if (result.confidence >= 0.85 && result.accuracy === "exact") {
          console.log(`✅ High confidence result from ${result.provider}`);
          return result;
        }
      }
      await new Promise((res) => setTimeout(res, 500)); // avoid rate limit
    }

    if (results.length === 0) {
      throw new Error("No results found from providers");
    }

    // Cross-check → if two providers agree closely, boost confidence
    const best = this.selectMostAccurateResult(results);
    return best;
  }

  // Smart selection
  selectMostAccurateResult(results) {
    if (results.length === 1) return results[0];

    results.forEach(
      (r) =>
        (r.finalScore =
          (r.confidence || 0.5) + (r.accuracy === "exact" ? 0.3 : 0.1)),
    );

    results.sort((a, b) => b.finalScore - a.finalScore);

    // Cross-verification check (within ~200m)
    if (results.length > 1) {
      const top = results[0];
      const second = results[1];
      const distance = this.haversineDistance(top, second);
      if (distance < 0.2) top.confidence = Math.min(1, top.confidence + 0.1);
    }

    return results[0];
  }

  // Distance between two results in km
  haversineDistance(a, b) {
    const toRad = (x) => (x * Math.PI) / 180;
    const R = 6371; // km
    const dLat = toRad(b.latitude - a.latitude);
    const dLon = toRad(b.longitude - a.longitude);
    const lat1 = toRad(a.latitude);
    const lat2 = toRad(b.latitude);

    const h =
      Math.sin(dLat / 2) ** 2 +
      Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
    return 2 * R * Math.asin(Math.sqrt(h));
  }

  determineAccuracy(type, class_) {
    const exact = ["house", "building", "college", "university", "school"];
    if (exact.includes(type) || exact.includes(class_)) return "exact";
    return "street";
  }
}

module.exports = new EnhancedGeocodingService();
