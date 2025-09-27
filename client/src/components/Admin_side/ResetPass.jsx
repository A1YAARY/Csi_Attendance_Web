import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Magnet from "../../reactbitscomponents/Magnet";
import { useAuth } from "../../context/authStore";
import axios from "axios";

export const ResetPass = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { BASE_URL } = useAuth();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [token, setToken] = useState("");
  const [isNewUser, setIsNewUser] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [tokenValid, setTokenValid] = useState(null); // null = checking, true = valid, false = invalid

  useEffect(() => {
    const urlToken = searchParams.get("token");
    const newUserFlag = searchParams.get("newUser") === "true";

    if (urlToken) {
      setToken(urlToken);
      setIsNewUser(newUserFlag);
      validateToken(urlToken);
    } else {
      setTokenValid(false);
      toast.error("Invalid or missing reset token");
    }
  }, [searchParams]);

  const validateToken = async (token) => {
    try {
      // You might want to create a token validation endpoint
      // For now, we'll assume token is valid if present
      setTokenValid(true);
    } catch (error) {
      setTokenValid(false);
      toast.error("Invalid or expired reset token");
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();

    if (!token) {
      toast.error("Reset token is missing");
      return;
    }

    if (password.length < 6) {
      toast.error("Password must be at least 6 characters long");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setIsLoading(true);

    try {
      const response = await axios.post(
        `${BASE_URL}/password/reset-password`, // Make sure this matches your route
        {
          token: token,
          newPassword: password,
          confirmPassword: confirmPassword, // Add this field
        },
        {
          headers: { "Content-Type": "application/json" },
          timeout: 10000,
        }
      );

      if (response.data.success) {
        toast.success(
          isNewUser
            ? "Password set successfully! You can now login."
            : "Password reset successfully!"
        );

        // Clear the form
        setPassword("");
        setConfirmPassword("");

        // Redirect to login
        setTimeout(() => {
          navigate("/login");
        }, 2000);
      } else {
        throw new Error(response.data.message || "Password reset failed");
      }
    } catch (error) {
      console.error("Password reset error:", error);

      if (error.response?.data?.message) {
        toast.error(error.response.data.message);
      } else if (error.code === "ECONNABORTED") {
        toast.error("Request timeout. Please try again.");
      } else if (error.response?.status === 400) {
        toast.error(
          "Invalid or expired token. Please request a new reset link."
        );
      } else {
        toast.error("Failed to reset password. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (tokenValid === false) {
    return (
      <div className="flex flex-col min-h-screen w-full items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">❌</div>
          <h1 className="text-2xl font-bold mb-2">Invalid Reset Link</h1>
          <p className="text-gray-600 mb-4">
            This password reset link is invalid or has expired.
          </p>
          <button
            onClick={() => navigate("/login")}
            className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  if (tokenValid === null) {
    return (
      <div className="flex flex-col min-h-screen w-full items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p>Validating reset link...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen w-full">
      <ToastContainer />

      {/* Navbar */}
      <div className="navbar w-full h-[80px] sm:h-[100px] lg:h-[110px] flex justify-center items-end p-4 lg:p-[16px]">
        <img
          src="/logo.svg"
          alt="atharva logo"
          className="h-auto max-h-[50px] sm:max-h-[60px] lg:max-h-[70px]"
        />
      </div>

      {/* Main content */}
      <div className="flex-1 flex items-center justify-center">
        <div className="w-full max-w-md lg:max-w-6xl mx-auto">
          <div className="lg:grid lg:grid-cols-2 lg:gap-12 lg:items-center">
            {/* Left side */}
            <div className="flex flex-col items-center text-center px-6 sm:px-8 lg:px-0">
              <h1 className="text-[24px] sm:text-[28px] lg:text-[36px] xl:text-[40px] font-bold mb-2 lg:mb-6">
                {isNewUser ? "Set Your Password" : "Reset Password"}
              </h1>
              <p className="text-gray-600 mb-4">
                {isNewUser
                  ? "Welcome! Please set your password to get started."
                  : "Enter your new password below."}
              </p>

              <img
                className="w-full max-w-[280px] sm:max-w-[320px] lg:max-w-[400px] xl:max-w-[450px] h-auto my-6 lg:my-8"
                src="/reset-password.svg"
                alt="Reset password illustration"
              />
            </div>

            {/* Right side: Form */}
            <div className="px-6 sm:px-8 lg:px-0 pb-8 lg:pb-0">
              <form
                onSubmit={handleResetPassword}
                className="flex flex-col gap-4 lg:gap-6"
              >
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    New Password
                  </label>
                  <input
                    type="password"
                    placeholder="Enter new password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    disabled={isLoading}
                    className="p-3 lg:p-4 rounded-lg border border-gray-300 focus:border-[#1D61E7] focus:outline-none focus:ring-2 focus:ring-[#1D61E7]/20 transition-all text-sm sm:text-base w-full disabled:opacity-50"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Must be at least 6 characters
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    disabled={isLoading}
                    className="p-3 lg:p-4 rounded-lg border border-gray-300 focus:border-[#1D61E7] focus:outline-none focus:ring-2 focus:ring-[#1D61E7]/20 transition-all text-sm sm:text-base w-full disabled:opacity-50"
                  />
                </div>

                <Magnet padding={90} disabled={isLoading} magnetStrength={90}>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="flex justify-center items-center rounded-lg font-medium gap-3 bg-[#1D61E7] hover:bg-[#1a56d1] text-white flex-1 h-[48px] lg:h-[52px] shadow-[0px_4px_4px_0px_#00000040] active:shadow-[0px_2px_1px_0px_#00000040] transition-all duration-200 text-sm sm:text-base disabled:opacity-50 disabled:cursor-not-allowed w-full"
                  >
                    {isLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        {isNewUser
                          ? "Setting Password..."
                          : "Resetting Password..."}
                      </>
                    ) : isNewUser ? (
                      "Set Password"
                    ) : (
                      "Reset Password"
                    )}
                  </button>
                </Magnet>
              </form>

              <div className="text-center mt-4">
                <button
                  onClick={() => navigate("/login")}
                  className="text-blue-500 hover:underline"
                >
                  Back to Login
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPass;
