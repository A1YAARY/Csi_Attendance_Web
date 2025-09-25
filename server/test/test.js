require("dotenv").config();
const geocoder = require("../utils/geocoding");

(async () => {
  try {
    // Try some addresses
    const addresses = [
      "Atharva College of Engineering, Mumbai",
      "IIT Bombay",
      "Mumbai University",
      "Gateway of India, Mumbai",
      "Taj Mahal, Agra",
    ];

    for (const addr of addresses) {
      console.log("\n--------------------------------------------");
      console.log(`📍 Testing address: ${addr}`);
      const result = await geocoder.geocodeAddress(addr);
      console.log("✅ Geocoded result:", result);
    }
  } catch (err) {
    console.error("❌ Test failed:", err.message);
  }
})();
