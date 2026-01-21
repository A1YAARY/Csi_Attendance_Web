import React, { useEffect } from "react";
import { create } from "zustand";

// ==============================
// Constants and cache
// ==============================
const BASE_URL =
    import.meta.env.VITE_BACKEND_BASE_URL ||
    "https://csi-attendance-web.onrender.com";

const apiCache = new Map();
const CACHE_TIME = 5 * 60 * 1000; // 5 minutes

// Prevent concurrent refresh loops
let refreshingRef = false;

// ==============================
// Logging utility
// ==============================
const logAuthContext = (operation, data, type = "info") => {
    try {
        const timestamp = new Date().toISOString();
        const logData = {
            timestamp,
            operation,
            type,
            data: typeof data === "object" ? JSON.stringify(data, null, 2) : data,
        };

        // Console group


        // Persist last 100 logs
        if (typeof localStorage !== "undefined") {
            const logs = JSON.parse(localStorage.getItem("authContextLogs") || "[]");
            logs.push(logData);
            if (logs.length > 100) logs.shift();
            localStorage.setItem("authContextLogs", JSON.stringify(logs));
        }
    } catch {
        // ignore logging failures
    }
};

// Optional helpers
export const getAuthContextLogs = () =>
    JSON.parse(localStorage.getItem("authContextLogs") || "[]");
export const clearAuthContextLogs = () =>
    localStorage.removeItem("authContextLogs");

