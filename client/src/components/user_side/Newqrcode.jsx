// import React, { useEffect, useRef, useState } from "react";
// import { Html5Qrcode } from "html5-qrcode";
// import { useNavigate } from "react-router-dom";
// import axios from "axios";

// const NewQrcode = () => {
//   const navigate = useNavigate();
//   const html5QrCodeRef = useRef(null);
//   const busyRef = useRef(false);
//   const [scannerRunning, setScannerRunning] = useState(false);
//   const [isProcessing, setIsProcessing] = useState(false);
//   const [errorMessage, setErrorMessage] = useState("");
//   const [currentStatus, setCurrentStatus] = useState(null);
//   const [ready, setReady] = useState(false);
//   const [showActionModal, setShowActionModal] = useState(false);
//   const [selectedAction, setSelectedAction] = useState(null);
//   const [scannerStarted, setScannerStarted] = useState(false);
//   const [location, setLocation] = useState(null);
//   const [locationError, setLocationError] = useState("");

//   const BASE_URL =
//     import.meta.env.VITE_BACKEND_BASE_URL ||
//     "https://csi-attendance-web.onrender.com";
//   const token = localStorage.getItem("accessToken");

//   // Get the same device ID used in login
//   const deviceId =
//     localStorage.getItem("attendance_device_id") || "unknown_device";

//   // Get user's current location
//   const getCurrentLocation = () => {
//     return new Promise((resolve) => {
//       if (!navigator.geolocation) {
//         setLocationError("Geolocation is not supported by this browser.");
//         resolve(null);
//         return;
//       }

//       navigator.geolocation.getCurrentPosition(
//         (position) => {
//           const locationData = {
//             latitude: position.coords.latitude,
//             longitude: position.coords.longitude,
//             accuracy: position.coords.accuracy,
//             timestamp: position.timestamp,
//           };
//           setLocation(locationData);
//           setLocationError("");
//           resolve(locationData);
//         },
//         (error) => {
//           let errorMsg = "Unable to retrieve your location. ";
//           switch (error.code) {
//             case error.PERMISSION_DENIED:
//               errorMsg += "Please enable location permissions for this site.";
//               break;
//             case error.POSITION_UNAVAILABLE:
//               errorMsg += "Location information is unavailable.";
//               break;
//             case error.TIMEOUT:
//               errorMsg += "Location request timed out.";
//               break;
//             default:
//               errorMsg += "An unknown error occurred.";
//               break;
//           }
//           setLocationError(errorMsg);
//           resolve(null);
//         },
//         {
//           enableHighAccuracy: true,
//           timeout: 10000,
//           maximumAge: 60000,
//         }
//       );
//     });
//   };

//   // Get user's current attendance status
//   const getUserStatus = async () => {
//     try {
//       // First, try to get location
//       await getCurrentLocation();

//       const response = await axios.get(`${BASE_URL}/attend/past?limit=1`, {
//         headers: {
//           Authorization: `Bearer ${token}`,
//           "Content-Type": "application/json",
//           "X-Device-ID": deviceId,
//         },
//       });

//       const arr = response.data?.data || response.data?.attendance || [];
//       if (Array.isArray(arr) && arr.length > 0) {
//         const lastEntry = arr[0];
//         setCurrentStatus(
//           lastEntry.type === "check-in" ? "checked-in" : "checked-out"
//         );
//       } else {
//         setCurrentStatus("checked-out");
//       }
//     } catch (error) {
//       console.log("Could not fetch user status, defaulting to checked-out");
//       setCurrentStatus("checked-out");
//     } finally {
//       setReady(true);
//       setShowActionModal(true);
//     }
//   };

//   const stopCamera = async () => {
//     try {
//       if (html5QrCodeRef.current) {
//         await html5QrCodeRef.current.stop();
//         html5QrCodeRef.current.clear();
//       }
//     } catch (e) {
//       console.warn("Camera stop error:", e);
//     }
//     setScannerRunning(false);
//   };

//   const parseQr = (decodedText) => {
//     try {
//       const parsed = JSON.parse(decodedText);
//       return {
//         code: parsed.code || decodedText,
//         qrType: parsed.qrType || parsed.type,
//       };
//     } catch {
//       return { code: decodedText, qrType: undefined };
//     }
//   };

