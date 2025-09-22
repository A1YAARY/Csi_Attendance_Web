const QRCode = require("qrcode");
const crypto = require("crypto");

const QrGenerator = {
  generateQRCode: async (organizationId, location) => {
    try {
      // Use fewer random bytes for a shorter payload
      const timestamp = Math.floor(Date.now() / 1000); // Unix seconds – compact
      const randomBytes = crypto.randomBytes(8).toString("hex"); // Not too long

      // Keep location concise and rounded
      const qrData = {
        organizationId,
        location: {
          latitude: Number(location.latitude).toFixed(5),
          longitude: Number(location.longitude).toFixed(5),
          radius: Number(location.radius) || 100,
        },
        timestamp, // seconds since epoch
        code: randomBytes // unique token for server lookup
      };

      // QR options optimized for scan reliability
      const qrCodeImage = await QRCode.toDataURL(JSON.stringify(qrData), {
        errorCorrectionLevel: "M", // Medium (recommended for this payload size)
        type: "image/png",
        margin: 2,
        width: 300,
        color: {
          dark: "#000000",
          light: "#ffffff",
        },
      });

      return {
        code: randomBytes,
        qrData,
        qrCodeImage,
      };
    } catch (error) {
      console.error("QR code generation error:", error);
      throw error;
    }
  }
};

module.exports = QrGenerator;  





// const QRCode = require("qrcode");
// const crypto = require("crypto");

// const QrGenerator = {
//   generateQRCode: async (organizationId, location) => {
//     try {
//       const timestamp = Date.now();
//       const randomBytes = crypto.randomBytes(16).toString("hex");
//       const code = `${organizationId}_${timestamp}_${randomBytes}`;

//       const qrData = {
//         code,
//         organizationId,
//         location,
//         timestamp
//       };

//       const qrCodeImage = await QRCode.toDataURL(JSON.stringify(qrData), {
//         errorCorrectionLevel: "H",
//         type: "image/png",
//         quality: 0.98,
//         margin: 1,
//         color: {
//           dark: "#000000",
//           light: "#ffffff",
//         },
//       });

//       return {
//         code,
//         qrData,
//         qrCodeImage,
//       };
//     } catch (error) {
//       console.error("QR code generation error:", error);
//       throw error;
//     }
//   }
// };

// module.exports = QrGenerator;


// // Enhanced qrGenerator.js
// const QRCode = require("qrcode");
// const crypto = require("crypto");

// const generateModernQRCode = async (organizationId, location, validityMinutes = 30) => {
//   try {
//     // Generate unique code with better entropy
//     const timestamp = Date.now();
//     const random = crypto.randomBytes(8).toString("hex");
//     const code = `ATT_${organizationId}_${timestamp}_${random}`;
    
//     // Modern QR code options for faster scanning
//     const qrOptions = {
//       type: "image/png",
//       quality: 1.0,
//       margin: 1, // Smaller margin for cleaner look
//       color: {
//         dark: "#000000",  // Black modules
//         light: "#FFFFFF"  // White background
//       },
//       width: 300, // Higher resolution
//       errorCorrectionLevel: "M", // Medium error correction (15% damage tolerance)
//       version: 6, // Optimal version for attendance data
//     };
    
//     // Create QR data with JSON structure for faster parsing
//     const qrData = JSON.stringify({
//       type: "attendance",
//       org: organizationId,
//       code: code,
//       exp: timestamp + (validityMinutes * 60 * 1000), // Expiration timestamp
//       loc: {
//         lat: location.latitude,
//         lng: location.longitude,
//         rad: location.radius || 100
//       },
//       v: "2.0" // QR version for compatibility
//     });
    
//     // Generate high-quality QR code
//     const qrCodeImage = await QRCode.toDataURL(qrData, qrOptions);
    
//     return {
//       code,
//       qrCodeImage,
//       expiresAt: new Date(timestamp + (validityMinutes * 60 * 1000)),
//       metadata: {
//         size: "300x300",
//         errorCorrection: "M",
//         estimatedScanTime: "< 1 second"
//       }
//     };
    
//   } catch (error) {
//     console.error("QR generation error:", error);
//     throw new Error("Failed to generate QR code");
//   }
// };

// // Generate UPI-style branded QR code
// const generateBrandedQRCode = async (organizationId, orgName, location, validityMinutes = 30) => {
//   try {
//     const { code, qrCodeImage, expiresAt } = await generateModernQRCode(
//       organizationId, 
//       location, 
//       validityMinutes
//     );
    
//     // You can add logo overlay here using canvas or image processing
//     // For now, returning the base QR with better styling options
    
//     return {
//       code,
//       qrCodeImage,
//       expiresAt,
//       style: {
//         borderRadius: "12px",
//         boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
//         background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
//         padding: "20px"
//       }
//     };
    
//   } catch (error) {
//     throw new Error("Failed to generate branded QR code");
//   }
// };

// module.exports = { generateModernQRCode, generateBrandedQRCode };
