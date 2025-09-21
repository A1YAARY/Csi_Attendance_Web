// Qrcode.jsx - Complete Fixed Version
import React, { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const NewQrcode = () => {
  const navigate = useNavigate();
  const html5QrCodeRef = useRef(null);
  const [scannerRunning, setScannerRunning] = useState(false);
  const [data, setData] = useState("No result");
  const [isCheckedIn, setIsCheckedIn] = useState(() => {
    const inT = localStorage.getItem("checkInTime");
    const outT = localStorage.getItem("checkOutTime");
    return !!inT && !outT;
  });
  const [errorMessage, setErrorMessage] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  // Fixed BASE_URL - use consistent URL
  const BASE_URL =
    import.meta.env.VITE_BACKEND_BASE_URL ||
    "https://csi-attendance-web.onrender.com";
  const token = localStorage.getItem("accessToken");

  const cancel = () => navigate("/");

  const isValidURL = (str) => {
    try {
      new URL(str);
      return true;
    } catch {
      return false;
    }
  };

  // Helper function to find rear camera
  const findRearCamera = (cameras) => {
    // Look for rear camera (environment facing)
    const rearCamera = cameras.find(
      (camera) =>
        camera.label.toLowerCase().includes("back") ||
        camera.label.toLowerCase().includes("rear") ||
        camera.label.toLowerCase().includes("environment")
    );
    // If no specific rear camera found, try to get the last camera (often rear on mobile)
    return rearCamera || cameras[cameras.length - 1] || cameras[0];
  };

  // ✅ Fixed handleScanning function
  const handleScanning = async (decodedText) => {
    // Prevent multiple scans
    if (isProcessing) return;
    setIsProcessing(true);

    // Parse QR (could be plain text or JSON string)
    let qrCode;
    try {
      const parsed = JSON.parse(decodedText);
      qrCode = parsed.code || decodedText;
    } catch {
      qrCode = decodedText;
    }

    // Prepare request body according to API spec
    const requestBody = {
      code: qrCode,
      type: isCheckedIn ? "check-out" : "check-in",
    };

    console.log("📤 Sending request:", requestBody);

    try {
      const res = await axios.post(`${BASE_URL}/attend/scan`, requestBody, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        withCredentials: true,
      });

      console.log("✅ Response from backend:", res.data);

      // Update check-in/out status based on current state
      const now = new Date();
      if (isCheckedIn) {
        // Checking out
        localStorage.setItem("checkOutTime", now.toISOString());
      } else {
        // Checking in
        localStorage.setItem("checkInTime", now.toISOString());
        localStorage.removeItem("checkOutTime");
      }

      // Navigate to success page
      navigate("/animation");
    } catch (error) {
      console.error("❌ Scan failed:", error.response?.data || error.message);
      console.error("❌ Request that failed:", requestBody);
      setErrorMessage(error.response?.data?.message || "Scan request failed.");
      setIsProcessing(false);

      // Navigate to error page after showing error
      setTimeout(() => {
        navigate("/scan-error");
      }, 2000);
    }
  };

  useEffect(() => {
    const elementId = "qr-reader";
    let scanner = null;

    const startScanner = async () => {
      try {
        scanner = new Html5Qrcode(elementId);
        html5QrCodeRef.current = scanner;

        const devices = await Html5Qrcode.getCameras();
        if (!devices || devices.length === 0) {
          setErrorMessage("No camera found");
          return;
        }

        // Use rear camera preferentially
        const selectedCamera = findRearCamera(devices);
        const cameraId = selectedCamera.id;

        console.log("📱 Using camera:", selectedCamera.label);

        await scanner.start(
          cameraId,
          {
            fps: 10,
            qrbox: { width: 300, height: 300 },
            aspectRatio: 0.7,
            disableFlip: true,
            facingMode: "environment",
          },
          (decodedText) => {
            // Prevent multiple scans
            if (isProcessing) return;

            console.log("📷 Scanned:", decodedText);
            setData(decodedText);
            localStorage.setItem("scannedData", decodedText);

            // Stop scanner immediately after scan
            if (scanner && scannerRunning) {
              scanner
                .stop()
                .then(() => {
                  scanner.clear();
                  setScannerRunning(false);
                  // Handle the scan result after stopping
                  handleScanning(decodedText);
                })
                .catch((err) => {
                  console.warn("Scanner stop failed", err);
                  // Handle scan even if stop failed
                  handleScanning(decodedText);
                });
            } else {
              // Handle scan if scanner not running
              handleScanning(decodedText);
            }
          },
          (error) => {
            // Ignore frequent scan errors
            if (error && !error.includes("NotFoundException")) {
              console.warn("Scan error:", error);
            }
          }
        );

        setScannerRunning(true);
      } catch (err) {
        console.error("Failed to start scanner", err);
        setErrorMessage("Failed to start scanner: " + err.message);

        // Handle specific camera permission errors
        if (err.name === "NotAllowedError") {
          setErrorMessage(
            "Camera permission denied. Please allow camera access and refresh the page."
          );
        } else if (err.name === "NotFoundError") {
          setErrorMessage("No camera found on this device.");
        } else if (err.name === "NotSupportedError") {
          setErrorMessage("Camera not supported on this browser.");
        }
      }
    };

    // Start scanner
    startScanner();

    // Cleanup function
    return () => {
      if (scanner && scannerRunning) {
        scanner
          .stop()
          .then(() => {
            scanner.clear();
          })
          .catch((err) => console.warn("Cleanup stop failed", err));
      }
    };
  }, []); // Remove dependency on scannerRunning to prevent re-initialization

  return (
    <div className="qr-scanner-container">
      <div className="scanner-header">
        <h2 className="scanner-title">
          {isCheckedIn ? "Scan to Check Out" : "Scan to Check In"}
        </h2>
        <button onClick={cancel} className="cancel-button">
          Cancel
        </button>
      </div>

      {errorMessage && (
        <div className="error-message">
          <p>{errorMessage}</p>
        </div>
      )}

      <div className="scanner-wrapper">
        <div id="qr-reader" className="qr-reader"></div>

        {isProcessing && (
          <div className="processing-overlay">
            <p>Processing scan...</p>
          </div>
        )}

        {data !== "No result" && (
          <div className="scan-result">
            <p>Scanned: {data}</p>
          </div>
        )}
      </div>

      <style jsx>{`
        .qr-scanner-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 20px;
          max-width: 500px;
          margin: 0 auto;
        }

        .scanner-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          width: 100%;
          margin-bottom: 20px;
        }

        .scanner-title {
          font-size: 24px;
          font-weight: bold;
          color: #333;
        }

        .cancel-button {
          padding: 10px 20px;
          background-color: #f44336;
          color: white;
          border: none;
          border-radius: 5px;
          cursor: pointer;
          font-size: 16px;
        }

        .cancel-button:hover {
          background-color: #da190b;
        }

        .error-message {
          background-color: #ffebee;
          border: 1px solid #f44336;
          border-radius: 5px;
          padding: 15px;
          margin-bottom: 20px;
          width: 100%;
          text-align: center;
        }

        .error-message p {
          color: #f44336;
          margin: 0;
          font-weight: bold;
        }

        .scanner-wrapper {
          position: relative;
          width: 100%;
          max-width: 400px;
        }

        .qr-reader {
          width: 100%;
          border-radius: 10px;
          overflow: hidden;
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
        }

        .processing-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0, 0, 0, 0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 10px;
        }

        .processing-overlay p {
          color: white;
          font-size: 18px;
          font-weight: bold;
        }

        .scan-result {
          margin-top: 15px;
          padding: 10px;
          background-color: #e8f5e8;
          border: 1px solid #4caf50;
          border-radius: 5px;
          text-align: center;
        }

        .scan-result p {
          color: #2e7d32;
          margin: 0;
          font-weight: bold;
        }

        @media (max-width: 768px) {
          .scanner-header {
            flex-direction: column;
            gap: 10px;
          }

          .scanner-title {
            font-size: 20px;
          }
        }
      `}</style>
    </div>
  );
};

export default NewQrcode;
