import React, { useEffect, useState, useCallback } from "react";
import { Admin_Navbar } from "./Admin_Navbar";
import EmployeeLayout from "./EmployeeLayout";
import { AttendanceRecordLayout } from "./AttendanceRecordLayout";
import { useAuth } from "../../context/AuthContext";
import QRcodeView from "./QRcodeView";
import Dashbord from "./Dashbord";
import AITestPage from "./AITestPage";
import Reports from "./Reports";
import VoiceDashboard from "../VoiceInterface/VoiceDashboard";
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
      console.log("🔍 AdminHome: Fetching admin records...");
      const data = await getAdminRecords();
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
    } catch (err) {
      console.error("❌ Error fetching admin records:", err);
      setError("Failed to fetch admin records");
      setRecords([]); // Ensure it's always an array
    }
  }, [getAdminRecords]);

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
    } catch (err) {
      console.error("❌ Error fetching today's attendance:", err);
      setError("Failed to fetch today's attendance");
      settodaysdata([]);
    }
  }, [getTodaysAttendance]);

  const fetchAllUsers = useCallback(async () => {
    try {
      const usersData = await getallusers();

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

     
      setallusers(processedUsers);
    } catch (err) {
      console.error("❌ Error fetching all users:", err);
      setError("Failed to fetch all users");
      setallusers([]);
    }
  }, [getallusers]);

  // Optimized data fetching - fetch all data concurrently
  const fetchAllData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const results = await Promise.allSettled([
        fetchAdminRecords(),
        fetchTodaysAttendance(),
        fetchAllUsers(),
      ]);

      // Log results for debugging
      results.forEach((result, index) => {
        const names = ["Records", "Today's Attendance", "Users"];
        if (result.status === "rejected") {
          // console.error(`❌ ${names[index]} fetch failed:`, result.reason);
        } else {
          // console.log(`✅ ${names[index]} fetch completed`);
        }
      });
    } catch (err) {
      console.error("❌ Error in fetchAllData:", err);
      setError("Failed to fetch data");
    } finally {
      setLoading(false);
      // console.log("🏁 AdminHome: Data fetch completed");
    }
  }, [fetchAdminRecords, fetchTodaysAttendance, fetchAllUsers]);

  // Single useEffect to fetch all data on component mount
  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // // Debug effect to log state changes
  // useEffect(() => {
  //   console.log("🔄 AdminHome State Update:");
  //   console.log("📊 Records:", records);
  //   console.log("📅 Today's Data:", todaysdata);
  //   console.log("👥 All Users:", allusers);
  //   console.log("🎯 Active View:", activeAdminView);
  // }, [records, todaysdata, allusers, activeAdminView]);

  // 🔐 Apply role-based protection
  const isAuthorized = useAdminProtection();
  const { user } = useAuth();

  // Show loading while checking authorization
  if (!isAuthorized && user !== null) {
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

  // Show loading while fetching data
  if (loading) {
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
          <Dashbord
            records={records}
            todaysdata={todaysdata}
            allusers={allusers}
          />
        );
      case "employees":
        console.log("👥 Rendering EmployeeLayout with users:", allusers);
        return <EmployeeLayout allusers={allusers} />;
      case "records":
        console.log(
          "📊 Rendering AttendanceRecordLayout with records:",
          records
        );
        console.log("📊 Records length:", records.length);
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
        {/* Debug panel - Remove in production */}
       

        {renderContent()}
      </main>
    </div>
  );
};

export default AdminHome;
