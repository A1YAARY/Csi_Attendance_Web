import { AnimatePresence, motion } from "framer-motion";
import { useState, useEffect } from "react";
import TimeProgressBar from "./TimeProgressBar";

function Card({ todayAttendance, loading }) {
  const user = JSON.parse(localStorage.getItem("userData"));
  const [isExpanded, setIsExpanded] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [timeElapsed, setTimeElapsed] = useState("0h 0m");
  const [reminder, setReminder] = useState("--");

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
        const checkInTime = new Date(lastSession.checkIn);
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
        setTimeElapsed("--");
        setReminder("--");
      }
    } else {
      setTimeElapsed("--");
      setReminder("--");
    }
  }, [todayAttendance, currentTime]);

  const getEntryTime = () => {
    if (!todayAttendance?.sessions?.length) return "--";

    const firstSession = todayAttendance.sessions[0];
    if (firstSession.checkIn) {
      return new Date(firstSession.checkIn).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    }
    return "--";
  };

  const getExitTime = () => {
    if (!todayAttendance?.sessions?.length) return "--";

    // Find the latest checkout time
    const sessionsWithCheckout = todayAttendance.sessions.filter(
      (s) => s.checkOut
    );
    if (sessionsWithCheckout.length === 0) return "--";

    const latestSession = sessionsWithCheckout[sessionsWithCheckout.length - 1];
    return new Date(latestSession.checkOut).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const getStatus = () => {
    if (!todayAttendance) return "Not Started";

    const hasActiveSession = todayAttendance.sessions?.some(
      (s) => s.checkIn && !s.checkOut
    );
    if (hasActiveSession) return "Ongoing";

    const hasCompletedSessions = todayAttendance.sessions?.some(
      (s) => s.checkIn && s.checkOut
    );
    if (hasCompletedSessions) return "Completed";

    return "Not Started";
  };

  const getDetailedCheckInOut = () => {
    if (!todayAttendance?.sessions?.length) {
      return { checkIn: "--", checkOut: "--" };
    }

    const sessions = todayAttendance.sessions;
    const firstCheckIn = sessions[0]?.checkIn;

    // Find last checkout
    const lastCheckOut = sessions.filter((s) => s.checkOut).pop()?.checkOut;

    return {
      checkIn: firstCheckIn
        ? new Date(firstCheckIn).toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          })
        : "--",
      checkOut: lastCheckOut
        ? new Date(lastCheckOut).toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          })
        : "--",
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
        </div>
      </div>
    );
  }

  return (
    <>
    {/* bg-gradient-to-r from-pink-100 to-blue-100 */}
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
              className={`font-semibold ${
                getStatus() === "Ongoing"
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
                <span className="font-medium">{user?.id || "N/A"}</span>
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
                  {new Date().toLocaleDateString()}
                </span>
              </div>

              <div className="border-t pt-4">
                <div className="flex justify-between mb-2">
                  <span className="text-gray-600">First Check-in:</span>
                  <span className="font-medium">{detailedTimes.checkIn}</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-600">Last Check-out:</span>
                  <span className="font-medium">{detailedTimes.checkOut}</span>
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
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default Card;
