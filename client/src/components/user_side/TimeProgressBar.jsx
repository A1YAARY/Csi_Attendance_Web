import React, { useState, useEffect } from 'react';

const WORK_START_HOUR = 9;
const WORK_END_HOUR = 17;
const TOTAL_WORK_MINUTES = (WORK_END_HOUR - WORK_START_HOUR) * 60;

const TimeProgressBar = () => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const calc = () => {
      if (!todayAttendance?.sessions?.length) {
        setProgress(0);
        return;
      }
      // Prefer totalWorkingTime from backend if provided
      const totalMinutesFromDoc =
        typeof todayAttendance.totalWorkingTime === "number"
          ? todayAttendance.totalWorkingTime
          : null;

      let totalMinutes = 0;
      if (totalMinutesFromDoc !== null) {
        totalMinutes = totalMinutesFromDoc;
      } else {
        // Fallback: sum durations or compute from checkIn/checkOut
        todayAttendance.sessions.forEach((s) => {
          if (typeof s.duration === "number") {
            totalMinutes += s.duration;
          } else if (s.checkIn && s.checkOut) {
            const start = new Date(s.checkIn);
            const end = new Date(s.checkOut);
            totalMinutes += Math.max(0, Math.floor((end - start) / 60000));
          } else if (s.checkIn && !s.checkOut) {
            // Ongoing session: up to now
            const start = new Date(s.checkIn);
            const now = new Date();
            totalMinutes += Math.max(0, Math.floor((now - start) / 60000));
          }
        });
      }
      const pct = Math.min(100, (totalMinutes / TOTAL_WORK_MINUTES) * 100);
      setProgress(Number.isFinite(pct) ? Number(pct.toFixed(2)) : 0);
    };
    calc();
    const t = setInterval(calc, 60000); // refresh every minute
    return () => clearInterval(t);
  }, [todayAttendance]);

  return (
    <div>
      <div className="flex justify-between text-[8px]">
        <span>09:00 A.M</span>
        <span>05:00 P.M.</span>
      </div>

      <div className="w-full h-[15px] bg-white border border-slate-300 rounded-full overflow-hidden">
        <div
          className="h-full bg-blue-600 transition-all"
          style={{ width: `${progress}%` }}
        ></div>
      </div>

      {/* <div className="mt-4 flex gap-4">
        <button
          onClick={handleCheckIn}
          className="px-4 py-2 bg-green-500 text-white rounded"
        >
          Check In
        </button>
        <button
          onClick={handleCheckOut}
          className="px-4 py-2 bg-red-500 text-white rounded"
        >
          Check Out
        </button>
        <button
          onClick={handleReset}
          className="px-4 py-2 bg-gray-500 text-white rounded"
        >
          Reset
        </button>
      </div>

      {checkInTime && (
        <p className="mt-2 text-sm">
          ✅ Checked in at: {checkInTime.toLocaleTimeString()}
        </p>
      )}
      {checkOutTime && (
        <p className="text-sm">
          🛑 Checked out at: {checkOutTime.toLocaleTimeString()}
        </p>
      )} */}
    </div>
  );
};

export default TimeProgressBar;
