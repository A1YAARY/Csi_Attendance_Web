import React, { useEffect, useState } from "react";
import CountUp from "../../reactbitscomponents/CountUp";
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
import { useAuthStore } from "../../context/authStore";
const Dashbord2 = ({ dashboard }) => {
  // Safe date parser (handles ISO, timestamp, string)
  const parseDateSafe = (value) => {
    if (!value) return null;

    const date = new Date(value);
    return isNaN(date.getTime()) ? null : date;
  };

  // Format time (IST)
  const formatisTimestamp = (value) => {
    const date = parseDateSafe(value);
    if (!date) return "--:--";

    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
      timeZone: "Asia/Kolkata",
    });
  };

  // Format date (IST)
  const formatDateIST = (value) => {
    const date = parseDateSafe(value);
    if (!date) return "--/--/----";

    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      timeZone: "Asia/Kolkata",
    });
  };

  const [stats, setstats] = useState(dashboard.stats || {});
  const [lastactivaty, setLastactivaty] = useState(
    dashboard.latestActivities || []
  );
  const { setAdminView } = useAuthStore();
  const [currentTime, setCurrentTime] = useState(new Date());
  useEffect(() => {
    console.log(dashboard);
  }, [dashboard]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);
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
                  {stats.totalCheckIns - stats.totalCheckOuts} Sessions Active
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
                      <p className="text-xl sm:text-2xl lg:text-3xl font-bold"></p>
                      <CountUp
                        from={0}
                        to={stats.totalEmployees}
                        separator=","
                        direction="up"
                        duration={0.4}
                        className="count-up-text text-xl sm:text-2xl lg:text-3xl font-bold"
                      />{" "}
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
                        <CountUp
                          from={0}
                          to={stats.present}
                          separator=","
                          direction="up"
                          duration={0.4}
                          className="count-up-text text-xl sm:text-2xl lg:text-3xl font-bold"
                        />
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
                        <CountUp
                          from={0}
                          to={stats.absent}
                          separator=","
                          direction="up"
                          duration={0.6}
                          className="count-up-text text-xl sm:text-2xl lg:text-3xl font-bold"
                        />
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
                        <CountUp
                          from={0}
                          to={stats.lateEntries}
                          separator=","
                          direction="up"
                          duration={0.4}
                          className="count-up-text text-xl sm:text-2xl lg:text-3xl font-bold"
                        />
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
                        {stats.halfDays}
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
                        {stats.halfDays}
                      </p>
                      <p className="text-sm sm:text-base font-semibold text-gray-800">
                        Half days
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
        {/* Latest Activity Section */}
        {/* Latest Activity Section - Enhanced Light Theme */}
        <div className="bg-white min-h-[30rem] w-full flex flex-col items-center justify-start rounded-2xl mt-4 sm:mt-6 p-6 sm:p-8 gap-6 border border-gray-200 shadow-md">
          {/* Header */}
          <div className="w-full flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-r from-blue-100 to-purple-100 rounded-lg">
                <Clock className="h-5 w-5 text-blue-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-800">
                Latest Activities
              </h2>
            </div>
            <div className="flex items-center gap-2 bg-gray-100 px-3 py-1 rounded-full">
              <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-gray-600 font-medium">
                Real-time
              </span>
            </div>
          </div>

          {/* Activities List */}
          <div className="w-full flex-1 overflow-hidden">
            <div className="h-full overflow-y-auto pr-2 [scrollbar-width:thin] [scrollbar-color:#a8a29e_transparent]">
              {lastactivaty.length > 0 ? (
                <div className="space-y-4">
                  {lastactivaty.map((activity, index) => (
                    <div
                      key={index}
                      className="bg-white rounded-xl p-4 border-l-4 border-blue-400 hover:border-purple-500 transition-all duration-300 hover:shadow-lg transform hover:scale-[1.01] border border-gray-100"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          {/* Activity Icon */}
                          <div
                            className={`p-2 rounded-full ${
                              activity.type === "check-in"
                                ? "bg-green-100"
                                : "bg-red-100"
                            }`}
                          >
                            {activity.type === "check-in" ? (
                              <UserCheck className="h-5 w-5 text-green-600" />
                            ) : (
                              <TrendingUp className="h-5 w-5 text-red-600" />
                            )}
                          </div>

                          {/* User Info */}
                          <div className="flex flex-col">
                            <span className="text-gray-800 font-semibold text-sm">
                              {activity.userName}
                            </span>
                            <span className="text-gray-500 text-xs">
                              {activity.userEmail}
                            </span>
                          </div>
                        </div>

                        {/* Activity Details */}
                        <div className="text-right">
                          <div
                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
                              activity.type === "check-in"
                                ? "bg-green-100 text-green-700"
                                : "bg-red-100 text-red-700"
                            }`}
                          >
                            <div
                              className={`h-2 w-2 rounded-full ${
                                activity.type === "check-in"
                                  ? "bg-green-500"
                                  : "bg-red-500"
                              }`}
                            ></div>
                            {activity.type === "check-in"
                              ? "Check In"
                              : "Check Out"}
                          </div>
                          <div className="text-gray-600 text-sm mt-1 font-medium">
                            {/* Using the pre-formatted isTimestamp field from your data */}
                            {/* {activity.isTimestamp
                              ? new Date(activity.isTimestamp).toLocaleTimeString(
                                  "en-US",
                                  {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                    hour12: true,
                                  }
                                )
                              : new Date(activity.time).toLocaleTimeString(
                                  "en-US",
                                  {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                    hour12: true,
                                  }
                                )} */}
                                {formatisTimestamp(activity.isTimestamp || activity.time)}

                          </div>
                        </div>
                      </div>

                      {/* Verification Badge */}
                      <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-200">
                        <div className="flex items-center gap-2">
                          <div
                            className={`h-2 w-2 rounded-full ${
                              activity.verified
                                ? "bg-green-500"
                                : "bg-yellow-500"
                            }`}
                          ></div>
                          <span className="text-xs text-gray-500 font-medium">
                            {activity.verified ? "Verified" : "Pending"}
                          </span>
                        </div>
                        <span className="text-xs text-gray-500">
                          {/* Using the pre-formatted isTimestamp field for the date */}
                          {/* {activity.isTimestamp
                            ? new Date(activity.isTimestamp).toLocaleDateString(
                                "en-IN"
                              )
                            : new Date(activity.time).toLocaleDateString(
                                "en-IN"
                              )} */}
                              {formatDateIST(activity.isTimestamp || activity.time)}

                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                /* Empty State */
                <div className="h-full flex flex-col items-center justify-center text-gray-500">
                  <div className="p-4 bg-gray-100 rounded-full mb-4">
                    <Clock className="h-8 w-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-600 mb-1">
                    No activities yet
                  </h3>
                  <p className="text-sm text-center">
                    Recent check-ins and check-outs will appear here.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Footer Stats */}
          <div className="w-full grid grid-cols-3 gap-4 pt-4 border-t border-gray-200">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-800">
                {lastactivaty.filter((a) => a.type === "check-in").length}
              </div>
              <div className="text-xs text-gray-500 font-medium">
                Today's Check-ins
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-800">
                {lastactivaty.filter((a) => a.type === "check-out").length}
              </div>
              <div className="text-xs text-gray-500 font-medium">
                Today's Check-outs
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-800">
                {lastactivaty.length}
              </div>
              <div className="text-xs text-gray-500 font-medium">
                Total Activities
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashbord2;
