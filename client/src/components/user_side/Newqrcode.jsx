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

  // const BASE_URL = "https://csi-attendance-web-s1yf.onrender.com";
  const BASE_URL = import.meta.env.VITE_BACKEND_BASE_URL||"https://csi-attendance-web-s1yf.onrender.com";
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
    const rearCamera = cameras.find(camera => 
      camera.label.toLowerCase().includes('back') || 
      camera.label.toLowerCase().includes('rear') || 
      camera.label.toLowerCase().includes('environment')
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
      qrCode = parsed.code || decodedText; // Use code field if exists, otherwise use raw text
    } catch {
      qrCode = decodedText; // Use raw text if not JSON
    }

    // Prepare request body according to API spec
    const requestBody = {
      code: qrCode, // ✅ Changed from payload spread to explicit code
      type: isCheckedIn ? "check-out" : "check-in", // ✅ Changed qrType to type, fixed casing
     
    };

    console.log("📤 Sending request:", requestBody); // Debug log

    try {
      const res = await axios.post(
        `${BASE_URL}/attend/scan`,
        requestBody, // ✅ Use structured request body
        {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json' // ✅ Explicit content type
          },
          withCredentials: true,
        }
      );

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
      console.error("❌ Request that failed:", requestBody); // Debug log
      
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
            // Request rear camera specifically
            facingMode: "environment"
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
    <div className="flex flex-col items-center justify-center w-screen h-[100dvh]  gap-4 pt-[70px] pb-[30px]">
      {/* Close Button */}
      <img
        onClick={cancel}
        src="/public/cross.png"
        className="h-[20px] absolute right-[10px] top-[25px] cursor-pointer"
        alt="Cancel"
      />

      {/* Title */}
      <div className="text flex flex-col items-center justify-center gap-0.5">
        <span className="font-bold text-lg">Scan Code</span>
        <span className="font-medium text-gray-400 text-xs">
          Scan QR Code to {isCheckedIn ? "check out" : "check in"} securely
        </span>
      </div>

      {/* Error Message */}
      {errorMessage && (
        <div className="text-red-500 text-sm text-center px-4">
          {errorMessage}
        </div>
      )}

      {/* Scanner */}
      <div
        id="qr-reader"
        className=" w-[350px]  rounded-[22px] m-auto flex overflow-hidden px-2 border border-gray-300"
      />

      {/* Status Indicator */}
      <div className="text-center">
        <span className={`text-sm font-medium ${isCheckedIn ? 'text-red-500' : 'text-blue-500'}`}>
          Ready to {isCheckedIn ? 'Check Out' : 'Check In'}
        </span>
      </div>

      
    </div>
  );
};

export default NewQrcode;