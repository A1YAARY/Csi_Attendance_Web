import React, { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const NewQrcode = () => {
  const navigate = useNavigate();
  const html5QrCodeRef = useRef(null);
  const busyRef = useRef(false); // Critical: prevents duplicate scans
  const [scannerRunning, setScannerRunning] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [currentStatus, setCurrentStatus] = useState(null); // 'checked-in' | 'checked-out'
  const [ready, setReady] = useState(false); // wait for status before starting
  const [showActionModal, setShowActionModal] = useState(false); // NEW: popup modal
  const [selectedAction, setSelectedAction] = useState(null); // NEW: user choice
  const [scannerStarted, setScannerStarted] = useState(false); // NEW: track scanner state
  const [locationStatus, setLocationStatus] = useState("Getting location...");

  const BASE_URL =
    import.meta.env.VITE_BACKEND_BASE_URL ||
    "https://csi-attendance-web.onrender.com";
  const token = localStorage.getItem("accessToken");
  const deviceId = localStorage.getItem("deviceId") || "unknown_device";

  // Get user's current attendance status (fixed to handle both response shapes)
  const getUserStatus = async () => {
    try {
      const response = await axios.get(`${BASE_URL}/attend/past?limit=1`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "X-Device-ID": deviceId,
        },
      });

      // Handle both { data: [...] } and { attendance: [...] } response shapes
      const arr = response.data?.data || response.data?.attendance || [];
      if (Array.isArray(arr) && arr.length > 0) {
        const lastEntry = arr[0];
        setCurrentStatus(
          lastEntry.type === "check-in" ? "checked-in" : "checked-out"
        );
      } else {
        setCurrentStatus("checked-out"); // Default for first-time user
      }
    } catch (error) {
      console.log("Could not fetch user status, defaulting to checked-out");
      setCurrentStatus("checked-out");
    } finally {
      setReady(true); // Allow scanner to start
      setShowActionModal(true); // NEW: Show action selection popup
    }
  };

  // Helper to stop camera safely
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

  const getNextActionType = () => {
    return currentStatus === "checked-in" ? "check-out" : "check-in";
  };

  const getNextActionText = () => {
    return currentStatus === "checked-in" ? "Check Out" : "Check In";
  };

  const getStatusIcon = () => {
    return currentStatus === "checked-in" ? "🔓" : "🔒";
  };

  // Parse QR payload (prefer qrType from QR if present)
  const parseQr = (decodedText) => {
    try {
      const parsed = JSON.parse(decodedText);
      return {
        code: parsed.code || decodedText,
        qrType: parsed.qrType || parsed.type, // respect QR's declared type
      };
    } catch {
      return { code: decodedText, qrType: undefined };
    }
  };

  // Enhanced geolocation with high accuracy and multiple attempts
  const getHighAccuracyLocation = () => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        setLocationStatus("❌ Geolocation not supported");
        return resolve(null);
      }

      setLocationStatus("📍 Getting precise location...");

      const options = {
        enableHighAccuracy: true,
        timeout: 15000, // 15 seconds
        maximumAge: 0, // Don't use cached location
      };

      let attempts = 0;
      const maxAttempts = 3;
      let bestLocation = null;

      const tryGetLocation = () => {
        attempts++;
        setLocationStatus(
          `📍 Getting location (attempt ${attempts}/${maxAttempts})...`
        );

        navigator.geolocation.getCurrentPosition(
          (position) => {
            const location = {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy,
              timestamp: Date.now(),
            };

            console.log(`📍 Location attempt ${attempts}:`, location);

            // Keep the most accurate location
            if (!bestLocation || location.accuracy < bestLocation.accuracy) {
              bestLocation = location;
            }

            // If we got a very accurate location (< 10m) or this is our last attempt
            if (location.accuracy <= 10 || attempts >= maxAttempts) {
              setLocationStatus(
                `✅ Location acquired (±${Math.round(bestLocation.accuracy)}m)`
              );
              resolve(bestLocation);
            } else {
              // Try again for better accuracy
              setTimeout(tryGetLocation, 1000);
            }
          },
          (error) => {
            console.error(`❌ Location attempt ${attempts} failed:`, error);

            if (attempts >= maxAttempts) {
              setLocationStatus("⚠️ Using approximate location");
              // Return best location we got, or null if none
              resolve(bestLocation);
            } else {
              setTimeout(tryGetLocation, 1000);
            }
          },
          options
        );
      };

      tryGetLocation();
    });
  };

  // Handle QR scan result (FIXED: single POST guaranteed)
  const handleScanning = async (decodedText) => {
    if (busyRef.current || isProcessing) return; // Double gate
    busyRef.current = true;
    setIsProcessing(true);

    try {
      const { code, qrType } = parseQr(decodedText);

      // NEW: Use selected action from popup instead of inferring
      const nextAction =
        selectedAction ||
        (qrType && (qrType === "check-in" || qrType === "check-out")
          ? qrType
          : getNextActionType());

      console.log("🔍 Scanned QR Code:", code);
      console.log("📋 Action:", nextAction);

      // Get high accuracy location
      const location = await getHighAccuracyLocation();

      if (!location) {
        throw new Error(
          "Unable to get location. Please ensure location services are enabled and try again."
        );
      }

      // Enhanced device info
      const deviceInfo = {
        deviceId: deviceId,
        platform: /Android/.test(navigator.userAgent)
          ? "Android"
          : /iPhone|iPad|iPod/.test(navigator.userAgent)
          ? "iOS"
          : "Web",
        userAgent: navigator.userAgent,
        fingerprint: deviceId,
        timestamp: Date.now(),
      };

      // Prepare request body
      const requestBody = {
        code,
        type: nextAction,
        location,
        deviceInfo,
      };

      console.log("📤 Sending request to /attend/scan:", requestBody);

      const response = await axios.post(
        `${BASE_URL}/attend/scan`,
        requestBody,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            "X-Device-ID": deviceId,
          },
          withCredentials: true,
        }
      );

      console.log("✅ Scan successful:", response.data);

      // Update status
      setCurrentStatus(
        nextAction === "check-in" ? "checked-in" : "checked-out"
      );

      // Navigate to success animation
      setTimeout(() => {
        navigate("/animation");
      }, 500);
    } catch (error) {
      console.error("❌ Scan failed:", error);

      let errorMsg =
        error.response?.data?.message || error.message || "Scan failed";

      // Handle specific error codes
      if (error.response?.data?.code === "LOCATION_OUT_OF_RANGE") {
        errorMsg = `❌ ${errorMsg}\n\nDistance: ${error.response.data.data?.currentDistance}m\nRequired: Within ${error.response.data.data?.allowedRadius}m`;
      } else if (error.response?.data?.code === "UNAUTHORIZED_DEVICE") {
        errorMsg = `❌ Unauthorized device\nRegistered: ${error.response.data.registeredDevice}\nCurrent: ${error.response.data.currentDevice}`;
      }

      setErrorMessage(errorMsg);

      // Navigate back after showing error
      setTimeout(() => {
        navigate("/dashboard");
      }, 5000);
    } finally {
      setIsProcessing(false);
      // Note: busyRef stays true to prevent rescanning until user navigates back
    }
  };

  // NEW: Handle action selection and start scanner
  const handleActionSelect = (action) => {
    setSelectedAction(action);
    setShowActionModal(false);
    setScannerStarted(true);
  };

  useEffect(() => {
    // Get user status first, then show popup
    getUserStatus();
  }, []);

  useEffect(() => {
    // NEW: Only start scanner after action is selected
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

        // Prioritize rear camera for mobile
        const rearCamera = devices.find((camera) => {
          const label = (camera.label || "").toLowerCase();
          return (
            label.includes("back") ||
            label.includes("rear") ||
            label.includes("environment")
          );
        });

        const selectedCamera =
          rearCamera || devices[devices.length - 1] || devices[0];
        console.log("📱 Selected camera:", selectedCamera.label);

        await scanner.start(
          selectedCamera.id,
          {
            fps: 15,
            qrbox: { width: 280, height: 280 },
            aspectRatio: 1.0,
            disableFlip: false,
          },
          (decodedText) => {
            // CRITICAL: Hard gate to prevent multiple scans
            if (busyRef.current) return;
            console.log("📷 QR Detected:", decodedText);

            // Stop camera IMMEDIATELY to prevent repeat callbacks
            (async () => {
              await stopCamera();
              await handleScanning(decodedText);
            })();
          },
          (error) => {
            // Ignore frequent scan errors
            if (error && !String(error).includes("NotFoundException")) {
              console.warn("Scanner error:", error);
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
        } else if (err.name === "NotFoundError") {
          setErrorMessage("📷 No camera found on this device.");
        } else if (err.name === "NotSupportedError") {
          setErrorMessage("📷 Camera not supported in this browser.");
        } else {
          setErrorMessage("📷 Failed to start camera: " + err.message);
        }
      }
    };

    const timer = setTimeout(startScanner, 100);

    return () => {
      clearTimeout(timer);
      stopCamera(); // Safe cleanup using ref
    };
  }, [ready, scannerStarted, showActionModal]); // NEW: depend on scanner started flag

  const handleCancel = () => {
    stopCamera();
    navigate("/dashboard");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Action Selection Modal */}
      {showActionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
            <div className="text-center">
              <div className="text-4xl mb-4">{getStatusIcon()}</div>
              <h2 className="text-xl font-bold text-gray-800 mb-2">
                What would you like to do?
              </h2>
              <p className="text-gray-600 mb-6">
                {currentStatus === "checked-in"
                  ? "You are currently checked in"
                  : "You are currently checked out"}
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

      {/* Main Scanner Interface */}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto">
          {/* Header */}
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-gray-800 mb-2">
              QR Code Scanner
            </h1>
            {selectedAction && (
              <div className="bg-blue-100 rounded-lg p-3 mb-4">
                <p className="text-blue-800 font-medium">
                  Ready to:{" "}
                  {selectedAction === "check-in"
                    ? "🔓 Check In"
                    : "🔒 Check Out"}
                </p>
                <p className="text-sm text-blue-600 mt-1">{locationStatus}</p>
              </div>
            )}
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-4 text-center">
              <p className="whitespace-pre-line">{errorMessage}</p>
            </div>
          )}

          {/* Processing State */}
          {isProcessing && (
            <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded-lg mb-4 text-center">
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-700 mr-2"></div>
                Processing scan...
              </div>
            </div>
          )}

          {/* QR Scanner */}
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            <div id="qr-reader" className="w-full"></div>

            {!showActionModal && !errorMessage && (
              <div className="p-4 text-center">
                <p className="text-gray-600 mb-2">
                  📱 Point your camera at the QR code
                </p>
                <p className="text-sm text-gray-500">
                  Scanning will happen automatically
                </p>

                <button
                  onClick={handleCancel}
                  className="mt-4 bg-gray-500 hover:bg-gray-600 text-white py-2 px-6 rounded-lg font-medium transition duration-200"
                >
                  Cancel
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
