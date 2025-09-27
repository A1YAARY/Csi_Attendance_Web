import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";

const AuthContext = createContext();

const BASE_URL =
  import.meta.env.VITE_BACKEND_BASE_URL ||
  "https://csi-attendance-web.onrender.com";

// Cache for API responses
const apiCache = new Map();
const CACHE_TIME = 5 * 60 * 1000; // 5 minutes

// Enhanced logging utility
const logAuthContext = (operation, data, type = 'info') => {
  const timestamp = new Date().toISOString();
  const logData = {
    timestamp,
    operation,
    type,
    data: typeof data === 'object' ? JSON.stringify(data, null, 2) : data
  };

  console.group(`🔐 AuthContext - ${operation}`);
  console.log(`⏰ Time: ${timestamp}`);
  console.log(`📊 Type: ${type}`);
  console.log(`📋 Data:`, data);
  console.groupEnd();

  // Store in localStorage for debugging
  const logs = JSON.parse(localStorage.getItem('authContextLogs') || '[]');
  logs.push(logData);
  // Keep only last 100 logs
  if (logs.length > 100) logs.shift();
  localStorage.setItem('authContextLogs', JSON.stringify(logs));
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeAdminView, setActiveAdminView] = useState("home");
  const [organization, setOrganization] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const refreshingRef = useRef(false);

  // Log state changes
  useEffect(() => {
    logAuthContext('State Change - User', user);
  }, [user]);

  useEffect(() => {
    logAuthContext('State Change - Organization', organization);
  }, [organization]);

  useEffect(() => {
    logAuthContext('State Change - Loading', loading);
  }, [loading]);

  // Get auth token from localStorage
  const getToken = useCallback(() => {
    const token = localStorage.getItem("accessToken");
    logAuthContext('Get Token', token ? 'Token exists' : 'No token found');
    return token;
  }, []);

  // Get auth headers
  const getAuthHeaders = useCallback(
    () => {
      const headers = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getToken()}`,
      };
      logAuthContext('Get Auth Headers', headers);
      return headers;
    },
    [getToken]
  );

  // Get file upload headers
  const getFileHeaders = useCallback(
    () => {
      const headers = {
        Authorization: `Bearer ${getToken()}`,
      };
      logAuthContext('Get File Headers', headers);
      return headers;
    },
    [getToken]
  );

  // Refresh token functionality
  const refreshAccessToken = useCallback(async () => {
    if (refreshingRef.current) {
      logAuthContext('Refresh Token', 'Already refreshing, skipping', 'warning');
      return null;
    }

    try {
      refreshingRef.current = true;
      setIsRefreshing(true);
      logAuthContext('Refresh Token', 'Starting token refresh');

      const response = await fetch(`${BASE_URL}/auth2/refresh-token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });

      const result = await response.json();
      logAuthContext('Refresh Token Response', result);

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Token refresh failed");
      }

      localStorage.setItem("accessToken", result.accessToken);
      localStorage.setItem("userData", JSON.stringify(result.user));
      setUser(result.user);
      setOrganization(result.organization || null);
      apiCache.clear();

      logAuthContext('Refresh Token', 'Token refreshed successfully', 'success');
      return result.accessToken;
    } catch (error) {
      logAuthContext('Refresh Token Error', error.message, 'error');
      await logout();
      throw error;
    } finally {
      refreshingRef.current = false;
      setIsRefreshing(false);
    }
  }, []);

  // Enhanced API request wrapper
  const makeAuthenticatedRequest = useCallback(
    async (url, options = {}) => {
      logAuthContext('API Request', { url, method: options.method || 'GET' });

      const makeRequest = async (token) => {
        const response = await fetch(url, {
          ...options,
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            ...options.headers,
          },
          credentials: "include",
        });

        const result = await response.json();
        logAuthContext('API Response', { url, status: response.status, result });

        if (response.status === 401 && result.code) {
          if (["TOKEN_EXPIRED", "INVALID_TOKEN", "MALFORMED_TOKEN"].includes(result.code)) {
            throw new Error("TOKEN_EXPIRED");
          }
        }

        if (!response.ok) {
          throw new Error(result.message || `HTTP error! status: ${response.status}`);
        }

        return result;
      };

      try {
        const currentToken = getToken();
        if (!currentToken) {
          throw new Error("No access token available");
        }
        return await makeRequest(currentToken);
      } catch (error) {
        if (error.message === "TOKEN_EXPIRED" && !refreshingRef.current) {
          try {
            const newToken = await refreshAccessToken();
            if (newToken) {
              return await makeRequest(newToken);
            }
          } catch (refreshError) {
            throw refreshError;
          }
        }
        throw error;
      }
    },
    [getToken, refreshAccessToken]
  );

  // Cached fetch with logging
  const cachedFetch = useCallback(
    async (url, options = {}) => {
      const cacheKey = `${url}_${JSON.stringify(options)}`;
      const cached = apiCache.get(cacheKey);

      if (cached && Date.now() - cached.timestamp < CACHE_TIME) {
        logAuthContext('Cache Hit', { url, cachedAt: new Date(cached.timestamp) });
        return cached.data;
      }

      logAuthContext('Cache Miss', { url });
      const data = await makeAuthenticatedRequest(url, options);
      apiCache.set(cacheKey, { data, timestamp: Date.now() });
      return data;
    },
    [makeAuthenticatedRequest]
  );

  // ===================================
  // AUTH ROUTES - /auth2/*
  // ===================================
  const registerOrganization = useCallback(async (data) => {
    logAuthContext('Register Organization', data);
    try {
      const response = await fetch(`${BASE_URL}/auth2/organization-register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      const result = await response.json();
      logAuthContext('Register Organization Response', result);
      return result;
    } catch (error) {
      logAuthContext('Register Organization Error', error.message, 'error');
      throw new Error(`Organization registration failed: ${error.message}`);
    }
  }, []);

  const registerUser = useCallback(
    async (data) => {
      logAuthContext('Register User', data);
      return makeAuthenticatedRequest(`${BASE_URL}/auth2/register-user`, {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    [makeAuthenticatedRequest]
  );

  const loginUser = useCallback(async (data) => {
    logAuthContext('Login User', data);
    try {
      const response = await fetch(`${BASE_URL}/auth2/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      const result = await response.json();
      logAuthContext('Login User Response', result);
      return result;
    } catch (error) {
      logAuthContext('Login User Error', error.message, 'error');
      throw new Error(`Login failed: ${error.message}`);
    }
  }, []);

  const viewProfile = useCallback(async () => {
    logAuthContext('View Profile', 'Fetching profile');
    return cachedFetch(`${BASE_URL}/auth2/viewProfile`);
  }, [cachedFetch]);

  const updateProfile = useCallback(
    async (data) => {
      logAuthContext('Update Profile', data);
      return makeAuthenticatedRequest(`${BASE_URL}/auth2/updateProfile`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
    },
    [makeAuthenticatedRequest]
  );

  const logoutUser = useCallback(async () => {
    logAuthContext('Logout User', 'Initiating logout');
    return makeAuthenticatedRequest(`${BASE_URL}/auth2/logout`, {
      method: "POST",
    });
  }, [makeAuthenticatedRequest]);

  const verifyToken = useCallback(async (token) => {
    logAuthContext('Verify Token', 'Verifying token');
    try {
      const response = await fetch(`${BASE_URL}/auth2/verify-token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const result = await response.json();
      logAuthContext('Verify Token Response', result);
      return result;
    } catch (error) {
      logAuthContext('Verify Token Error', error.message, 'error');
      throw error;
    }
  }, []);

  // ===================================
  // ATTENDANCE ROUTES - /attend/*
  // ===================================
  const scanAttendance = useCallback(
    async (data) => {
      logAuthContext('Scan Attendance', data);
      return makeAuthenticatedRequest(`${BASE_URL}/attend/scan`, {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    [makeAuthenticatedRequest]
  );

  const getPastAttendance = useCallback(async () => {
    logAuthContext('Get Past Attendance', 'Fetching past attendance');
    return cachedFetch(`${BASE_URL}/attend/past`);
  }, [cachedFetch]);

  const getAttendanceDailyReport = useCallback(async () => {
    logAuthContext('Get Attendance Daily Report', 'Fetching daily report');
    return cachedFetch(`${BASE_URL}/attend/daily-report`);
  }, [cachedFetch]);

  const getAttendanceWeeklyReport = useCallback(async () => {
    logAuthContext('Get Attendance Weekly Report', 'Fetching weekly report');
    return cachedFetch(`${BASE_URL}/attend/weekly-report`);
  }, [cachedFetch]);

  const getAttendanceMonthlyReport = useCallback(async () => {
    logAuthContext('Get Attendance Monthly Report', 'Fetching monthly report');
    return cachedFetch(`${BASE_URL}/attend/monthly-report`);
  }, [cachedFetch]);

  const downloadAttendanceDaily = useCallback(async () => {
    logAuthContext('Download Attendance Daily', 'Downloading daily report');
    return makeAuthenticatedRequest(`${BASE_URL}/attend/download-daily`);
  }, [makeAuthenticatedRequest]);

  const downloadAttendanceWeekly = useCallback(async () => {
    logAuthContext('Download Attendance Weekly', 'Downloading weekly report');
    return makeAuthenticatedRequest(`${BASE_URL}/attend/download-weekly`);
  }, [makeAuthenticatedRequest]);

  const checkWorkingDay = useCallback(async () => {
    logAuthContext('Check Working Day', 'Checking if today is working day');
    return cachedFetch(`${BASE_URL}/attend/check`);
  }, [cachedFetch]);

  // ===================================
  // ADMIN ROUTES - /admin/*
  // ===================================
  const getAdminRecords = useCallback(async () => {
    logAuthContext('Get Admin Records', 'Fetching admin records');
    return cachedFetch(`${BASE_URL}/admin/records`);
  }, [cachedFetch]);

  const getAllUsers = useCallback(async () => {
    logAuthContext('Get All Users', 'Fetching all users');
    return cachedFetch(`${BASE_URL}/admin/allusers`);
  }, [cachedFetch]);

  const getAdminDashboard = useCallback(async () => {
    logAuthContext('Get Admin Dashboard', 'Fetching dashboard data');
    return cachedFetch(`${BASE_URL}/admin/dashboard`);
  }, [cachedFetch]);

  const getSingleUser = useCallback(
    async (userId) => {
      logAuthContext('Get Single User', { userId });
      return cachedFetch(`${BASE_URL}/admin/singleUser/${userId}`);
    },
    [cachedFetch]
  );

  const updateUserByAdmin = useCallback(
    async (userId, data) => {
      logAuthContext('Update User By Admin', { userId, data });
      return makeAuthenticatedRequest(`${BASE_URL}/admin/user/${userId}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      });
    },
    [makeAuthenticatedRequest]
  );

  const deleteUser = useCallback(
    async (userId) => {
      logAuthContext('Delete User', { userId });
      apiCache.clear();
      return makeAuthenticatedRequest(`${BASE_URL}/admin/user/${userId}`, {
        method: "DELETE",
      });
    },
    [makeAuthenticatedRequest]
  );

  const resetUserDevice = useCallback(
    async (data) => {
      logAuthContext('Reset User Device', data);
      return makeAuthenticatedRequest(`${BASE_URL}/admin/reset-user-device`, {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    [makeAuthenticatedRequest]
  );

  const getDeviceChangeRequests = useCallback(async () => {
    logAuthContext('Get Device Change Requests', 'Fetching device change requests');
    return cachedFetch(`${BASE_URL}/admin/device-change-requests`);
  }, [cachedFetch]);

  const handleDeviceChangeRequest = useCallback(
    async (data) => {
      logAuthContext('Handle Device Change Request', data);
      return makeAuthenticatedRequest(`${BASE_URL}/admin/handle-device-change-request`, {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    [makeAuthenticatedRequest]
  );

  const getAdminQRCodes = useCallback(async () => {
    logAuthContext('Get Admin QR Codes', 'Fetching QR codes');
    return cachedFetch(`${BASE_URL}/admin/qrcodes`);
  }, [cachedFetch]);

  const getQRCodeByType = useCallback(
    async (type) => {
      logAuthContext('Get QR Code By Type', { type });
      return cachedFetch(`${BASE_URL}/admin/qrcode/${type}`);
    },
    [cachedFetch]
  );

  const getTodaysAttendance = useCallback(async () => {
    logAuthContext('Get Todays Attendance', 'Fetching todays attendance');
    return cachedFetch(`${BASE_URL}/admin/todays-attendance`);
  }, [cachedFetch]);

  const getAdminDailyReport = useCallback(async () => {
    logAuthContext('Get Admin Daily Report', 'Fetching admin daily report');
    return cachedFetch(`${BASE_URL}/admin/daily-report`);
  }, [cachedFetch]);

  const getAdminWeeklyReport = useCallback(async () => {
    logAuthContext('Get Admin Weekly Report', 'Fetching admin weekly report');
    return cachedFetch(`${BASE_URL}/admin/weekly-report`);
  }, [cachedFetch]);

  const getAdminMonthlyReport = useCallback(async () => {
    logAuthContext('Get Admin Monthly Report', 'Fetching admin monthly report');
    return cachedFetch(`${BASE_URL}/admin/monthly-report`);
  }, [cachedFetch]);

  const markHolidayAttendance = useCallback(
    async (data) => {
      logAuthContext('Mark Holiday Attendance', data);
      return makeAuthenticatedRequest(`${BASE_URL}/admin/mark-holiday-attendance`, {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    [makeAuthenticatedRequest]
  );

  // ===================================
  // QR CODE ROUTES - /qrcode/*
  // ===================================
  const getActiveQRCode = useCallback(async () => {
    logAuthContext('Get Active QR Code', 'Fetching active QR code');
    return cachedFetch(`${BASE_URL}/qrcode/active`);
  }, [cachedFetch]);

  const generateNewQRCode = useCallback(async () => {
    logAuthContext('Generate New QR Code', 'Generating new QR code');
    return makeAuthenticatedRequest(`${BASE_URL}/qrcode/generate`, {
      method: "POST",
    });
  }, [makeAuthenticatedRequest]);

  // ===================================
  // BULK USER ROUTES - /bulk/*
  // ===================================
  const bulkUploadUsers = useCallback(
    async (formData) => {
      logAuthContext('Bulk Upload Users', 'Uploading users via Excel');
      try {
        const token = getToken();
        const response = await fetch(`${BASE_URL}/bulk/upload-users`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
          credentials: "include",
        });
        const result = await response.json();
        logAuthContext('Bulk Upload Users Response', result);
        return result;
      } catch (error) {
        logAuthContext('Bulk Upload Users Error', error.message, 'error');
        throw error;
      }
    },
    [getToken]
  );

  const downloadUserTemplate = useCallback(async () => {
    logAuthContext('Download User Template', 'Downloading Excel template');
    return cachedFetch(`${BASE_URL}/bulk/template`);
  }, [cachedFetch]);

  // ===================================
  // AI ANALYTICS ROUTES - /api/ai-analytics/*
  // ===================================
  const queryAI = useCallback(
    async (data) => {
      logAuthContext('Query AI', data);
      return makeAuthenticatedRequest(`${BASE_URL}/api/ai-analytics/query`, {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    [makeAuthenticatedRequest]
  );

  const getAICapabilities = useCallback(async () => {
    logAuthContext('Get AI Capabilities', 'Fetching AI capabilities');
    return cachedFetch(`${BASE_URL}/api/ai-analytics/capabilities`);
  }, [cachedFetch]);

  const getAIHealth = useCallback(async () => {
    logAuthContext('Get AI Health', 'Checking AI health');
    return cachedFetch(`${BASE_URL}/api/ai-analytics/health`);
  }, [cachedFetch]);

  // ===================================
  // DOWNLOAD ROUTES - /getdata/*
  // ===================================
  const downloadDailyReport = useCallback(async () => {
    logAuthContext('Download Daily Report', 'Downloading daily Excel report');
    try {
      const token = getToken();
      const today = new Date().toISOString().split("T")[0];
      const response = await fetch(`${BASE_URL}/getdata/daily?date=${today}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `daily_report_${today}.xlsx`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        logAuthContext('Download Daily Report', 'Download triggered successfully', 'success');
      }
    } catch (error) {
      logAuthContext('Download Daily Report Error', error.message, 'error');
      throw error;
    }
  }, [getToken]);

  const downloadWeeklyReport = useCallback(async () => {
    logAuthContext('Download Weekly Report', 'Downloading weekly Excel report');
    try {
      const token = getToken();
      const today = new Date().toISOString().split("T")[0];
      const response = await fetch(`${BASE_URL}/getdata/weekly`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `weekly_report_${today}.xlsx`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        logAuthContext('Download Weekly Report', 'Download triggered successfully', 'success');
      }
    } catch (error) {
      logAuthContext('Download Weekly Report Error', error.message, 'error');
      throw error;
    }
  }, [getToken]);

  // ===================================
  // PASSWORD RESET ROUTES - /password/*
  // ===================================
  const requestPasswordReset = useCallback(async (data) => {
    logAuthContext('Request Password Reset', data);
    try {
      const response = await fetch(`${BASE_URL}/password/request-reset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await response.json();
      logAuthContext('Request Password Reset Response', result);
      return result;
    } catch (error) {
      logAuthContext('Request Password Reset Error', error.message, 'error');
      throw error;
    }
  }, []);

  const resetPassword = useCallback(async (data) => {
    logAuthContext('Reset Password', data);
    try {
      const response = await fetch(`${BASE_URL}/password/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await response.json();
      logAuthContext('Reset Password Response', result);
      return result;
    } catch (error) {
      logAuthContext('Reset Password Error', error.message, 'error');
      throw error;
    }
  }, []);

  const updatePassword = useCallback(
    async (data) => {
      logAuthContext('Update Password', data);
      return makeAuthenticatedRequest(`${BASE_URL}/password/update-password`, {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    [makeAuthenticatedRequest]
  );

  // ===================================
  // UTILITY FUNCTIONS
  // ===================================
  const isAuthenticated = useCallback(() => {
    const result = !!(user && getToken());
    logAuthContext('Is Authenticated', result);
    return result;
  }, [user, getToken]);

  const isAdmin = useCallback(() => {
    const result = user && user.role === "organization";
    logAuthContext('Is Admin', result);
    return result;
  }, [user]);

  const getSystemHealth = useCallback(async () => {
    logAuthContext('Get System Health', 'Checking system health');
    try {
      const response = await fetch(`${BASE_URL}/`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });
      const result = await response.json();
      logAuthContext('Get System Health Response', result);
      return result;
    } catch (error) {
      logAuthContext('Get System Health Error', error.message, 'error');
      throw error;
    }
  }, []);

  // ===================================
  // AUTH STATE MANAGEMENT
  // ===================================
  const login = useCallback((userData, accessToken, organizationData = null) => {
    logAuthContext('Login', { userData, organizationData });
    setUser(userData);
    setOrganization(organizationData);
    localStorage.setItem("accessToken", accessToken);
    localStorage.setItem("userData", JSON.stringify(userData));
    apiCache.clear();
  }, []);

  const logout = useCallback(async () => {
    logAuthContext('Logout', 'Starting logout process');
    try {
      const token = getToken();
      if (token && user) {
        try {
          await logoutUser();
        } catch (error) {
          logAuthContext('Logout Server Call Failed', error.message, 'warning');
        }
      }
    } catch (error) {
      logAuthContext('Logout Error', error.message, 'error');
    } finally {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("userData");
      localStorage.removeItem("checkInTime");
      localStorage.removeItem("checkOutTime");
      localStorage.removeItem("organizationcode");
      setUser(null);
      setOrganization(null);
      apiCache.clear();
      logAuthContext('Logout', 'Logout completed successfully', 'success');
    }
  }, [getToken, user, logoutUser]);

  const checkAutoLogin = useCallback(async () => {
    logAuthContext('Check Auto Login', 'Checking for automatic login');
    try {
      const storedToken = getToken();
      const storedUserData = localStorage.getItem("userData");

      if (storedToken && storedUserData) {
        try {
          const parsedUser = JSON.parse(storedUserData);
          const verifyResult = await verifyToken(storedToken);

          if (verifyResult.success) {
            setUser(parsedUser);
            setOrganization(verifyResult.organization || null);
            logAuthContext('Check Auto Login', 'Auto login successful via stored token', 'success');
            return true;
          }
        } catch (error) {
          logAuthContext('Check Auto Login', 'Stored token verification failed, trying refresh', 'warning');
        }
      }

      try {
        const newAccessToken = await refreshAccessToken();
        if (newAccessToken) {
          logAuthContext('Check Auto Login', 'Auto login successful via refresh token', 'success');
          return true;
        }
      } catch (error) {
        logAuthContext('Check Auto Login', 'Auto login failed - no valid refresh token', 'warning');
      }

      return false;
    } catch (error) {
      logAuthContext('Check Auto Login Error', error.message, 'error');
      return false;
    }
  }, [getToken, verifyToken, refreshAccessToken]);

  // Initialize auth on app start
  useEffect(() => {
    const initializeAuth = async () => {
      logAuthContext('Initialize Auth', 'Starting auth initialization');
      try {
        setLoading(true);
        const autoLoginSuccess = await checkAutoLogin();
        if (!autoLoginSuccess) {
          logAuthContext('Initialize Auth', 'Auto-login failed - manual login required', 'warning');
        }
      } catch (error) {
        logAuthContext('Initialize Auth Error', error.message, 'error');
        localStorage.removeItem("accessToken");
        localStorage.removeItem("userData");
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, [checkAutoLogin]);

  // Periodic token refresh
  useEffect(() => {
    if (!user) return;

    const refreshInterval = setInterval(async () => {
      try {
        await refreshAccessToken();
        logAuthContext('Periodic Token Refresh', 'Token refreshed successfully', 'success');
      } catch (error) {
        logAuthContext('Periodic Token Refresh Error', error.message, 'error');
      }
    }, 60 * 60 * 1000); // 1 hour

    return () => clearInterval(refreshInterval);
  }, [user, refreshAccessToken]);

  const setAdminView = useCallback((view) => {
    logAuthContext('Set Admin View', { view });
    setActiveAdminView(view);
  }, []);

  // Context value with all functions
  const contextValue = useMemo(
    () => ({
      // State
      user,
      loading,
      isRefreshing,
      activeAdminView,
      organization,
      BASE_URL,

      // Auth functions
      login,
      logout,
      setAdminView,
      setOrganization,
      refreshAccessToken,
      checkAutoLogin,

      // Auth API functions
      registerOrganization,
      registerUser,
      loginUser,
      viewProfile,
      updateProfile,
      logoutUser,
      verifyToken,

      // Attendance API functions
      scanAttendance,
      getPastAttendance,
      getAttendanceDailyReport,
      getAttendanceWeeklyReport,
      getAttendanceMonthlyReport,
      downloadAttendanceDaily,
      downloadAttendanceWeekly,
      checkWorkingDay,

      // Admin API functions
      getAdminRecords,
      getAllUsers,
      getAdminDashboard,
      getSingleUser,
      updateUserByAdmin,
      deleteUser,
      resetUserDevice,
      getDeviceChangeRequests,
      handleDeviceChangeRequest,
      getAdminQRCodes,
      getQRCodeByType,
      getTodaysAttendance,
      getAdminDailyReport,
      getAdminWeeklyReport,
      getAdminMonthlyReport,
      markHolidayAttendance,

      // QR Code API functions
      getActiveQRCode,
      generateNewQRCode,

      // Bulk User API functions
      bulkUploadUsers,
      downloadUserTemplate,

      // AI Analytics API functions
      queryAI,
      getAICapabilities,
      getAIHealth,

      // Download API functions
      downloadDailyReport,
      downloadWeeklyReport,

      // Password Reset API functions
      requestPasswordReset,
      resetPassword,
      updatePassword,

      // Utility functions
      isAuthenticated,
      isAdmin,
      getAuthHeaders,
      getFileHeaders,
      makeAuthenticatedRequest,
      getSystemHealth,

      // Debugging function
      logAuthContext,
    }),
    [
      user,
      loading,
      isRefreshing,
      activeAdminView,
      organization,
      login,
      logout,
      setAdminView,
      refreshAccessToken,
      checkAutoLogin,
      registerOrganization,
      registerUser,
      loginUser,
      viewProfile,
      updateProfile,
      logoutUser,
      verifyToken,
      scanAttendance,
      getPastAttendance,
      getAttendanceDailyReport,
      getAttendanceWeeklyReport,
      getAttendanceMonthlyReport,
      downloadAttendanceDaily,
      downloadAttendanceWeekly,
      checkWorkingDay,
      getAdminRecords,
      getAllUsers,
      getAdminDashboard,
      getSingleUser,
      updateUserByAdmin,
      deleteUser,
      resetUserDevice,
      getDeviceChangeRequests,
      handleDeviceChangeRequest,
      getAdminQRCodes,
      getQRCodeByType,
      getTodaysAttendance,
      getAdminDailyReport,
      getAdminWeeklyReport,
      getAdminMonthlyReport,
      markHolidayAttendance,
      getActiveQRCode,
      generateNewQRCode,
      bulkUploadUsers,
      downloadUserTemplate,
      queryAI,
      getAICapabilities,
      getAIHealth,
      downloadDailyReport,
      downloadWeeklyReport,
      requestPasswordReset,
      resetPassword,
      updatePassword,
      isAuthenticated,
      isAdmin,
      getAuthHeaders,
      getFileHeaders,
      makeAuthenticatedRequest,
      getSystemHealth,
    ]
  );

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

// Debug function to view logs
export function getAuthContextLogs() {
  return JSON.parse(localStorage.getItem('authContextLogs') || '[]');
}

// Clear logs function
export function clearAuthContextLogs() {
  localStorage.removeItem('authContextLogs');
}
