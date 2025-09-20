import React, { useEffect, useState, useCallback } from "react";
import { Admin_Navbar } from "./Admin_Navbar";
import EmployeeLayout from "./EmployeeLayout";
import { AttendanceRecordLayout } from "./AttendanceRecordLayout";
import { useAuth } from "../../context/AuthContext";
import QRcodeView from "./QRcodeView";
import Dashbord from "./Dashbord";
import AITestPage from "./AITestPage";
import { useAdminProtection } from "../../hooks/useAdminProtection";

const AdminHome = () => {
  const {
    activeAdminView,
    setAdminView,
    getAdminRecords,
    getTodaysAttendance,
    getallusers,
  } = useAuth();

  // State management
  const [records, setRecords] = useState([]);
  const [todaysdata, settodaysdata] = useState([]);
  const [allusers, setallusers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Memoized data fetching functions
  const fetchAdminRecords = useCallback(async () => {
    try {
      const data = await getAdminRecords();
      setRecords(data || []);
      console.log("Fetched admin records:", data);
    } catch (err) {
      console.error("Error fetching admin records:", err);
      setError("Failed to fetch admin records");
    }
  }, [getAdminRecords]);

  const fetchTodaysAttendance = useCallback(async () => {
    try {
      const todaysdata = await getTodaysAttendance();
      settodaysdata(todaysdata || []);
      console.log("Fetched admin todays record:", todaysdata);
    } catch (err) {
      console.error("Error fetching today's attendance:", err);
      setError("Failed to fetch today's attendance");
    }
  }, [getTodaysAttendance]);

  const fetchAllUsers = useCallback(async () => {
    try {
      console.log("AdminHome: Fetching all users...");
      const usersData = await getallusers();
      console.log("AdminHome: Raw users response:", usersData);
      
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
      
      console.log("AdminHome: Processed users:", processedUsers);
      setallusers(processedUsers);
    } catch (err) {
      console.error("Error fetching all users:", err);
      setError("Failed to fetch all users");
    }
  }, [getallusers]);

  // Optimized data fetching - fetch all data concurrently
  const fetchAllData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      await Promise.allSettled([
        fetchAdminRecords(),
        fetchTodaysAttendance(),
        fetchAllUsers(),
      ]);
    } catch (err) {
      console.error("Error in fetchAllData:", err);
      setError("Failed to fetch data");
    } finally {
      setLoading(false);
    }
  }, [fetchAdminRecords, fetchTodaysAttendance, fetchAllUsers]);

  // Single useEffect to fetch all data on component mount
  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // 🔐 Apply role-based protection
  const isAuthorized = useAdminProtection();
  const { user } = useAuth();

  // Show loading while checking authorization
  if (!isAuthorized && user !== null) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
        <div className="text-center max-w-sm mx-auto">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600 text-sm sm:text-base">Checking permissions...</p>
        </div>
      </div>
    );
  }

  // Don't render admin content if not authorized
  if (user && !isAuthorized) {
    return null;
  }

  // Show loading state while fetching data
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Admin_Navbar />
        <div className="flex items-center justify-center h-[calc(100vh-64px)] p-4">
          <div className="text-center max-w-sm mx-auto">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-4 text-gray-600 text-sm sm:text-base">Loading data...</p>
          </div>
        </div>
      </div>
    );
  }

  // Show error state if there's an error
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Admin_Navbar />
        <div className="flex items-center justify-center h-[calc(100vh-64px)] p-4">
          <div className="text-center text-red-600 max-w-md mx-auto">
            <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <p className="text-lg font-semibold mb-2">Error</p>
            <p className="text-sm sm:text-base mb-4">{error}</p>
            <button
              onClick={fetchAllData}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm sm:text-base"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Main render function with proper conditional rendering
  const renderContent = () => {
    switch (activeAdminView) {
      case "home":
        return (
          <Dashbord 
            records={records}
            todaysdata={todaysdata}
            allusers={allusers}
          />
        );
      case "employees":
        return <EmployeeLayout />;
      case "records":
        return <AttendanceRecordLayout records={records} />;
      case "reports":
        return (
          <div className="p-4 sm:p-6 bg-gray-50 min-h-[calc(100vh-64px)]">
            <div className="max-w-7xl mx-auto">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2">📊 Reports</h1>
              <p className="text-gray-600 text-sm sm:text-base">
                Reports functionality coming soon...
              </p>
            </div>
          </div>
        );
      case "qr":
      case "qrcodes":
        return <QRcodeView />;
      case "ai":
      case "ai-test":
        return <AITestPage />;
      default:
        return (
          <Dashbord 
            records={records}
            todaysdata={todaysdata}
            allusers={allusers}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Admin_Navbar />
      <main className="transition-all duration-300">
        {renderContent()}
      </main>
    </div>
  );
};

export default AdminHome;
