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

  },[]);

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

      // Expecting shape like:
      // { lastUpdated, organizationId, organizationName,
      //   qrCodes: { checkIn: {..., qrImage: "data:image/png;base64,..."}, checkOut: {...} },
      //   settings: {...}
      // }
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
      // Comment out the next line if dummy fallback should not appear automatically
      // setQrCodes(dummyData);
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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <div className="animate-pulse">
              <QrCode className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600">
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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-md p-8">
            <div className="text-center">
              <XCircle className="w-16 h-16 mx-auto text-red-500 mb-4" />
              <h2 className="text-2xl font-bold text-red-600 mb-2">
                Failed to Load QR Codes
              </h2>
              <p className="text-gray-600 mb-4">{error}</p>
              <button
                onClick={fetchQRCodes}
                className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg transition-colors"
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-8">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-gray-800">
              Organization QR Codes
            </h1>
            <button
              onClick={() => regenerateQRCodes()}
              disabled={regenerating}
              className="flex items-center space-x-2 bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg transition-colors"
            >
              <RefreshCw
                className={`w-5 h-5 ${regenerating ? "animate-spin" : ""}`}
              />
              <span>
                {regenerating ? "Regenerating..." : "Regenerate Both"}
              </span>
            </button>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Check-In QR Code */}
            {qrCodes?.checkIn && (
              <div className="bg-gray-50 rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-gray-800 flex items-center">
                    <CheckCircle2 className="w-6 h-6 text-green-500 mr-2" />
                    Check-In QR Code
                  </h2>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => regenerateQRCodes("check-in")}
                      disabled={regenerating}
                      className="p-2 text-blue-500 hover:bg-blue-100 rounded-lg transition-colors"
                      title="Regenerate Check-In QR"
                    >
                      <RefreshCw
                        className={`w-4 h-4 ${
                          regenerating ? "animate-spin" : ""
                        }`}
                      />
                    </button>
                    <button
                      onClick={() =>
                        downloadQRCode(qrCodes.checkIn.qrImageData, "check-in")
                      }
                      className="p-2 text-green-500 hover:bg-green-100 rounded-lg transition-colors"
                      title="Download Check-In QR"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="text-center">
                  <div className="bg-white p-4 rounded-lg inline-block shadow-sm">
                    <img
                      src={qrCodes.checkIn.qrImageData}
                      alt="Check-In QR Code"
                      className="w-48 h-48 mx-auto"
                    />
                  </div>
                  <div className="mt-4 text-sm text-gray-600">
                    <p>
                      <strong>Code:</strong> {qrCodes.checkIn.code}
                    </p>
                    <p>
                      <strong>Usage Count:</strong> {qrCodes.checkIn.usageCount}
                    </p>
                    <p>
                      <strong>Status:</strong>{" "}
                      <span
                        className={
                          qrCodes.checkIn.active
                            ? "text-green-600"
                            : "text-red-600"
                        }
                      >
                        {qrCodes.checkIn.active ? "Active" : "Inactive"}
                      </span>
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Check-Out QR Code */}
            {qrCodes?.checkOut && (
              <div className="bg-gray-50 rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-gray-800 flex items-center">
                    <XCircle className="w-6 h-6 text-red-500 mr-2" />
                    Check-Out QR Code
                  </h2>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => regenerateQRCodes("check-out")}
                      disabled={regenerating}
                      className="p-2 text-blue-500 hover:bg-blue-100 rounded-lg transition-colors"
                      title="Regenerate Check-Out QR"
                    >
                      <RefreshCw
                        className={`w-4 h-4 ${
                          regenerating ? "animate-spin" : ""
                        }`}
                      />
                    </button>
                    <button
                      onClick={() =>
                        downloadQRCode(
                          qrCodes.checkOut.qrImageData,
                          "check-out"
                        )
                      }
                      className="p-2 text-green-500 hover:bg-green-100 rounded-lg transition-colors"
                      title="Download Check-Out QR"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="text-center">
                  <div className="bg-white p-4 rounded-lg inline-block shadow-sm">
                    <img
                      src={qrCodes.checkOut.qrImageData}
                      alt="Check-Out QR Code"
                      className="w-48 h-48 mx-auto"
                    />
                  </div>
                  <div className="mt-4 text-sm text-gray-600">
                    <p>
                      <strong>Code:</strong> {qrCodes.checkOut.code}
                    </p>
                    <p>
                      <strong>Usage Count:</strong>{" "}
                      {qrCodes.checkOut.usageCount}
                    </p>
                    <p>
                      <strong>Status:</strong>{" "}
                      <span
                        className={
                          qrCodes.checkOut.active
                            ? "text-green-600"
                            : "text-red-600"
                        }
                      >
                        {qrCodes.checkOut.active ? "Active" : "Inactive"}
                      </span>
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* No QR Codes Available */}
          {!qrCodes?.checkIn && !qrCodes?.checkOut && (
            <div className="text-center py-12">
              <QrCode className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <h3 className="text-xl font-semibold text-gray-600 mb-2">
                No QR Codes Available
              </h3>
              <p className="text-gray-500 mb-4">
                Generate QR codes for your organization to enable attendance
                tracking.
              </p>
              <button
                onClick={() => regenerateQRCodes()}
                disabled={regenerating}
                className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg transition-colors"
              >
                Generate QR Codes
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default QRcodeView;