//   const handleScanning = async (decodedText) => {
//     if (busyRef.current || isProcessing) return;
//     busyRef.current = true;
//     setIsProcessing(true);

//     try {
//       const { code, qrType } = parseQr(decodedText);
//       const nextAction =
//         selectedAction ||
//         (qrType && (qrType === "check-in" || qrType === "check-out")
//           ? qrType
//           : currentStatus === "checked-in"
//           ? "check-out"
//           : "check-in");

//       console.log("🔍 QR Scan Details:", {
//         code: code.substring(0, 20) + "...",
//         action: nextAction,
//         deviceId: deviceId,
//         hasLocation: !!location,
//         location: location,
//       });

//       // Prepare scan data with enhanced device info
//       const scanData = {
//         code,
//         type: nextAction,
//         location: location || {
//           latitude: 0,
//           longitude: 0,
//           accuracy: 0,
//         },
//         deviceInfo: {
//           deviceId: deviceId,
//           platform: navigator.platform,
//           userAgent: navigator.userAgent,
//           fingerprint: deviceId,
//           screenResolution: `${screen.width}x${screen.height}`,
//           timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
//           language: navigator.language,
//         },
//       };

//       console.log("📤 Sending scan data:", scanData);

//       const response = await axios.post(`${BASE_URL}/attend/scan`, scanData, {
//         headers: {
//           Authorization: `Bearer ${token}`,
//           "Content-Type": "application/json",
//           "X-Device-ID": deviceId,
//         },
//         withCredentials: true,
//         timeout: 15000,
//       });

//       console.log("✅ Scan successful:", response.data);

//       // Update status
//       setCurrentStatus(
//         nextAction === "check-in" ? "checked-in" : "checked-out"
//       );
//       const scanResultData = {
//         success: true,
//         action: nextAction,
//         timestamp: response.data.data?.timestamp || new Date().toISOString(),
//         message: response.data.message,
//         location: {
//           distance: response.data.data?.location?.distance,
//           withinRange: response.data.data?.location?.withinRange,
//         },
//         dailySummary: response.data.data?.dailySummary || {},
//         verified: response.data.data?.verified || false,
//         attendanceId: response.data.data?.attendanceId,
//       };

//       // Store in localStorage for animation page
//       localStorage.setItem("scanResult", JSON.stringify(scanResultData));

//       // Navigate to success
//       setTimeout(() => {
//         navigate("/animation", {
//           state: {
//             scanData: scanResultData,
//             fromScan: true,
//           },
//         });
//       }, 500);
//     } catch (error) {
//       console.error("❌ Scan failed:", error);

//       let errorMsg =
//         error.response?.data?.message || error.message || "Scan failed";

//       // Enhanced error handling
//       if (error.response?.data?.code === "UNAUTHORIZED_DEVICE") {
//         errorMsg = `🚫 Device Not Authorized\n\nThis device is not registered for your account.\n\nRegistered: ${error.response.data.registeredDevice}\nCurrent: ${error.response.data.currentDevice}\n\nContact admin to reset your device.`;
//       } else if (error.response?.data?.code === "LOCATION_OUT_OF_RANGE") {
//         errorMsg = `📍 Location Issue\n\nYou are ${error.response.data.data?.currentDistance}m away from the organization.\nRequired: within ${error.response.data.data?.allowedRadius}m.\n\nPlease move closer to the organization location.`;
//       } else if (error.response?.data?.code === "LOCATION_REQUIRED") {
//         errorMsg =
//           "📍 Location access required. Please enable location services.";
//       } else if (error.code === "ECONNABORTED") {
//         errorMsg =
//           "Request timeout. Please check your connection and try again.";
//       }

//       setErrorMessage(errorMsg);

//       // Return to dashboard after error
//       setTimeout(() => {
//         navigate("/dashboard");
//       }, 5000);
//     } finally {
//       setIsProcessing(false);
//     }
//   };

