import React, { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const NewQrcode = () => {
  const navigate = useNavigate();
  const html5QrCodeRef = useRef(null);
  const isBusyRef = useRef(false); // prevents duplicate posts
  const [scannerRunning, setScannerRunning] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [currentStatus, setCurrentStatus] = useState(null); // 'checked-in' | 'checked-out'
  const [ready, setReady] = useState(false); // wait status before starting

  const BASE_URL = import.meta.env.VITE_BACKEND_BASE_URL || "https://csi-attendance-web.onrender.com";
  const token = localStorage.getItem("accessToken");

  // Get user's current attendance status (normalized to array shape)
  const getUserStatus = async () => {
    try {
      const response = await axios.get(`${BASE_URL}/attend/past?limit=1`, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });
      const arr = response.data?.data || response.data?.attendance || [];
      if (Array.isArray(arr) && arr.length > 0) {
        const lastEntry = arr[0];
        setCurrentStatus(lastEntry.type === "check-in" ? "checked-in" : "checked-out");
      } else {
        setCurrentStatus("checked-out");
      }
    } catch {
      setCurrentStatus("checked-out");
    } finally {
      setReady(true);
    }
  };

  const getNextActionType = () => (currentStatus === "checked-in" ? "check-out" : "check-in");
  const getNextActionText = () => (currentStatus === "checked-in" ? "Check Out" : "Check In");
  const getStatusIcon = () => (currentStatus === "checked-in" ? "🔓" : "🔒");

  // Parse QR (prefer qrType from payload if present)
  const parseQr = (decodedText) => {
    try {
      const parsed = JSON.parse(decodedText);
      return { code: parsed.code || decodedText, qrType: parsed.qrType || parsed.type };
    } catch {
      return { code: decodedText, qrType: undefined };
    }
  };

  // Get geolocation (best effort)
  const getGeo = () =>
    new Promise((resolve) => {
      if (!navigator.geolocation) return resolve(null);
      navigator.geolocation.getCurrentPosition(
        (pos) =>
          resolve({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
          }),
        () => resolve(null),
        { timeout: 5000, enableHighAccuracy: true }
      );
    });

  // Handle QR scan result
  const handleScanning = async (decodedText) => {
    if (isBusyRef.current || isProcessing) return;
    isBusyRef.current = true;
    setIsProcessing(true);

    try {
      // Stop camera immediately to prevent repeat decodes
      if (html5QrCodeRef.current && scannerRunning) {
        try {
          await html5QrCodeRef.current.stop();
          html5QrCodeRef.current.clear();
        } catch {}
        setScannerRunning(false);
      }

      // Show holding/login screen while posting (adjust route if different)
      navigate("/login", { replace: true });

      const { code, qrType } = parseQr(decodedText);
      const nextAction = qrType && (qrType === "check-in" || qrType === "check-out") ? qrType : getNextActionType();
      const location = await getGeo();

      const requestBody = {
        code,
        type: nextAction,
        ...(location && { location }),
        deviceInfo: {
          platform: "Android",
          userAgent: navigator.userAgent,
        },
      };

      const response = await axios.post(`${BASE_URL}/attend/scan`, requestBody, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        withCredentials: true,
      });

      // Update local status
      setCurrentStatus(nextAction === "check-in" ? "checked-in" : "checked-out");

      // Navigate to respective success page
      navigate(nextAction === "check-in" ? "/checked-in" : "/checked-out", { replace: true });
    } catch (error) {
      const errorMsg = error?.response?.data?.message || error?.message || "Scan failed";
      setErrorMessage(errorMsg);
      navigate("/scan-error", { replace: true });
    } finally {
      setIsProcessing(false);
      isBusyRef.current = false;
    }
  };

  useEffect(() => {
    getUserStatus();
  }, []);

  useEffect(() => {
    if (!ready) return;

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

        const pick = (camera) => (camera?.label || "").toLowerCase();
        const rearCamera =
          devices.find((c) => pick(c).includes("back") || pick(c).includes("rear") || pick(c).includes("environment")) ||
          devices[devices.length - 1] ||
          devices[0];

        await scanner.start(
          rearCamera.id,
          { fps: 15, qrbox: { width: 280, height: 280 }, aspectRatio: 1.0, disableFlip: false },
          (decodedText) => {
            if (!isProcessing && !isBusyRef.current) handleScanning(decodedText);
          },
          () => {}
        );

        setScannerRunning(true);
      } catch (err) {
        if (err?.name === "NotAllowedError") setErrorMessage("📷 Camera permission denied. Please allow camera access.");
        else if (err?.name === "NotFoundError") setErrorMessage("📷 No camera found on this device.");
        else if (err?.name === "NotSupportedError") setErrorMessage("📷 Camera not supported in this browser.");
        else setErrorMessage("📷 Failed to start camera: " + (err?.message || "Unknown error"));
      }
    };

    const timer = setTimeout(startScanner, 100);

    return () => {
      clearTimeout(timer);
      if (scanner && scannerRunning) {
        scanner
          .stop()
          .then(() => scanner.clear())
          .catch(() => {});
      }
    };
  }, [ready, scannerRunning]);

  const handleCancel = () => {
    if (html5QrCodeRef.current && scannerRunning) {
      html5QrCodeRef.current.stop().catch(() => {});
    }
    navigate("/dashboard");
  };

  return (
    <div className="qr-scanner-container">
      {/* Header */}
      <div className="scanner-header">
        <button onClick={handleCancel} className="back-button" disabled={isProcessing}>
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
          <p>{currentStatus === "checked-in" ? "You are currently checked in" : "You are currently checked out"}</p>
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

      {/* Clean white Android-first styles */}
      <style jsx>{`
        .qr-scanner-container {
          min-height: 100vh;
          background: #ffffff;
          color: #111;
          padding: 20px;
          display: flex;
          flex-direction: column;
          font-family: system-ui, -apple-system, Roboto, "Segoe UI", Arial, sans-serif;
        }
        .scanner-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 16px;
          padding-top: env(safe-area-inset-top, 16px);
        }
        .back-button {
          background: #f3f4f6;
          border: 1px solid #e5e7eb;
          color: #111;
          padding: 10px 14px;
          border-radius: 10px;
          font-size: 15px;
        }
        .back-button:disabled { opacity: .5; }
        .scanner-title { font-size: 22px; font-weight: 700; margin: 0; }
        .spacer { width: 64px; }

        .status-card, .error-card {
          background: #fff;
          border: 1px solid #eee;
          border-radius: 14px;
          padding: 16px;
          margin-bottom: 16px;
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .error-card { border-color: #ffd1d1; background: #fff7f7; }
        .status-icon { font-size: 28px; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; border-radius: 50%; background: #f3f4f6; }

        .scanner-wrapper { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 16px; }
        .scanner-frame {
          position: relative;
          width: 100%;
          max-width: 360px;
          aspect-ratio: 1;
          background: #fafafa;
          border: 1px solid #eee;
          border-radius: 14px;
          overflow: hidden;
        }
        .qr-reader { width: 100%; height: 100%; }

        .processing-overlay {
          position: absolute; inset: 0;
          background: rgba(255,255,255,.85);
          display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px;
        }
        .spinner {
          width: 36px; height: 36px; border: 3px solid #e5e7eb; border-top: 3px solid #111; border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        .scan-instruction { text-align: center; color: #6b7280; margin-bottom: env(safe-area-inset-bottom, 16px); }
        .scan-instruction p { margin: 4px 0; font-size: 14px; }

        @media (max-width: 480px) {
          .scanner-title { font-size: 20px; }
          .scanner-frame { max-width: 320px; }
        }
      `}</style>
    </div>
  );
};

export default NewQrcode;
