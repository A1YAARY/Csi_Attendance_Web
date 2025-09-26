import React, { useEffect, useState } from "react";
import Card from "./Card";
import Previous from "./Previous";
import Navbar from "./Navbar";
import { LoginPage } from "./LoginPage";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const Dashboard = () => {
  const { getPastAttendance } = useAuth();
  const navigate = useNavigate();
  const [pastAttendance, setPastAttendance] = useState([]);
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [loading, setLoading] = useState(true);

  // Dashboad.jsx — replace only the data handling inside fetchPastAttendance, leave JSX/styles untouched
  useEffect(() => {
    const fetchPastAttendance = async () => {
      try {
        setLoading(true);
        const data = await getPastAttendance();
        if (data?.attendance && Array.isArray(data.attendance)) {
          // Normalize server items to the shape the components expect
          const normalized = data.attendance.map((a) => ({
            ...a,
            // alias for convenience (keep original too)
            date: a.createdAt,
            // ensure sessions have plain timestamps
            sessions: (a.sessions || []).map((s) => ({
              checkIn: s?.checkIn || null,
              checkOut: s?.checkOut || null,
              duration: typeof s?.duration === "number" ? s.duration : 0,
            })),
            // totalWorkingTime and status already exist on the document
          }));

          setPastAttendance(normalized);

          // Today record by date
          const today = new Date().toDateString();
          const todayRecord = normalized.find(
            (r) => new Date(r.date).toDateString() === today
          );
          setTodayAttendance(todayRecord || null);
        }
      } catch (error) {
        console.error("Error fetching past attendance:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchPastAttendance();
  }, []);

  const hidden = () => {
    navigate("/ScanQR");
  };

  const hidden1 = () => {
    navigate("/ShowLogOut");
  };

  return (
    <div className="h-[100dvh] bg-white px-4 pb-4">
      <Navbar onProfileClick={hidden1} />

      <div className="mt-4">
        <h1 className="text-2xl font-semibold mb-6">Welcome</h1>

        {/* Card component with today's data */}
        <Card todayAttendance={todayAttendance} loading={loading} />

        <button
          onClick={hidden}
          className="w-full mt-6 bg-[#1D61E7] text-white py-3 rounded-lg flex items-center justify-center gap-2 text-sm font-medium"
        >
          <span className="text-lg">📱</span>
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
                <Previous key={record._id || index} attendanceData={record} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