//   const handleActionSelect = (action) => {
//     if (!location && !locationError) {
//       // Try to get location again if not available
//       getCurrentLocation().then(() => {
//         setSelectedAction(action);
//         setShowActionModal(false);
//         setScannerStarted(true);
//       });
//     } else {
//       setSelectedAction(action);
//       setShowActionModal(false);
//       setScannerStarted(true);
//     }
//   };

//   useEffect(() => {
//     getUserStatus();
//   }, []);

//   useEffect(() => {
//     if (!ready || !scannerStarted || showActionModal) return;

//     const elementId = "qr-reader";
//     let scanner = null;

//     const startScanner = async () => {
//       try {
//         scanner = new Html5Qrcode(elementId);
//         html5QrCodeRef.current = scanner;

//         const devices = await Html5Qrcode.getCameras();
//         if (!devices || devices.length === 0) {
//           setErrorMessage("📷 No camera found on this device");
//           return;
//         }

//         const rearCamera = devices.find((camera) => {
//           const label = (camera.label || "").toLowerCase();
//           return label.includes("back") || label.includes("rear");
//         });

//         const selectedCamera =
//           rearCamera || devices[devices.length - 1] || devices[0];
//         console.log("📱 Selected camera:", selectedCamera.label);

//         await scanner.start(
//           selectedCamera.id,
//           {
//             fps: 10,
//             qrbox: { width: 250, height: 250 },
//             aspectRatio: 1.0,
//           },
//           (decodedText) => {
//             if (busyRef.current) return;
//             console.log(
//               "📷 QR Detected:",
//               decodedText.substring(0, 50) + "..."
//             );

//             (async () => {
//               await stopCamera();
//               await handleScanning(decodedText);
//             })();
//           },
//           (error) => {
//             // Ignore frequent scan errors
//             if (error && !String(error).includes("NotFoundException")) {
//               console.warn("Scanner warning:", error);
//             }
//           }
//         );

//         setScannerRunning(true);
//       } catch (err) {
//         console.error("Scanner initialization failed:", err);
//         if (err.name === "NotAllowedError") {
//           setErrorMessage(
//             "📷 Camera permission denied. Please allow camera access in your browser settings."
//           );
//         } else {
//           setErrorMessage("📷 Failed to start camera: " + err.message);
//         }
//       }
//     };

//     const timer = setTimeout(startScanner, 100);
//     return () => {
//       clearTimeout(timer);
//       stopCamera();
//     };
//   }, [ready, scannerStarted, showActionModal]);

//   const handleCancel = () => {
//     stopCamera();
//     navigate("/dashboard");
//   };

//   return (
//     <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
//       {/* Action Selection Modal */}
//       {showActionModal && (
//         <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
//           <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
//             <div className="text-center">
//               <div className="text-4xl mb-4">
//                 {currentStatus === "checked-in" ? "🔓" : "🔒"}
//               </div>
//               <h2 className="text-xl font-bold text-gray-800 mb-2">
//                 Attendance Action
//               </h2>

//               {locationError && (
//                 <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
//                   <p className="text-yellow-800 text-sm">{locationError}</p>
//                 </div>
//               )}

//               {location && (
//                 <div className="bg-green-50 border border-green-200 rounded-lg p-2 mb-4">
//                   <p className="text-green-800 text-xs">
//                     📍 Location ready (Accuracy: ±
//                     {Math.round(location.accuracy)}m)
//                   </p>
//                 </div>
//               )}

//               <p className="text-gray-600 mb-4">
//                 {currentStatus === "checked-in"
//                   ? "You are currently checked in"
//                   : "You are currently checked out"}
//               </p>

//               <div className="space-y-3">
//                 <button
//                   onClick={() => handleActionSelect("check-in")}
//                   disabled={!location && !locationError}
//                   className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white py-3 px-4 rounded-lg font-medium transition duration-200 disabled:cursor-not-allowed"
//                 >
//                   🔓 Check In
//                 </button>
//                 <button
//                   onClick={() => handleActionSelect("check-out")}
//                   disabled={!location && !locationError}
//                   className="w-full bg-red-500 hover:bg-red-600 disabled:bg-gray-300 text-white py-3 px-4 rounded-lg font-medium transition duration-200 disabled:cursor-not-allowed"
//                 >
//                   🔒 Check Out
//                 </button>
//                 <button
//                   onClick={handleCancel}
//                   className="w-full bg-gray-300 hover:bg-gray-400 text-gray-700 py-3 px-4 rounded-lg font-medium transition duration-200"
//                 >
//                   Cancel
//                 </button>
//               </div>
//             </div>
//           </div>
//         </div>
//       )}

