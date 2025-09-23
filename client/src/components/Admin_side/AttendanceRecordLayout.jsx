import React, { useState, useEffect, useRef } from "react";
import {
  Calendar,
  Download,
  Filter,
  Search,
  Eye,
  Clock,
  MapPin,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";

export const AttendanceRecordLayout = ({ records: propRecords }) => {
  const { getAdminRecords } = useAuth();
  const [records, setRecords] = useState([]);
  const [filteredRecords, setFilteredRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const menuRef = useRef();

  const toggleDropdown = () => {
    setOpen(!open);
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Fetch records on component mount or use props
  useEffect(() => {
    if (propRecords && Array.isArray(propRecords)) {
      // console.log("Using prop records:", propRecords);
      setRecords(propRecords);
      setFilteredRecords(propRecords);
      setLoading(false);
    } else {
      fetchRecords();
    }
  }, [propRecords]);

  // Filter records based on search term, date, and status
  useEffect(() => {
    let filtered = [...records];

    // Search filter
    if (searchTerm.trim() !== "") {
      filtered = filtered.filter(
        (record) =>
          record.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          record.department?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          record.role?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Date filter
    if (dateFilter) {
      filtered = filtered.filter((record) => {
        const recordDate = new Date(record.date).toISOString().split("T")[0];
        return recordDate === dateFilter;
      });
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((record) => record.status === statusFilter);
    }

    setFilteredRecords(filtered);
  }, [searchTerm, dateFilter, statusFilter, records]);

  const fetchRecords = async () => {
    try {
      setLoading(true);
      setError(null);

      // console.log("Fetching admin records...");
      const response = await getAdminRecords();
      // console.log("Raw records response:", response);

      // Handle different response formats
      let recordsData = [];
      if (Array.isArray(response)) {
        recordsData = response;
      } else if (response && response.data && Array.isArray(response.data)) {
        recordsData = response.data;
      } else if (
        response &&
        response.records &&
        Array.isArray(response.records)
      ) {
        recordsData = response.records;
      } else if (
        response &&
        response.attendanceRecords &&
        Array.isArray(response.attendanceRecords)
      ) {
        recordsData = response.attendanceRecords;
      }

      // console.log("Processed records data:", recordsData);
      setRecords(recordsData);
      setFilteredRecords(recordsData);
    } catch (err) {
      console.error("Error fetching records:", err);
      setError("Failed to fetch attendance records");
    } finally {
      setLoading(false);
    }
  };

  // Format time display
  const formatTime = (time) => {
    if (!time) return "N/A";
    try {
      // Handle different time formats
      if (time.includes("AM") || time.includes("PM")) {
        return time; // Already formatted
      }

      // Convert 24-hour format to 12-hour format
      const [hours, minutes] = time.split(":");
      const hour12 = hours % 12 || 12;
      const ampm = hours < 12 ? "AM" : "PM";
      return `${hour12}:${minutes} ${ampm}`;
    } catch (error) {
      return time; // Return as-is if formatting fails
    }
  };

  // Format date display
  const formatDate = (date) => {
    if (!date) return "N/A";
    try {
      return new Date(date).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch (error) {
      return date;
    }
  };

  // Get status color
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
        return "bg-orange-100 text-orange-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (loading) {
    return (
      <div className="p-4 sm:p-6 bg-gray-50 min-h-[calc(100vh-64px)]">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-lg shadow-sm p-8">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
              <p className="ml-4 text-gray-600">
                Loading attendance records...
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 sm:p-6 bg-gray-50 min-h-[calc(100vh-64px)]">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <div className="text-red-500 mb-4">
              <svg
                className="w-16 h-16 mx-auto"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
            </div>
            <p className="text-lg text-red-600 mb-4">Error Loading Records</p>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={fetchRecords}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 bg-gray-50 min-h-[calc(100vh-64px)]">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
            Attendance Records
          </h1>
          <p className="text-sm sm:text-base text-gray-600">
            Track and manage employee attendance
          </p>
        </div>

        {/* Filters and Actions */}
        <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 mb-6">
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
            {/* Left side - Filters */}
            <div className="flex flex-col sm:flex-row gap-4 flex-1">
              {/* Search */}
              <div className="relative flex-1 max-w-md">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Search by name, department..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>

              {/* Date Filter */}
              <div className="relative">
                <input
                  type="date"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              >
                <option value="all">All Status</option>
                {/* <option value="present">Present</option>
                <option value="absent">Absent</option> */}
                <option value="incomplete">Incomplete</option>
                <option value="complete">Complete</option>
              </select>
            </div>

            {/* Right side - Actions */}
            <div className="flex gap-2 sm:gap-3 w-full sm:w-auto">
              {/* <button className="flex items-center px-3 sm:px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm flex-1 sm:flex-initial justify-center">
                <Calendar className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Pick Date</span>
                <span className="sm:hidden">Date</span>
              </button> */}
              <div className="relative inline-block text-left" ref={menuRef}>
              <button className="flex items-center px-3 sm:px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm flex-1 sm:flex-initial justify-center">
                <Download className="w-4 h-4 mr-2" />
                <span onClick={toggleDropdown} className="hidden sm:inline">Export</span>
                <span onClick={toggleDropdown} className="sm:hidden">Export</span>
              </button>
              
      {/* <button
        onClick={toggleDropdown}
        className="p-2 text-gray-600 hover:text-black focus:outline-none"
      >
        &#8942; Vertical ellipsis */}
      {/* </button> */}

      {open && (
        <div className="absolute right-0 mt-2 w-40 bg-white border border-gray-200 rounded shadow-md z-10">
          <ul className="py-1">
            <li className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer">
              Daily
            </li>
            <li className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer">
              Weekly
            </li>
            {/* <li className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer">
              Share
            </li> */}
          </ul>
        </div>
      )}
    </div>
            </div>
          </div>

          {/* Results count */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <p className="text-sm text-gray-600">
              Showing {filteredRecords.length} of {records.length} records
            </p>
          </div>
        </div>

        {/* Records Table/Cards */}
        {filteredRecords.length > 0 ? (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            {/* Desktop Table View */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full">
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
                    <tr key={record._id || index} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <img
                            className="h-10 w-10 rounded-full mr-3"
                            src={`https://ui-avatars.com/api/?name=${encodeURIComponent(
                              record.name || "User"
                            )}&size=40&background=4F46E5&color=fff&rounded=true`}
                            alt={record.name}
                          />
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {record.name || "N/A"}
                            </p>
                            <p className="text-xs text-gray-500">
                              {record.organizationId?.slice(-6) || "N/A"}
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
                        {formatDate(record.date)}
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
                          {formatTime(record.checkInTime)}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        <div className="flex items-center">
                          <Clock className="w-4 h-4 mr-1 text-gray-400" />
                          {formatTime(record.checkOutTime)}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {record.workingHours || "N/A"}
                      </td>
                      <td className="px-6 py-4">
                        <button className="text-blue-600 hover:text-blue-900 text-sm font-medium">
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="lg:hidden">
              {filteredRecords.map((record, index) => (
                <div
                  key={record._id || index}
                  className="p-4 border-b border-gray-200 last:border-b-0"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center">
                      <img
                        className="h-10 w-10 rounded-full mr-3"
                        src={`https://ui-avatars.com/api/?name=${encodeURIComponent(
                          record.name || "User"
                        )}&size=40&background=4F46E5&color=fff&rounded=true`}
                        alt={record.name}
                      />
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {record.name || "N/A"}
                        </p>
                        <p className="text-xs text-gray-500">
                          {record.role || "N/A"} • {record.department || "N/A"}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                        record.status
                      )}`}
                    >
                      {record.status || "N/A"}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <p className="text-gray-500 mb-1">Date</p>
                      <p className="font-medium">{formatDate(record.date)}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 mb-1">Working Hours</p>
                      <p className="font-medium">
                        {record.workingHours || "N/A"}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500 mb-1">Check In</p>
                      <p className="font-medium flex items-center">
                        <Clock className="w-3 h-3 mr-1" />
                        {formatTime(record.checkInTime)}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500 mb-1">Check Out</p>
                      <p className="font-medium flex items-center">
                        <Clock className="w-3 h-3 mr-1" />
                        {formatTime(record.checkOutTime)}
                      </p>
                    </div>
                  </div>

                  {record.location && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <p className="text-xs text-gray-500 flex items-center">
                        <MapPin className="w-3 h-3 mr-1" />
                        Location: {record.location.latitude},{" "}
                        {record.location.longitude}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <div className="mx-auto h-24 w-24 text-gray-400 mb-4">
              <svg
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                className="w-full h-full"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1"
                  d="M9 5H7a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
            </div>
            <p className="text-lg text-gray-600 mb-2">
              No attendance records found
            </p>
            <p className="text-sm text-gray-400">
              {searchTerm || dateFilter || statusFilter !== "all"
                ? "Try adjusting your filters to see more results"
                : "Attendance records will appear here once employees start checking in"}
            </p>
            {(searchTerm || dateFilter || statusFilter !== "all") && (
              <button
                onClick={() => {
                  setSearchTerm("");
                  setDateFilter("");
                  setStatusFilter("all");
                }}
                className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm"
              >
                Clear Filters
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
