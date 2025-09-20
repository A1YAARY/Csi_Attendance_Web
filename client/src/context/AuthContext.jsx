import React, { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext();
// const BASE_URL = "https://csi-attendance-web.onrender.com";
const BASE_URL =
  import.meta.env.VITE_BACKEND_BASE_URL ||
  "https://csi-attendance-web.onrender.com";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeAdminView, setActiveAdminView] = useState("home");

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
    const response = await fetch(`${BASE_URL}/auth2/organization-register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return await response.json();
  };

  const registerUser = async (data) => {
    const response = await fetch(`${BASE_URL}/auth2/register-user`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return await response.json();
  };

  const loginUser = async (data) => {
    const response = await fetch(`${BASE_URL}/auth2/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return await response.json();
  };

  const viewProfile = async () => {
    const response = await fetch(`${BASE_URL}/auth2/viewProfile`, {
      method: "GET",
      headers: getAuthHeaders(),
    });
    return await response.json();
  };

  const updateProfile = async (data) => {
    const response = await fetch(`${BASE_URL}/auth2/updateProfile`, {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return await response.json();
  };

  const logoutUser = async () => {
    const response = await fetch(`${BASE_URL}/auth2/logout`, {
      method: "POST",
      headers: getAuthHeaders(),
    });
    return await response.json();
  };

  // ===========================================
  // QR CODE API CALLS
  // ===========================================

  const getActiveQRCode = async () => {
    const response = await fetch(`${BASE_URL}/qrcode/active`, {
      method: "GET",
      headers: getAuthHeaders(),
    });
    return await response.json();
  };

  // ===========================================
  // ATTENDANCE API CALLS
  // ===========================================

  const scanAttendance = async (data) => {
    const response = await fetch(`${BASE_URL}/attend/scan`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return await response.json();
  };

  const getPastAttendance = async () => {
    const response = await fetch(`${BASE_URL}/attend/past`, {
      method: "GET",
      headers: getAuthHeaders(),
    });
    return await response.json();
  };

  const uploadAttendance = async (formData) => {
    const response = await fetch(`${BASE_URL}/attend/upload`, {
      method: "POST",
      headers: getFileHeaders(),
      body: formData,
    });
    return await response.json();
  };

  // ===========================================
  // ADMIN API CALLS
  // ===========================================

  const getAdminRecords = async () => {
    const response = await fetch(`${BASE_URL}/admin/records`, {
      method: "GET",
      headers: getAuthHeaders(),
    });
    return await response.json();
  };

  const getSingleUser = async (userId) => {
    const response = await fetch(`${BASE_URL}/admin/singleUser/${userId}`, {
      method: "GET",
      headers: getAuthHeaders(),
    });
    return await response.json();
  };
  const getallusers = async (userId) => {
    const response = await fetch(`${BASE_URL}/admin/allusers`, {
      method: "GET",
      headers: getAuthHeaders(),
    });
    return await response.json();
  };

  const getAdminQRCodes = async () => {
    const response = await fetch(`${BASE_URL}/admin/qrcodes`, {
      method: "GET",
      headers: getAuthHeaders(),
    });
    return await response.json();
  };

  const getTodaysAttendance = async () => {
    const response = await fetch(`${BASE_URL}/admin/todays-attendance`, {
      method: "GET",
      headers: getAuthHeaders(),
    });
    return await response.json();
  };

  const deleteUser = async (userId) => {
    const response = await fetch(`${BASE_URL}/admin/user/${userId}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
    return await response.json();
  };

  const getDailyReport = async () => {
    const response = await fetch(`${BASE_URL}/admin/daily-report`, {
      method: "GET",
      headers: getAuthHeaders(),
    });
    return await response.json();
  };

  const getWeeklyReport = async () => {
    const response = await fetch(`${BASE_URL}/admin/weekly-report`, {
      method: "GET",
      headers: getAuthHeaders(),
    });
    return await response.json();
  };

  // ===========================================
  // PASSWORD RESET API CALLS
  // ===========================================

  const requestPasswordReset = async (data) => {
    const response = await fetch(`${BASE_URL}/password/request-reset`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return await response.json();
  };

  const resetPassword = async (data) => {
    const response = await fetch(`${BASE_URL}/password/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return await response.json();
  };

  // ===========================================
  // AI API CALLS
  // ===========================================

  const getAIHealth = async () => {
    const response = await fetch(`${BASE_URL}/ai/health`, {
      method: "GET",
      headers: getAuthHeaders(),
    });
    return await response.json();
  };

  const getAICapabilities = async () => {
    const response = await fetch(`${BASE_URL}/ai/capabilities`, {
      method: "GET",
      headers: getAuthHeaders(),
    });
    return await response.json();
  };

  const queryAI = async (data) => {
    const response = await fetch(`${BASE_URL}/ai/query`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return await response.json();
  };

  // ===========================================
  // SYSTEM API CALLS
  // ===========================================

  const getSystemHealth = async () => {
    const response = await fetch(`${BASE_URL}/`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });
    return await response.json();
  };

  const getScanLogs = async () => {
    const response = await fetch(`${BASE_URL}/logs/scans`, {
      method: "GET",
      headers: getAuthHeaders(),
    });
    return await response.json();
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
    setUser(null);
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

    // Auth functions
    login,
    logout,
    setAdminView,

    // API functions - Authentication
    registerOrganization,
    registerUser,
    loginUser,
    viewProfile,
    updateProfile,
    BASE_URL,
    logoutUser,

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

// Usage Example:
/*
const { 
  loginUser, 
  viewProfile, 
  scanAttendance, 
  getAdminRecords,
  user,
  logout 
} = useAuth();

// Login
const loginData = await loginUser({ email: 'user@example.com', password: 'password' });

// Get profile
const profile = await viewProfile();

// Scan attendance
const scanResult = await scanAttendance({ qrCode: 'some-qr-code' });

// Get admin records
const records = await getAdminRecords();
*/
