// Qrcode.jsx

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

  const baseurl = "https://csi-attendance-web-s1yf.onrender.com";
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

  // ✅ Handle scan and send to backend
  const handleScanning = async (decodedText) => {
    // Parse QR (could be plain text or JSON string)
    let payload;
    try {
      payload = JSON.parse(decodedText);
    } catch {
      payload = { code: decodedText };
    }

    try {
      const res = await axios.post(
        `${baseurl}/attend/scan`,
        {
          ...payload,
          qrType: isCheckedIn ? "check-Out" : "check-in",
        },
        {
          headers: { Authorization: `Bearer ${token}` },
          withCredentials: true,
        }
      );

      console.log("✅ Response from backend:", res.data);
      navigate("/Complete");
    } catch (error) {
      console.error("❌ Scan failed:", error.response?.data || error.message);
      setErrorMessage(error.response?.data?.message || "Scan request failed.");
    }
  };

  const handleCheckIn = () => {
    const now = new Date();
    localStorage.setItem("checkInTime", now.toISOString());
    localStorage.removeItem("checkOutTime");
    setIsCheckedIn(true);
    navigate("/Complete");
  };

  const handleCheckOut = () => {
    const now = new Date();
    localStorage.setItem("checkOutTime", now.toISOString());
    setIsCheckedIn(false);
    navigate("/Dashboard");
  };

  const handleToggle = () => {
    if (isCheckedIn) handleCheckOut();
    else handleCheckIn();
  };

  useEffect(() => {
    const elementId = "qr-reader";
    html5QrCodeRef.current = new Html5Qrcode(elementId);

    Html5Qrcode.getCameras()
      .then((devices) => {
        if (!devices || devices.length === 0) {
          setErrorMessage("No camera found");
          return;
        }
        const cameraId = devices[0].id;

        html5QrCodeRef.current
          .start(
            cameraId,
            { fps: 10, qrbox: { width: 300, height: 300 }, aspectRatio: 0.7, disableFlip: true },
            (decodedText) => {
              console.log("📷 Scanned:", decodedText);
              setData(decodedText);
              localStorage.setItem("scannedData", decodedText);

              handleScanning(decodedText);

              // Stop scanner once scanned
              if (html5QrCodeRef.current && scannerRunning) {
                html5QrCodeRef.current
                  .stop()
                  .then(() => {
                    html5QrCodeRef.current.clear();
                    setScannerRunning(false);

                    if (isValidURL(decodedText)) {
                      window.location.href = decodedText;
                    }
                  })
                  .catch((err) => console.warn("Scanner stop failed", err));
              }
            }
          )
          .then(() => setScannerRunning(true))
          .catch((err) => {
            console.error("Failed to start scanner", err);
            setErrorMessage("Failed to start scanner");
          });
      })
      .catch((err) => {
        console.error("Error getting cameras", err);
        setErrorMessage("Error accessing camera");
      });

    return () => {
      if (html5QrCodeRef.current && scannerRunning) {
        html5QrCodeRef.current
          .stop()
          .then(() => {
            html5QrCodeRef.current.clear();
          })
          .catch((err) => console.warn("Cleanup stop failed", err));
      }
    };
  }, [scannerRunning]);

  return (
    <div className="flex flex-col items-center justify-center w-screen h-[100dvh] gap-4 pt-[70px] pb-[30px]">
      {/* Close Button */}
      <img
        onClick={cancel}
        src="/src/assets/cross.png"
        className="h-[12px] absolute right-[15px] top-[25px] cursor-pointer"
        alt="Cancel"
      />

      {/* Title */}
      <div className="text flex flex-col items-center justify-center gap-0.5">
        <span className="font-bold text-lg">Scan Code</span>
        <span className="font-medium text-gray-400 text-xs">
          Scan QR Code to check securely
        </span>
      </div>

      {/* Error
      {errorMessage && (
        <div className="text-red-500 text-sm">{errorMessage}</div>
      )} */}

      {/* Scanner */}
      <div
        id="qr-reader"
        className="w-[350px] rounded-[22px] m-auto flex overflow-hidden border border-gray-300"
      />

      {/* Toggle Button */}
      <button
        onClick={handleToggle}
        className={`flex justify-center items-center rounded-lg text-sm font-medium gap-3 
          ${isCheckedIn ? "bg-red-500" : "bg-[#1D61E7]"} 
          text-white w-[350px] h-[48px] shadow-[0px_4px_4px_0px_#00000040] 
          active:shadow-[0px_2px_1px_0px_#00000040] transition-all duration-100`}
      >
        {isCheckedIn ? "Check Out" : "Check In"}
        <img
          src="/src/assets/check.png"
          className="h-[15px] invert-100"
          alt="Check"
        />
      </button>
    </div>
  );
};

export default NewQrcode;
