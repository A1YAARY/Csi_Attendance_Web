import { AnimatePresence, motion } from "framer-motion";
import { useState, useEffect } from "react";
import TimeProgressBar from "./TimeProgressBar";

function Card() {
  const user = JSON.parse(localStorage.getItem("userData"));
  const [isExpanded, setIsExpanded] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [timeElapsed, setTimeElapsed] = useState("0h 0m");
  const [reminder, setReminder] = useState("--");

  // Dynamic state for attendance data
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch today's attendance data
  useEffect(() => {
    const fetchTodaysAttendance = async () => {
      try {
        setLoading(true);
        setError(null);

        // Get token from localStorage - check multiple possible keys
        let token = localStorage.getItem("accessToken") ||
          localStorage.getItem("token") ||
          localStorage.getItem("authToken");

        // If token is not found in direct keys, check in userData
        if (!token && user) {
          token = user.accessToken || user.token || user.authToken;
        }

        if (!token) {
          throw new Error("No authentication token found in localStorage");
        }

        console.log("Using token:", token.substring(0, 20) + "..."); // Debug log

        const response = await fetch(
          `${import.meta.env.VITE_BACKEND_BASE_URL}/attend/today`,
          {
            method: "GET",
            headers: {
              "Authorization": `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        console.log("Fetch result:", result); // Debug log
        
        if (result.success) {
          setTodayAttendance(result.data);
          console.log("Attendance data fetched successfully:", result.data);
        } else {
          throw new Error("Failed to fetch attendance data");
        }
      } catch (err) {
        console.error("Error fetching today's attendance:", err);
        setError(err.message);
        setTodayAttendance(null);
      } finally {
        setLoading(false);
      }
    };

    fetchTodaysAttendance();
  }, []); // Run once on component mount

  // Update current time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(timer);
  }, []);

  // Calculate time elapsed and reminder
  useEffect(() => {
    if (
      todayAttendance &&
      todayAttendance.sessions &&
      todayAttendance.sessions.length > 0
    ) {
      const lastSession =
        todayAttendance.sessions[todayAttendance.sessions.length - 1];

      if (lastSession.checkIn && !lastSession.checkOut) {
        // Currently checked in - calculate elapsed time
        const checkInTime = new Date(lastSession.checkIn.time);
        const now = new Date();
        const diffMs = now - checkInTime;
        const hours = Math.floor(diffMs / (1000 * 60 * 60));
        const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

        setTimeElapsed(`${hours}h ${minutes}m`);

        // Calculate reminder time (8 hours from check-in)
        const targetTime = new Date(checkInTime.getTime() + 8 * 60 * 60 * 1000);
        const reminderMs = targetTime - now;

        if (reminderMs > 0) {
          const reminderHours = Math.floor(reminderMs / (1000 * 60 * 60));
          const reminderMinutes = Math.floor(
            (reminderMs % (1000 * 60 * 60)) / (1000 * 60)
          );
          setReminder(`${reminderHours}h ${reminderMinutes}m`);
        } else {
          setReminder("0m");
        }
      } else {
        // Not currently checked in or session completed
        setTimeElapsed(todayAttendance.totalWorkingTimeFormatted || "--");
        setReminder("--");
      }
    } else {
      setTimeElapsed("--");
      setReminder("--");
    }
  }, [todayAttendance, currentTime]);

  const getEntryTime = () => {
    if (!todayAttendance?.sessions?.length) return "--";
    const first = todayAttendance.sessions[0];
    return first?.checkIn?.timeIST?.time || "--";
  };

  const getExitTime = () => {
    if (!todayAttendance?.sessions?.length) return "--";
    const sessionsWithCheckout = todayAttendance.sessions.filter((s) => s.checkOut);
    const last = sessionsWithCheckout[sessionsWithCheckout.length - 1];
    return last?.checkOut?.timeIST?.time || "--";
  };

  const getStatus = () => {
    if (!todayAttendance) return "Not Started";
    const s = String(todayAttendance.status || "").toLowerCase();
    if (s === "ongoing") return "Ongoing";
    if (s === "present") return "Completed"; // Completed day
    if (s === "half-day") return "Half-day";
    if (s === "absent") return "Not Started";
    return "Not Started";
  };

  const getDetailedCheckInOut = () => {
    if (!todayAttendance?.sessions?.length) {
      return { checkIn: "--", checkOut: "--" };
    }

    const sessions = todayAttendance.sessions;
    const firstCheckIn = sessions[0]?.checkIn?.timeIST?.time;

    // Find last checkout
    const lastCheckOut = sessions.filter((s) => s.checkOut).pop()?.checkOut?.timeIST?.time;

    return {
      checkIn: firstCheckIn || "--",
      checkOut: lastCheckOut || "--",
    };
  };

  const detailedTimes = getDetailedCheckInOut();

  if (loading) {
    return (
      <div className="bg-gradient-to-r from-pink-100 to-blue-100 rounded-2xl p-6 animate-pulse">
        <div className="h-8 bg-gray-200 rounded mb-4"></div>
        <div className="space-y-3">
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/3"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-red-800 mb-2">Error Loading Data</h3>
        <p className="text-red-600 text-sm mb-3">{error}</p>
        <div className="space-y-2 text-xs text-gray-600 mb-4">
          <p>Available localStorage keys:</p>
          <ul className="list-disc list-inside">
            <li>accessToken: {localStorage.getItem("accessToken") ? "✓" : "✗"}</li>
            <li>token: {localStorage.getItem("token") ? "✓" : "✗"}</li>
            <li>userData: {localStorage.getItem("userData") ? "✓" : "✗"}</li>
          </ul>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <>
      <motion.div
        className="bg-[url('./cardimage.png')] bg-cover rounded-2xl p-6 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
        whileTap={{ scale: 0.98 }}
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Today's Session</h3>
          <motion.div
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={{ duration: 0.3 }}
            className="font-extrabold"
          >
            ⮟
          </motion.div>
        </div>

        <div className="flex justify-between items-start mb-6">
          <div>
            <p className="text-sm text-gray-600">Entry:</p>
            <p className="text-2xl font-bold">{getEntryTime()}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Exit:</p>
            <p className="text-2xl font-bold">{getExitTime()}</p>
          </div>
        </div>

        <TimeProgressBar />

        <div className="flex justify-between items-center mt-4 text-sm">
          <div>
            <span className="text-gray-600">Status: </span>
            <span
              className={`font-semibold ${getStatus() === "Ongoing"
                  ? "text-orange-600"
                  : getStatus() === "Completed"
                    ? "text-green-600"
                    : "text-gray-600"
                }`}
            >
              {getStatus()}
            </span>
          </div>
          <div>
            <span className="text-gray-600">Time Elapsed: </span>
            <span className="font-semibold">{timeElapsed}</span>
          </div>
          <div>
            <span className="text-gray-600">Reminder: </span>
            <span className="font-semibold">{reminder}</span>
          </div>
        </div>
      </motion.div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="bg-[url('./cardimage.png')] bg-cover rounded-2xl border border-gray-200 p-6 mt-4"
          >
            <h4 className="font-semibold mb-4">Session Details</h4>

            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-gray-600">Name:</span>
                <span className="font-medium">{user?.name || "N/A"}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-600">Employee ID:</span>
                <span className="font-medium">{user?.id || user?._id || "N/A"}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-600">Email:</span>
                <span className="font-medium">{user?.email || "N/A"}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-600">Department:</span>
                <span className="font-medium">
                  {user?.department || "EXTC"}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-600">Date:</span>
                <span className="font-medium">
                  {todayAttendance?.sessions?.[0]?.checkIn?.timeIST?.date || new Date().toLocaleDateString()}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-600">Organization:</span>
                <span className="font-medium">
                  {todayAttendance?.organizationName || "N/A"}
                </span>
              </div>

              <div className="border-t pt-4">
                <div className="flex justify-between mb-2">
                  <span className="text-gray-600">First Check-in:</span>
                  <span className="font-medium">{detailedTimes.checkIn}</span>
                </div>

                <div className="flex justify-between mb-2">
                  <span className="text-gray-600">Last Check-out:</span>
                  <span className="font-medium">{detailedTimes.checkOut}</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-600">Total Working Time:</span>
                  <span className="font-medium">
                    {todayAttendance?.totalWorkingTimeFormatted || "0h 0m"}
                  </span>
                </div>
              </div>

              {todayAttendance?.sessions &&
                todayAttendance.sessions.length > 1 && (
                  <div className="border-t pt-4">
                    <span className="text-gray-600 text-sm">
                      Total Sessions:{" "}
                    </span>
                    <span className="font-medium text-sm">
                      {todayAttendance.sessions.length}
                    </span>
                  </div>
                )}

              {todayAttendance?.hasActiveSession && (
                <div className="border-t pt-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-green-600 font-medium text-sm">
                      Active Session Running
                    </span>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default Card;
