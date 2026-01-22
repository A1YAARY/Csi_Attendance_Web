import React, { useEffect, useState, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { Admin_Navbar } from "./Admin_Navbar";
import EmployeeLayout from "./EmployeeLayout";
import AttendanceRecordLayout from "./AttendanceRecordLayout";
import { useAuth } from "../../context/authStore"; // ✅ FIXED IMPORT
import QRcodeView from "./QRcodeView";
import AITestPage from "./AITestPage";
import Reports from "./Reports";
import VoiceDashboard from "../VoiceInterface/VoiceDashboard";
import { useAdminProtection } from "../../hooks/useAdminProtection";
import Dashbord2 from "./Dashbord2";
import EmployeeLayout2 from "./EmployeeLayout2";
import DeviceChangeRequests from "./DeviceChangeRequests";

const AdminHome = () => {
  const {
    activeAdminView,
    setAdminView,
    getAdminRecords,
    getTodaysAttendance,
    user,
    getAdminDashboard,
    loading: authLoading,
  } = useAuth();

  const location = useLocation();

  // Sync state with URL on mount and route change
  useEffect(() => {
    const path = location.pathname;
    if (path.includes("/admin/notifications")) {
      setAdminView("notifications");
    } else if (path.includes("/admin/employees")) {
      setAdminView("employees");
    } else if (path.includes("/admin/records")) {
      setAdminView("records");
    } else if (path.includes("/admin/reports")) {
      setAdminView("reports");
    } else if (path.includes("/admin/qrcodes")) {
      setAdminView("qrcodes");
    } else if (path.includes("/admin/ai")) {
      setAdminView("ai");
    } else if (path.includes("/admin/voice")) {
      setAdminView("voice");
    } else if (path === "/admin/dashboard" || path === "/admin") {
      setAdminView("home");
    }
  }, [location.pathname, setAdminView]);

  // State management
  const [records, setRecords] = useState([]);
  const [emploies, setallemploies] = useState([]);
  const [todaysdata, settodaysdata] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [dashboard, setDashboard] = useState(null);
  const [error, setError] = useState(null);
  // Date filter state lifted from AttendanceRecordLayout
  const [selectedDate, setSelectedDate] = useState(() => {
    return new Date().toISOString().split("T")[0];
  });

  const fetchdashbord = useCallback(async () => {
    try {
      const data = await getAdminDashboard();
      setDashboard(data || {});
      return data;
    } catch (err) {
      console.error("❌ Error fetching admin dashboard:", err);
      setError("Failed to fetch admin dashboard");
      throw err;
    }
  }, [getAdminDashboard]);

  // Memoized data fetching functions
  const fetchAdminRecords = useCallback(async () => {
    try {
      // Pass selectedDate to getAdminRecords
      const data = await getAdminRecords(selectedDate);
      console.log("📊 AdminHome: Raw records response:", data);

      // Handle different response structures
      let processedRecords = [];
      if (Array.isArray(data)) {
        processedRecords = data;
      } else if (data && data.data && Array.isArray(data.data)) {
        processedRecords = data.data;
      } else if (data && data.records && Array.isArray(data.records)) {
        processedRecords = data.records;
      } else if (
        data &&
        data.attendanceRecords &&
        Array.isArray(data.attendanceRecords)
      ) {
        processedRecords = data.attendanceRecords;
      } else if (data && data.result && Array.isArray(data.result)) {
        processedRecords = data.result;
      }

      setRecords(processedRecords || []);
      return processedRecords;
    } catch (err) {
      console.error("❌ Error fetching admin records:", err);
      setError("Failed to fetch admin records");
      setRecords([]);
      throw err;
    }
  }, [getAdminRecords, selectedDate]);

  const fetchTodaysAttendance = useCallback(async () => {
    try {
      const todaysdata = await getTodaysAttendance();

      // Handle different response structures
      let processedTodaysData = [];
      if (Array.isArray(todaysdata)) {
        processedTodaysData = todaysdata;
      } else if (
        todaysdata &&
        todaysdata.data &&
        Array.isArray(todaysdata.data)
      ) {
        processedTodaysData = todaysdata.data;
      } else if (
        todaysdata &&
        todaysdata.attendance &&
        Array.isArray(todaysdata.attendance)
      ) {
        processedTodaysData = todaysdata.attendance;
      }

      settodaysdata(processedTodaysData || []);
      return processedTodaysData;
    } catch (err) {
      console.error("❌ Error fetching today's attendance:", err);
      setError("Failed to fetch today's attendance");
      settodaysdata([]);
      throw err;
    }
  }, [getTodaysAttendance]);

  // Optimized data fetching
  const fetchAllData = useCallback(async () => {
    if (authLoading) return; // Wait for auth to be ready

    setDataLoading(true);
    setError(null);

    try {
      await Promise.allSettled([
        fetchAdminRecords(),
        fetchTodaysAttendance(),
        fetchdashbord(),
      ]);
    } catch (err) {
      console.error("❌ Error in fetchAllData:", err);
      setError("Failed to fetch data");
    } finally {
      setDataLoading(false);
    }
  }, [authLoading, fetchAdminRecords, fetchTodaysAttendance]);

  // Refetch when date changes
  useEffect(() => {
    if (!authLoading && activeAdminView === "records") {
      fetchAdminRecords();
    }
  }, [selectedDate, activeAdminView, authLoading, fetchAdminRecords]);

  // Fetch data when component mounts and auth is ready
  useEffect(() => {
    if (!authLoading) {
      fetchAllData();
    }
  }, [authLoading, fetchAllData]);

  // 🔐 Check if user is admin
  const isAuthorized = user?.role === "organization";

  // Show loading while checking authorization or fetching auth
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto"></div>
          <h2 className="text-xl font-semibold mt-4">
            Checking permissions...
          </h2>
        </div>
      </div>
    );
  }

  // Show unauthorized message if user is not admin
  if (!isAuthorized) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center text-red-600">
          <h2 className="text-xl font-semibold mb-4">Access Denied</h2>
          <p>You do not have permission to access this page.</p>
        </div>
      </div>
    );
  }

  // Show loading while fetching data
  if (dataLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto"></div>
          <h2 className="text-xl font-semibold mt-4">Loading data...</h2>
        </div>
      </div>
    );
  }

  // Show error if there's an error
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center text-red-600">
          <h2 className="text-xl font-semibold mb-4">Error</h2>
          <p>{error}</p>
          <button
            onClick={fetchAllData}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Render based on active view and URL logic
  const renderContent = () => {
    const normalizedPath = path.toLowerCase();
    if (normalizedPath.includes("/admin/notifications"))
      return <DeviceChangeRequests />;
    if (normalizedPath.includes("/admin/employees"))
      return <EmployeeLayout2 emploies={emploies} />;
    if (normalizedPath.includes("/admin/records")) {
      return (
        <AttendanceRecordLayout
          records={records}
          dateFilter={selectedDate}
          setDateFilter={setSelectedDate}
          onRefresh={fetchAdminRecords}
        />
      );
    }
    if (path.includes("/admin/reports")) return <Reports />;
    if (path.includes("/admin/qrcodes")) return <QRcodeView />;
    if (path.includes("/admin/ai")) return <AITestPage />;
    if (path.includes("/admin/voice")) {
      return (
        <VoiceDashboard
          organizationId={user?.organizationId?._id || user?.organizationId}
          userId={user?._id}
        />
      );
    }

    // Default to Dashboard
    return (
      <Dashbord2 dashboard={dashboard} onRefresh={fetchTodaysAttendance} />
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Admin_Navbar />
      <main className="pt-16">{renderContent()}</main>

      {/* DEBUG: Remove before production */}
      <div className="fixed bottom-4 right-4 bg-black text-white p-4 rounded-lg z-[9999] opacity-75 text-xs">
        <p>Path: {location.pathname}</p>
        <p>View: {activeAdminView}</p>
      </div>
    </div>
  );
};

export default AdminHome;
