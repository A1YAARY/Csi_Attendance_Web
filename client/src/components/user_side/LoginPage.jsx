import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast, ToastContainer } from "react-toastify";
import axios from "axios";
import { useAuth } from "../../context/AuthContext";
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
  const { login, BASE_URL } = useAuth();
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

      const res = await axios.post(
        `${BASE_URL}/auth2/login`,
        {
          email,
          password,
          deviceId: deviceId,
          deviceType: /Android/.test(navigator.userAgent)
            ? "Android"
            : /iPhone|iPad|iPod/.test(navigator.userAgent)
            ? "iOS"
            : "Web",
          deviceFingerprint: deviceId, // Use deviceId as fingerprint too
        },
        {
          withCredentials: true,
          headers: {
            "Content-Type": "application/json",
            "X-Device-ID": deviceId,
          },
          timeout: 15000,
        }
      );

      if (res.data.success && res.data.accessToken) {
        // Store organization code if available
        if (res.data.organization?.name) {
          localStorage.setItem("orginizationcode", res.data.organization.name);
        }

        // Store device binding
        localStorage.setItem("user_device_binding", `${email}:${deviceId}`);

        console.log(
          "✅ Login successful, device registered:",
          res.data.user.deviceRegistered
        );

        login(res.data.user, res.data.accessToken, res.data.organization);
        toast.success("Login successful!");

        // Navigate based on role
        if (res.data.user.role === "organization") {
          navigate("/admin", { replace: true });
        } else {
          navigate("/Teacherinfo", { replace: true });
        }
      }
    } catch (error) {
      console.error("❌ Login error:", error);

      const errorData = error.response?.data;

      // Enhanced error handling
      if (errorData?.code === "DEVICE_NOT_AUTHORIZED") {
        toast.error(
          `🚫 Device Not Authorized\n\nThis account is registered to another device.\n\nRegistered Device: ${errorData.registeredDevice}\nCurrent Device: ${errorData.currentDevice}\n\nPlease contact admin to reset your device registration.`,
          {
            autoClose: 10000,
            style: { whiteSpace: "pre-line" },
          }
        );

        // Show contact admin option for users
        if (loginadmin) {
          setTimeout(() => {
            if (
              window.confirm(
                "Would you like to request device change from admin?"
              )
            ) {
              // You can implement a device change request flow here
              navigate("/contact-admin");
            }
          }, 2000);
        }
      } else if (errorData?.requiresDeviceInfo) {
        toast.error("Device information is required for login");
      } else {
        toast.error(errorData?.message || "Login failed. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

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
              <h1 className="text-[24px] sm:text-[28px] lg:text-[36px] xl:text-[40px] font-bold tracking-tighter mb-2 lg:mb-6">
                Sign in to your Account
                <p className="text-[14px] sm:text-[16px] lg:text-[18px] text-[#404142] font-semibold tracking-normal mt-1">
                  {loginadmin ? "Staff" : "Admin"} Login
                </p>
              </h1>
              <img
                className="w-full max-w-[280px] sm:max-w-[320px] lg:max-w-[400px] xl:max-w-[450px] h-auto my-6 lg:my-8"
                src="/login.svg"
                alt="Login illustration"
              />
            </div>

            {/* Right side: Form */}
            <div className="px-6 sm:px-8 lg:px-0 pb-8 lg:pb-0 flex flex-col items-center">
              <form
                onSubmit={handleEmailLogin}
                className="flex flex-col gap-4 lg:gap-6 w-full max-w-md"
              >
                <input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                  className="p-3 lg:p-4 rounded-lg border border-gray-300 focus:border-[#1D61E7] focus:outline-none focus:ring-2 focus:ring-[#1D61E7]/20 transition-all text-sm sm:text-base disabled:opacity-50"
                />

                <div className="flex items-center justify-between w-full">
                  <input
                    type={show ? "text" : "password"}
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={isLoading}
                    className="p-3 lg:p-4 rounded-lg border border-gray-300 focus:border-[#1D61E7] focus:outline-none focus:ring-2 focus:ring-[#1D61E7]/20 transition-all text-sm sm:text-base flex-1 disabled:opacity-50"
                  />
                  <button
                    type="button"
                    onClick={handleClick}
                    className="ml-2 p-3 text-gray-500 hover:text-gray-700"
                  >
                    {show ? (
                      <AiOutlineEyeInvisible size={20} />
                    ) : (
                      <AiOutlineEye size={20} />
                    )}
                  </button>
                </div>

                {/* Device Info */}
                {/* {deviceId && (
                  <div className="text-xs text-gray-600 bg-blue-50 p-2 rounded-lg">
                    <div className="font-medium">Device Security:</div>
                    <div className="truncate">ID: {deviceId}</div>
                    <div>One account per device • Contact admin to change</div>
                  </div>
                )} */}

                <Magnet padding={90} disabled={isLoading} magnetStrength={90}>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="flex justify-center items-center rounded-lg font-medium gap-3 bg-[#1D61E7] hover:bg-[#1a56d1] text-white w-full h-[48px] lg:h-[52px] shadow-[0px_4px_4px_0px_#00000040] active:shadow-[0px_2px_1px_0px_#00000040] transition-all duration-200 text-sm sm:text-base disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Logging in...
                      </>
                    ) : (
                      "Login"
                    )}
                  </button>
                </Magnet>
              </form>

              <div className="text-[#6C7278] text-[12px] mt-4 text-center flex">
                Or Login as {loginadmin ? "Admin/Organizer" : "Staff"}?{" "}
                <button
                  onClick={handleAdminLogin}
                  className="text-[#4D81E7] hover:underline cursor-pointer ml-1"
                >
                  Switch
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
