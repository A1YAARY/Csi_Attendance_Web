import React, { useEffect, useState, useCallback } from "react";
import { Admin_Navbar } from "./Admin_Navbar";
import EmployeeLayout from "./EmployeeLayout";
import { AttendanceRecordLayout } from "./AttendanceRecordLayout";
import { useAuth } from "../../context/authStore"; // ✅ FIXED IMPORT
import QRcodeView from "./QRcodeView";
import AITestPage from "./AITestPage";
import Reports from "./Reports";
import VoiceDashboard from "../VoiceInterface/VoiceDashboard";
import { useAdminProtection } from "../../hooks/useAdminProtection";
import Dashbord2 from "./Dashbord2";
import EmployeeLayout2 from "./EmployeeLayout2";

const AdminHome = () => {
  const {
    activeAdminView,
    setAdminView,
    getAdminRecords,
    getTodaysAttendance,
    getAllUsers, // ✅ CORRECTED METHOD NAME (was getallusers)
    user,
    getAdminDashboard,
    loading: authLoading
  } = useAuth();

  // State management
  const [records, setRecords] = useState([]);
  const [emploies, setallemploies] = useState([]);
  const [todaysdata, settodaysdata] = useState([]);
  const [allusers, setallusers] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [dashboard, setDashboard] = useState(null);
  const [error, setError] = useState(null);

  const fetchdashbord = useCallback(async () => {
    try {
      const data = await getAdminDashboard();
      setDashboard(data || {});
      return data;
    } catch (err) {
      console.error("❌ Error fetching admin dashboard:", err)
      setError("Failed to fetch admin dashboard")
      throw err
    }
  }, [getAdminDashboard]);


  // Memoized data fetching functions
  const fetchAdminRecords = useCallback(async () => {
    try {
      const data = await getAdminRecords();
      // console.log("📊 AdminHome: Raw records response:", data);

      // Handle different response structures
      let processedRecords = [];
      if (Array.isArray(data)) {
        processedRecords = data;
      } else if (data && data.data && Array.isArray(data.data)) {
        processedRecords = data.data;
      } else if (data && data.records && Array.isArray(data.records)) {
        processedRecords = data.records;
      } else if (data && data.attendanceRecords && Array.isArray(data.attendanceRecords)) {
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
  }, [getAdminRecords]);

  const fetchTodaysAttendance = useCallback(async () => {
    try {
      const todaysdata = await getTodaysAttendance();

      // Handle different response structures
      let processedTodaysData = [];
      if (Array.isArray(todaysdata)) {
        processedTodaysData = todaysdata;
      } else if (todaysdata && todaysdata.data && Array.isArray(todaysdata.data)) {
        processedTodaysData = todaysdata.data;
      } else if (todaysdata && todaysdata.attendance && Array.isArray(todaysdata.attendance)) {
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

  const fetchAllUsers = useCallback(async () => {
    try {
      const usersData = await getAllUsers(); // ✅ CORRECTED METHOD CALL
      setallemploies(usersData || []);
      let processedUsers = [];
      if (Array.isArray(usersData)) {
        processedUsers = usersData;
      } else if (usersData && usersData.data && Array.isArray(usersData.data)) {
        processedUsers = usersData.data;
      } else if (usersData && usersData.users && Array.isArray(usersData.users)) {
        processedUsers = usersData.users;
      } else if (usersData && usersData.allusers && Array.isArray(usersData.allusers)) {
        processedUsers = usersData.allusers;
      }

      setallusers(processedUsers || []);
      return processedUsers;
    } catch (err) {
      console.error("❌ Error fetching all users:", err);
      setError("Failed to fetch all users");
      setallusers([]);
      throw err;
    }
  }, [getAllUsers]); // ✅ CORRECTED DEPENDENCY

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
        fetchAllUsers(),
      ]);
    } catch (err) {
      console.error("❌ Error in fetchAllData:", err);
      setError("Failed to fetch data");
    } finally {
      setDataLoading(false);
    }
  }, [authLoading, fetchAdminRecords, fetchTodaysAttendance, fetchAllUsers]);

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
          <h2 className="text-xl font-semibold mt-4">Checking permissions...</h2>
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

  // Render based on active view
  const renderContent = () => {
    console.log("🎯 Rendering content for view:", activeAdminView);

    switch (activeAdminView) {
      case "home":
      default:
        return (
          <Dashbord2
            dashboard={dashboard}
          />
        );
      case "employees":
        return <EmployeeLayout2 emploies={emploies} />;
      case "records":
        return <AttendanceRecordLayout records={records} />;
      case "reports":
        return <Reports />;
      case "qr":
      case "qrcodes":
        return <QRcodeView />;
      case "ai":
      case "ai-test":
        return <AITestPage />;
      case "voice":
        return (
          <VoiceDashboard 
            organizationId={user?.organizationId?._id || user?.organizationId}
            userId={user?._id}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Admin_Navbar />
      <main className="pt-16">
        {renderContent()}
      </main>
    </div>
  );
};

export default AdminHome;