// ==============================
// Zustand store
// ==============================
export const useAuthStore = create((set, get) => {
    // ---------- helpers ----------
    const getToken = () => {
        const token = localStorage.getItem("accessToken");
        logAuthContext("Get Token", token ? "Token exists" : "No token found");
        return token;
    };

    const setToken = (token) => {
        if (token) localStorage.setItem("accessToken", token);
        else localStorage.removeItem("accessToken");
    };

    const getAuthHeaders = () => {
        const headers = {
            "Content-Type": "application/json",
            Authorization: `Bearer ${getToken()}`,
        };
        logAuthContext("Get Auth Headers", headers);
        return headers;
    };

    const getFileHeaders = () => {
        const headers = { Authorization: `Bearer ${getToken()}` };
        logAuthContext("Get File Headers", headers);
        return headers;
    };

    const makeAuthenticatedRequest = async (url, options = {}) => {
        logAuthContext("API Request", { url, method: options.method || "GET" });

        const makeRequest = async (token) => {
            const response = await fetch(url, {
                ...options,
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                    ...(options.headers || {}),
                },
                credentials: "include",
            });

            let result = null;
            try {
                result = await response.json();
            } catch {
                result = { ok: response.ok, status: response.status };
            }

            logAuthContext("API Response", { url, status: response.status, result });

            // Token problems surfaced by API - FIX: Add proper closing braces
            if (response.status === 401 && result && result.code) {
                if (
                    ["TOKEN_EXPIRED", "INVALID_TOKEN", "MALFORMED_TOKEN"].includes(
                        result.code
                    )
                ) {
                    throw new Error("TOKEN_EXPIRED");
                }
            }

            if (!response.ok) {
                const msg =
                    (result && (result.message || result.error)) ||
                    `HTTP error! status: ${response.status}`;
                throw new Error(msg);
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
            // Try to refresh and retry once
            if (error.message === "TOKEN_EXPIRED" && !refreshingRef) {
                try {
                    const newToken = await get().refreshAccessToken();
                    if (newToken) {
                        return await makeRequest(newToken);
                    }
                } catch (refreshError) {
                    throw refreshError;
                }
            }
            throw error;
        }
    };

    const cachedFetch = async (url, options = {}, forceRefresh = false) => {
        const cacheKey = `${url}_${JSON.stringify(options)}`;
        
        if (!forceRefresh) {
            const cached = apiCache.get(cacheKey);
            if (cached && Date.now() - cached.timestamp < CACHE_TIME) {
                logAuthContext("Cache Hit", { url, cachedAt: new Date(cached.timestamp) });
                return cached.data;
            }
        }
        
        logAuthContext(forceRefresh ? "Cache Bypass (Force Refresh)" : "Cache Miss", { url });
        const data = await makeAuthenticatedRequest(url, options);
        apiCache.set(cacheKey, { data, timestamp: Date.now() });
        return data;
    };

    // ---------- store shape ----------
    return {
        // state
        user: null,
        organization: null,
        loading: true,
        isRefreshing: false,
        activeAdminView: localStorage.getItem("lastAdminView") || "home",
        BASE_URL,

        // ---------- auth lifecycle ----------
        login: (userData, accessToken, organizationData = null) => {
            logAuthContext("Login", { userData, organizationData });
            set({ user: userData, organization: organizationData });
            setToken(accessToken);
            localStorage.setItem("userData", JSON.stringify(userData));
            apiCache.clear();
        },

        logout: async () => {
            logAuthContext("Logout", "Starting logout process");
            try {
                const token = getToken();
                const { user } = get();
                if (token && user) {
                    try {
                        await get().logoutUser();
                    } catch (e) {
                        logAuthContext(
                            "Logout Server Call Failed",
                            e?.message || String(e),
                            "warning"
                        );
                    }
                }
            } catch (e) {
                logAuthContext("Logout Error", e?.message || String(e), "error");
            } finally {
                localStorage.removeItem("accessToken");
                localStorage.removeItem("userData");
                localStorage.removeItem("checkInTime");
                localStorage.removeItem("checkOutTime");
                localStorage.removeItem("organizationcode");
                localStorage.removeItem("lastAdminView");
                set({ user: null, organization: null });
                apiCache.clear();
                logAuthContext("Logout", "Logout completed successfully", "success");
            }
        },

        refreshAccessToken: async () => {
            if (refreshingRef) {
                logAuthContext(
                    "Refresh Token",
                    "Already refreshing, skipping",
                    "warning"
                );
                return null;
            }
            try {
                refreshingRef = true;
                set({ isRefreshing: true });
                logAuthContext("Refresh Token", "Starting token refresh");

                const response = await fetch(`${BASE_URL}/auth2/refresh-token`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                });
                const result = await response.json();
                logAuthContext("Refresh Token Response", result);

                if (!response.ok || !result.success) {
                    throw new Error(result.message || "Token refresh failed");
                }

                setToken(result.accessToken);
                localStorage.setItem("userData", JSON.stringify(result.user));
                set({
                    user: result.user,
                    organization: result.organization || null,
                });
                apiCache.clear();
                logAuthContext(
                    "Refresh Token",
                    "Token refreshed successfully",
                    "success"
                );
                return result.accessToken;
            } catch (error) {
                logAuthContext("Refresh Token Error", error.message, "error");
                await get().logout();
                throw error;
            } finally {
                refreshingRef = false;
                set({ isRefreshing: false });
            }
        },

        checkAutoLogin: async () => {
            logAuthContext("Check Auto Login", "Checking for automatic login");
            try {
                const storedToken = getToken();
                const storedUserData = localStorage.getItem("userData");
                if (storedToken && storedUserData) {
                    try {
                        const parsedUser = JSON.parse(storedUserData);
                        const verifyResult = await get().verifyToken(storedToken);
                        if (verifyResult.success) {
                            set({
                                user: parsedUser,
                                organization: verifyResult.organization || null,
                            });
                            logAuthContext(
                                "Check Auto Login",
                                "Auto login successful via stored token",
                                "success"
                            );
                            return true;
                        }
                    } catch (e) {
                        logAuthContext(
                            "Check Auto Login",
                            "Stored token verification failed, trying refresh",
                            "warning"
                        );
                    }
                }

                try {
                    const newAccessToken = await get().refreshAccessToken();
                    if (newAccessToken) {
                        logAuthContext(
                            "Check Auto Login",
                            "Auto login successful via refresh token",
                            "success"
                        );
                        return true;
                    }
                } catch {
                    logAuthContext(
                        "Check Auto Login",
                        "Auto login failed - no valid refresh token",
                        "warning"
                    );
                }
                return false;
            } catch (error) {
                logAuthContext("Check Auto Login Error", error.message, "error");
                return false;
            }
        },

        initAuth: async () => {
            logAuthContext("Initialize Auth", "Starting auth initialization");
            try {
                set({ loading: true });
                const ok = await get().checkAutoLogin();
                if (!ok) {
                    logAuthContext(
                        "Initialize Auth",
                        "Auto-login failed - manual login required",
                        "warning"
                    );
                }
            } catch (e) {
                logAuthContext("Initialize Auth Error", e?.message || String(e), "error");
                localStorage.removeItem("accessToken");
                localStorage.removeItem("userData");
            } finally {
                set({ loading: false });
            }

            // Periodic refresh (1 hour)
            if (typeof window !== "undefined") {
                if (get().__refreshInterval) {
                    clearInterval(get().__refreshInterval);
                }
                const interval = setInterval(async () => {
                    if (!get().user) return;
                    try {
                        await get().refreshAccessToken();
                        logAuthContext(
                            "Periodic Token Refresh",
                            "Token refreshed successfully",
                            "success"
                        );
                    } catch (e) {
                        logAuthContext(
                            "Periodic Token Refresh Error",
                            e?.message || String(e),
                            "error"
                        );
                    }
                }, 60 * 60 * 1000);
                set({ __refreshInterval: interval });
            }
        },


        setOrganization: (org) => set({ organization: org }),
        
        setAdminView: (view) => {
            logAuthContext("Set Admin View", view);
            localStorage.setItem("lastAdminView", view);
            set({ activeAdminView: view });
        },

        // ---------- utility ----------
        isAuthenticated: () => {
            const result = !!(get().user && getToken());
            logAuthContext("Is Authenticated", result);
            return result;
        },
        isAdmin: () => {
            const result = get().user && get().user.role === "organization";
            logAuthContext("Is Admin", result);
            return result;
        },
        getAuthHeaders,
        getFileHeaders,
        makeAuthenticatedRequest,
        getSystemHealth: async () => {
            logAuthContext("Get System Health", "Checking system health");
            const response = await fetch(`${BASE_URL}/`, {
                method: "GET",
                headers: { "Content-Type": "application/json" },
            });
            const result = await response.json();
            logAuthContext("Get System Health Response", result);
            return result;
        },

        // ---------- AUTH API (auth2) ----------
        registerOrganization: async (data) => {
            logAuthContext("Register Organization", data);
            const response = await fetch(`${BASE_URL}/auth2/organization-register`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
                credentials: "include",
            });
            const result = await response.json();
            logAuthContext("Register Organization Response", result);
            return result;
        },

        registerUser: async (data) =>
            makeAuthenticatedRequest(`${BASE_URL}/auth2/register-user`, {
                method: "POST",
                body: JSON.stringify(data),
            }),

        loginUser: async (data) => {
            logAuthContext("Login User", data);
            const response = await fetch(`${BASE_URL}/auth2/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
                credentials: "include",
            });
            const result = await response.json();
            logAuthContext("Login User Response", result);

            // Persist session on success
            if (response.ok && result?.success && result?.accessToken && result?.user) {
                // Reuse the existing login helper to centralize state writes
                get().login(result.user, result.accessToken, result.organization || null);
            }

            return result;
        },

        viewProfile: async () => {
            logAuthContext("View Profile", "Fetching profile");
            return cachedFetch(`${BASE_URL}/auth2/viewProfile`);
        },

        updateProfile: async (data) =>
            makeAuthenticatedRequest(`${BASE_URL}/auth2/updateProfile`, {
                method: "PUT",
                body: JSON.stringify(data),
            }),

        logoutUser: async () =>
            makeAuthenticatedRequest(`${BASE_URL}/auth2/logout`, { method: "POST" }),

        verifyToken: async (token) => {
            logAuthContext("Verify Token", "Verifying token");
            const response = await fetch(`${BASE_URL}/auth2/verify-token`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token }),
            });
            const result = await response.json();
            logAuthContext("Verify Token Response", result);
            return result;
        },

        // ---------- ATTENDANCE (attend) ----------
        scanAttendance: async (data) =>
            makeAuthenticatedRequest(`${BASE_URL}/attend/scan`, {
                method: "POST",
                body: JSON.stringify(data),
            }),

        getPastAttendance: async () =>
            cachedFetch(`${BASE_URL}/attend/past`),

        getAttendanceDailyReport: async () =>
            cachedFetch(`${BASE_URL}/attend/daily-report`),

        getAttendanceWeeklyReport: async () =>
            cachedFetch(`${BASE_URL}/attend/weekly-report`),

        getAttendanceMonthlyReport: async () =>
            cachedFetch(`${BASE_URL}/attend/monthly-report`),

        downloadAttendanceDaily: async () =>
            makeAuthenticatedRequest(`${BASE_URL}/attend/download-daily`),

        downloadAttendanceWeekly: async () =>
            makeAuthenticatedRequest(`${BASE_URL}/attend/download-weekly`),

        checkWorkingDay: async () =>
            cachedFetch(`${BASE_URL}/attend/check`),

        // ---------- ADMIN (admin) ----------
        getAdminRecords: async (date) =>
            cachedFetch(`${BASE_URL}/admin/records${date ? `?date=${date}` : ""}`),

        getAllUsers: async (forceRefresh = false) =>
            cachedFetch(`${BASE_URL}/admin/allusers`, {}, forceRefresh),

        getAdminDashboard: async () =>
            cachedFetch(`${BASE_URL}/admin/dashboard`),

        getSingleUser: async (userId) =>
            cachedFetch(`${BASE_URL}/admin/singleUser/${userId}`),

        updateUserByAdmin: async (userId, data) => {
            apiCache.clear(); // Clear cache before update
            const result = await makeAuthenticatedRequest(`${BASE_URL}/admin/user/${userId}`, {
                method: "PATCH",
                body: JSON.stringify(data),
            });
            apiCache.clear(); // Clear cache after update
            return result;
        },

        deleteUser: async (userId) => {
            apiCache.clear();
            return get().makeAuthenticatedRequest(`${BASE_URL}/admin/user/${userId}`, {
                method: "DELETE",
            });
        },

        resetUserDevice: async (data) =>
            makeAuthenticatedRequest(`${BASE_URL}/admin/reset-user-device`, {
                method: "POST",
                body: JSON.stringify(data),
            }),

        getDeviceChangeRequests: async () =>
            cachedFetch(`${BASE_URL}/admin/device-change-requests`),

        handleDeviceChangeRequest: async (data) =>
            makeAuthenticatedRequest(
                `${BASE_URL}/admin/handle-device-change-request`,
                { method: "POST", body: JSON.stringify(data) }
            ),

        getAdminQRCodes: async () =>
            cachedFetch(`${BASE_URL}/admin/qrcodes`),

        getQRCodeByType: async (type) =>
            cachedFetch(`${BASE_URL}/admin/qrcode/${type}`),

        getTodaysAttendance: async () =>
            cachedFetch(`${BASE_URL}/admin/todays-attendance`),

        getAdminDailyReport: async () =>
            cachedFetch(`${BASE_URL}/admin/daily-report`),

        getAdminWeeklyReport: async () =>
            cachedFetch(`${BASE_URL}/admin/weekly-report`),

        getAdminMonthlyReport: async () =>
            cachedFetch(`${BASE_URL}/admin/monthly-report`),

        markHolidayAttendance: async (data) =>
            makeAuthenticatedRequest(`${BASE_URL}/admin/mark-holiday-attendance`, {
                method: "POST",
                body: JSON.stringify(data),
            }),

        // ---------- QR CODE (qrcode) ----------
        getActiveQRCode: async () =>
            cachedFetch(`${BASE_URL}/qrcode/active`),

        generateNewQRCode: async () =>
            makeAuthenticatedRequest(`${BASE_URL}/qrcode/generate`, {
                method: "POST",
            }),

        // ---------- BULK (bulk) ----------
        bulkUploadUsers: async (formData) => {
            logAuthContext("Bulk Upload Users", "Uploading users via Excel");
            const token = getToken();
            const response = await fetch(`${BASE_URL}/bulk/upload-users`, {
                method: "POST",
                headers: { Authorization: `Bearer ${token}` },
                body: formData,
                credentials: "include",
            });
            const result = await response.json();
            logAuthContext("Bulk Upload Users Response", result);
            return result;
        },

        downloadUserTemplate: async () =>
            cachedFetch(`${BASE_URL}/bulk/template`),

        // ---------- AI ANALYTICS (api/ai-analytics) ----------
        queryAI: async (data) =>
            makeAuthenticatedRequest(`${BASE_URL}/api/ai-analytics/query`, {
                method: "POST",
                body: JSON.stringify(data),
            }),

        getAICapabilities: async () =>
            cachedFetch(`${BASE_URL}/api/ai-analytics/capabilities`),

        getAIHealth: async () =>
            cachedFetch(`${BASE_URL}/api/ai-analytics/health`),

        // ---------- DOWNLOADS (getdata) ----------
        downloadDailyReport: async (date) => {
            logAuthContext("Download Daily Report", `Downloading daily Excel report for ${date || "today"}`);
            const token = getToken();
            const targetDate = date || new Date().toISOString().split("T")[0];
            const response = await fetch(`${BASE_URL}/getdata/daily?date=${targetDate}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const link = document.createElement("a");
                link.href = url;
                link.setAttribute("download", `daily_report_${targetDate}.xlsx`);
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                logAuthContext(
                    "Download Daily Report",
                    "Download triggered successfully",
                    "success"
                );
            } else {
                throw new Error(`Failed to download daily report: ${response.status}`);
            }
        },

        downloadWeeklyReport: async () => {
            logAuthContext("Download Weekly Report", "Downloading weekly Excel report");
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
                logAuthContext(
                    "Download Weekly Report",
                    "Download triggered successfully",
                    "success"
                );
            } else {
                throw new Error(`Failed to download weekly report: ${response.status}`);
            }
        },

        // ---------- PASSWORD (password) ----------
        requestPasswordReset: async (data) => {
            logAuthContext("Request Password Reset", data);
            const response = await fetch(`${BASE_URL}/password/request-reset`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
            const result = await response.json();
            logAuthContext("Request Password Reset Response", result);
            return result;
        },

        resetPassword: async (data) => {
            logAuthContext("Reset Password", data);
            const response = await fetch(`${BASE_URL}/password/reset-password`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
            const result = await response.json();
            logAuthContext("Reset Password Response", result);
            return result;
        },

        updatePassword: async (data) =>
            makeAuthenticatedRequest(`${BASE_URL}/password/update-password`, {
                method: "POST",
                body: JSON.stringify(data),
            }),
    };
});

// Keep a reference for cleanup
// eslint-disable-next-line no-underscore-dangle
useAuthStore.setState({ __refreshInterval: null });

// ---------- Public hook matching Context API ----------
export const useAuth = () => useAuthStore();

// ---------- Provider wrapper to mirror old usage ----------
export function AuthProvider({ children }) {
    useEffect(() => {
        useAuthStore.getState().initAuth();
        return () => {
            const interval = useAuthStore.getState().__refreshInterval;
            if (interval) clearInterval(interval);
        };
    }, []);
    return children;
}
