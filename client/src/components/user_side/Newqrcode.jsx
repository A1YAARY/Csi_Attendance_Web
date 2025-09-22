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

  const BASE_URL =
    import.meta.env.VITE_BACKEND_BASE_URL ||
    "https://csi-attendance-web.onrender.com";
  const token = localStorage.getItem("accessToken");

  // Get user's current attendance status (fixed to handle both response shapes)
  const getUserStatus = async () => {
    try {
      const response = await axios.get(`${BASE_URL}/attend/past?limit=1`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
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

  // Get geolocation (best effort)
  const getGeo = () =>
    new Promise((resolve) => {
      if (!navigator.geolocation) return resolve(null);
      navigator.geolocation.getCurrentPosition(
        (position) =>
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
          }),
        () => resolve(null),
        { timeout: 5000, enableHighAccuracy: true }
      );
    });

  // Handle QR scan result (FIXED: single POST guaranteed)
  const handleScanning = async (decodedText) => {
    if (busyRef.current || isProcessing) return; // Double gate
    busyRef.current = true;
    setIsProcessing(true);

    try {
      const { code, qrType } = parseQr(decodedText);

      // Use QR's declared type if present, otherwise infer from current status
      const nextAction =
        qrType && (qrType === "check-in" || qrType === "check-out")
          ? qrType
          : getNextActionType();

      console.log("🔍 Scanned QR Code:", code);
      console.log("📋 Action:", nextAction);

      // Get location if available
      const location = await getGeo();

      // Prepare request body
      const requestBody = {
        code,
        type: nextAction,
        ...(location && { location }),
        deviceInfo: {
          platform: "Android",
          userAgent: navigator.userAgent,
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
      // Note: busyRef stays true to prevent rescanning until user navigates back
    }
  };

  useEffect(() => {
    // Get user status first, then allow scanning
    getUserStatus();
  }, []);

  useEffect(() => {
    if (!ready) return; // Wait for status

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
  }, [ready]); // Only depend on ready flag

  const handleCancel = () => {
    stopCamera();
    navigate("/dashboard");
  };

  return (
    <div className="qr-scanner-container">
      {/* Header */}
      <div className="scanner-header">
        <button
          onClick={handleCancel}
          className="back-button"
          disabled={isProcessing}
        >
          ← Back
        </button>
        <h1 className="scanner-title">QR Scanner</h1>
        <div className="spacer"></div>
      </div>

      {/* Status Card */}
      <div className="status-card">
        <div className="status-icon">{getStatusIcon()}</div>
        <div className="status-text">
          <h2>Ready to {getNextActionText()}</h2>
          <p>
            {currentStatus === "checked-in"
              ? "You are currently checked in"
              : "You are currently checked out"}
          </p>
        </div>
      </div>

      {/* Error Message */}
      {errorMessage && (
        <div className="error-card">
          <div className="error-icon">⚠️</div>
          <p>{errorMessage}</p>
        </div>
      )}

      {/* Scanner Container */}
      <div className="scanner-wrapper">
        <div className="scanner-frame">
          <div id="qr-reader" className="qr-reader"></div>

          {/* Processing Overlay */}
          {isProcessing && (
            <div className="processing-overlay">
              <div className="spinner"></div>
              <p>Processing scan...</p>
            </div>
          )}
        </div>

        <div className="scan-instruction">
          <p>📱 Point your camera at the QR code</p>
          <p>Scanning will happen automatically</p>
        </div>
      </div>

      {/* Clean white Android-optimized styles */}
      <style jsx>{`
        .qr-scanner-container {
          min-height: 100vh;
          background: #ffffff;
          color: #111111;
          padding: 20px;
          display: flex;
          flex-direction: column;
          font-family: system-ui, -apple-system, Roboto, "Segoe UI", Arial,
            sans-serif;
        }

        .scanner-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 20px;
          padding-top: env(safe-area-inset-top, 20px);
        }

        .back-button {
          background: #f3f4f6;
          border: 1px solid #e5e7eb;
          color: #111111;
          padding: 12px 16px;
          border-radius: 12px;
          font-size: 16px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .back-button:hover {
          background: #e5e7eb;
        }

        .back-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .scanner-title {
          font-size: 24px;
          font-weight: 700;
          text-align: center;
          margin: 0;
          color: #111111;
        }

        .spacer {
          width: 80px;
        }

        .status-card {
          background: #ffffff;
          border: 1px solid #e5e7eb;
          border-radius: 16px;
          padding: 20px;
          margin-bottom: 20px;
          display: flex;
          align-items: center;
          gap: 15px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .status-icon {
          font-size: 32px;
          background: #f3f4f6;
          border-radius: 50%;
          width: 60px;
          height: 60px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .status-text h2 {
          margin: 0 0 5px 0;
          font-size: 20px;
          font-weight: 600;
          color: #111111;
        }

        .status-text p {
          margin: 0;
          color: #6b7280;
          font-size: 14px;
        }

        .error-card {
          background: #fef2f2;
          border: 1px solid #fecaca;
          border-radius: 12px;
          padding: 16px;
          margin-bottom: 20px;
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .error-icon {
          font-size: 20px;
        }

        .error-card p {
          margin: 0;
          font-size: 14px;
          color: #dc2626;
        }

        .scanner-wrapper {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 20px;
        }

        .scanner-frame {
          position: relative;
          width: 100%;
          max-width: 350px;
          aspect-ratio: 1;
          background: #f9fafb;
          border: 2px solid #e5e7eb;
          border-radius: 20px;
          overflow: hidden;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }

        .qr-reader {
          width: 100%;
          height: 100%;
        }

        .processing-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(255, 255, 255, 0.9);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 15px;
        }

        .spinner {
          width: 40px;
          height: 40px;
          border: 3px solid #e5e7eb;
          border-top: 3px solid #3b82f6;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }

        .processing-overlay p {
          margin: 0;
          font-size: 16px;
          font-weight: 500;
          color: #374151;
        }

        .scan-instruction {
          text-align: center;
          margin-bottom: env(safe-area-inset-bottom, 20px);
        }

        .scan-instruction p {
          margin: 5px 0;
          color: #6b7280;
          font-size: 14px;
        }

        /* Mobile optimizations */
        @media (max-width: 480px) {
          .qr-scanner-container {
            padding: 15px;
          }

          .scanner-title {
            font-size: 20px;
          }

          .status-card {
            padding: 15px;
          }

          .status-icon {
            width: 50px;
            height: 50px;
            font-size: 28px;
          }

          .status-text h2 {
            font-size: 18px;
          }

          .scanner-frame {
            max-width: 300px;
          }
        }

        /* Landscape mobile optimization */
        @media (orientation: landscape) and (max-height: 500px) {
          .status-card {
            padding: 10px 15px;
          }

          .scanner-frame {
            max-width: 250px;
          }
        }

        /* Android-specific optimizations */
        @media (max-width: 768px) {
          .qr-scanner-container {
            -webkit-user-select: none;
            user-select: none;
            -webkit-tap-highlight-color: transparent;
          }

          .back-button {
            -webkit-appearance: none;
            appearance: none;
            border-radius: 12px;
          }

          .scanner-frame {
            border-width: 1px;
          }
        }
      `}</style>
    </div>
  );
};

export default NewQrcode;
