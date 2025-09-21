import React, { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const NewQrcode = () => {
  const navigate = useNavigate();
  const html5QrCodeRef = useRef(null);
  const [scannerRunning, setScannerRunning] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [currentStatus, setCurrentStatus] = useState(null); // null, 'checked-in', 'checked-out'

  const BASE_URL =
    import.meta.env.VITE_BACKEND_BASE_URL ||
    "https://csi-attendance-web.onrender.com";
  const token = localStorage.getItem("accessToken");

  // Get user's current attendance status
  const getUserStatus = async () => {
    try {
      const response = await axios.get(`${BASE_URL}/attend/past?limit=1`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.data.attendance && response.data.attendance.length > 0) {
        const lastEntry = response.data.attendance[0];
        setCurrentStatus(
          lastEntry.type === "check-in" ? "checked-in" : "checked-out"
        );
      } else {
        setCurrentStatus("checked-out"); // First time user
      }
    } catch (error) {
      console.log("Could not fetch user status, defaulting to check-in");
      setCurrentStatus("checked-out"); // Default to allow check-in
    }
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

  // Handle QR scan result
  const handleScanning = async (decodedText) => {
    if (isProcessing) return;
    setIsProcessing(true);

    try {
      // Extract the QR code value from your format
      let qrCode = decodedText;

      // If it's JSON, extract the code
      try {
        const parsed = JSON.parse(decodedText);
        qrCode = parsed.code || decodedText;
      } catch {
        // Use as plain text
        qrCode = decodedText;
      }

      console.log("🔍 Scanned QR Code:", qrCode);

      const nextAction = getNextActionType();
      console.log("📋 Next Action:", nextAction);

      // Get location if available
      let location = null;
      if (navigator.geolocation) {
        try {
          const position = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              timeout: 5000,
              enableHighAccuracy: true,
            });
          });

          location = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
          };
        } catch (locationError) {
          console.log("Location not available:", locationError);
        }
      }

      // Prepare request body according to API documentation
      const requestBody = {
        code: qrCode,
        type: nextAction,
        ...(location && { location }),
        deviceInfo: {
          platform: navigator.platform || "Unknown",
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
    }
  };

  useEffect(() => {
    // Get user status first
    getUserStatus();

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
        const rearCamera = devices.find(
          (camera) =>
            camera.label.toLowerCase().includes("back") ||
            camera.label.toLowerCase().includes("rear") ||
            camera.label.toLowerCase().includes("environment")
        );

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
            if (isProcessing) return;

            console.log("📷 QR Detected:", decodedText);

            // Stop scanner immediately
            if (scanner && scannerRunning) {
              scanner
                .stop()
                .then(() => {
                  scanner.clear();
                  setScannerRunning(false);
                  handleScanning(decodedText);
                })
                .catch(() => {
                  handleScanning(decodedText);
                });
            } else {
              handleScanning(decodedText);
            }
          },
          (error) => {
            // Ignore frequent scan errors
            if (error && !error.includes("NotFoundException")) {
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

    // Start scanner after a small delay to ensure DOM is ready
    const timer = setTimeout(startScanner, 100);

    // Cleanup
    return () => {
      clearTimeout(timer);
      if (scanner && scannerRunning) {
        scanner
          .stop()
          .then(() => {
            scanner.clear();
          })
          .catch(console.warn);
      }
    };
  }, []); // Remove dependencies to prevent re-initialization

  const handleCancel = () => {
    if (html5QrCodeRef.current && scannerRunning) {
      html5QrCodeRef.current.stop().catch(console.warn);
    }
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

          {/* Scanner Overlay */}
          <div className="scanner-overlay">
            <div className="scan-frame">
              <div className="corner top-left"></div>
              <div className="corner top-right"></div>
              <div className="corner bottom-left"></div>
              <div className="corner bottom-right"></div>
            </div>
          </div>

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

      <style jsx>{`
        .qr-scanner-container {
          min-height: 100vh;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 20px;
          display: flex;
          flex-direction: column;
          color: white;
        }

        .scanner-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 20px;
          padding-top: env(safe-area-inset-top, 20px);
        }

        .back-button {
          background: rgba(255, 255, 255, 0.2);
          border: none;
          color: white;
          padding: 12px 16px;
          border-radius: 12px;
          font-size: 16px;
          cursor: pointer;
          backdrop-filter: blur(10px);
          transition: all 0.2s ease;
        }

        .back-button:hover {
          background: rgba(255, 255, 255, 0.3);
          transform: translateY(-1px);
        }

        .back-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .scanner-title {
          font-size: 24px;
          font-weight: bold;
          text-align: center;
          margin: 0;
        }

        .spacer {
          width: 80px;
        }

        .status-card {
          background: rgba(255, 255, 255, 0.15);
          backdrop-filter: blur(20px);
          border-radius: 20px;
          padding: 20px;
          margin-bottom: 20px;
          display: flex;
          align-items: center;
          gap: 15px;
          border: 1px solid rgba(255, 255, 255, 0.2);
        }

        .status-icon {
          font-size: 40px;
          background: rgba(255, 255, 255, 0.2);
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
        }

        .status-text p {
          margin: 0;
          opacity: 0.8;
          font-size: 14px;
        }

        .error-card {
          background: rgba(255, 107, 107, 0.2);
          backdrop-filter: blur(20px);
          border-radius: 16px;
          padding: 16px;
          margin-bottom: 20px;
          display: flex;
          align-items: center;
          gap: 12px;
          border: 1px solid rgba(255, 107, 107, 0.3);
        }

        .error-icon {
          font-size: 24px;
        }

        .error-card p {
          margin: 0;
          font-size: 14px;
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
          background: rgba(0, 0, 0, 0.8);
          border-radius: 20px;
          overflow: hidden;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
        }

        .qr-reader {
          width: 100%;
          height: 100%;
        }

        .scanner-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          pointer-events: none;
        }

        .scan-frame {
          width: 250px;
          height: 250px;
          position: relative;
        }

        .corner {
          position: absolute;
          width: 25px;
          height: 25px;
          border: 3px solid #00ff88;
        }

        .corner.top-left {
          top: 0;
          left: 0;
          border-right: none;
          border-bottom: none;
          border-top-left-radius: 8px;
        }

        .corner.top-right {
          top: 0;
          right: 0;
          border-left: none;
          border-bottom: none;
          border-top-right-radius: 8px;
        }

        .corner.bottom-left {
          bottom: 0;
          left: 0;
          border-right: none;
          border-top: none;
          border-bottom-left-radius: 8px;
        }

        .corner.bottom-right {
          bottom: 0;
          right: 0;
          border-left: none;
          border-top: none;
          border-bottom-right-radius: 8px;
        }

        .processing-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.8);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 15px;
        }

        .spinner {
          width: 40px;
          height: 40px;
          border: 3px solid rgba(255, 255, 255, 0.3);
          border-top: 3px solid #00ff88;
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
        }

        .scan-instruction {
          text-align: center;
          margin-bottom: env(safe-area-inset-bottom, 20px);
        }

        .scan-instruction p {
          margin: 5px 0;
          opacity: 0.8;
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
            font-size: 30px;
          }

          .status-text h2 {
            font-size: 18px;
          }

          .scanner-frame {
            max-width: 300px;
          }

          .scan-frame {
            width: 200px;
            height: 200px;
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

          .scan-frame {
            width: 180px;
            height: 180px;
          }
        }
      `}</style>
    </div>
  );
};

export default NewQrcode;
