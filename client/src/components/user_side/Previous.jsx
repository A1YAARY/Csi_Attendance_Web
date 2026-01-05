// Previous.jsx - Dynamic previous attendance display
// Premium enhancement: Added card-like styling with shadows and transitions

import React from "react";
import StatusLabel from "./StatusLabel";

function Previous({ attendanceData }) {
  if (!attendanceData) return null;

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const dayName = date.toLocaleDateString("en-US", { weekday: "long" });
    const formattedDate = date.toLocaleDateString("en-GB");
    return { dayName, formattedDate };
  };

  const getCheckInTime = () => {
    if (!attendanceData.sessions || attendanceData.sessions.length === 0) return "--";
    const firstSession = attendanceData.sessions[0];
    return firstSession.checkIn ? new Date(firstSession.checkIn.time).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true }) : "--";
  };

  const getCheckOutTime = () => {
    if (!attendanceData.sessions || attendanceData.sessions.length === 0) return "--";
    const sessionsWithCheckout = attendanceData.sessions.filter((s) => s.checkOut);
    if (sessionsWithCheckout.length === 0) return "--";
    const lastCheckout = sessionsWithCheckout[sessionsWithCheckout.length - 1];
    return new Date(lastCheckout.checkOut.time).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
  };

  const getTotalWorkTime = () => {
    if (!attendanceData.sessions || attendanceData.sessions.length === 0) return "0h 0m";
    if (attendanceData.totalWorkingTimeFormatted) return attendanceData.totalWorkingTimeFormatted; // Dynamic from data
    let totalMinutes = 0;
    attendanceData.sessions.forEach((session) => {
      if (session.duration) {
        totalMinutes += session.duration;
      } else if (session.checkIn && session.checkOut) {
        const checkIn = new Date(session.checkIn.time);
        const checkOut = new Date(session.checkOut.time);
        totalMinutes += Math.floor((checkOut - checkIn) / (1000 * 60));
      }
    });
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours}h ${minutes}m`;
  };

  const { dayName, formattedDate } = formatDate(attendanceData.date || attendanceData.dateIST.iso); // Dynamic date

  return (
    <div className="bg-white rounded-xl p-4 shadow-md hover:shadow-lg transition-shadow duration-200">
      <div className="flex justify-between items-center mb-2">
        <span className="text-lg font-semibold text-gray-800">{formattedDate}</span>
        <StatusLabel status={attendanceData.status} />
      </div>
      <div className="text-sm text-gray-600">
        <p>Check-in: {getCheckInTime()}</p>
        <p>Check-out: {getCheckOutTime()}</p>
        <p>Total Time: {getTotalWorkTime()}</p>
        <p>Organization: {attendanceData.organizationName}</p>
      </div>
    </div>
  );
}

export default Previous;
