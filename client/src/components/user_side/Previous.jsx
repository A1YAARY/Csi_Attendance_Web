import React from "react";
import StatusLabel from "./StatusLabel";

function Previous({ attendanceData }) {
  if (!attendanceData) {
    return null;
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const dayName = date.toLocaleDateString("en-US", { weekday: "long" });
    const formattedDate = date.toLocaleDateString("en-GB");
    return { dayName, formattedDate };
  };

  const getCheckInTime = () => {
    if (!attendanceData.sessions || attendanceData.sessions.length === 0)
      return "--";
    const firstSession = attendanceData.sessions[0];
    if (!firstSession.checkIn) return "--";

    return new Date(firstSession.checkIn).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const getCheckOutTime = () => {
    if (!attendanceData.sessions || attendanceData.sessions.length === 0)
      return "--";

    // Find the last session with checkout
    const sessionsWithCheckout = attendanceData.sessions.filter(
      (s) => s.checkOut
    );
    if (sessionsWithCheckout.length === 0) return "--";

    const lastCheckout = sessionsWithCheckout[sessionsWithCheckout.length - 1];
    return new Date(lastCheckout.checkOut).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const getTotalWorkTime = () => {
    if (!attendanceData.sessions || attendanceData.sessions.length === 0)
      return "0h 0m";

    let totalMinutes = 0;
    attendanceData.sessions.forEach((session) => {
      if (session.checkIn && session.checkOut) {
        const checkIn = new Date(session.checkIn);
        const checkOut = new Date(session.checkOut);
        const diffMs = checkOut - checkIn;
        totalMinutes += Math.floor(diffMs / (1000 * 60));
      }
    });

    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    return `${hours}h ${minutes}m`;
  };

  const getAttendanceStatus = () => {
    if (!attendanceData.sessions || attendanceData.sessions.length === 0)
      return "Absent";

    const totalWorkTime = getTotalWorkTimeInMinutes();

    if (totalWorkTime >= 480) return "Present"; // 8 hours
    if (totalWorkTime >= 240) return "Half-day"; // 4 hours
    return "Present"; // Any attendance counts as present
  };

  const getTotalWorkTimeInMinutes = () => {
    if (!attendanceData.sessions) return 0;

    let totalMinutes = 0;
    attendanceData.sessions.forEach((session) => {
      if (session.checkIn && session.checkOut) {
        const checkIn = new Date(session.checkIn);
        const checkOut = new Date(session.checkOut);
        const diffMs = checkOut - checkIn;
        totalMinutes += Math.floor(diffMs / (1000 * 60));
      }
    });

    return totalMinutes;
  };

  const { dayName, formattedDate } = formatDate(attendanceData.createdAt);

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 mb-3">
      <div className="flex justify-between items-start mb-3">
        <div>
          <h4 className="font-semibold text-gray-800">{dayName}</h4>
          <p className="text-sm text-gray-600">{formattedDate}</p>
        </div>
        <StatusLabel status={getAttendanceStatus()} />
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-600">Check-in:</span>
          <span className="font-medium">{getCheckInTime()}</span>
        </div>

        <div className="flex justify-between">
          <span className="text-gray-600">Check-out:</span>
          <span className="font-medium">{getCheckOutTime()}</span>
        </div>

        <div className="flex justify-between border-t pt-2">
          <span className="text-gray-600">Total Time:</span>
          <span className="font-semibold text-blue-600">
            {getTotalWorkTime()}
          </span>
        </div>

        {attendanceData.sessions && attendanceData.sessions.length > 1 && (
          <div className="flex justify-between">
            <span className="text-gray-600">Sessions:</span>
            <span className="font-medium">
              {attendanceData.sessions.length}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export default Previous;
