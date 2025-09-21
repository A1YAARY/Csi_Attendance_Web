import React, { useEffect, useState } from "react";
import {
  Users,
  FileText,
  BarChart3,
  QrCode,
  Home,
  TrendingUp,
  Clock,
  UserCheck,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";

const Dashbord = ({ records, todaysdata, allusers }) => {
  const { setAdminView } = useAuth();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [stats, setStats] = useState({
    totalEmployees: 0,
    onTime: 0,
    absent: 0,
    lateArrival: 0,
    earlyDepartures: 0,
    activeSessions: 0,
  });

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Calculate dynamic stats based on real data
  useEffect(() => {
    calculateStats();
  }, [records, todaysdata, allusers]);

  const calculateStats = () => {
    // Get all users data
    let allUsersData = [];
    if (Array.isArray(allusers)) {
      allUsersData = allusers;
    } else if (allusers?.allusers && Array.isArray(allusers.allusers)) {
      allUsersData = allusers.allusers;
    } else if (allusers?.data && Array.isArray(allusers.data)) {
      allUsersData = allusers.data;
    }

    // Get today's attendance data
    let todaysAttendanceData = [];
    if (Array.isArray(todaysdata)) {
      todaysAttendanceData = todaysdata;
    } else if (
      todaysdata?.attendanceRecords &&
      Array.isArray(todaysdata.attendanceRecords)
    ) {
      todaysAttendanceData = todaysdata.attendanceRecords;
    } else if (todaysdata?.data && Array.isArray(todaysdata.data)) {
      todaysAttendanceData = todaysdata.data;
    }

    // Get records data
    let recordsData = [];
    if (Array.isArray(records)) {
      recordsData = records;
    } else if (
      records?.attendanceRecords &&
      Array.isArray(records.attendanceRecords)
    ) {
      recordsData = records.attendanceRecords;
    } else if (records?.data && Array.isArray(records.data)) {
      recordsData = records.data;
    }

    const totalEmployees = allUsersData.length;

    // Get today's date in YYYY-MM-DD format
    const today = new Date().toISOString().split("T")[0];
    const currentTime = new Date();
    const currentHour = currentTime.getHours();
    const currentMinute = currentTime.getMinutes();
    const currentTimeInMinutes = currentHour * 60 + currentMinute;

    // Filter today's attendance records
    const todaysRecords = [...todaysAttendanceData, ...recordsData].filter(
      (record) => {
        if (!record.date) return false;
        const recordDate = new Date(record.date).toISOString().split("T")[0];
        return recordDate === today;
      }
    );

    let onTimeCount = 0;
    let lateArrivalCount = 0;
    let activeSessionsCount = 0;
    let earlyDeparturesCount = 0;
    let absentCount = 0;

    // Create a map of users with their attendance status
    const userAttendanceMap = new Map();

    // Process today's attendance records
    todaysRecords.forEach((record) => {
      const userId = record.userId || record._id || record.organizationId;
      if (!userId) return;

      if (!userAttendanceMap.has(userId)) {
        userAttendanceMap.set(userId, {
          checkIn: null,
          checkOut: null,
          workingHours: null,
          status: record.status,
        });
      }

      const userRecord = userAttendanceMap.get(userId);

      if (record.checkInTime) {
        userRecord.checkIn = record.checkInTime;
      }
      if (record.checkOutTime) {
        userRecord.checkOut = record.checkOutTime;
      }
      if (record.workingHours) {
        userRecord.workingHours = record.workingHours;
      }
    });

    // Process each user to determine their status
    allUsersData.forEach((user) => {
      const userId = user._id || user.id;
      const userWorkingHours = user.workingHours || {
        start: "09:00",
        end: "17:00",
      };

      const startTime = userWorkingHours.start || "09:00";
      const endTime = userWorkingHours.end || "17:00";

      const [startHour, startMin] = startTime.split(":").map(Number);
      const [endHour, endMin] = endTime.split(":").map(Number);

      const workStartInMinutes = startHour * 60 + startMin;
      const workEndInMinutes = endHour * 60 + endMin;

      const userAttendance = userAttendanceMap.get(userId);

      if (userAttendance) {
        const checkInTime = userAttendance.checkIn;
        const checkOutTime = userAttendance.checkOut;

        if (checkInTime) {
          let checkInMinutes = 0;
          try {
            if (checkInTime.includes(":")) {
              const [hour, min] = checkInTime
                .split(":")
                .map((s) => parseInt(s.replace(/[^0-9]/g, "")));
              checkInMinutes = hour * 60 + (min || 0);

              if (checkInTime.toLowerCase().includes("pm") && hour !== 12) {
                checkInMinutes += 12 * 60;
              } else if (
                checkInTime.toLowerCase().includes("am") &&
                hour === 12
              ) {
                checkInMinutes -= 12 * 60;
              }
            }
          } catch (error) {
            console.error("Error parsing check-in time:", checkInTime);
          }

          if (checkInMinutes <= workStartInMinutes + 15) {
            onTimeCount++;
          } else {
            lateArrivalCount++;
          }

          if (!checkOutTime) {
            activeSessionsCount++;
          } else {
            try {
              let checkOutMinutes = 0;
              if (checkOutTime.includes(":")) {
                const [hour, min] = checkOutTime
                  .split(":")
                  .map((s) => parseInt(s.replace(/[^0-9]/g, "")));
                checkOutMinutes = hour * 60 + (min || 0);

                if (checkOutTime.toLowerCase().includes("pm") && hour !== 12) {
                  checkOutMinutes += 12 * 60;
                } else if (
                  checkOutTime.toLowerCase().includes("am") &&
                  hour === 12
                ) {
                  checkOutMinutes -= 12 * 60;
                }
              }

              if (checkOutMinutes < workEndInMinutes - 30) {
                earlyDeparturesCount++;
              }
            } catch (error) {
              console.error("Error parsing check-out time:", checkOutTime);
            }
          }
        }
      } else {
        if (currentTimeInMinutes > workStartInMinutes + 60) {
          absentCount++;
        }
      }
    });

    setStats({
      totalEmployees,
      onTime: onTimeCount,
      absent: absentCount,
      lateArrival: lateArrivalCount,
      earlyDepartures: earlyDeparturesCount,
      activeSessions: activeSessionsCount,
    });
  };

  // Format current time for display
  const formatCurrentTime = (date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
      timeZone: "Asia/Kolkata",
    });
  };

  // Format current date for display
  const formatCurrentDate = (date) => {
    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      timeZone: "Asia/Kolkata",
    });
  };

  return (
    <div className="min-h-screen overflow-hidden [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
      <div className="p-3 sm:p-4 lg:p-6 w-full">
        {/* Main Dashboard Content */}
        <div className="flex flex-col xl:flex-row gap-4 lg:gap-5 xl:gap-6 justify-center">
          {/* System Status Card */}
          <div className="border border-gray-200 rounded-lg px-4 sm:px-6 py-6 sm:py-8 lg:py-10 bg-white w-full xl:w-96 2xl:w-[431px] order-2 xl:order-1">
            <div className="flex flex-col justify-between h-full space-y-6 lg:space-y-8">
              <div className="flex flex-col space-y-2">
                <div className="text-sm sm:text-base font-medium text-black">
                  System Status:
                </div>
                <div className="flex items-center gap-3">
                  <div className="font-medium flex items-center gap-3 lg:gap-4">
                    <div className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl leading-none">
                      Active
                    </div>
                    <div className="h-4 w-4 sm:h-5 sm:w-5 bg-green-500 rounded-full"></div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col space-y-1">
                <div className="text-lg sm:text-xl lg:text-2xl xl:text-3xl font-medium text-black">
                  {formatCurrentTime(currentTime)}
                </div>
                <div className="text-sm sm:text-base font-medium text-gray-500">
                  {formatCurrentDate(currentTime)}
                </div>
              </div>

              <div className="flex flex-col space-y-1">
                <div className="text-lg sm:text-xl lg:text-2xl font-medium">
                  Users:
                </div>
                <div className="text-sm sm:text-base font-medium text-black">
                  {stats.activeSessions} Sessions Active
                </div>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="flex flex-col gap-4 lg:gap-5 order-1 xl:order-2 flex-1">
            {/* First Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4 lg:gap-5">
              {/* Total Employees */}
              <div className="border border-gray-200 bg-white rounded-lg px-4 sm:px-5 lg:px-6 py-5 sm:py-6 lg:py-7">
                <div className="flex justify-between w-full">
                  <div className="flex flex-col flex-1">
                    <div className="justify-between h-full flex flex-col space-y-3 sm:space-y-4">
                      <p className="text-xl sm:text-2xl lg:text-3xl font-bold">
                        {stats.totalEmployees}
                      </p>
                      <p className="text-sm sm:text-base font-semibold text-gray-800">
                        Total Employees
                      </p>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <img
                        className="h-5 w-5 sm:h-6 sm:w-6"
                        src="/add_green.svg"
                        alt=""
                      />
                      <p className="text-xs sm:text-sm text-green-600 font-medium">
                        {stats.totalEmployees > 0 ? "Active" : "No"} Employees
                      </p>
                    </div>
                  </div>
                  <img
                    className="h-8 w-8 sm:h-10 sm:w-10 flex-shrink-0"
                    src="/Total Employees Icon.svg"
                    alt=""
                  />
                </div>
              </div>

              {/* On Time */}
              <div className="border border-gray-200 bg-white rounded-lg px-4 sm:px-5 lg:px-6 py-5 sm:py-6 lg:py-7">
                <div className="flex justify-between w-full">
                  <div className="flex flex-col flex-1">
                    <div className="justify-between h-full flex flex-col space-y-3 sm:space-y-4">
                      <p className="text-xl sm:text-2xl lg:text-3xl font-bold">
                        {stats.onTime}
                      </p>
                      <p className="text-sm sm:text-base font-semibold text-gray-800">
                        On Time
                      </p>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <img
                        className="h-5 w-5 sm:h-6 sm:w-6"
                        src="/grow_green.svg"
                        alt=""
                      />
                      <p className="text-xs sm:text-sm text-green-600 font-medium">
                        {stats.onTime > 0
                          ? `${Math.round(
                              (stats.onTime / stats.totalEmployees) * 100
                            )}%`
                          : "0%"}{" "}
                        on time today
                      </p>
                    </div>
                  </div>
                  <img
                    className="h-8 w-8 sm:h-10 sm:w-10 flex-shrink-0"
                    src="/Currently Ongoing Icon.svg"
                    alt=""
                  />
                </div>
              </div>

              {/* Absent */}
              <div className="border border-gray-200 bg-white rounded-lg px-4 sm:px-5 lg:px-6 py-5 sm:py-6 lg:py-7 sm:col-span-2 xl:col-span-1">
                <div className="flex justify-between w-full">
                  <div className="flex flex-col flex-1">
                    <div className="justify-between h-full flex flex-col space-y-3 sm:space-y-4">
                      <p className="text-xl sm:text-2xl lg:text-3xl font-bold">
                        {stats.absent}
                      </p>
                      <p className="text-sm sm:text-base font-semibold text-gray-800">
                        Absent
                      </p>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <img
                        className="h-5 w-5 sm:h-6 sm:w-6"
                        src={
                          stats.absent > 0 ? "/fall_red.svg" : "/grow_green.svg"
                        }
                        alt=""
                      />
                      <p
                        className={`text-xs sm:text-sm font-medium ${
                          stats.absent > 0 ? "text-red-600" : "text-green-600"
                        }`}
                      >
                        {stats.absent > 0
                          ? `${stats.absent} absent today`
                          : "All present today"}
                      </p>
                    </div>
                  </div>
                  <img
                    className="h-8 w-8 sm:h-10 sm:w-10 flex-shrink-0"
                    src="/Absent Icon.svg"
                    alt=""
                  />
                </div>
              </div>
            </div>

            {/* Second Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4 lg:gap-5">
              {/* Late Arrival */}
              <div className="border border-gray-200 bg-white rounded-lg px-4 sm:px-5 lg:px-6 py-5 sm:py-6 lg:py-7">
                <div className="flex justify-between w-full">
                  <div className="flex flex-col flex-1">
                    <div className="justify-between h-full flex flex-col space-y-3 sm:space-y-4">
                      <p className="text-xl sm:text-2xl lg:text-3xl font-bold">
                        {stats.lateArrival}
                      </p>
                      <p className="text-sm sm:text-base font-semibold text-gray-800">
                        Late Arrival
                      </p>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <img
                        className="h-5 w-5 sm:h-6 sm:w-6"
                        src={
                          stats.lateArrival === 0
                            ? "/grow_green.svg"
                            : "/fall_red.svg"
                        }
                        alt=""
                      />
                      <p
                        className={`text-xs sm:text-sm font-medium ${
                          stats.lateArrival === 0
                            ? "text-green-600"
                            : "text-red-600"
                        }`}
                      >
                        {stats.lateArrival === 0
                          ? "No late arrivals"
                          : `${stats.lateArrival} late today`}
                      </p>
                    </div>
                  </div>
                  <img
                    className="h-8 w-8 sm:h-10 sm:w-10 flex-shrink-0"
                    src="/Late Arrivals Icon.svg"
                    alt=""
                  />
                </div>
              </div>

              {/* Early Departures */}
              <div className="border border-gray-200 bg-white rounded-lg px-4 sm:px-5 lg:px-6 py-5 sm:py-6 lg:py-7">
                <div className="flex justify-between w-full">
                  <div className="flex flex-col flex-1">
                    <div className="justify-between h-full flex flex-col space-y-3 sm:space-y-4">
                      <p className="text-xl sm:text-2xl lg:text-3xl font-bold">
                        {stats.earlyDepartures}
                      </p>
                      <p className="text-sm sm:text-base font-semibold text-gray-800">
                        Early Departures
                      </p>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <img
                        className="h-5 w-5 sm:h-6 sm:w-6"
                        src={
                          stats.earlyDepartures === 0
                            ? "/grow_green.svg"
                            : "/fall_red.svg"
                        }
                        alt=""
                      />
                      <p
                        className={`text-xs sm:text-sm font-medium ${
                          stats.earlyDepartures === 0
                            ? "text-green-600"
                            : "text-red-600"
                        }`}
                      >
                        {stats.earlyDepartures === 0
                          ? "No early departures"
                          : `${stats.earlyDepartures} left early`}
                      </p>
                    </div>
                  </div>
                  <img
                    className="h-8 w-8 sm:h-10 sm:w-10 flex-shrink-0"
                    src="/Early Departure Icon.svg"
                    alt=""
                  />
                </div>
              </div>

              {/* Time Off */}
              <div className="border border-gray-200 bg-white rounded-lg px-4 sm:px-5 lg:px-6 py-5 sm:py-6 lg:py-7 sm:col-span-2 xl:col-span-1">
                <div className="flex justify-between w-full">
                  <div className="flex flex-col flex-1">
                    <div className="justify-between h-full flex flex-col space-y-3 sm:space-y-4">
                      <p className="text-xl sm:text-2xl lg:text-3xl font-bold">
                        24
                      </p>
                      <p className="text-sm sm:text-base font-semibold text-gray-800">
                        Time Off
                      </p>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <img
                        className="h-5 w-5 sm:h-6 sm:w-6"
                        src="/grow_blue.svg"
                        alt=""
                      />
                      <p className="text-xs sm:text-sm text-blue-600 font-medium">
                        2 less than yesterday
                      </p>
                    </div>
                  </div>
                  <img
                    className="h-8 w-8 sm:h-10 sm:w-10 flex-shrink-0"
                    src="/Time off icon.svg"
                    alt=""
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions Section */}
        <div className="bg-white p-4 sm:p-6 rounded-lg shadow mt-4 sm:mt-6">
          <h2 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">
            Quick Actions
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
            <button
              onClick={() => setAdminView("qrcodes")}
              className="p-4 sm:p-6 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 transition-colors touch-manipulation"
            >
              <QrCode className="h-6 w-6 sm:h-8 sm:w-8 mx-auto mb-2 text-gray-400" />
              <p className="text-xs sm:text-sm text-center">
                Generate QR codes for attendance tracking and access control
              </p>
            </button>
            <button
              onClick={() => setAdminView("employees")}
              className="p-4 sm:p-6 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 transition-colors touch-manipulation"
            >
              <Users className="h-6 w-6 sm:h-8 sm:w-8 mx-auto mb-2 text-gray-400" />
              <p className="text-xs sm:text-sm text-center">
                Manage employee information and profiles
              </p>
            </button>
            <button
              onClick={() => setAdminView("reports")}
              className="p-4 sm:p-6 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 transition-colors md:col-span-1"
            >
              <FileText className="h-6 w-6 sm:h-8 sm:w-8 mx-auto mb-2 text-gray-400" />
              <p className="text-xs sm:text-sm text-center">
                View detailed attendance reports and analytics
              </p>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashbord;
