import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useLocation } from "react-router-dom";

const AnimationPage = () => {
  const user = JSON.parse(localStorage.getItem("userData"));
  const navigate = useNavigate();
  const location = useLocation();
  const [scanData, setScanData] = useState(null);

  const hidden3 = () => {
    navigate("/Dashboard");
  };

  const [step, setStep] = useState("logoOnly");

  // Get scan data from navigation state or localStorage
  useEffect(() => {
    let scanResult = null;

    // First try to get from navigation state
    if (location.state?.scanData) {
      scanResult = location.state.scanData;
    } else {
      // Fallback to localStorage
      const storedResult = localStorage.getItem("scanResult");
      if (storedResult) {
        try {
          scanResult = JSON.parse(storedResult);
          localStorage.removeItem("scanResult"); // Clear after use
        } catch (error) {
          console.error("Error parsing scan result:", error);
        }
      }
    }

    setScanData(scanResult);
  }, [location.state]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setStep("logoAndText");
    }, 1200);
    return () => clearTimeout(timer);
  }, []);

  // Helper functions for formatting
  const formatTime = (timestamp) => {
    if (!timestamp) return "---";
    return new Date(timestamp).toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return new Date().toLocaleDateString();
    return new Date(timestamp).toLocaleDateString("en-IN");
  };

  const getActionText = () => {
    if (!scanData) return "Attendance Marked";
    return scanData.action === "check-in"
      ? "Check-in Successful"
      : scanData.action === "check-out"
      ? "Check-out Successful"
      : "Attendance Marked";
  };

  const getEntryText = () => {
    if (!scanData) return "Your entry has been marked";
    return scanData.action === "check-in"
      ? "Your entry has been marked"
      : scanData.action === "check-out"
      ? "Your exit has been marked"
      : "Your attendance has been marked";
  };

  // Get current check-in and check-out times
  const getCurrentTimes = () => {
    if (!scanData) return { checkIn: "---", checkOut: "---" };

    const currentTime = formatTime(scanData.timestamp);

    if (scanData.action === "check-in") {
      return { checkIn: currentTime, checkOut: "---" };
    } else if (scanData.action === "check-out") {
      // For check-out, we need to show both times if available from dailySummary
      const sessions = scanData.dailySummary?.sessions;
      if (sessions && sessions > 0) {
        return { checkIn: "9:40 AM", checkOut: currentTime }; // You might want to get actual check-in time
      }
      return { checkIn: "---", checkOut: currentTime };
    }

    return { checkIn: "---", checkOut: "---" };
  };

  const times = getCurrentTimes();

  return (
    <div className="h-[100dvh] bg-white">
      <div className="w-full h-full flex justify-center relative overflow-hidden">
        <AnimatePresence mode="wait">
          {/* LOGO STEP */}
          {(step === "logoOnly" || step === "logoAndText") && (
            <motion.div
              key="logo"
              className="absolute flex flex-col items-center justify-center h-screen"
              initial={{ scale: 0, y: 0, opacity: 0 }}
              animate={{
                scale: step === "logoOnly" ? 1 : 0.7,
                y: step === "logoOnly" ? 0 : -260,
                opacity: 1,
              }}
              transition={{
                type: "spring",
                stiffness: 90,
                damping: 18,
              }}
            >
              {/* Logo Image */}
              <motion.img
                src="/Checkmark.png"
                alt="Checkmark"
                className="h-[156px] w-[152px]"
                transition={{
                  type: "spring",
                  stiffness: 150,
                  damping: 15,
                }}
              />

              {/* Dynamic Logo Title */}
              <motion.span
                className="font-semibold text-[30px] mt-4"
                initial={{ opacity: 1, y: 20 }}
                animate={{
                  scale: step === "logoOnly" ? 1 : 1.3,
                  y: step === "logoOnly" ? 0 : 10,
                }}
                transition={{ duration: 0.6 }}
              >
                {getActionText()}
              </motion.span>
            </motion.div>
          )}

          {/* DETAILS & DASHBOARD BUTTON */}
          {step === "logoAndText" && (
            <motion.div
              className="w-full h-full relative flex flex-col pb-[22px] items-center justify-end"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8, duration: 0.7 }}
            >
              {/* FADE-IN DETAILS */}
              <motion.div
                className="markedD flex flex-col items-center"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  delay: 1,
                  duration: 0.7,
                  ease: [0.16, 1, 0.3, 1],
                }}
              >
                <div className="marked flex flex-col justify-center items-center h-[100px] w-[350px] gap-[10px]">
                  <div className="text flex flex-col justify-center items-center">
                    <span className="text-gray-400">{getEntryText()}</span>
                    {/* Show verification status if available */}
                    {scanData && (
                      <span
                        className={`text-xs mt-1 ${
                          scanData.verified
                            ? "text-green-600"
                            : "text-orange-500"
                        }`}
                      >
                        {scanData.verified ? "✓ Verified" : "⚠ Unverified"}
                      </span>
                    )}
                  </div>
                </div>

                {/* DETAILS CARD */}
                <motion.div
                  className="detail h-[450px] w-[350px] flex flex-col gap-[5px]"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.3, duration: 0.6 }}
                >
                  <span className="font-semibold">Details:</span>
                  <div className="info flex flex-col justify-center items-center h-[410px] border-slate-300 border-[1px] rounded-2xl shadow-md bg-white">
                    {[
                      ["Name", user?.name || "N/A"],
                      ["Employee ID", user?.id || "N/A"],
                      ["Department", user?.department || "EXTC"],
                      ["Date", formatDate(scanData?.timestamp)],
                    ].map(([label, value], i) => (
                      <motion.div
                        key={i}
                        className="info1 h-[64px] w-[310px] flex flex-col gap-[12px]"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 1.5 + i * 0.1 }}
                      >
                        <span className="text-sm font-semibold">{label}</span>
                        <span className="text-xs text-gray-500">{value}</span>
                      </motion.div>
                    ))}

                    {/* Dynamic Check-in & Check-out */}
                    <motion.div
                      className="info1 h-[64px] w-[310px] flex justify-between"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 1.9 }}
                    >
                      <div className="checkIn flex flex-col gap-[12px]">
                        <span className="text-sm font-semibold">
                          Check-in time
                        </span>
                        <span className="text-xs text-gray-500">
                          {times.checkIn}
                        </span>
                      </div>
                      <div className="checkOut flex flex-col gap-[12px]">
                        <span className="text-sm font-semibold">
                          Check-out time
                        </span>
                        <span className="text-xs text-gray-500">
                          {times.checkOut}
                        </span>
                      </div>
                    </motion.div>

                    {/* Additional Info - Working Time (if available) */}
                    {scanData?.dailySummary?.totalMinutes > 0 && (
                      <motion.div
                        className="info1 h-[40px] w-[310px] flex justify-between items-center border-t pt-2"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 2.1 }}
                      >
                        <span className="text-sm font-semibold">
                          Total Time Today:
                        </span>
                        <span className="text-xs text-blue-600 font-medium">
                          {Math.floor(scanData.dailySummary.totalMinutes / 60)}h{" "}
                          {scanData.dailySummary.totalMinutes % 60}m
                        </span>
                      </motion.div>
                    )}
                  </div>

                  {/* BUTTON */}
                  <motion.button
                    onClick={hidden3}
                    className="flex justify-center items-center mt-[20px] rounded-lg text-sm gap-3 bg-[#1D61E7] text-white w-[350px] h-[48px] shadow-[0px_4px_4px_0px_#00000040]"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    transition={{ type: "spring", stiffness: 200, damping: 12 }}
                  >
                    Go to Dashboard
                  </motion.button>
                </motion.div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default AnimationPage;
