import React from "react";
import StatusLabel from "./StatusLabel";

function Previous() {
  return (
    <div className="w-full bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-100 p-3 sm:p-4 lg:p-5">
      <div className="flex items-center justify-between">
        {/* Left side - Date info */}
        <div className="flex flex-col space-y-1 sm:space-y-2">
          <p className="text-[12px] sm:text-[14px] lg:text-[15px] font-medium text-gray-800">
            Monday
          </p>
          <p className="text-[10px] sm:text-[12px] lg:text-[13px] text-gray-500">
            30/05/2025
          </p>
        </div>

        {/* Center - Time info (hidden on mobile if space is tight) */}
        <div className="hidden sm:flex flex-col items-center space-y-1">
          <p className="text-[11px] sm:text-[12px] lg:text-[13px] text-gray-600">
            Check-in: 9:00 AM
          </p>
          <p className="text-[11px] sm:text-[12px] lg:text-[13px] text-gray-600">
            Check-out: 5:30 PM
          </p>
        </div>

        {/* Right side - Status */}
        <div className="flex flex-col items-end space-y-1 sm:space-y-2">
          <StatusLabel status="Present" />
          <p className="text-[10px] sm:text-[11px] lg:text-[12px] text-gray-400">
            8h 30m
          </p>
        </div>
      </div>

      {/* Mobile time info - shown only on small screens */}
      <div className="sm:hidden mt-3 pt-3 border-t border-gray-100 flex justify-between text-[11px] text-gray-600">
        <span>In: 9:00 AM</span>
        <span>Out: 5:30 PM</span>
      </div>
    </div>
  );
}

export default Previous;