//       {/* Scanner Interface */}
//       <div className="container mx-auto px-4 py-8">
//         <div className="max-w-md mx-auto">
//           <div className="text-center mb-6">
//             <h1 className="text-2xl font-bold text-gray-800 mb-2">
//               QR Code Scanner
//             </h1>
//             <div className="bg-blue-100 rounded-lg p-3 mb-4">
//               <p className="text-blue-800 font-medium text-sm">
//                 Device: {deviceId.substring(0, 20)}...
//               </p>
//               {location && (
//                 <p className="text-blue-600 text-xs">
//                   Location: {location.latitude.toFixed(4)},{" "}
//                   {location.longitude.toFixed(4)}
//                 </p>
//               )}
//             </div>
//           </div>

//           {errorMessage && (
//             <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-4 text-center">
//               <p className="whitespace-pre-line text-sm">{errorMessage}</p>
//             </div>
//           )}

//           {isProcessing && (
//             <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded-lg mb-4 text-center">
//               <div className="flex items-center justify-center">
//                 <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-700 mr-2"></div>
//                 Processing attendance...
//               </div>
//             </div>
//           )}

//           <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
//             <div id="qr-reader" className="w-full aspect-square"></div>

//             {!showActionModal && !errorMessage && (
//               <div className="p-4 text-center">
//                 <p className="text-gray-600 mb-2">📱 Point camera at QR code</p>
//                 <p className="text-sm text-gray-500">
//                   Make sure location services are enabled
//                 </p>

