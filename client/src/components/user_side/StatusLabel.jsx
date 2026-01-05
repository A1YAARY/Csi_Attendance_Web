// StatusLabel.jsx — minimal safety guard; keep class strings untouched
import React from "react";

export default function StatusLabel({ status }) {
  const s = String(status || "").toLowerCase();

  const getStatusStyles = () => {
    switch (s) {
      case "present":
        return "text-[#01AB06] bg-green-50 border-green-200";
      case "absent":
        return "text-[#CF0700] bg-red-50 border-red-200";
      case "half-day":
        return "text-[#D56E07] bg-orange-50 border-orange-200";
      case "ongoing":
        return "text-blue-600 bg-blue-50 border-blue-200";
      default:
        return "text-gray-600 bg-gray-50 border-gray-200";
    }
  };

  return (
    <span className={`px-3 py-1 rounded-full text-sm border ${getStatusStyles()}`}>
      {status || "—"}
    </span>
  );
}
