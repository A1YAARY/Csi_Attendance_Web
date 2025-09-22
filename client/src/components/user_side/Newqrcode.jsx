// src/pages/Newqrcode.jsx
import React, { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import axios from "axios";

const BASE_URL =
  import.meta.env.VITE_BACKEND_BASE_URL ||
  "https://csi-attendance-web.onrender.com";

export default function NewQrcode() {
  const html5QrCodeRef = useRef(null);
  const isBusyRef = useRef(false);

  const [ready, setReady] = useState(false);
  const [scannerRunning, setScannerRunning] = useState(false);
  const [status, setStatus] = useState("checked-out"); // "checked-in" | "checked-out"
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [cameras, setCameras] = useState([]);
  const [cameraId, setCameraId] = useState(null);
  const [torchOn, setTorchOn] = useState(false);

  const token = localStorage.getItem("accessToken");

  // Android PWA meta adjustments (optional)
  useEffect(() => {
    const theme = document.querySelector('meta[name="theme-color"]');
    const old = theme?.getAttribute("content");
    theme?.setAttribute("content", "#ffffff");
    return () => old && theme?.setAttribute("content", old);
  }, []);

  // Utilities
  const parseQr = (text) => {
    try {
      const obj = JSON.parse(text);
      return { code: obj.code ?? text, qrType: obj.qrType || obj.type };
    } catch {
      return { code: text, qrType: undefined };
    }
  };

  const nextAction = () => (status === "checked-in" ? "check-out" : "check-in");

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

  const loadStatus = async () => {
    try {
      const resp = await axios.get(`${BASE_URL}/attend/past?limit=1`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      const arr = resp.data?.data || resp.data?.attendance || [];
      if (Array.isArray(arr) && arr.length > 0) {
        setStatus(arr[0].type === "check-in" ? "checked-in" : "checked-out");
      } else {
        setStatus("checked-out");
      }
    } catch {
      setStatus("checked-out");
    } finally {
      setReady(true);
    }
  };

  const handleScan = async (decodedText) => {
    if (isBusyRef.current) return;
    isBusyRef.current = true;
    setMessage("");
    setError("");

    try {
      const { code, qrType } = parseQr(decodedText);
      const geo = await getGeo();
      const type =
        qrType && (qrType === "check-in" || qrType === "check-out")
          ? qrType
          : nextAction();

      const resp = await axios.post(
        `${BASE_URL}/attend/scan`,
        {
          code,
          type,
          ...(geo ? { location: geo } : {}),
          deviceInfo: {
            platform: navigator.platform || "Android",
            userAgent: navigator.userAgent,
          },
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      setStatus(type === "check-in" ? "checked-in" : "checked-out");
      setMessage(resp?.data?.message || "Success");
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || "Scan failed");
    } finally {
      isBusyRef.current = false;
      // restart preview to allow another scan
      restartScanner();
    }
  };

  const startScanner = async (preferredId) => {
    try {
      const instance = new Html5Qrcode("qr-view");
      html5QrCodeRef.current = instance;

      const devs = await Html5Qrcode.getCameras();
      setCameras(devs || []);
      const rear =
        devs?.find(
          (d) =>
            (d.label || "").toLowerCase().includes("back") ||
            (d.label || "").toLowerCase().includes("environment")
        ) ||
        devs?.[devs.length - 1] ||
        devs?.[0];

      const id = preferredId || cameraId || rear?.id;
      if (!id) throw new Error("No camera found");

      await instance.start(
        id,
        {
          fps: 15,
          qrbox: { width: 260, height: 260 },
          aspectRatio: 1.3,
          experimentalFeatures: { useBarCodeDetectorIfSupported: true },
        },
        (text) => {
          if (!isBusyRef.current) {
            // pause preview while processing
            instance
              .pause(true)
              .then(() => handleScan(text))
              .catch(() => handleScan(text));
          }
        },
        () => {}
      );

      // Torch control if supported
      try {
        const track =
          instance.getState() === 2 ? instance.getRunningTrack() : null;
        if (track && track.getCapabilities && track.applyConstraints) {
          const caps = track.getCapabilities();
          if (caps.torch) {
            await track.applyConstraints({ advanced: [{ torch: torchOn }] });
          }
        }
      } catch {}

      setScannerRunning(true);
    } catch (e) {
      setError(e?.message || "Failed to start camera");
      setScannerRunning(false);
    }
  };

  const stopScanner = async () => {
    const instance = html5QrCodeRef.current;
    if (!instance) return;
    try {
      if (instance.isScanning) await instance.stop();
      instance.clear();
    } catch {}
    setScannerRunning(false);
  };

  const restartScanner = async () => {
    await stopScanner();
    await startScanner();
  };

  // Boot
  useEffect(() => {
    loadStatus();
    return () => stopScanner();
  }, []);

  useEffect(() => {
    if (ready) startScanner();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  // UI
  return (
    <div style={styles.screen}>
      <header style={styles.header}>
        <h1 style={styles.title}>Scan QR</h1>
        <p style={styles.sub}>
          {status === "checked-in"
            ? "Status: Checked in"
            : "Status: Checked out"}
        </p>
      </header>

      <section style={styles.previewWrap}>
        <div id="qr-view" style={styles.preview} />
        <div style={styles.frame} />
      </section>

      {!!message && <p style={styles.ok}>{message}</p>}
      {!!error && <p style={styles.err}>{error}</p>}

      <div style={styles.controls}>
        <select
          aria-label="Camera"
          value={cameraId || ""}
          onChange={(e) => {
            setCameraId(e.target.value || null);
            restartScanner();
          }}
          style={styles.select}
        >
          <option value="">Default camera</option>
          {cameras.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label || c.id}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={async () => {
            try {
              const inst = html5QrCodeRef.current;
              const track = inst?.getRunningTrack?.();
              if (track?.getCapabilities && track.applyConstraints) {
                const caps = track.getCapabilities();
                if (caps.torch) {
                  const next = !torchOn;
                  await track.applyConstraints({ advanced: [{ torch: next }] });
                  setTorchOn(next);
                } else {
                  setError("Torch not supported on this camera");
                }
              }
            } catch {
              setError("Torch control failed");
            }
          }}
          style={styles.btn}
        >
          {torchOn ? "Torch Off" : "Torch On"}
        </button>

        <button type="button" onClick={restartScanner} style={styles.btn}>
          Restart
        </button>
      </div>

      <footer style={styles.footer}>
        <p style={styles.help}>
          Align the QR inside the square. Scans automatically.
        </p>
      </footer>
    </div>
  );
}

const styles = {
  screen: {
    backgroundColor: "#ffffff",
    color: "#222",
    minHeight: "100vh",
    fontFamily:
      "system-ui, -apple-system, Roboto, 'Segoe UI', Arial, sans-serif",
    display: "flex",
    flexDirection: "column",
    padding: "12px 12px 20px",
  },
  header: { paddingTop: 8, paddingBottom: 8 },
  title: { margin: 0, fontSize: 20, fontWeight: 600, lineHeight: 1.2 },
  sub: { margin: "4px 0 0", fontSize: 14, color: "#666" },

  previewWrap: { position: "relative", marginTop: 12, alignSelf: "center" },
  preview: {
    width: 320,
    height: 320,
    background: "#f5f5f5",
    borderRadius: 12,
    overflow: "hidden",
  },
  frame: {
    position: "absolute",
    top: 8,
    left: 8,
    right: 8,
    bottom: 8,
    border: "2px solid #0ea5e9",
    borderRadius: 10,
    pointerEvents: "none",
  },

  ok: { color: "#0f766e", fontSize: 14, marginTop: 12 },
  err: { color: "#b91c1c", fontSize: 14, marginTop: 12 },

  controls: {
    marginTop: 12,
    display: "flex",
    gap: 8,
    alignItems: "center",
    justifyContent: "space-between",
  },
  select: {
    flex: 1,
    padding: "10px 12px",
    borderRadius: 10,
    border: "1px solid #e5e7eb",
    background: "#fff",
    fontSize: 14,
    WebkitAppearance: "none",
  },
  btn: {
    padding: "10px 12px",
    borderRadius: 10,
    border: "1px solid #e5e7eb",
    background: "#fff",
    fontSize: 14,
    minWidth: 100,
  },
  footer: { marginTop: "auto", paddingTop: 8 },
  help: { fontSize: 13, color: "#6b7280" },
};
