import React, { useState, useEffect } from 'react';

const WORK_START_HOUR = 9;
const WORK_END_HOUR = 17;
const TOTAL_WORK_MINUTES = (WORK_END_HOUR - WORK_START_HOUR) * 60;

const TimeProgressBar = () => {
  const [checkInTime, setCheckInTime] = useState(
    localStorage.getItem('checkInTime') ? new Date(localStorage.getItem('checkInTime')) : null
  );
  const [checkOutTime, setCheckOutTime] = useState(
    localStorage.getItem('checkOutTime') ? new Date(localStorage.getItem('checkOutTime')) : null
  );
  const [progress, setProgress] = useState(0);

  // Calculate progress only when checkIn or checkOut changes
  useEffect(() => {
    if (!checkInTime) return;

    const endTime = checkOutTime ? checkOutTime : new Date();
    const timeSpentMs = Math.max(0, endTime - checkInTime);
    const timeSpentMinutes = timeSpentMs / (1000 * 60);
    const percent = Math.min((timeSpentMinutes / TOTAL_WORK_MINUTES) * 100, 100);
    setProgress(percent.toFixed(2));
  }, [checkInTime, checkOutTime]);

  const handleCheckIn = () => {
    const now = new Date();
    setCheckInTime(now);
    setCheckOutTime(null); // reset previous checkout
    localStorage.setItem('checkInTime', now.toISOString());
    localStorage.removeItem('checkOutTime');
  };

  const handleCheckOut = () => {
    const now = new Date();
    setCheckOutTime(now);
    localStorage.setItem('checkOutTime', now.toISOString());
  };

  const handleReset = () => {
    setCheckInTime(null);
    setCheckOutTime(null);
    setProgress(0);
    localStorage.removeItem('checkInTime');
    localStorage.removeItem('checkOutTime');
  };

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
