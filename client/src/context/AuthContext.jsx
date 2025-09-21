import React, { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext();

const BASE_URL =
  import.meta.env.VITE_BACKEND_BASE_URL ||
  "https://csi-attendance-web.onrender.com";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeAdminView, setActiveAdminView] = useState("home");
  const [orginization, setorginization] = useState(null);

  // Get auth token from localStorage
  const getToken = () => localStorage.getItem("accessToken");

  // Get auth headers
  const getAuthHeaders = () => ({
    "Content-Type": "application/json",
    Authorization: `Bearer ${getToken()}`,
  });

  // Get file upload headers
  const getFileHeaders = () => ({
    Authorization: `Bearer ${getToken()}`,
  });

  // ===========================================
  // AUTHENTICATION API CALLS
  // ===========================================
  const registerOrganization = async (data) => {
    try {
      const response = await fetch(`${BASE_URL}/auth2/organization-register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return await response.json();
    } catch (error) {
      throw new Error(`Organization registration failed: ${error.message}`);
    }
  };

  const registerUser = async (data) => {
    try {
      const response = await fetch(`${BASE_URL}/auth2/register-user`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      });
      return await response.json();
    } catch (error) {
      throw new Error(`User registration failed: ${error.message}`);
    }
  };

  const loginUser = async (data) => {
    try {
      const response = await fetch(`${BASE_URL}/auth2/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return await response.json();
    } catch (error) {
      throw new Error(`Login failed: ${error.message}`);
    }
  };

  const viewProfile = async () => {
    try {
      const response = await fetch(`${BASE_URL}/auth2/viewProfile`, {
        method: "GET",
        headers: getAuthHeaders(),
      });
      return await response.json();
    } catch (error) {
      throw new Error(`Profile fetch failed: ${error.message}`);
    }
  };

  const updateProfile = async (data) => {
    try {
      const response = await fetch(`${BASE_URL}/auth2/updateProfile`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      });
      return await response.json();
    } catch (error) {
      throw new Error(`Profile update failed: ${error.message}`);
    }
  };

  const logoutUser = async () => {
    try {
      const response = await fetch(`${BASE_URL}/auth2/logout`, {
        method: "POST",
        headers: getAuthHeaders(),
      });
      return await response.json();
    } catch (error) {
      throw new Error(`Logout failed: ${error.message}`);
    }
  };

  // ===========================================
  // QR CODE API CALLS
  // ===========================================
  const getActiveQRCode = async () => {
    try {
      const response = await fetch(`${BASE_URL}/qrcode/active`, {
        method: "GET",
        headers: getAuthHeaders(),
      });
      return await response.json();
    } catch (error) {
      throw new Error(`QR Code fetch failed: ${error.message}`);
    }
  };

  // ===========================================
  // ATTENDANCE API CALLS
  // ===========================================
  const scanAttendance = async (data) => {
    try {
      const response = await fetch(`${BASE_URL}/attend/scan`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      });
      return await response.json();
    } catch (error) {
      throw new Error(`Attendance scan failed: ${error.message}`);
    }
  };

  const getPastAttendance = async () => {
    try {
      const response = await fetch(`${BASE_URL}/attend/past`, {
        method: "GET",
        headers: getAuthHeaders(),
      });
      return await response.json();
    } catch (error) {
      throw new Error(`Past attendance fetch failed: ${error.message}`);
    }
  };

  const uploadAttendance = async (formData) => {
    try {
      const response = await fetch(`${BASE_URL}/attend/upload`, {
        method: "POST",
        headers: getFileHeaders(),
        body: formData,
      });
      return await response.json();
    } catch (error) {
      throw new Error(`Attendance upload failed: ${error.message}`);
    }
  };

  // ===========================================
  // ADMIN API CALLS
  // ===========================================
  const getAdminRecords = async () => {
    try {
      const response = await fetch(`${BASE_URL}/admin/records`, {
        method: "GET",
        headers: getAuthHeaders(),
      });
      return await response.json();
    } catch (error) {
      throw new Error(`Admin records fetch failed: ${error.message}`);
    }
  };

  const getSingleUser = async (userId) => {
    try {
      const response = await fetch(`${BASE_URL}/admin/singleUser/${userId}`, {
        method: "GET",
        headers: getAuthHeaders(),
      });
      return await response.json();
    } catch (error) {
      throw new Error(`Single user fetch failed: ${error.message}`);
    }
  };

  const getallusers = async () => {
    try {
      const response = await fetch(`${BASE_URL}/admin/allusers`, {
        method: "GET",
        headers: getAuthHeaders(),
      });
      return await response.json();
    } catch (error) {
      throw new Error(`All users fetch failed: ${error.message}`);
    }
  };

  const getAdminQRCodes = async () => {
    try {
      const response = await fetch(`${BASE_URL}/admin/qrcodes`, {
        method: "GET",
        headers: getAuthHeaders(),
      });
      return await response.json();
    } catch (error) {
      throw new Error(`Admin QR codes fetch failed: ${error.message}`);
    }
  };

  const getTodaysAttendance = async () => {
    try {
      const response = await fetch(`${BASE_URL}/admin/todays-attendance`, {
        method: "GET",
        headers: getAuthHeaders(),
      });
      return await response.json();
    } catch (error) {
      throw new Error(`Today's attendance fetch failed: ${error.message}`);
    }
  };

  const deleteUser = async (userId) => {
    try {
      const response = await fetch(`${BASE_URL}/admin/user/${userId}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      return await response.json();
    } catch (error) {
      throw new Error(`User deletion failed: ${error.message}`);
    }
  };

  const getDailyReport = async () => {
    try {
      const response = await fetch(`${BASE_URL}/admin/daily-report`, {
        method: "GET",
        headers: getAuthHeaders(),
      });
      return await response.json();
    } catch (error) {
      throw new Error(`Daily report fetch failed: ${error.message}`);
    }
  };

  const getWeeklyReport = async () => {
    try {
      const response = await fetch(`${BASE_URL}/admin/weekly-report`, {
        method: "GET",
        headers: getAuthHeaders(),
      });
      return await response.json();
    } catch (error) {
      throw new Error(`Weekly report fetch failed: ${error.message}`);
    }
  };

  // ===========================================
  // PASSWORD RESET API CALLS
  // ===========================================
  const requestPasswordReset = async (data) => {
    try {
      const response = await fetch(`${BASE_URL}/password/request-reset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return await response.json();
    } catch (error) {
      throw new Error(`Password reset request failed: ${error.message}`);
    }
  };

  const resetPassword = async (data) => {
    try {
      const response = await fetch(`${BASE_URL}/password/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return await response.json();
    } catch (error) {
      throw new Error(`Password reset failed: ${error.message}`);
    }
  };

  // ===========================================
  // AI API CALLS
  // ===========================================
  const getAIHealth = async () => {
    try {
      const response = await fetch(`${BASE_URL}/api/ai-analytics/health`, {
        method: "GET",
        headers: getAuthHeaders(),
      });
      return await response.json();
    } catch (error) {
      throw new Error(`AI Health Check Failed: ${error.message}`);
    }
  };

  const getAICapabilities = async () => {
    try {
      const response = await fetch(
        `${BASE_URL}/api/ai-analytics/capabilities`,
        {
          method: "GET",
          headers: getAuthHeaders(),
        }
      );
      return await response.json();
    } catch (error) {
      throw new Error(`AI Capabilities Fetch Failed: ${error.message}`);
    }
  };

  const queryAI = async (data) => {
    try {
      console.log("🚀 Sending AI request:", data);
      const response = await fetch(`${BASE_URL}/api/ai-analytics/query`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      });
      const result = await response.json();
      console.log("📥 AI response received:", result);
      return result;
    } catch (error) {
      console.error("❌ AI Query Failed:", error);
      throw new Error(`AI Query Failed: ${error.message}`);
    }
  };

  // ===========================================
  // SYSTEM API CALLS
  // ===========================================
  const getSystemHealth = async () => {
    try {
      const response = await fetch(`${BASE_URL}/`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });
      return await response.json();
    } catch (error) {
      throw new Error(`System health check failed: ${error.message}`);
    }
  };

  const getScanLogs = async () => {
    try {
      const response = await fetch(`${BASE_URL}/logs/scans`, {
        method: "GET",
        headers: getAuthHeaders(),
      });
      return await response.json();
    } catch (error) {
      throw new Error(`Scan logs fetch failed: ${error.message}`);
    }
  };

  // ===========================================
  // AUTH STATE MANAGEMENT
  // ===========================================

  // Initialize user session on app load
  useEffect(() => {
    const token = getToken();
    const userData = localStorage.getItem("userData");

    if (token && userData) {
      try {
        setUser(JSON.parse(userData));
      } catch (error) {
        console.error("Error parsing user data:", error);
        logout();
      }
    }
    setLoading(false);
  }, []);

  // Login function
  const login = (userData, accessToken) => {
    setUser(userData);
    localStorage.setItem("accessToken", accessToken);
    localStorage.setItem("userData", JSON.stringify(userData));
  };

  // Logout function
  const logout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("userData");
    localStorage.removeItem("checkInTime");
    localStorage.removeItem("checkOutTime");
    localStorage.removeItem("orginizationcode");
    setUser(null);
    setorginization(null);
  };

  // Set admin view
  const setAdminView = (view) => {
    setActiveAdminView(view);
  };

  const value = {
    // State
    user,
    loading,
    activeAdminView,
    orginization,

    // Auth functions
    login,
    logout,
    setAdminView,
    setorginization,

    // API functions - Authentication
    registerOrganization,
    registerUser,
    loginUser,
    viewProfile,
    updateProfile,
    logoutUser,
    BASE_URL,

    // API functions - QR Code
    getActiveQRCode,

    // API functions - Attendance
    scanAttendance,
    getPastAttendance,
    uploadAttendance,

    // API functions - Admin
    getAdminRecords,
    getSingleUser,
    getAdminQRCodes,
    getTodaysAttendance,
    deleteUser,
    getDailyReport,
    getWeeklyReport,
    getallusers,

    // API functions - Password Reset
    requestPasswordReset,
    resetPassword,

    // API functions - AI
    getAIHealth,
    getAICapabilities,
    queryAI,

    // API functions - System
    getSystemHealth,
    getScanLogs,

    // Utility functions
    getAuthHeaders,
    getFileHeaders,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
