import React, { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const NewQrcode = () => {
  const navigate = useNavigate();
  const scannerRef = useRef(null);
  const busyRef = useRef(false);

  const [ui, setUi] = useState({ ready: false, running: false, error: "" });
  const [status, setStatus] = useState("checked-out");
  const [cams, setCams] = useState([]);
  const [selCam, setSelCam] = useState("");

  const BASE_URL = import.meta.env.VITE_BACKEND_BASE_URL || "https://csi-attendance-web.onrender.com";
  const token = localStorage.getItem("accessToken");

  const containerStyle = {
    minHeight: "100vh",
    backgroundColor: "#fff",
    color: "#111",
    fontFamily: "system-ui, -apple-system, Roboto, Segoe UI, Arial, sans-serif",
    padding: 16,
    display: "flex",
    flexDirection: "column",
    gap: 12,
  };

  const cardStyle = {
    background: "#fff",
    border: "1px solid #eee",
    borderRadius: 12,
    padding: 16,
    boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
  };

  const buttonStyle = {
    width: "100%",
    padding: 14,
    borderRadius: 12,
    border: "none",
    background: "#111",
    color: "#fff",
    fontSize: 16,
  };

  const subtitle = { color: "#666", fontSize: 13 };

  const parseQr = (text) => {
    try {
      const obj = JSON.parse(text);
      return {
        code: obj.code ?? text,
        qrType: obj.qrType || obj.type,
      };
    } catch {
      return { code: text, qrType: undefined };
    }
  };

  const getGeo = () =>
    new Promise((resolve) => {
      if (!navigator.geolocation) return resolve(null);
      navigator.geolocation.getCurrentPosition(
        (p) => resolve({ latitude: p.coords.latitude, longitude: p.coords.longitude, accuracy: p.coords.accuracy }),
        () => resolve(null),
        { enableHighAccuracy: true, timeout: 5000 }
      );
    });

  const loadStatus = async () => {
    try {
      const r = await axios.get(`${BASE_URL}/attend/past?limit=1`, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });
      const arr = r.data?.data || r.data?.attendance || [];
      setStatus(arr[0]?.type === "check-in" ? "checked-in" : "checked-out");
    } catch {
      setStatus("checked-out");
    } finally {
      setUi((s) => ({ ...s, ready: true }));
    }
  };

  const nextActionByStatus = () => (status === "checked-in" ? "check-out" : "check-in");

  const stopCamera = async () => {
    try {
      if (scannerRef.current && ui.running) {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      }
    } catch {}
    setUi((s) => ({ ...s, running: false }));
  };

  const handleDecode = async (text) => {
    if (busyRef.current) return;
    busyRef.current = true;

    // 1) Stop camera immediately to prevent repeated decodes
    await stopCamera();

    // 2) Show interim page while posting (you mentioned “login screen” – navigate there first)
    navigate("/login", { replace: true }); // change to your verification route if different

    try {
      const { code, qrType } = parseQr(text);
      const type = qrType && (qrType === "check-in" || qrType === "check-out") ? qrType : nextActionByStatus();
      const geo = await getGeo();

      const body = {
        code,
        type,
        ...(geo ? { location: geo } : {}),
        deviceInfo: {
          platform: "Android",
          userAgent: navigator.userAgent,
        },
      };

      const resp = await axios.post(`${BASE_URL}/attend/scan`, body, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        withCredentials: true,
      });

      // 3) Navigate to the respective page after success
      if (type === "check-in") navigate("/checked-in", { replace: true });
      else navigate("/checked-out", { replace: true });
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || "Scan failed";
      setUi((s) => ({ ...s, error: msg }));
      navigate("/scan-error", { replace: true });
    } finally {
      busyRef.current = false;
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  useEffect(() => {
    if (!ui.ready) return;

    let scanner;
    const start = async () => {
      try {
        scanner = new Html5Qrcode("qr-box");
        scannerRef.current = scanner;

        const devices = await Html5Qrcode.getCameras();
        setCams(devices || []);

        const rear =
          devices?.find((d) => (d.label || "").toLowerCase().includes("back") || (d.label || "").toLowerCase().includes("environment")) ||
          devices?.[devices.length - 1] ||
          devices?.[0];

        const id = selCam || rear?.id;
        if (!id) throw new Error("No camera available");

        await scanner.start(
          id,
          { fps: 15, qrbox: { width: 280, height: 280 }, aspectRatio: 1.0, disableFlip: false },
          (txt) => handleDecode(txt),
          () => {}
        );
        setUi((s) => ({ ...s, running: true }));
      } catch (err) {
        setUi((s) => ({ ...s, error: err?.message || "Failed to start camera" }));
      }
    };

    start();
    return () => {
      stopCamera();
    };
  }, [ui.ready, selCam]);

  return (
    <div style={containerStyle}>
      <div style={{ ...cardStyle }}>
        <h2 style={{ margin: 0 }}>Scan QR</h2>
        <p style={subtitle}>
          {status === "checked-in" ? "Currently checked in — next scan will check out." : "Currently checked out — next scan will check in."}
        </p>
      </div>

      <div style={{ ...cardStyle, display: "flex", flexDirection: "column", gap: 8 }}>
        <label htmlFor="cam" style={{ fontSize: 13, color: "#444" }}>
          Camera
        </label>
        <select
          id="cam"
          value={selCam}
          onChange={(e) => setSelCam(e.target.value)}
          style={{ padding: 12, borderRadius: 10, border: "1px solid #ddd", background: "#fff" }}
        >
          <option value="">Auto</option>
          {cams.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label || c.id}
            </option>
          ))}
        </select>
      </div>

      <div id="qr-box" style={{ width: "100%", maxWidth: 360, height: 360, margin: "0 auto", borderRadius: 12, background: "#fafafa", border: "1px solid #eee" }} />

      {ui.error && (
        <div style={{ ...cardStyle, color: "#b00020" }}>
          <strong>{ui.error}</strong>
        </div>
      )}

      <button
        style={buttonStyle}
        onClick={async () => {
          if (ui.running) await stopCamera();
          else setUi((s) => ({ ...s, ready: true }));
        }}
      >
        {ui.running ? "Stop camera" : "Start camera"}
      </button>

      <p style={{ ...subtitle, textAlign: "center" }}>Android optimized • Single‑scan flow • Camera stops after decode</p>
    </div>
  );
};

export default NewQrcode;
