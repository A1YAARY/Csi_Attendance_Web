import React, { useEffect, useState } from "react";
import { Admin_Navbar } from "./Admin_Navbar";
import EmployeeLayout from "./EmployeeLayout";
import { AttendanceRecordLayout } from "./AttendanceRecordLayout";
import { useAuth } from "../../context/AuthContext";
import QRcodeView from "./QRcodeView";
import Dashbord from "./Dashbord";
import AITestPage from "./AITestPage"; // If you want to include AI test page
import { useAdminProtection } from "../../hooks/useAdminProtection"; // Import the protection hook
const AdminHome = () => {
  const {
    activeAdminView,
    setAdminView,
    getAdminRecords,
    getTodaysAttendance,
  } = useAuth();
  const [records, setRecords] = useState([]);
  const [todaysdata, settodaysdata] = useState([]);

  useEffect(() => {
    const fetchAdminRecords = async () => {
      const data = await getAdminRecords();
      const todaysdata = await getTodaysAttendance();
      setRecords(data);
      settodaysdata(todaysdata);
      console.log("Fetched admin records:", data);
      console.log("Fetched admin todays record:", todaysdata);
    };
    fetchAdminRecords();
  }, [getAdminRecords, getTodaysAttendance]);

  // 🔐 Apply role-based protection
  const isAuthorized = useAdminProtection();

  // Show loading while checking authorization
  if (!isAuthorized && useAuth().user !== null) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Checking permissions...</p>
        </div>
      </div>
    );
  }

  // Don't render admin content if not authorized
  if (useAuth().user && !isAuthorized) {
    return null; // The hook will handle the redirect
  }

  // Main render function with proper conditional rendering
  const renderContent = () => {
    switch (activeAdminView) {
      case "home":
        return <Dashbord />;
      case "employees":
        return <EmployeeLayout />;
      case "records":
        return <AttendanceRecordLayout />;
      case "reports":
        return (
          <div className="p-6 bg-gray-50 min-h-screen">
            <h1 className="text-2xl font-bold text-gray-800">📊 Reports</h1>
            <p className="text-gray-600 mt-2">
              Reports functionality coming soon...
            </p>
          </div>
        );
      case "qr":
      case "qrcodes":
        return <QRcodeView />;
      case "ai":
      case "ai-test":
        return <AITestPage />; // Include if you want AI testing
      default:
        return <Dashbord />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Admin_Navbar />
      <main className="transition-all duration-300">{renderContent()}</main>
    </div>
  );
};

export default AdminHome;
