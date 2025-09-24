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

  const BASE_URL =
    import.meta.env.VITE_BACKEND_BASE_URL ||
    "https://csi-attendance-web.onrender.com";
  const token = localStorage.getItem("accessToken");

  // Generate or get device ID
  const getDeviceId = () => {
    let deviceId = localStorage.getItem("deviceId");
    if (!deviceId) {
      // Generate a unique device ID based on browser fingerprint
      deviceId =
        "device_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);
      localStorage.setItem("deviceId", deviceId);
    }
    return deviceId;
  };

  // Get user's current attendance status
  const getUserStatus = async () => {
    try {
      const response = await axios.get(`${BASE_URL}/attend/past?limit=1`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
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
    } finally {
      setReady(true);
      setShowActionModal(true);
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

  // Parse QR payload
  const parseQr = (decodedText) => {
    try {
      const parsed = JSON.parse(decodedText);
      return {
        code: parsed.code || decodedText,
        qrType: parsed.qrType || parsed.type,
      };
    } catch {
      return {
        code: decodedText,
        qrType: undefined,
      };
    }
  };

  // Get geolocation
  const getGeo = () =>
    new Promise((resolve) => {
      if (!navigator.geolocation) {
        console.warn("Geolocation not supported");
        return resolve(null);
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          console.log("📍 Location obtained:", {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
          });
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
          });
        },
        (error) => {
          console.warn("Location error:", error.message);
          resolve(null);
        },
        {
          timeout: 10000,
          enableHighAccuracy: true,
          maximumAge: 300000, // 5 minutes
        }
      );
    });

  // Handle QR scan result - UPDATED with deviceId and location
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
          : getNextActionType());

      console.log("🔍 Scanned QR Code:", code);
      console.log("📋 Action:", nextAction);

      // Get location if available
      const location = await getGeo();

      // Get device ID
      const deviceId = getDeviceId();

      // Prepare request body with required fields
      const requestBody = {
        code,
        type: nextAction,
        location: location || {
          latitude: 0,
          longitude: 0,
          accuracy: 0,
        },
        deviceInfo: {
          deviceId: deviceId,
          platform: navigator.platform || "Web",
          userAgent: navigator.userAgent,
          fingerprint: deviceId, // Use deviceId as fingerprint fallback
        },
      };

      console.log("📤 Sending request to /attend/scan:", requestBody);

      const response = await axios.post(
        `${BASE_URL}/attend/scan`,
        requestBody,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            "x-device-id": deviceId, // Also send as header
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
      const errorMsg =
        error.response?.data?.message || error.message || "Scan failed";
      setErrorMessage(errorMsg);

      // Navigate back after showing error
      setTimeout(() => {
        navigate("/dashboard");
      }, 3000);
    } finally {
      setIsProcessing(false);
      busyRef.current = false; // Reset busy flag
    }
  };

  // Handle action selection and start scanner
  const handleActionSelect = (action) => {
    setSelectedAction(action);
    setShowActionModal(false);
    setScannerStarted(true);
  };

  useEffect(() => {
    getUserStatus();
  }, []);

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

        // Try to find rear camera first
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
            if (busyRef.current) return;
            console.log("📷 QR Detected:", decodedText);

            // Handle scanning asynchronously
            (async () => {
              await stopCamera();
              await handleScanning(decodedText);
            })();
          },
          (error) => {
            // Suppress common scan errors
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
            "📷 Camera permission denied. Please allow camera access and refresh the page."
          );
        } else if (err.name === "NotFoundError") {
          setErrorMessage("📷 No camera found on this device.");
        } else if (err.name === "NotSupportedError") {
          setErrorMessage(
            "📷 Camera not supported in this browser. Try Chrome or Safari."
          );
        } else {
          setErrorMessage(
            "📷 Failed to start camera: " + (err.message || "Unknown error")
          );
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md">
        {/* Action Selection Modal */}
        {showActionModal && (
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              What would you like to do?
            </h2>
            <p className="text-gray-600 mb-6">
              Current Status:{" "}
              {currentStatus === "checked-in"
                ? "🔓 Checked In"
                : "🔒 Checked Out"}
            </p>
            <div className="space-y-3">
              <button
                onClick={() => handleActionSelect("check-in")}
                className="w-full bg-green-500 text-white py-3 px-6 rounded-lg font-semibold hover:bg-green-600 transition-colors flex items-center justify-center"
              >
                🔒 Check In
              </button>
              <button
                onClick={() => handleActionSelect("check-out")}
                className="w-full bg-red-500 text-white py-3 px-6 rounded-lg font-semibold hover:bg-red-600 transition-colors flex items-center justify-center"
              >
                🔓 Check Out
              </button>
              <button
                onClick={handleCancel}
                className="w-full bg-gray-500 text-white py-3 px-6 rounded-lg font-semibold hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Error Display */}
        {errorMessage && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            <p className="font-semibold">Error:</p>
            <p>{errorMessage}</p>
          </div>
        )}

        {/* Processing State */}
        {isProcessing && (
          <div className="text-center mb-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-2"></div>
            <p className="text-gray-600">Processing scan...</p>
            <p className="text-sm text-gray-500">
              {selectedAction === "check-in"
                ? "Checking in..."
                : "Checking out..."}
            </p>
          </div>
        )}

        {/* QR Scanner */}
        {!showActionModal && (
          <>
            <div className="text-center mb-4">
              <h1 className="text-2xl font-bold text-gray-800 mb-2">
                📱 Scan QR Code
              </h1>
              <p className="text-gray-600">
                Action:{" "}
                {selectedAction === "check-in" ? "🔒 Check In" : "🔓 Check Out"}
              </p>
              <p className="text-sm text-gray-500">
                Point your camera at the QR code
              </p>
            </div>

            <div className="relative mb-6">
              <div
                id="qr-reader"
                className="w-full rounded-lg overflow-hidden border-4 border-indigo-200"
                style={{ minHeight: "300px" }}
              ></div>

              {/* Scanner overlay */}
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute inset-4 border-2 border-white rounded-lg opacity-50"></div>
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                  <div className="w-8 h-8 border-t-2 border-l-2 border-white absolute -top-4 -left-4"></div>
                  <div className="w-8 h-8 border-t-2 border-r-2 border-white absolute -top-4 -right-4"></div>
                  <div className="w-8 h-8 border-b-2 border-l-2 border-white absolute -bottom-4 -left-4"></div>
                  <div className="w-8 h-8 border-b-2 border-r-2 border-white absolute -bottom-4 -right-4"></div>
                </div>
              </div>
            </div>

            <button
              onClick={handleCancel}
              className="w-full bg-gray-500 text-white py-3 px-6 rounded-lg font-semibold hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default NewQrcode;
