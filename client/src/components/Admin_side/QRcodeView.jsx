import React, { useEffect, useState } from "react";
import { useAuth } from "../../context/authStore";
import {
  QrCode,
  RefreshCw,
  Download,
  CheckCircle2,
  XCircle,
} from "lucide-react";

const QRcodeView = () => {
  const { BASE_URL } = useAuth();

  const [qrCodes, setQrCodes] = useState(null);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [error, setError] = useState(null);

  const normalizeDataUrl = (value) => {
    if (!value) return "";
    return value.startsWith("data:") ? value : `data:image/png;base64,${value}`;
  };

  // Fetch QR codes from backend
  const fetchQRCodes = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem("accessToken");

      if (!token) {
        throw new Error("No access token found. Please login again.");
      }

      const res = await fetch(`${BASE_URL}/admin/qrcodes`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      const isJson = res.headers
        .get("content-type")
        ?.includes("application/json");

      if (!res.ok) {
        if (isJson) {
          const err = await res.json();
          throw new Error(
            err?.message || `HTTP ${res.status}: ${res.statusText}`
          );
        } else {
          const text = await res.text();
          throw new Error(`HTTP ${res.status}: ${text.slice(0, 120)}`);
        }
      }

      if (!isJson) {
        const text = await res.text();
        throw new Error(`Expected JSON, got: ${text.slice(0, 120)}`);
      }

      const data = await res.json();
      console.log("✅ QR Codes API Response:", data);

      // Handle different possible response structures
      let qrCodesData = null;

      if (data?.qrCodes) {
        // Structure: { qrCodes: { checkIn: {...}, checkOut: {...} } }
        qrCodesData = data.qrCodes;
      } else if (data?.checkIn || data?.checkOut) {
        // Structure: { checkIn: {...}, checkOut: {...} }
        qrCodesData = data;
      } else if (Array.isArray(data)) {
        // Structure: [{ type: 'check-in', ... }, { type: 'check-out', ... }]
        qrCodesData = {
          checkIn: data.find((qr) => qr.type === "check-in"),
          checkOut: data.find((qr) => qr.type === "check-out"),
        };
      } else if (data?.success && data?.data) {
        // Structure: { success: true, data: { qrCodes: {...} } }
        qrCodesData = data.data.qrCodes || data.data;
      } else {
        // Try to use the entire response as qrCodes data
        qrCodesData = data;
      }

      const mapped = {
        checkIn: qrCodesData?.checkIn
          ? {
              qrImage: normalizeDataUrl(
                qrCodesData.checkIn.qrImage ??
                  qrCodesData.checkIn.qrImageData ??
                  qrCodesData.checkIn.image
              ),
              code: qrCodesData.checkIn.code ?? qrCodesData.checkIn._id,
              usageCount: qrCodesData.checkIn.usageCount ?? 0,
              type: qrCodesData.checkIn.type || "check-in",
              active: qrCodesData.checkIn.active ?? true,
              id: qrCodesData.checkIn.id || qrCodesData.checkIn._id,
              createdAt:
                qrCodesData.checkIn.createdAt ||
                qrCodesData.checkIn.createdAtIST,
            }
          : null,
        checkOut: qrCodesData?.checkOut
          ? {
              qrImage: normalizeDataUrl(
                qrCodesData.checkOut.qrImage ??
                  qrCodesData.checkOut.qrImageData ??
                  qrCodesData.checkOut.image
              ),
              code: qrCodesData.checkOut.code ?? qrCodesData.checkOut._id,
              usageCount: qrCodesData.checkOut.usageCount ?? 0,
              type: qrCodesData.checkOut.type || "check-out",
              active: qrCodesData.checkOut.active ?? true,
              id: qrCodesData.checkOut.id || qrCodesData.checkOut._id,
              createdAt:
                qrCodesData.checkOut.createdAt ||
                qrCodesData.checkOut.createdAtIST,
            }
          : null,
      };

      console.log("✅ Mapped QR Codes:", mapped);
      setQrCodes(mapped);
    } catch (e) {
      console.error("❌ Failed to fetch QR codes:", e);
      setError(
        e?.message || "Failed to fetch QR codes from server. Please retry."
      );
    } finally {
      setLoading(false);
    }
  };

  // Regenerate QR codes
  const regenerateQRCodes = async (type = "both") => {
    try {
      setRegenerating(true);
      setError(null);
      const token = localStorage.getItem("accessToken");

      if (!token) {
        throw new Error("No access token found. Please login again.");
      }

      const res = await fetch(`${BASE_URL}/admin/qrcodes/regenerate`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ type }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(
          errorData?.message || `HTTP ${res.status}: ${res.statusText}`
        );
      }

      const result = await res.json();
      console.log("✅ QR codes regenerated:", result);

      // Refresh the QR codes after regeneration
      await fetchQRCodes();
    } catch (e) {
      console.error("❌ Error regenerating QR codes:", e);
      setError(e?.message || "Failed to regenerate QR codes");
    } finally {
      setRegenerating(false);
    }
  };

  // Download QR code with banner
  const downloadQRCode = (qrImage, type) => {
    if (!qrImage) {
      alert("QR code image not available for download");
      return;
    }

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = qrImage;
    img.onerror = () => {
      alert("Failed to load QR code image for download");
    };
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        const bannerHeight = 60;
        canvas.width = img.width;
        canvas.height = img.height + bannerHeight;

        // Banner background
        ctx.fillStyle = type === "check-in" ? "#10B981" : "#EF4444"; // green/red
        ctx.fillRect(0, 0, canvas.width, bannerHeight);

        // Banner text
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 28px Arial";
        ctx.textAlign = "center";
        ctx.fillText(
          type === "check-in" ? "CHECK-IN QR CODE" : "CHECK-OUT QR CODE",
          canvas.width / 2,
          bannerHeight / 1.6
        );

        // Draw QR image
        ctx.drawImage(img, 0, bannerHeight, img.width, img.height);

        // Download
        const link = document.createElement("a");
        link.href = canvas.toDataURL("image/png");
        link.download = `${type}-qr-code.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch (error) {
        console.error("Error creating download:", error);
        alert("Failed to prepare QR code for download");
      }
    };
  };

  useEffect(() => {
    fetchQRCodes();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">
            Fetching the latest organization QR codes...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center text-center bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
        <div className="bg-white rounded-lg shadow-md p-8 max-w-md">
          <XCircle className="w-12 h-12 mx-auto text-red-500 mb-4" />
          <h2 className="font-bold text-red-600 mb-4 text-xl">
            Failed to Load QR Codes
          </h2>
          <p className="text-gray-600 mb-6 text-sm leading-relaxed">{error}</p>
          <div className="space-y-3">
            <button
              onClick={fetchQRCodes}
              disabled={loading}
              className="bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white px-6 py-2 rounded-lg font-medium transition-colors w-full"
            >
              {loading ? "Loading..." : "Try Again"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-7xl mx-auto bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">
            Organization QR Codes
          </h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Check-In */}
          {qrCodes?.checkIn && (
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-800 flex items-center">
                  <CheckCircle2 className="w-6 h-6 text-green-500 mr-2" />
                  Check-In QR Code
                </h2>
                <div className="flex gap-2">
                  <button
                    onClick={() =>
                      downloadQRCode(qrCodes.checkIn.qrImage, "check-in")
                    }
                    className="p-2 text-green-500 hover:bg-green-100 rounded-lg transition-colors"
                    title="Download Check-In QR"
                  >
                    <Download className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <div className="text-center">
                <div className="bg-white p-4 rounded-lg shadow-sm mb-4 inline-block">
                  <img
                    src={qrCodes.checkIn.qrImage}
                    alt="Check-In QR Code"
                    className="w-48 h-48 mx-auto"
                    onError={(e) => {
                      e.target.style.display = "none";
                      e.target.nextSibling.style.display = "block";
                    }}
                  />
                  <div
                    style={{ display: "none" }}
                    className="w-48 h-48 mx-auto bg-gray-200 flex items-center justify-center rounded"
                  >
                    <span className="text-gray-500 text-sm">
                      Image not available
                    </span>
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="font-mono text-xs break-all text-gray-600 bg-gray-100 p-2 rounded">
                    {qrCodes.checkIn.code}
                  </p>
                  {qrCodes.checkIn.usageCount !== undefined && (
                    <p className="text-sm text-gray-500">
                      Usage Count: {qrCodes.checkIn.usageCount}
                    </p>
                  )}
                  {qrCodes.checkIn.createdAt && (
                    <p className="text-xs text-gray-400">
                      Created:{" "}
                      {new Date(qrCodes.checkIn.createdAt).toLocaleString()}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Check-Out */}
          {qrCodes?.checkOut && (
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-800 flex items-center">
                  <XCircle className="w-6 h-6 text-red-500 mr-2" />
                  Check-Out QR Code
                </h2>
                <div className="flex gap-2">
                 
                  <button
                    onClick={() =>
                      downloadQRCode(qrCodes.checkOut.qrImage, "check-out")
                    }
                    className="p-2 text-green-500 hover:bg-green-100 rounded-lg transition-colors"
                    title="Download Check-Out QR"
                  >
                    <Download className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <div className="text-center">
                <div className="bg-white p-4 rounded-lg shadow-sm mb-4 inline-block">
                  <img
                    src={qrCodes.checkOut.qrImage}
                    alt="Check-Out QR Code"
                    className="w-48 h-48 mx-auto"
                    onError={(e) => {
                      e.target.style.display = "none";
                      e.target.nextSibling.style.display = "block";
                    }}
                  />
                  <div
                    style={{ display: "none" }}
                    className="w-48 h-48 mx-auto bg-gray-200 flex items-center justify-center rounded"
                  >
                    <span className="text-gray-500 text-sm">
                      Image not available
                    </span>
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="font-mono text-xs break-all text-gray-600 bg-gray-100 p-2 rounded">
                    {qrCodes.checkOut.code}
                  </p>
                  {qrCodes.checkOut.usageCount !== undefined && (
                    <p className="text-sm text-gray-500">
                      Usage Count: {qrCodes.checkOut.usageCount}
                    </p>
                  )}
                  {qrCodes.checkOut.createdAt && (
                    <p className="text-xs text-gray-400">
                      Created:{" "}
                      {new Date(qrCodes.checkOut.createdAt).toLocaleString()}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {!qrCodes?.checkIn && !qrCodes?.checkOut && (
          <div className="text-center py-12">
            <QrCode className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-600 mb-2">
              No QR Codes Available
            </h3>
            <p className="text-gray-500 mb-6">
              Generate QR codes for your organization to enable attendance
              tracking.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default QRcodeView;
