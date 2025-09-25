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
import axios from "axios";
import fs from "fs";

const BASE_URL =
  import.meta.env.VITE_BACKEND_BASE_URL ||
  "https://csi-attendance-web.onrender.com";

// Cache for API responses
const apiCache = new Map();
const CACHE_TIME = 5 * 60 * 1000; // 5 minutes

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeAdminView, setActiveAdminView] = useState("home");
  const [orginization, setorginization] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Ref to track if we're currently refreshing to prevent multiple simultaneous refreshes
  const refreshingRef = useRef(false);

  // Get auth token from localStorage
  const getToken = useCallback(() => localStorage.getItem("accessToken"), []);

  // Get auth headers
  const getAuthHeaders = useCallback(
    () => ({
      "Content-Type": "application/json",
      Authorization: `Bearer ${getToken()}`,
    }),
    [getToken]
  );

  // Get file upload headers
  const getFileHeaders = useCallback(
    () => ({
      Authorization: `Bearer ${getToken()}`,
    }),
    [getToken]
  );

  // 🆕 REFRESH TOKEN FUNCTIONALITY - Core refresh function
  const refreshAccessToken = useCallback(async () => {
    if (refreshingRef.current) {
      return null; // Prevent multiple simultaneous refresh attempts
    }

    try {
      refreshingRef.current = true;
      setIsRefreshing(true);

      console.log("🔄 Attempting to refresh access token...");

      // Call refresh token endpoint (cookies are sent automatically)
      const response = await fetch(`${BASE_URL}/auth2/refresh-token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include", // Important: This sends cookies automatically
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Token refresh failed");
      }

      console.log("✅ Token refreshed successfully");

      // Update stored tokens
      localStorage.setItem("accessToken", result.accessToken);
      localStorage.setItem("userData", JSON.stringify(result.user));

      // Update user state
      setUser(result.user);
      setorginization(result.organization || null);

      // Clear API cache since we have a new token
      apiCache.clear();

      return result.accessToken;
    } catch (error) {
      console.error("❌ Token refresh failed:", error);

      // If refresh fails, logout user
      await logout();
      throw error;
    } finally {
      refreshingRef.current = false;
      setIsRefreshing(false);
    }
  }, []);

  // 🆕 AUTOMATIC LOGIN CHECK - Check if user can be logged in via refresh token
  const checkAutoLogin = useCallback(async () => {
    try {
      console.log("🔍 Checking for automatic login via refresh token...");

      const storedToken = getToken();
      const storedUserData = localStorage.getItem("userData");

      // If we have both access token and user data, try to use them first
      if (storedToken && storedUserData) {
        try {
          const parsedUser = JSON.parse(storedUserData);

          // Verify if the stored access token is still valid
          const verifyResponse = await fetch(`${BASE_URL}/auth2/verify-token`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token: storedToken }),
          });

          if (verifyResponse.ok) {
            const verifyResult = await verifyResponse.json();
            if (verifyResult.success) {
              console.log(
                "✅ Stored access token is valid - auto login successful"
              );
              setUser(parsedUser);
              setorginization(verifyResult.organization || null);
              return true;
            }
          }
        } catch (error) {
          console.log(
            "⚠️ Stored access token verification failed, trying refresh..."
          );
        }
      }

      // If access token is invalid/missing, try refresh token
      try {
        const newAccessToken = await refreshAccessToken();
        if (newAccessToken) {
          console.log("✅ Auto-login successful via refresh token");
          return true;
        }
      } catch (error) {
        console.log("❌ Auto-login failed - no valid refresh token");
      }

      return false;
    } catch (error) {
      console.error("❌ Auto-login check failed:", error);
      return false;
    }
  }, [getToken, refreshAccessToken]);

  // 🆕 ENHANCED API REQUEST WRAPPER - With automatic token refresh
  const makeAuthenticatedRequest = useCallback(
    async (url, options = {}) => {
      const makeRequest = async (token) => {
        const response = await fetch(url, {
          ...options,
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            ...options.headers,
          },
          credentials: "include", // Always include cookies
        });

        const result = await response.json();

        // Check for token expiry or auth errors
        if (response.status === 401 && result.code) {
          if (
            ["TOKEN_EXPIRED", "INVALID_TOKEN", "MALFORMED_TOKEN"].includes(
              result.code
            )
          ) {
            throw new Error("TOKEN_EXPIRED");
          }
        }

        if (!response.ok) {
          throw new Error(
            result.message || `HTTP error! status: ${response.status}`
          );
        }

        return result;
      };

      try {
        const currentToken = getToken();
        if (!currentToken) {
          throw new Error("No access token available");
        }

        // Try with current token first
        return await makeRequest(currentToken);
      } catch (error) {
        // If token is expired, try to refresh and retry
        if (error.message === "TOKEN_EXPIRED" && !refreshingRef.current) {
          try {
            console.log("🔄 Access token expired, attempting refresh...");
            const newToken = await refreshAccessToken();

            if (newToken) {
              console.log("✅ Token refreshed, retrying request...");
              return await makeRequest(newToken);
            } else {
              throw new Error("Failed to refresh token");
            }
          } catch (refreshError) {
            console.error("❌ Token refresh failed:", refreshError);
            throw refreshError;
          }
        }

        throw error;
      }
    },
    [getToken, refreshAccessToken]
  );

  // 🆕 CACHED FETCH with automatic refresh
  const cachedFetch = useCallback(
    async (url, options = {}) => {
      const cacheKey = `${url}_${JSON.stringify(options)}`;
      const cached = apiCache.get(cacheKey);

      if (cached && Date.now() - cached.timestamp < CACHE_TIME) {
        return cached.data;
      }

      try {
        const data = await makeAuthenticatedRequest(url, options);
        apiCache.set(cacheKey, { data, timestamp: Date.now() });
        return data;
      } catch (error) {
        throw error;
      }
    },
    [makeAuthenticatedRequest]
  );
  const getdaily = async (token) => {
    try {
      const todays = new Date();
      const formateddate = todays.toISOString().split("T")[0];

      const response = await axios.get(
        `${BASE_URL}/getdata/daily?date=${formateddate}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          responseType: "blob", // important: receive Excel file as binary
        }
      );

      // Create a URL for the blob and trigger download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;

      // Optional: name the file dynamically based on the date
      link.setAttribute("download", `daily_report_${todays}.xlsx`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      console.log("Download triggered");
    } catch (error) {
      console.error("Failed to download daily report:", error);
      alert("Failed to download daily report.");
    }
  };
  const getWeek = async (token) => {
    try {
      const todays = new Date();
      // const formateddate  = todays.toISOString().split("T")[0]

      const response = await axios.get(`${BASE_URL}/getdata/weekly`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        responseType: "blob", // important: receive Excel file as binary
      });
      // Create a URL for the blob and trigger download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;

      // Optional: name the file dynamically based on the date
      link.setAttribute("download", `Weekly_report_${todays}.xlsx`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      console.log("Download triggered");
    } catch (error) {
      console.error("Failed to download weekly report:", error);
      alert("Failed to download weekly report.");
    }
  };

  // ===========================================
  // AUTHENTICATION API CALLS - Enhanced with refresh token support
  // ===========================================

  const registerOrganization = useCallback(async (data) => {
    try {
      const response = await fetch(`${BASE_URL}/auth2/organization-register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      return await response.json();
    } catch (error) {
      throw new Error(`Organization registration failed: ${error.message}`);
    }
  }, []);

  const registerUser = useCallback(
    async (data) => {
      return makeAuthenticatedRequest(`${BASE_URL}/auth2/register-user`, {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    [makeAuthenticatedRequest]
  );

  const loginUser = useCallback(async (data) => {
    try {
      const response = await fetch(`${BASE_URL}/auth2/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include", // Important: This allows cookies to be set
      });
      return await response.json();
    } catch (error) {
      throw new Error(`Login failed: ${error.message}`);
    }
  }, []);

  const viewProfile = useCallback(async () => {
    return cachedFetch(`${BASE_URL}/auth2/viewProfile`);
  }, [cachedFetch]);

  const updateProfile = useCallback(
    async (data) => {
      return makeAuthenticatedRequest(`${BASE_URL}/auth2/updateProfile`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
    },
    [makeAuthenticatedRequest]
  );

  const logoutUser = useCallback(async () => {
    return makeAuthenticatedRequest(`${BASE_URL}/auth2/logout`, {
      method: "POST",
    });
  }, [makeAuthenticatedRequest]);

  // QR CODE API CALLS
  const getActiveQRCode = useCallback(async () => {
    return cachedFetch(`${BASE_URL}/qrcode/active`);
  }, [cachedFetch]);

  // ATTENDANCE API CALLS
  const scanAttendance = useCallback(
    async (data) => {
      return makeAuthenticatedRequest(`${BASE_URL}/attend/scan`, {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    [makeAuthenticatedRequest]
  );

  const getPastAttendance = useCallback(async () => {
    return cachedFetch(`${BASE_URL}/attend/past`);
  }, [cachedFetch]);

  const uploadAttendance = useCallback(
    async (formData) => {
      try {
        const token = getToken();
        const response = await fetch(`${BASE_URL}/attend/upload`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
          credentials: "include",
        });
        return await response.json();
      } catch (error) {
        throw new Error(`Attendance upload failed: ${error.message}`);
      }
    },
    [getToken]
  );

  // ADMIN API CALLS
  const getAdminRecords = useCallback(async () => {
    return cachedFetch(`${BASE_URL}/admin/records`);
  }, [cachedFetch]);

  const getSingleUser = useCallback(
    async (userId) => {
      return cachedFetch(`${BASE_URL}/admin/singleUser/${userId}`);
    },
    [cachedFetch]
  );

  const getallusers = useCallback(async () => {
    return cachedFetch(`${BASE_URL}/admin/allusers`);
  }, [cachedFetch]);

  const getAdminQRCodes = useCallback(async () => {
    return cachedFetch(`${BASE_URL}/admin/qrcodes`);
  }, [cachedFetch]);

  const getTodaysAttendance = useCallback(async () => {
    return cachedFetch(`${BASE_URL}/admin/todays-attendance`);
  }, [cachedFetch]);

  const deleteUser = useCallback(
    async (userId) => {
      // Clear cache after deletion
      apiCache.clear();
      return makeAuthenticatedRequest(`${BASE_URL}/admin/user/${userId}`, {
        method: "DELETE",
      });
    },
    [makeAuthenticatedRequest]
  );

  const getDailyReport = useCallback(async () => {
    return cachedFetch(`${BASE_URL}/admin/daily-report`);
  }, [cachedFetch]);

  const getWeeklyReport = useCallback(async () => {
    return cachedFetch(`${BASE_URL}/admin/weekly-report`);
  }, [cachedFetch]);

  // PASSWORD RESET API CALLS
  const requestPasswordReset = useCallback(async (data) => {
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
  }, []);

  const resetPassword = useCallback(async (data) => {
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
  }, []);

  // AI API CALLS
  const getAIHealth = useCallback(async () => {
    return cachedFetch(`${BASE_URL}/api/ai-analytics/health`);
  }, [cachedFetch]);

  const getAICapabilities = useCallback(async () => {
    return cachedFetch(`${BASE_URL}/api/ai-analytics/capabilities`);
  }, [cachedFetch]);

  const queryAI = useCallback(
    async (data) => {
      return makeAuthenticatedRequest(`${BASE_URL}/api/ai-analytics/query`, {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    [makeAuthenticatedRequest]
  );

  // Add this method to check if user is authenticated
  const isAuthenticated = () => {
    return !!(user && accessToken);
  };

  // Add this method to check if user is admin
  const isAdmin = () => {
    return user && user.role === "organization";
  };

  // SYSTEM API CALLS
  const getSystemHealth = useCallback(async () => {
    try {
      const response = await fetch(`${BASE_URL}/`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });
      return await response.json();
    } catch (error) {
      throw new Error(`System health check failed: ${error.message}`);
    }
  }, []);

  const getScanLogs = useCallback(async () => {
    return cachedFetch(`${BASE_URL}/logs/scans`);
  }, [cachedFetch]);

  // ===========================================
  // AUTH STATE MANAGEMENT - Enhanced with refresh token
  // ===========================================

  // 🆕 INITIALIZATION - Check for auto-login on app start
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        setLoading(true);

        // Try automatic login via refresh token
        const autoLoginSuccess = await checkAutoLogin();

        if (!autoLoginSuccess) {
          console.log("❌ Auto-login failed - user needs to login manually");
        }
      } catch (error) {
        console.error("❌ Auth initialization failed:", error);

        // Clean up any invalid stored data
        localStorage.removeItem("accessToken");
        localStorage.removeItem("userData");
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, [checkAutoLogin]);

  // 🆕 PERIODIC TOKEN REFRESH - Optional: refresh tokens periodically
  useEffect(() => {
    if (!user) return;

    // Set up periodic token refresh (every 1 hour)
    const refreshInterval = setInterval(async () => {
      try {
        await refreshAccessToken();
        console.log("🔄 Periodic token refresh successful");
      } catch (error) {
        console.error("❌ Periodic token refresh failed:", error);
      }
    }, 60 * 60 * 1000); // 1 hour

    return () => clearInterval(refreshInterval);
  }, [user, refreshAccessToken]);

  // Enhanced login function - stores user data and handles refresh token
  const login = useCallback((userData, accessToken, organization = null) => {
    console.log("✅ Login successful, storing user data");

    setUser(userData);
    setorginization(organization);

    localStorage.setItem("accessToken", accessToken);
    localStorage.setItem("userData", JSON.stringify(userData));

    // Clear any existing cache
    apiCache.clear();
  }, []);

  // Enhanced logout function - clears everything including cookies
  const logout = useCallback(async () => {
    try {
      console.log("🚪 Logging out...");

      // Try to call logout endpoint if token exists
      const token = getToken();
      if (token && user) {
        try {
          await logoutUser();
        } catch (error) {
          console.log("⚠️ Server logout call failed:", error);
          // Continue with local logout even if server call fails
        }
      }
    } catch (error) {
      console.error("❌ Logout error:", error);
    } finally {
      // Always clear local storage and state
      localStorage.removeItem("accessToken");
      localStorage.removeItem("userData");
      localStorage.removeItem("checkInTime");
      localStorage.removeItem("checkOutTime");
      localStorage.removeItem("orginizationcode");

      setUser(null);
      setorginization(null);

      // Clear all caches
      apiCache.clear();

      console.log("✅ Logout complete");
    }
  }, [getToken, user, logoutUser]);

  const setAdminView = useCallback((view) => {
    setActiveAdminView(view);
  }, []);

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo(
    () => ({
      // State
      user,
      loading,
      isRefreshing,
      activeAdminView,
      orginization,

      // Auth functions
      login,
      logout,
      setAdminView,
      setorginization,
      refreshAccessToken,
      checkAutoLogin,

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
      getdaily,
      getWeek,
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
      isAuthenticated, // ADD this
      isAdmin, //
      // Utility functions
      getAuthHeaders,
      getFileHeaders,
      makeAuthenticatedRequest,
    }),
    [
      user,
      loading,
      isRefreshing,
      activeAdminView,
      orginization,
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
      getActiveQRCode,
      scanAttendance,
      getPastAttendance,
      uploadAttendance,
      getAdminRecords,
      getSingleUser,
      getAdminQRCodes,
      getTodaysAttendance,
      deleteUser,
      getDailyReport,
      getWeeklyReport,
      getallusers,
      requestPasswordReset,
      resetPassword,
      getAIHealth,
      getAICapabilities,
      queryAI,
      getSystemHealth,
      getScanLogs,
      getAuthHeaders,
      getFileHeaders,
      makeAuthenticatedRequest,
    ]
  );

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
