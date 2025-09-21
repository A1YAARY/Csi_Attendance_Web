import React from "react";

export default function StatusLabel({ status }) {
  const getStatusStyles = () => {
    switch (status.toLowerCase()) {
      case "present":
        return "text-[#01AB06] bg-green-50 border-green-200";
      case "absent":
        return "text-[#CF0700] bg-red-50 border-red-200";
      case "half-day":
        return "text-[#D56E07] bg-orange-50 border-orange-200";
      default:
        return "text-gray-600 bg-gray-50 border-gray-200";
    }
  };

  return (
    <span
      className={`inline-flex items-center px-2 sm:px-3 py-1 rounded-full text-[10px] sm:text-[11px] lg:text-[12px] font-medium border ${getStatusStyles()} transition-colors duration-200`}
    >
      {status}
    </span>
  );
}
