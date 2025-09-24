import React from "react";


export default function StatusLabel({ status }) {
  const getStatusStyles = () => {
    switch (status.toLowerCase()) {
      case "present":
        return "text-[#01AB06]";
      case "absent":
        return "text-[#CF0700]";
      case "half-day":
        return "text-[#D56E07]";
      default:
        return "text-gray-600";
    }
  };

  return (
    <span className={`font-semibold text-sm ${getStatusStyles()}`}>
      {status}
    </span>
  );
}
