// Dashboard.jsx - Main dashboard component with dynamic data integration
// Enhanced for premium UI/UX: Added smooth transitions, responsive design, and subtle animations

import React, { useEffect, useState } from "react";
import Card from "./Card";
import Previous from "./Previous";
import Navbar from "./Navbar"; // Assuming this exists; if not, implement a premium navbar
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/authStore"; // Assuming auth context

const Dashboard = () => {
  const { getPastAttendance, getTodaysAttendance } = useAuth();
  const navigate = useNavigate();
  const [pastAttendance, setPastAttendance] = useState([]);
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [loading, setLoading] = useState(true);

  // Dynamic data from user query - integrated directly for this example
  // In production, this would come from API, but here we use the provided data
 

  useEffect(() => {
    const fetchPastAttendance = async () => {
      try {
        setLoading(true);
        const fetchedData = await getPastAttendance();
        console.log("Fetched past attendance:", fetchedData);
        
        setPastAttendance(fetchedData.data || []);
        setTodayAttendance(null); // Explicitly clear today's attendance
      } catch (e) {
        console.error("Error fetching past attendance:", e);
        setPastAttendance([]);
        setTodayAttendance(null);
      } finally {
        setLoading(false);
      }
    };

    fetchPastAttendance();
  }, [getPastAttendance]);
  const hidden = () => navigate("/ScanQR");
  const hidden1 = () => navigate("/ShowLogOut");

  return (
    <div className="h-[100dvh] bg-gradient-to-br from-gray-50 to-blue-50 px-6 py-4 overflow-auto transition-all duration-300">
      <Navbar onProfileClick={hidden1} />
      <div className="mt-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-8 tracking-tight">Welcome Back!</h1>
        {/* Premium Card with dynamic todayAttendance */}
        <Card todayAttendance={todayAttendance} loading={loading} />
        <button
          onClick={hidden}
          className="w-full mt-8 bg-indigo-600 text-white py-4 rounded-xl flex items-center justify-center gap-3 text-base font-semibold shadow-lg hover:shadow-xl transition-shadow duration-200"
        >
          <span className="text-xl">📷</span> Scan QR
        </button>
        <div className="mt-8">
          <h2 className="text-xl font-semibold text-gray-700 mb-5">Previous Attendance</h2>
          {loading ? (
            <div className="text-center text-gray-500 py-10">Loading...</div>
          ) : pastAttendance.length === 0 ? (
            <div className="text-center text-gray-500 py-10">No previous records found</div>
          ) : (
            <div className="space-y-4">
              {pastAttendance.slice(0, 5).map((record, index) => (
                <Previous key={index} attendanceData={record} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
