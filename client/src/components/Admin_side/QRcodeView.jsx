import React, { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
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

  useEffect(() => {
    console.log(qrCodes);
    console.log("BASE_URL", BASE_URL);
  }, []);

  // Optional: keep dummy only for explicit fallback testing
  const dummyData = {
    checkIn: {
      qrImageData:
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
      code: "dummy_checkin_code_123",
      usageCount: 12,
      type: "check-in",
      active: true,
    },
    checkOut: {
      qrImageData:
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
      code: "dummy_checkout_code_456",
      usageCount: 10,
      type: "check-out",
      active: true,
    },
  };

  const normalizeDataUrl = (value) => {
    if (!value) return "";
    return value.startsWith("data:") ? value : `data:image/png;base64,${value}`;
  };

  // Fetch QR codes from backend - MINIMAL CHANGE TO FIX ERROR
  const fetchQRCodes = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem("accessToken");
      const res = await fetch(`${BASE_URL}/admin/qrcodes`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      // CHECK IF RESPONSE IS JSON BEFORE PARSING
      const isJson = res.headers
        .get("content-type")
        ?.includes("application/json");
      if (!res.ok) {
        if (isJson) {
          const err = await res.json();
          throw new Error(err?.message || `HTTP ${res.status}`);
        } else {
          const text = await res.text();
          throw new Error(`Non-JSON response: ${text.slice(0, 120)}`);
        }
      }

      if (!isJson) {
        const text = await res.text();
        throw new Error(`Expected JSON, got: ${text.slice(0, 120)}`);
      }
      const data = await res.json();

      console.log("✅ QR Codes fetched successfully:", data);

      const mapped = data?.qrCodes
        ? {
            checkIn: data.qrCodes.checkIn
              ? {
                  qrImageData: normalizeDataUrl(
                    data.qrCodes.checkIn.qrImage ??
                      data.qrCodes.checkIn.qrImageData
                  ),
                  code: data.qrCodes.checkIn.code,
                  usageCount: data.qrCodes.checkIn.usageCount ?? 0,
                  type: data.qrCodes.checkIn.type || "check-in",
                  active: data.qrCodes.checkIn.active ?? true,
                  id:
                    data.qrCodes.checkIn.id ||
                    data.qrCodes.checkIn._id ||
                    undefined,
                }
              : null,
            checkOut: data.qrCodes.checkOut
              ? {
                  qrImageData: normalizeDataUrl(
                    data.qrCodes.checkOut.qrImage ??
                      data.qrCodes.checkOut.qrImageData
                  ),
                  code: data.qrCodes.checkOut.code,
                  usageCount: data.qrCodes.checkOut.usageCount ?? 0,
                  type: data.qrCodes.checkOut.type || "check-out",
                  active: data.qrCodes.checkOut.active ?? true,
                  id:
                    data.qrCodes.checkOut.id ||
                    data.qrCodes.checkOut._id ||
                    undefined,
                }
              : null,
          }
        : null;

      if (!mapped) {
        throw new Error("Unexpected response shape: missing qrCodes");
      }
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
      const token = localStorage.getItem("accessToken");
      const res = await fetch(`${BASE_URL}/admin/qrcodes/regenerate`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ type }), // type: 'both' | 'check-in' | 'check-out'
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const data = await res.json();
      console.log("✅ QR Codes regenerated:", data);
      await fetchQRCodes();
    } catch (e) {
      console.error("❌ Error regenerating QR codes:", e);
      setError("Failed to regenerate QR codes");
    } finally {
      setRegenerating(false);
    }
  };

  // Download QR code
  const downloadQRCode = (qrImageData, type) => {
    const link = document.createElement("a");
    link.href = normalizeDataUrl(qrImageData);
    link.download = `${type}-qr-code.png`;
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  useEffect(() => {
    fetchQRCodes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-3 sm:p-4 lg:p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-lg shadow-md p-6 sm:p-8 text-center">
            <div className="animate-pulse">
              <QrCode className="w-12 h-12 sm:w-16 sm:h-16 mx-auto text-gray-400 mb-4" />
              <p className="text-sm sm:text-base text-gray-600">
                Fetching the latest organization QR codes from the server...
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-3 sm:p-4 lg:p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-lg shadow-md p-6 sm:p-8">
            <div className="text-center">
              <XCircle className="w-12 h-12 sm:w-16 sm:h-16 mx-auto text-red-500 mb-4" />
              <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-red-600 mb-2">
                Failed to Load QR Codes
              </h2>
              <p className="text-sm sm:text-base text-gray-600 mb-4 max-w-md mx-auto">
                {error}
              </p>
              <button
                onClick={fetchQRCodes}
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg transition-colors text-sm sm:text-base touch-manipulation"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-3 sm:p-4 lg:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 lg:p-8">
          {/* Header Section - Responsive */}
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6 sm:mb-8">
            <div className="text-center sm:text-left">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-800">
                Organization QR Codes
              </h1>
              <p className="text-sm sm:text-base text-gray-600 mt-1">
                Manage attendance tracking QR codes
              </p>
            </div>
            {/* <button
              onClick={() => regenerateQRCodes()}
              disabled={regenerating}
              className="flex items-center justify-center space-x-2 bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white px-3 sm:px-4 py-2 sm:py-3 rounded-lg transition-colors text-sm sm:text-base touch-manipulation w-full sm:w-auto"
            >
              <RefreshCw
                className={`w-4 h-4 sm:w-5 sm:h-5 ${
                  regenerating ? "animate-spin" : ""
                }`}
              />
              <span>
                {regenerating ? "Regenerating..." : "Regenerate Both"}
              </span>
            </button> */}
          </div>

          {/* QR Codes Grid - Responsive */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
            {/* Check-In QR Code */}
            {qrCodes?.checkIn && (
              <div className="bg-gray-50 rounded-lg p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4">
                  <h2 className="text-lg sm:text-xl font-semibold text-gray-800 flex items-center">
                    <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6 text-green-500 mr-2 flex-shrink-0" />
                    <span className="truncate">Check-In QR Code</span>
                  </h2>
                  <div className="flex space-x-2 justify-center sm:justify-end">
                    {/* <button
                      onClick={() => regenerateQRCodes("check-in")}
                      disabled={regenerating}
                      className="p-2 text-blue-500 hover:bg-blue-100 rounded-lg transition-colors touch-manipulation"
                      title="Regenerate Check-In QR"
                    >
                      <RefreshCw
                        className={`w-4 h-4 ${
                          regenerating ? "animate-spin" : ""
                        }`}
                      />
                    </button> */}
                    <button
                      onClick={() =>
                        downloadQRCode(qrCodes.checkIn.qrImageData, "check-in")
                      }
                      className="p-2 text-green-500 hover:bg-green-100 rounded-lg transition-colors touch-manipulation"
                      title="Download Check-In QR"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="text-center">
                  {/* QR Code Display - Responsive */}
                  <div className="bg-white p-3 sm:p-4 rounded-lg inline-block shadow-sm mb-4">
                    <img
                      src={qrCodes.checkIn.qrImageData}
                      alt="Check-In QR Code"
                      className="w-32 h-32 sm:w-40 sm:h-40 lg:w-48 lg:h-48 mx-auto"
                    />
                  </div>

                  {/* QR Code Info - Mobile Optimized */}
                  <div className="space-y-2 text-xs sm:text-sm text-gray-600">
                    <div className="bg-white p-2 sm:p-3 rounded border">
                      <p className="font-medium text-gray-700 mb-1">Code:</p>
                      <p className="break-all font-mono text-xs">
                        {qrCodes.checkIn.code}
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-white p-2 sm:p-3 rounded border text-center">
                        <p className="font-medium text-gray-700">Usage Count</p>
                        <p className="text-lg font-bold text-blue-600">
                          {qrCodes.checkIn.usageCount}
                        </p>
                      </div>
                      <div className="bg-white p-2 sm:p-3 rounded border text-center">
                        <p className="font-medium text-gray-700">Status</p>
                        <p
                          className={`font-bold ${
                            qrCodes.checkIn.active
                              ? "text-green-600"
                              : "text-red-600"
                          }`}
                        >
                          {qrCodes.checkIn.active ? "Active" : "Inactive"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Check-Out QR Code */}
            {qrCodes?.checkOut && (
              <div className="bg-gray-50 rounded-lg p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4">
                  <h2 className="text-lg sm:text-xl font-semibold text-gray-800 flex items-center">
                    <XCircle className="w-5 h-5 sm:w-6 sm:h-6 text-red-500 mr-2 flex-shrink-0" />
                    <span className="truncate">Check-Out QR Code</span>
                  </h2>
                  <div className="flex space-x-2 justify-center sm:justify-end">
                    {/* <button
                      onClick={() => regenerateQRCodes("check-out")}
                      disabled={regenerating}
                      className="p-2 text-blue-500 hover:bg-blue-100 rounded-lg transition-colors touch-manipulation"
                      title="Regenerate Check-Out QR"
                    >
                      <RefreshCw
                        className={`w-4 h-4 ${
                          regenerating ? "animate-spin" : ""
                        }`}
                      />
                    </button> */}
                    <button
                      onClick={() =>
                        downloadQRCode(
                          qrCodes.checkOut.qrImageData,
                          "check-out"
                        )
                      }
                      className="p-2 text-green-500 hover:bg-green-100 rounded-lg transition-colors touch-manipulation"
                      title="Download Check-Out QR"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="text-center">
                  {/* QR Code Display - Responsive */}
                  <div className="bg-white p-3 sm:p-4 rounded-lg inline-block shadow-sm mb-4">
                    <img
                      src={qrCodes.checkOut.qrImageData}
                      alt="Check-Out QR Code"
                      className="w-32 h-32 sm:w-40 sm:h-40 lg:w-48 lg:h-48 mx-auto"
                    />
                  </div>

                  {/* QR Code Info - Mobile Optimized */}
                  <div className="space-y-2 text-xs sm:text-sm text-gray-600">
                    <div className="bg-white p-2 sm:p-3 rounded border">
                      <p className="font-medium text-gray-700 mb-1">Code:</p>
                      <p className="break-all font-mono text-xs">
                        {qrCodes.checkOut.code}
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-white p-2 sm:p-3 rounded border text-center">
                        <p className="font-medium text-gray-700">Usage Count</p>
                        <p className="text-lg font-bold text-blue-600">
                          {qrCodes.checkOut.usageCount}
                        </p>
                      </div>
                      <div className="bg-white p-2 sm:p-3 rounded border text-center">
                        <p className="font-medium text-gray-700">Status</p>
                        <p
                          className={`font-bold ${
                            qrCodes.checkOut.active
                              ? "text-green-600"
                              : "text-red-600"
                          }`}
                        >
                          {qrCodes.checkOut.active ? "Active" : "Inactive"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* No QR Codes Available - Responsive */}
          {!qrCodes?.checkIn && !qrCodes?.checkOut && (
            <div className="text-center py-8 sm:py-12">
              <QrCode className="w-12 h-12 sm:w-16 sm:h-16 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg sm:text-xl font-semibold text-gray-600 mb-2">
                No QR Codes Available
              </h3>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default QRcodeView;
