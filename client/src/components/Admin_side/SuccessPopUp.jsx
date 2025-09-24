// SuccessPopup.jsx
import React, { useEffect } from "react";

const SuccessPopUp = ({ show, message = "Success!" }) => {
  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl p-6 w-80 text-center animate-fadeInUp">
        {/* Animated Check Icon */}
        <div className="flex items-center justify-center mb-4">
          <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center animate-scaleIn">
            <svg
              className="w-10 h-10 text-white"
              fill="none"
              stroke="currentColor"
              strokeWidth="4"
              viewBox="0 0 24 24"
            >
              <path d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>
        <p className="text-lg font-semibold text-gray-800">{message}</p>
      </div>
    </div>
  );
};

export default SuccessPopUp;
;
