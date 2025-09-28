import React, { useEffect, useState } from "react";
import Card from "./Card";
import Previous from "./Previous";
import Navbar from "./Navbar";
import { LoginPage } from "./LoginPage";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/authStore";

const Dashboard = () => {
  const { getPastAttendance } = useAuth();
  const navigate = useNavigate();

  const [pastAttendance, setPastAttendance] = useState([]);
  const [sessions, setsessions] = useState([])
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPastAttendance = async () => {
      try {
        setLoading(true);
        const data = await getPastAttendance();
        setTodayAttendance(data?.attendance || [])

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
  console.log(todayAttendance);

  const hidden = () => navigate("/ScanQR");
  const hidden1 = () => navigate("/ShowLogOut");

  return (
    <div className="h-[100dvh] bg-white px-4 pb-4">
      <Navbar onProfileClick={hidden1} />

      <div className="mt-4">
        <h1 className="text-2xl font-semibold mb-6">Welcome</h1>

        {/* Card component with today's data */}
        {/* <Card todayAttendance={todayAttendance} loading={loading} /> */}

        <button
          onClick={hidden}
          className="w-full mt-6 bg-[#1D61E7] text-white py-3 rounded-lg flex items-center justify-center gap-2 text-sm font-medium"
        >
          <span className="text-lg"><img src="./qr_icon.svg" className="invert h-4" /></span>
          Scan QR
        </button>

        <div className="mt-6">
          <h2 className="text-lg font-semibold mb-4">Previous Attendance</h2>

          {loading ? (
            <div className="text-center text-gray-500 py-8">Loading...</div>
          ) : pastAttendance.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              No previous attendance records found
            </div>
          ) : (
            <div className="space-y-3">
              {pastAttendance.slice(0, 5).map((record, index) => (
                <Previous attendanceData={todayAttendance} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