//                 <button
//                   onClick={handleCancel}
//                   className="mt-4 bg-gray-500 hover:bg-gray-600 text-white py-2 px-6 rounded-lg font-medium transition duration-200"
//                 >
//                   Cancel Scan
//                 </button>
//               </div>
//             )}
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default NewQrcode;
import React, { useEffect, useRef, useState, useCallback } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const NewQrcode = () => {
  const navigate = useNavigate();
  const html5QrCodeRef = useRef(null);
  const busyRef = useRef(false);
  const locationTimeoutRef = useRef(null);
  const [scannerRunning, setScannerRunning] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [currentStatus, setCurrentStatus] = useState(null);
  const [ready, setReady] = useState(false);
  const [showActionModal, setShowActionModal] = useState(false);
  const [selectedAction, setSelectedAction] = useState(null);
  const [scannerStarted, setScannerStarted] = useState(false);
  const [location, setLocation] = useState(null);
  const [locationError, setLocationError] = useState("");
  const [isLoadingLocation, setIsLoadingLocation] = useState(true);
  const [locationStatus, setLocationStatus] = useState("fetching"); // fetching, success, error, timeout

  const BASE_URL =
    import.meta.env.VITE_BACKEND_BASE_URL ||
    "https://csi-attendance-web.onrender.com";
  const token = localStorage.getItem("accessToken");

  const deviceId =
    localStorage.getItem("attendance_device_id") || "unknown_device";

  // Optimized location fetching with aggressive timeout and fallback
  const getCurrentLocation = useCallback(() => {
    return new Promise((resolve) => {
      setIsLoadingLocation(true);
      setLocationStatus("fetching");

      if (!navigator.geolocation) {
        setLocationError("Geolocation not supported");
        setLocationStatus("error");
        setIsLoadingLocation(false);
        resolve(null);
        return;
      }

      // Set a strict timeout for location
      locationTimeoutRef.current = setTimeout(() => {
        setLocationStatus("timeout");
        setLocationError("Location timeout - continuing without precise location");
        setIsLoadingLocation(false);
        resolve(null);
      }, 3000); // 3 second timeout

      const options = {
        enableHighAccuracy: false, // Faster, less accurate
        timeout: 2500, // 2.5 second timeout
        maximumAge: 300000, // Accept 5-minute old location
      };

      navigator.geolocation.getCurrentPosition(
        (position) => {
          if (locationTimeoutRef.current) {
            clearTimeout(locationTimeoutRef.current);
          }
          
          const locationData = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp,
          };
          
          setLocation(locationData);
          setLocationError("");
          setLocationStatus("success");
          setIsLoadingLocation(false);
          resolve(locationData);
        },
        (error) => {
          if (locationTimeoutRef.current) {
            clearTimeout(locationTimeoutRef.current);
          }
          
          let errorMsg = "";
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMsg = "Location permission denied";
              break;
            case error.POSITION_UNAVAILABLE:
              errorMsg = "Location unavailable";
              break;
            case error.TIMEOUT:
              errorMsg = "Location request timeout";
              break;
            default:
              errorMsg = "Location error occurred";
              break;
          }
          
          setLocationError(errorMsg);
          setLocationStatus("error");
          setIsLoadingLocation(false);
          resolve(null);
        },
        options
      );
    });
  }, []);

  // Get user's current attendance status
  const getUserStatus = async () => {
    try {
      const response = await axios.get(`${BASE_URL}/attend/past?limit=1`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "X-Device-ID": deviceId,
        },
      });

      const arr = response.data?.data || response.data?.attendance || [];
      if (Array.isArray(arr) && arr.length > 0) {
        const lastEntry = arr[0];
        setCurrentStatus(
          lastEntry.type === "check-in" ? "checked-in" : "checked-out"
        );
      } else {
        setCurrentStatus("checked-out");
      }
    } catch (error) {
      console.log("Could not fetch user status, defaulting to checked-out");
      setCurrentStatus("checked-out");
    }
  };

  // Initialize everything in parallel
  const initializeApp = async () => {
    setReady(false);
    
    // Start both location and status fetching in parallel
    const [locationResult] = await Promise.allSettled([
      getCurrentLocation(),
      getUserStatus(),
    ]);

    // Always set ready to true after initialization attempts
    setReady(true);
    setShowActionModal(true);
  };

  const stopCamera = async () => {
    try {
      if (html5QrCodeRef.current) {
        await html5QrCodeRef.current.stop();
        html5QrCodeRef.current.clear();
      }
    } catch (e) {
      console.warn("Camera stop error:", e);
    }
    setScannerRunning(false);
  };

  const parseQr = (decodedText) => {
    try {
      const parsed = JSON.parse(decodedText);
      return {
        code: parsed.code || decodedText,
        qrType: parsed.qrType || parsed.type,
      };
    } catch {
      return { code: decodedText, qrType: undefined };
    }
  };

  const handleScanning = async (decodedText) => {
    if (busyRef.current || isProcessing) return;
    busyRef.current = true;
    setIsProcessing(true);

    try {
      const { code, qrType } = parseQr(decodedText);
      const nextAction =
        selectedAction ||
        (qrType && (qrType === "check-in" || qrType === "check-out")
          ? qrType
          : currentStatus === "checked-in"
          ? "check-out"
          : "check-in");

      console.log("🔍 QR Scan Details:", {
        code: code.substring(0, 20) + "...",
        action: nextAction,
        deviceId: deviceId,
        hasLocation: !!location,
        locationStatus,
      });

      // Use best available location or fallback
      const locationData = location || {
        latitude: 0,
        longitude: 0,
        accuracy: 999999,
        fallback: true
      };

      const scanData = {
        code,
        type: nextAction,
        location: locationData,
        deviceInfo: {
          deviceId: deviceId,
          platform: navigator.platform,
          userAgent: navigator.userAgent,
          fingerprint: deviceId,
          screenResolution: `${screen.width}x${screen.height}`,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          language: navigator.language,
        },
      };

      console.log("📤 Sending scan data:", scanData);

      const response = await axios.post(`${BASE_URL}/attend/scan`, scanData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "X-Device-ID": deviceId,
        },
        withCredentials: true,
        timeout: 15000,
      });

      console.log("✅ Scan successful:", response.data);

      setCurrentStatus(
        nextAction === "check-in" ? "checked-in" : "checked-out"
      );
      
      const scanResultData = {
        success: true,
        action: nextAction,
        timestamp: response.data.data?.timestamp || new Date().toISOString(),
        message: response.data.message,
        location: {
          distance: response.data.data?.location?.distance,
          withinRange: response.data.data?.location?.withinRange,
        },
        dailySummary: response.data.data?.dailySummary || {},
        verified: response.data.data?.verified || false,
        attendanceId: response.data.data?.attendanceId,
      };

      localStorage.setItem("scanResult", JSON.stringify(scanResultData));

      setTimeout(() => {
        navigate("/animation", {
          state: {
            scanData: scanResultData,
            fromScan: true,
          },
        });
      }, 500);
    } catch (error) {
      console.error("❌ Scan failed:", error);

      let errorMsg =
        error.response?.data?.message || error.message || "Scan failed";

      if (error.response?.data?.code === "UNAUTHORIZED_DEVICE") {
        errorMsg = `🚫 Device Not Authorized\n\nContact admin to reset your device.`;
      } else if (error.response?.data?.code === "LOCATION_OUT_OF_RANGE") {
        errorMsg = `📍 You are too far from the organization location.\n\nDistance: ${error.response.data.data?.currentDistance}m\nRequired: within ${error.response.data.data?.allowedRadius}m`;
      } else if (error.response?.data?.code === "LOCATION_REQUIRED") {
        errorMsg = "📍 Location access required. Please enable location services.";
      } else if (error.code === "ECONNABORTED") {
        errorMsg = "Request timeout. Please check your connection.";
      }

      setErrorMessage(errorMsg);

      setTimeout(() => {
        navigate("/dashboard");
      }, 5000);
    } finally {
      setIsProcessing(false);
      busyRef.current = false;
    }
  };

  const handleActionSelect = (action) => {
    setSelectedAction(action);
    setShowActionModal(false);
    setScannerStarted(true);
  };

  // Initialize on mount
  useEffect(() => {
    initializeApp();
    
    return () => {
      if (locationTimeoutRef.current) {
        clearTimeout(locationTimeoutRef.current);
      }
    };
  }, []);

  // Scanner initialization
  useEffect(() => {
    if (!ready || !scannerStarted || showActionModal) return;

    const elementId = "qr-reader";
    let scanner = null;

    const startScanner = async () => {
      try {
        scanner = new Html5Qrcode(elementId);
        html5QrCodeRef.current = scanner;

        const devices = await Html5Qrcode.getCameras();
        if (!devices || devices.length === 0) {
          setErrorMessage("📷 No camera found on this device");
          return;
        }

        const rearCamera = devices.find((camera) => {
          const label = (camera.label || "").toLowerCase();
          return label.includes("back") || label.includes("rear");
        });

        const selectedCamera =
          rearCamera || devices[devices.length - 1] || devices[0];

        await scanner.start(
          selectedCamera.id,
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0,
          },
          (decodedText) => {
            if (busyRef.current) return;
            console.log("📷 QR Detected:", decodedText.substring(0, 50) + "...");

            (async () => {
              await stopCamera();
              await handleScanning(decodedText);
            })();
          },
          (error) => {
            if (error && !String(error).includes("NotFoundException")) {
              console.warn("Scanner warning:", error);
            }
          }
        );

        setScannerRunning(true);
      } catch (err) {
        console.error("Scanner initialization failed:", err);
        if (err.name === "NotAllowedError") {
          setErrorMessage(
            "📷 Camera permission denied. Please allow camera access."
          );
        } else {
          setErrorMessage("📷 Failed to start camera: " + err.message);
        }
      }
    };

    const timer = setTimeout(startScanner, 100);
    return () => {
      clearTimeout(timer);
      stopCamera();
    };
  }, [ready, scannerStarted, showActionModal]);

  const handleCancel = () => {
    stopCamera();
    navigate("/dashboard");
  };

  const getLocationStatusIcon = () => {
    switch (locationStatus) {
      case "fetching": return "🔄";
      case "success": return "📍";
      case "error": return "⚠️";
      case "timeout": return "⏱️";
      default: return "❓";
    }
  };

  const getLocationStatusText = () => {
    switch (locationStatus) {
      case "fetching": return "Getting location...";
      case "success": return `Location ready (±${Math.round(location?.accuracy || 0)}m)`;
      case "error": return locationError;
      case "timeout": return "Location timeout - continuing";
      default: return "Checking location...";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Loading Screen */}
      {!ready && (
        <div className="fixed inset-0 bg-white flex items-center justify-center z-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold text-gray-700 mb-2">Initializing Scanner</h2>
            <div className="flex items-center justify-center text-sm text-gray-600">
              <span className="mr-2">{getLocationStatusIcon()}</span>
              <span>{getLocationStatusText()}</span>
            </div>
          </div>
        </div>
      )}

      {/* Action Selection Modal */}
      {showActionModal && ready && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
            <div className="text-center">
              <div className="text-4xl mb-4">
                {currentStatus === "checked-in" ? "🔓" : "🔒"}
              </div>
              <h2 className="text-xl font-bold text-gray-800 mb-2">
                Select Action
              </h2>

              {/* Location Status */}
              <div className={`border rounded-lg p-3 mb-4 ${
                locationStatus === "success" 
                  ? "bg-green-50 border-green-200" 
                  : locationStatus === "error"
                  ? "bg-red-50 border-red-200"
                  : "bg-yellow-50 border-yellow-200"
              }`}>
                <div className="flex items-center justify-center text-sm">
                  <span className="mr-2">{getLocationStatusIcon()}</span>
                  <span className={
                    locationStatus === "success" 
                      ? "text-green-800" 
                      : locationStatus === "error"
                      ? "text-red-800"
                      : "text-yellow-800"
                  }>
                    {getLocationStatusText()}
                  </span>
                </div>
              </div>

              <p className="text-gray-600 mb-4">
                Current status: {currentStatus === "checked-in" ? "Checked In" : "Checked Out"}
              </p>

              <div className="space-y-3">
                <button
                  onClick={() => handleActionSelect("check-in")}
                  className="w-full bg-green-500 hover:bg-green-600 text-white py-3 px-4 rounded-lg font-medium transition duration-200"
                >
                  🔓 Check In
                </button>
                <button
                  onClick={() => handleActionSelect("check-out")}
                  className="w-full bg-red-500 hover:bg-red-600 text-white py-3 px-4 rounded-lg font-medium transition duration-200"
                >
                  🔒 Check Out
                </button>
                <button
                  onClick={handleCancel}
                  className="w-full bg-gray-300 hover:bg-gray-400 text-gray-700 py-3 px-4 rounded-lg font-medium transition duration-200"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Scanner Interface */}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-gray-800 mb-2">
              QR Code Scanner
            </h1>
            <div className="bg-blue-100 rounded-lg p-3 mb-4">
              <p className="text-blue-800 font-medium text-sm">
                Device: {deviceId.substring(0, 20)}...
              </p>
              <div className="flex items-center justify-center mt-1">
                <span className="mr-2">{getLocationStatusIcon()}</span>
                <span className="text-blue-600 text-xs">
                  {getLocationStatusText()}
                </span>
              </div>
            </div>
          </div>

          {errorMessage && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-4 text-center">
              <p className="whitespace-pre-line text-sm">{errorMessage}</p>
            </div>
          )}

          {isProcessing && (
            <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded-lg mb-4 text-center">
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-700 mr-2"></div>
                Processing attendance...
              </div>
            </div>
          )}

          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            <div id="qr-reader" className="w-full aspect-square"></div>

            {!showActionModal && !errorMessage && (
              <div className="p-4 text-center">
                <p className="text-gray-600 mb-2">📱 Point camera at QR code</p>
                <p className="text-sm text-gray-500">
                  Selected Action: {selectedAction}
                </p>

                <button
                  onClick={handleCancel}
                  className="mt-4 bg-gray-500 hover:bg-gray-600 text-white py-2 px-6 rounded-lg font-medium transition duration-200"
                >
                  Cancel Scan
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewQrcode;