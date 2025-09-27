import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { toast, ToastContainer } from "react-toastify";
import axios from "axios";
import { useAuth } from "../../context/authStore";
import "react-toastify/dist/ReactToastify.css";
import Magnet from "../../reactbitscomponents/Magnet";
import { AiOutlineEye, AiOutlineEyeInvisible } from "react-icons/ai";

// Enhanced device ID generation - MORE RELIABLE
const generateStableDeviceId = () => {
  try {
    // Try to get existing device ID first
    let storedDeviceId = localStorage.getItem("attendance_device_id");
    if (storedDeviceId && storedDeviceId.startsWith("device_")) {
      return storedDeviceId;
    }

    // Generate new device ID with multiple fingerprints
    const fingerprints = [
      navigator.userAgent,
      navigator.language,
      screen.width + "x" + screen.height,
      screen.colorDepth,
      new Date().getTimezoneOffset().toString(),
      navigator.platform,
      navigator.hardwareConcurrency || "unknown",
      navigator.deviceMemory || "unknown",
      navigator.maxTouchPoints || "unknown",
    ].join("|");

    // Create hash
    let hash = 0;
    for (let i = 0; i < fingerprints.length; i++) {
      const char = fingerprints.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }

    const newDeviceId =
      "device_" + Math.abs(hash).toString(36) + "_" + Date.now().toString(36);

    // Store permanently
    localStorage.setItem("attendance_device_id", newDeviceId);
    console.log("🔐 Generated new device ID:", newDeviceId);
    return newDeviceId;
  } catch (error) {
    // Fallback device ID
    const fallbackId = "device_fallback_" + Date.now();
    localStorage.setItem("attendance_device_id", fallbackId);
    return fallbackId;
  }
};
export const LoginPage = () => {
  const navigate = useNavigate();
  const { loginUser, login, BASE_URL } = useAuth(); // ✅ Use new store methods
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setshow] = useState(false);
  const [loginadmin, setloginadmin] = useState(true);
  const [deviceId, setDeviceId] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Generate stable device ID on component mount
  useEffect(() => {
    const id = generateStableDeviceId();
    setDeviceId(id);
    console.log("📱 Device ID ready:", id);
  }, []);

  const handleClick = () => {
    setshow(!show);
  };

  const handleAdminLogin = () => {
    setloginadmin(!loginadmin);
  };

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    if (isLoading) return;
    setIsLoading(true);

    try {
      console.log("🔐 Attempting login with device:", deviceId);

      // ✅ USE THE NEW STORE METHOD
      const result = await loginUser({
        email,
        password,
        deviceId: deviceId,
        deviceType: /Android/.test(navigator.userAgent)
          ? "Android"
          : /iPhone|iPad|iPod/.test(navigator.userAgent)
            ? "iOS"
            : "Web",
        deviceFingerprint: deviceId,
      });

      if (result.success && result.accessToken) {
        // Store organization code if available
        if (result.organization?.name) {
          localStorage.setItem("organizationcode", result.organization.name);
        }

        // Store device binding
        localStorage.setItem("user_device_binding", `${email}:${deviceId}`);
        console.log(
          "✅ Login successful, device registered:",
          result.user.deviceRegistered
        );

        // ✅ The store's loginUser already handles state, but we need to ensure navigation
        toast.success("Login successful!");

        // Navigate based on role
        if (result.user.role === "organization") {
          navigate("/admin", { replace: true });
        } else {
          navigate("/teacherinfo", { replace: true });
        }
      } else {
        toast.error(result.message || "Login failed");
      }
    } catch (error) {
      console.error("❌ Login error:", error);

      // Enhanced error handling
      if (error.message?.includes("DEVICE_NOT_AUTHORIZED")) {
        toast.error(
          `🚫 Device Not Authorized\n\nThis account is registered to another device.\n\nPlease contact admin to reset your device registration.`,
          {
            autoClose: 10000,
            style: { whiteSpace: "pre-line" },
          }
        );
      } else {
        toast.error(error.message || "Login failed. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-18 h-18  rounded-full mb-4">
            {/* <span className="text-2xl font-bold text-white">A</span> */}
            <img className="w-18 h-18" src="/Atharva-logo.svg" alt="" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome Back
          </h1>
          <p className="text-gray-600">
            {loginadmin ? "Staff" : "Admin"} Login
          </p>
        </div>

        {/* Login Form Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
          <form onSubmit={handleEmailLogin} className="space-y-6">
            {/* Email Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-gray-50 focus:bg-white"
              />
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={show ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-gray-50 focus:bg-white"
                />
                <button
                  type="button"
                  onClick={handleClick}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {show ? (
                    <AiOutlineEyeInvisible size={20} />
                  ) : (
                    <AiOutlineEye size={20} />
                  )}
                </button>
              </div>
            </div>

            {/* Login Type Toggle */}
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={handleAdminLogin}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                Switch to {loginadmin ? "Admin" : "Staff"} Login
              </button>
            </div>

            {/* Submit Button */}
            {/* <Magnet> */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold py-3 px-6 rounded-lg hover:from-blue-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "Signing In..." : "Sign In"}
            </button>
            {/* </Magnet> */}
          </form>

          {/* Navigation Links */}
          <div className="mt-6 text-center space-y-3">
            <div className="text-sm text-gray-600">
              Don't have an organization account?{" "}
              <Link
                to="/register"
                className="text-blue-600 hover:text-blue-800 font-medium hover:underline transition-colors"
              >
                Register Organization
              </Link>
            </div>

            {/* Additional helpful links */}
            <div className="text-xs text-gray-500">
              Need help?{" "}
              <span className="text-blue-600 hover:text-blue-800 cursor-pointer hover:underline">
                Contact Support
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-sm text-gray-500">
            © 2025 Attendance System. All rights reserved.
          </p>
        </div>
      </div>

      <ToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />
    </div>
  );
};
