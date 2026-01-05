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

const AttendanceRecordsLayout = ({ records }) => {
  const [filteredRecords, setFilteredRecords] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState(() => {
    const today = new Date();
    return today.toISOString().split("T")[0]; // default to today's date YYYY-MM-DD
  });
  const [statusFilter, setStatusFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  const toggleDropdown = () => {
    setOpen(!open);
  };

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
      filtered = filtered.filter(
        (record) => record.status?.toLowerCase() === statusFilter.toLowerCase()
      );
    }

    setFilteredRecords(filtered);
  }, [records, searchTerm, dateFilter, statusFilter]);

  const formatTime = (time) => {
    if (!time) return "N/A";
    try {
      if (typeof time === "object" && time.start) return formatTime(time.start);
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
    <div className="p-4 sm:p-6 bg-gray-50 min-h-[calc(100vh-64px)]">
      <div className="max-w-7xl mx-auto">
        <h1 className="mb-4 text-2xl sm:text-3xl font-bold text-gray-900">
          Attendance Records
        </h1>
        <p className="mb-6 text-sm sm:text-base text-gray-600">
          Track and manage employee attendance
        </p>

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

              <div className="relative inline-block text-left" ref={menuRef}>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="border-0 rounded-lg focus:ring-0 focus:border-none text-sm bg-transparent font-medium text-gray-600 uppercase tracking-wide"
                >
                  <option value="all">All Status</option>
                  <option value="incomplete">Incomplete</option>
                  <option value="complete">Complete</option>
                  <option value="present">Present</option>
                  <option value="absent">Absent</option>
                  <option value="late">Late</option>
                  <option value="partial">Partial</option>
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
                      onClick={() => {
                        alert("Download Daily Report");
                        setOpen(false);
                      }}
                    >
                      Daily
                    </li>
                    <li
                      className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer"
                      onClick={() => {
                        alert("Download Weekly Report");
                        setOpen(false);
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

        {filteredRecords.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden p-8 text-center text-gray-600">
            No attendance records found. Try adjusting your filters to see
            results.
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
