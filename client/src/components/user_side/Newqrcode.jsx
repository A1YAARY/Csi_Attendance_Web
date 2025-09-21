import React, { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const NewQrcode = () => {
  const navigate = useNavigate();
  const qrRef = useRef(null);
  const [running, setRunning] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const BASE_URL =
    import.meta.env.VITE_BACKEND_BASE_URL ||
    "https://csi-attendance-web.onrender.com";
  const token = localStorage.getItem("accessToken");

  // Determine next expected type based on local flags
  const nextType = (() => {
    const inT = localStorage.getItem("checkInTime");
    const outT = localStorage.getItem("checkOutTime");
    return inT && !outT ? "check-out" : "check-in";
  })();

  // Extract code from plain text, JSON, or URL with ?code=
  const extractCode = (decodedText) => {
    try {
      const j = JSON.parse(decodedText);
      if (j.code) return j.code.toString();
    } catch {}
    try {
      const url = new URL(decodedText);
      const c = url.searchParams.get("code");
      if (c) return c.toString();
    } catch {}
    return decodedText?.toString().trim();
  };

  const postScan = async (decodedText) => {
    if (isProcessing) return;
    setIsProcessing(true);
    setErrorMsg("");

    const code = extractCode(decodedText);
    if (!code) {
      setErrorMsg("Invalid QR content");
      setIsProcessing(false);
      return;
    }

    try {
      const res = await axios.post(
        `${BASE_URL}/attend/scan`,
        { code, type: nextType },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          withCredentials: true,
          timeout: 10000,
        }
      );

      // Update local phase flags so the next scan flips correctly
      const now = new Date().toISOString();
      if (nextType === "check-in") {
        localStorage.setItem("checkInTime", now);
        localStorage.removeItem("checkOutTime");
      } else {
        localStorage.setItem("checkOutTime", now);
      }

      navigate("/animation");
    } catch (err) {
      const msg = err.response?.data?.message || "Scan failed";
      setErrorMsg(msg);
      setIsProcessing(false);
    }
  };

  // Prefer rear camera for Android
  const pickRear = (devices) => {
    return (
      devices.find((d) => (d.label || "").toLowerCase().includes("back")) ||
      devices.find((d) => (d.label || "").toLowerCase().includes("rear")) ||
      devices[devices.length - 1] ||
      devices[0]
    );
  };

  useEffect(() => {
    const id = "qr-canvas";
    let scanner;

    const start = async () => {
      try {
        scanner = new Html5Qrcode(id);
        qrRef.current = scanner;

        const cams = await Html5Qrcode.getCameras();
        if (!cams || cams.length === 0) {
          setErrorMsg("No camera found");
          return;
        }
        const cam = pickRear(cams);

        await scanner.start(
          cam.id,
          {
            fps: 12,
            qrbox: { width: 260, height: 260 },
            aspectRatio: 1.33,
            disableFlip: true,
          },
          async (decodedText) => {
            if (!running || isProcessing) return;
            setRunning(false);
            try {
              await scanner.stop();
              await scanner.clear();
            } catch {}
            await postScan(decodedText);
          },
          (scanErr) => {
            // ignore continuous decode errors to keep UI smooth
          }
        );

        setRunning(true);
      } catch (e) {
        setErrorMsg(e?.message || "Failed to start camera");
      }
    };

    start();

    return () => {
      const stop = async () => {
        try {
          if (qrRef.current) {
            const s = qrRef.current;
            await s.stop();
            await s.clear();
          }
        } catch {}
      };
      stop();
    };
  }, []); // one-time init for Android-friendly behavior

  const tryAgain = async () => {
    setErrorMsg("");
    setIsProcessing(false);
    // Soft reload the component route for a clean camera session
    navigate(0);
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-slate-900 to-slate-800 text-white flex flex-col items-center justify-start px-4 py-6">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold tracking-tight">
            {nextType === "check-in" ? "Scan to Check‑In" : "Scan to Check‑Out"}
          </h2>
          <span className="text-xs px-2 py-1 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-400/30">
            {nextType.toUpperCase()}
          </span>
        </div>

        <div className="relative rounded-2xl overflow-hidden border border-white/10 shadow-lg">
          <div id="qr-canvas" className="w-full h-[320px] bg-black" />

          {/* Neon scan line */}
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute left-4 right-4 top-1/2 h-[2px] bg-gradient-to-r from-transparent via-cyan-300 to-transparent animate-pulse" />
            <div className="absolute inset-0 border border-white/10 rounded-2xl" />
          </div>

          {/* Processing overlay */}
          {isProcessing && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
              <div className="h-10 w-10 border-2 border-cyan-300 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>

        {errorMsg && (
          <div className="mt-4 rounded-lg bg-red-500/15 border border-red-400/30 text-red-200 px-3 py-2 text-sm">
            {errorMsg}
          </div>
        )}

        <div className="mt-5 flex gap-3">
          <button
            onClick={() => navigate(-1)}
            className="flex-1 h-11 rounded-lg bg-white/10 hover:bg-white/15 border border-white/15 transition"
          >
            Cancel
          </button>
          <button
            onClick={tryAgain}
            disabled={isProcessing}
            className="flex-1 h-11 rounded-lg bg-cyan-500 hover:bg-cyan-600 transition disabled:opacity-60"
          >
            Scan Again
          </button>
        </div>

        <p className="mt-3 text-xs text-white/70 text-center">
          Hold the phone steady and center the QR in the box for fastest
          detection.
        </p>
      </div>
    </div>
  );
};

export default NewQrcode;
