import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const Logout = () => {
  const user = JSON.parse(localStorage.getItem("userData"));
  const { logout } = useAuth();
  const navigate = useNavigate();

  const hidden = () => {
    logout();
    navigate("/");
  };

  const cancel = () => navigate("/TeacherInfo");

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-red-50 to-white p-4">
      <div className="w-full max-w-md sm:max-w-lg bg-white rounded-xl sm:rounded-2xl shadow-2xl border border-gray-100">
        <div className="p-6 sm:p-8 lg:p-10 text-center">
          {/* Warning Icon */}
          <div className="mx-auto flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 mb-4 sm:mb-6 bg-red-100 rounded-full">
            <svg
              className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>

          {/* Title */}
          <h2 className="text-[20px] sm:text-[24px] lg:text-[28px] font-bold text-gray-900 mb-2 sm:mb-3">
            Sign Out
          </h2>

          {/* User Info */}
          {user && (
            <p className="text-[14px] sm:text-[16px] lg:text-[18px] text-gray-600 mb-4 sm:mb-6">
              Are you sure you want to sign out, <br />
              <span className="font-semibold text-gray-800">{user.name}?</span>
            </p>
          )}

          {/* Warning Message */}
          <p className="text-[12px] sm:text-[14px] lg:text-[15px] text-gray-500 mb-6 sm:mb-8 leading-relaxed">
            You will be logged out of your account and will need to sign in
            again to access your dashboard.
          </p>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <button
              onClick={cancel}
              className="flex-1 px-4 sm:px-6 py-2.5 sm:py-3 bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold text-[14px] sm:text-[15px] lg:text-[16px] rounded-lg sm:rounded-xl transition-all duration-200 border border-gray-200"
            >
              Cancel
            </button>
            <button
              onClick={hidden}
              className="flex-1 px-4 sm:px-6 py-2.5 sm:py-3 bg-red-600 hover:bg-red-700 text-white font-semibold text-[14px] sm:text-[15px] lg:text-[16px] rounded-lg sm:rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              Sign Out
            </button>
          </div>

          {/* Footer Link */}
          <div className="mt-6 sm:mt-8">
            <Link
              to="/support"
              className="text-[12px] sm:text-[13px] text-blue-600 hover:text-blue-700 hover:underline transition-colors duration-200"
            >
              Need help? Contact support
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Logout;
