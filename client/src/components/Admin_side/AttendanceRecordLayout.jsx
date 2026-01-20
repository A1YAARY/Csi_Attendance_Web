import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../../context/authStore";
import {
  Calendar,
  Download,
  Filter,
  Search,
  Eye,
  Clock,
  MapPin,
  RefreshCw
} from "lucide-react";

const AttendanceRecordsLayout = ({ records, dateFilter, setDateFilter, onRefresh }) => {
  const [filteredRecords, setFilteredRecords] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  // local dateFilter state removed, using props
  const [statusFilter, setStatusFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loading, setLoading] = useState(false);
  const menuRef = useRef(null);

  const toggleDropdown = () => {
    setOpen(!open);
  };

  const { downloadDailyReport, downloadWeeklyReport } = useAuth();

  // Fetch attendance records function
  // const fetchAttendanceRecords = async (isManualRefresh = false) => {
  //   try {
  //     if (isManualRefresh) {
  //       setIsRefreshing(true);
  //     } else {
  //       setLoading(true);
  //     }

  //     const response = await fetch('your-api-endpoint/attendance');
  //     const data = await response.json();

  //     // Handle response structure
  //     let recordsData = [];
  //     if (data && data.success && Array.isArray(data.data)) {
  //       recordsData = data.data;
  //     } else if (Array.isArray(data)) {
  //       recordsData = data;
  //     } else {
  //       console.error('Unexpected response structure:', data);
  //       recordsData = [];
  //     }

  //     setRecords(recordsData);
  //     applyFiltersToRecords(recordsData);
  //   } catch (error) {
  //     console.error('Error fetching attendance records:', error);
  //   } finally {
  //     setIsRefreshing(false);
  //     setLoading(false);
  //   }
  // };

  // Apply filters to records
  const applyFiltersToRecords = (data) => {
    let filtered = data;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(record =>
        record.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.department?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.role?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply date filter - Client side check (optional since server filters too)
    if (dateFilter) {
      filtered = filtered.filter(record => {
        try {
          const recordDate = new Date(record.date || record.createdAt).toISOString().split('T')[0];
          return recordDate === dateFilter;
        } catch {
          return false;
        }
      });
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(record =>
        record.status?.toLowerCase() === statusFilter.toLowerCase()
      );
    }

    setFilteredRecords(filtered);
  };

  // Manual refresh handler
  const handleRefresh = async () => {
    if (onRefresh) {
      setIsRefreshing(true);
      try {
        await onRefresh();
      } catch (error) {
        console.error("Refresh failed:", error);
      } finally {
        setIsRefreshing(false);
      }
    } else {
      // Fallback if no refresh function provided
      applyFiltersToRecords(records);
    }
  };

  // Auto-refresh setup
  // useEffect(() => {
  //   // Initial fetch
  //   fetchAttendanceRecords(false);

  //   // Set up polling
  //   const intervalId = setInterval(() => {
  //     fetchAttendanceRecords(true);
  //   }, POLLING_INTERVAL);

  //   // Cleanup
  //   return () => {
  //     clearInterval(intervalId);
  //   };
  // }, []);

  // Update filters when search/filter values change


  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    let filtered = [...records];

    if (searchTerm.trim() !== "") {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (record) =>
          record.name?.toLowerCase().includes(term) ||
          record.department?.toLowerCase().includes(term) ||
          record.role?.toLowerCase().includes(term)
      );
    }

    if (dateFilter && dateFilter !== "all") {
      filtered = filtered.filter((record) => {
        try {
          const recordDateValue = record.date || record.createdAt;
          if (!recordDateValue) return false;
          const recordDateString = recordDateValue.split("T")[0];
          return recordDateString === dateFilter;
        } catch {
          return false;
        }
      });
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((record) => {
        const status = record.status?.toLowerCase();
        switch (statusFilter) {
          case "present":
            return ["present", "half-day", "full-day"].includes(status);
          case "absent":
            return status === "absent";
          case "late":
            return record.isLate === true;
          case "partial":
            return status === "half-day";
          case "complete":
            return status === "full-day";
          case "incomplete":
            return status === "present"; // Present but not half-day or full-day yet
          default:
            return status === statusFilter;
        }
      });
    }

    setFilteredRecords(filtered);
  }, [records, searchTerm, dateFilter, statusFilter]);



  const formatTime = (time) => {
    if (!time) return "N/A";
    try {
      if (typeof time === "object") {
        if (time.start) return formatTime(time.start);
        if (time.time) return time.time;
      }
      if (typeof time === "string" && (time.includes("AM") || time.includes("PM")))
        return time;
      if (typeof time === "string") {
        const [hoursStr, minutes] = time.split(":");
        let hours = parseInt(hoursStr, 10);
        const ampm = hours >= 12 ? "PM" : "AM";
        hours = hours % 12 || 12;
        return `${hours}:${minutes} ${ampm}`;
      }
    } catch {
      return String(time);
    }
    return String(time);
  };

  const formatDate = (date) => {
    if (!date) return "N/A";
    try {
      const dateObj = new Date(date);
      return dateObj.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return date;
    }
  };

  const formatWorkingHours = (wh) => {
    if (!wh || typeof wh !== "object") return "N/A";
    return `${wh.start || "--"} - ${wh.end || "--"}${wh.timezone ? " (" + wh.timezone + ")" : ""
      }`;
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case "present":
      case "complete":
        return "bg-green-100 text-green-800";
      case "absent":
        return "bg-red-100 text-red-800";
      case "late":
        return "bg-yellow-100 text-yellow-800";
      case "partial":
      case "incomplete":
        return "bg-orange-100 text-orange-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    // <div className="p-4 sm:p-6 bg-gray-50 min-h-[calc(100vh-64px)]">
    //   <div className="max-w-7xl mx-auto">
    //     <h1 className="mb-4 text-2xl sm:text-3xl font-bold text-gray-900">
    //       Attendance Records
    //     </h1>
    //     <p className="mb-6 text-sm sm:text-base text-gray-600">
    //       Track and manage employee attendance
    //     </p>

    //     <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 mb-6">
    //       <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
    //         <div className="flex flex-col sm:flex-row gap-4 flex-1">
    //           <div className="relative flex-1 max-w-md">
    //             <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
    //               <Search className="h-4 w-4 text-gray-400" />
    //             </div>
    //             <input
    //               type="text"
    //               placeholder="Search by name, department, role..."
    //               value={searchTerm}
    //               onChange={(e) => setSearchTerm(e.target.value)}
    //               className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
    //             />
    //           </div>

    //           <div className="relative">
    //             <input
    //               type="date"
    //               value={dateFilter}
    //               onChange={(e) => setDateFilter(e.target.value)}
    //               className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm cursor-pointer"
    //             />
    //           </div>

    //           <div className="relative inline-block text-left" ref={menuRef}>
    //             <select
    //               value={statusFilter}
    //               onChange={(e) => setStatusFilter(e.target.value)}
    //               className="border-0 rounded-lg focus:ring-0 focus:border-none text-sm bg-transparent font-medium text-gray-600 uppercase tracking-wide"
    //             >
    //               <option value="all">All Status</option>
    //               <option value="incomplete">Incomplete</option>
    //               <option value="complete">Complete</option>
    //               <option value="present">Present</option>
    //               <option value="absent">Absent</option>
    //               <option value="late">Late</option>
    //               <option value="partial">Partial</option>
    //             </select>
    //           </div>
    //         </div>

    //         <div className="relative inline-block text-left" ref={menuRef}>
    //           <button
    //             onClick={toggleDropdown}
    //             className="flex items-center px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
    //           >
    //             <Download className="w-4 h-4 mr-2" />
    //             Export
    //           </button>
    //           {open && (
    //             <div className="absolute right-0 mt-2 w-40 bg-white border border-gray-200 rounded shadow-md z-10">
    //               <ul className="py-1">
    //                 <li
    //                   className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer"
    //                   onClick={() => {
    //                     alert("Download Daily Report");
    //                     setOpen(false);
    //                   }}
    //                 >
    //                   Daily
    //                 </li>
    //                 <li
    //                   className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer"
    //                   onClick={() => {
    //                     alert("Download Weekly Report");
    //                     setOpen(false);
    //                   }}
    //                 >
    //                   Weekly
    //                 </li>
    //               </ul>
    //             </div>
    //           )}
    //         </div>
    //       </div>
    //     </div>

    //     <p className="mb-4 text-sm text-gray-600">
    //       Showing {filteredRecords.length} of {records.length} records
    //     </p>

    //     {filteredRecords.length === 0 ? (
    //       <div className="bg-white rounded-lg shadow-sm overflow-hidden p-8 text-center text-gray-600">
    //         No attendance records found. Try adjusting your filters to see
    //         results.
    //       </div>
    //     ) : (
    //       <div className="bg-white rounded-lg shadow-sm overflow-hidden">
    //         <div className="overflow-x-auto">
    //           <table className="min-w-full divide-y divide-gray-200">
    //             <thead className="bg-gray-50 border-b border-gray-200">
    //               <tr>
    //                 <th className="px-6 py-4 text-left text-sm font-medium text-gray-600">
    //                   Name
    //                 </th>
    //                 <th className="px-6 py-4 text-left text-sm font-medium text-gray-600">
    //                   Role
    //                 </th>
    //                 <th className="px-6 py-4 text-left text-sm font-medium text-gray-600">
    //                   Department
    //                 </th>
    //                 <th className="px-6 py-4 text-left text-sm font-medium text-gray-600">
    //                   Date
    //                 </th>
    //                 <th className="px-6 py-4 text-left text-sm font-medium text-gray-600">
    //                   Status
    //                 </th>
    //                 <th className="px-6 py-4 text-left text-sm font-medium text-gray-600">
    //                   Check In
    //                 </th>
    //                 <th className="px-6 py-4 text-left text-sm font-medium text-gray-600">
    //                   Check Out
    //                 </th>
    //                 <th className="px-6 py-4 text-left text-sm font-medium text-gray-600">
    //                   Working Hours
    //                 </th>
    //                 <th className="px-6 py-4 text-left text-sm font-medium text-gray-600">
    //                   Actions
    //                 </th>
    //               </tr>
    //             </thead>
    //             <tbody className="divide-y divide-gray-200">
    //               {filteredRecords.map((record, index) => (
    //                 <tr
    //                   key={record.userId || record.id || index}
    //                   className="hover:bg-gray-50 cursor-pointer"
    //                 >
    //                   <td className="px-6 py-4">
    //                     <div className="flex items-center">
    //                       <img
    //                         src={`https://ui-avatars.com/api/?name=${encodeURIComponent(
    //                           record.name || "User"
    //                         )}&size=40&background=4F46E5&color=fff&rounded=true`}
    //                         alt={record.name || "User"}
    //                         className="h-10 w-10 rounded-full mr-3"
    //                       />
    //                       <div>
    //                         <p className="text-sm font-medium text-gray-900">
    //                           {record.name || "N/A"}
    //                         </p>
    //                         <p className="text-xs text-gray-500">
    //                           {record.email || "N/A"}
    //                         </p>
    //                       </div>
    //                     </div>
    //                   </td>
    //                   <td className="px-6 py-4 text-sm text-gray-900">
    //                     {record.role || "N/A"}
    //                   </td>
    //                   <td className="px-6 py-4 text-sm text-gray-900">
    //                     {record.department || "N/A"}
    //                   </td>
    //                   <td className="px-6 py-4 text-sm text-gray-900">
    //                     {formatDate(record.date || record.createdAt)}
    //                   </td>
    //                   <td className="px-6 py-4">
    //                     <span
    //                       className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(
    //                         record.status
    //                       )}`}
    //                     >
    //                       {record.status || "N/A"}
    //                     </span>
    //                   </td>
    //                   <td className="px-6 py-4 text-sm text-gray-900">
    //                     <div className="flex items-center">
    //                       <Clock className="w-4 h-4 mr-1 text-gray-400" />
    //                       {formatTime(record.firstCheckInIST || record.firstCheckIn)}
    //                     </div>
    //                   </td>
    //                   <td className="px-6 py-4 text-sm text-gray-900">
    //                     <div className="flex items-center">
    //                       <Clock className="w-4 h-4 mr-1 text-gray-400" />
    //                       {formatTime(record.lastCheckOutIST || record.lastCheckOut)}
    //                     </div>
    //                   </td>
    //                   <td className="px-6 py-4 text-sm text-gray-900">
    //                     {formatWorkingHours(record.workingHours)}
    //                   </td>
    //                   <td className="px-6 py-4 text-sm text-blue-600 hover:text-blue-900 font-medium">
    //                     <button>
    //                       <Eye className="w-4 h-4" title="View Details" />
    //                     </button>
    //                   </td>
    //                 </tr>
    //               ))}
    //             </tbody>
    //           </table>
    //         </div>
    //       </div>
    //     )}
    //   </div>
    // </div>
    <div className="p-4 sm:p-6 bg-gray-50 min-h-[calc(100vh-64px)]">
      <div className="max-w-7xl mx-auto">
        {/* Header with Refresh Button */}
        <div className="mb-6 flex justify-between items-start">
          <div>
            <h1 className="mb-2 text-2xl sm:text-3xl font-bold text-gray-900">
              Attendance Records
            </h1>
            <p className="text-sm sm:text-base text-gray-600">
              Track and manage employee attendance
            </p>
          </div>

          {/* Refresh Button + Real-time Badge */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 active:bg-gray-300 text-gray-700 text-sm font-medium rounded-full transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="text-xs">{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
            </button>

            {/* <div className="flex items-center gap-2 bg-gray-100 px-3 py-1 rounded-full">
          <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-sm text-gray-600 font-medium">Real-time</span>
        </div> */}
          </div>
        </div>

        {/* Search and Filter Controls */}
        <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 mb-6">
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-4 flex-1">
              <div className="relative flex-1 max-w-md">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Search by name, department, role..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>

              <div className="relative">
                <input
                  type="date"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm cursor-pointer"
                />
              </div>

              <div className="relative inline-block text-left">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm font-medium text-gray-600"
                >
                  <option value="all">All Status</option>
                  <option value="incomplete">Incomplete</option>
                  <option value="complete">Complete</option>
                  <option value="present">Present</option>
                  <option value="absent">Absent</option>
                  <option value="late">Late</option>
                  <option value="partial">half day</option>
                </select>
              </div>
            </div>

            <div className="relative inline-block text-left" ref={menuRef}>
              <button
                onClick={toggleDropdown}
                className="flex items-center px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
              >
                <Download className="w-4 h-4 mr-2" />
                Export
              </button>
              {open && (
                <div className="absolute right-0 mt-2 w-40 bg-white border border-gray-200 rounded shadow-md z-10">
                  <ul className="py-1">
                    <li
                      className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer"
                      onClick={async () => {
                        try {
                          await downloadDailyReport(dateFilter);
                          setOpen(false);
                        } catch (error) {
                          alert("Failed to download daily report");
                        }
                      }}
                    >
                      Daily
                    </li>
                    <li
                      className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer"
                      onClick={async () => {
                        try {
                          await downloadWeeklyReport();
                          setOpen(false);
                        } catch (error) {
                          alert("Failed to download weekly report");
                        }
                      }}
                    >
                      Weekly
                    </li>
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>

        <p className="mb-4 text-sm text-gray-600">
          Showing {filteredRecords.length} of {records.length} records
        </p>

        {loading ? (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden p-8 text-center text-gray-600">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-500" />
            <p>Loading attendance records...</p>
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden p-8 text-center text-gray-600">
            No attendance records found. Try adjusting your filters to see results.
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-600">
                      Name
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-600">
                      Role
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-600">
                      Department
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-600">
                      Date
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-600">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-600">
                      Check In
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-600">
                      Check Out
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-600">
                      Working Hours
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-600">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredRecords.map((record, index) => (
                    <tr
                      key={record.userId || record.id || index}
                      className="hover:bg-gray-50 cursor-pointer"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <img
                            src={`https://ui-avatars.com/api/?name=${encodeURIComponent(
                              record.name || "User"
                            )}&size=40&background=4F46E5&color=fff&rounded=true`}
                            alt={record.name || "User"}
                            className="h-10 w-10 rounded-full mr-3"
                          />
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {record.name || "N/A"}
                            </p>
                            <p className="text-xs text-gray-500">
                              {record.email || "N/A"}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {record.role || "N/A"}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {record.department || "N/A"}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {formatDate(record.date || record.createdAt)}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                            record.status
                          )}`}
                        >
                          {record.status || "N/A"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        <div className="flex items-center">
                          <Clock className="w-4 h-4 mr-1 text-gray-400" />
                          {formatTime(record.firstCheckInIST || record.firstCheckIn)}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        <div className="flex items-center">
                          <Clock className="w-4 h-4 mr-1 text-gray-400" />
                          {formatTime(record.lastCheckOutIST || record.lastCheckOut)}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {formatWorkingHours(record.workingHours)}
                      </td>
                      <td className="px-6 py-4 text-sm text-blue-600 hover:text-blue-900 font-medium">
                        <button>
                          <Eye className="w-4 h-4" title="View Details" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AttendanceRecordsLayout;
