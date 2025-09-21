import React, { useEffect, useState, useCallback } from "react";
import { Admin_Navbar } from "./Admin_Navbar";
import EmployeeLayout from "./EmployeeLayout";
import { AttendanceRecordLayout } from "./AttendanceRecordLayout";
import { useAuth } from "../../context/AuthContext";
import QRcodeView from "./QRcodeView";
import Dashbord from "./Dashbord";
import AITestPage from "./AITestPage";
import Reports from "./Reports";
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
      // console.log("Fetched admin records:", data);
    } catch (err) {
      console.error("Error fetching admin records:", err);
      setError("Failed to fetch admin records");
    }
  }, [getAdminRecords]);

  const fetchTodaysAttendance = useCallback(async () => {
    try {
      const todaysdata = await getTodaysAttendance();
      settodaysdata(todaysdata || []);
      // console.log("Fetched admin todays record:", todaysdata);
    } catch (err) {
      console.error("Error fetching today's attendance:", err);
      setError("Failed to fetch today's attendance");
    }
  }, [getTodaysAttendance]);

  const fetchAllUsers = useCallback(async () => {
    try {
      // console.log("AdminHome: Fetching all users...");
      const usersData = await getallusers();
      // console.log("AdminHome: Raw users response:", usersData);

      let processedUsers = [];
      if (Array.isArray(usersData)) {
        processedUsers = usersData;
      } else if (usersData && usersData.data && Array.isArray(usersData.data)) {
        processedUsers = usersData.data;
      } else if (
        usersData &&
        usersData.users &&
        Array.isArray(usersData.users)
      ) {
        processedUsers = usersData.users;
      } else if (
        usersData &&
        usersData.allusers &&
        Array.isArray(usersData.allusers)
      ) {
        processedUsers = usersData.allusers;
      }

      // console.log("AdminHome: Processed users:", processedUsers);
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
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Checking permissions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Admin_Navbar />
      <div className="container mx-auto px-4 py-8">
        {loading ? (
          <div className="flex items-center justify-center min-h-96">
            <div className="text-center">
              <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading data...</p>
            </div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center min-h-96">
            <div className="text-center">
              <div className="text-red-500 text-6xl mb-4">⚠️</div>
              <h2 className="text-2xl font-bold text-red-600 mb-2">Error</h2>
              <p className="text-gray-600 mb-4">{error}</p>
              <button
                onClick={fetchAllData}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
              >
                Try Again
              </button>
            </div>
          </div>
        ) : (
          <>
            {activeAdminView === "home" && (
              <Dashbord
                records={records}
                todaysdata={todaysdata}
                allusers={allusers}
              />
            )}
            {activeAdminView === "employees" && (
              <EmployeeLayout allusers={allusers} />
            )}
            {activeAdminView === "attendance" && (
              <AttendanceRecordLayout records={records} />
            )}
            {activeAdminView === "qr" && <QRcodeView />}
            {activeAdminView === "ai" && <AITestPage />}
            {activeAdminView === "reports" && <Reports />}
          </>
        )}
      </div>
    </div>
  );
};

export default AdminHome;
