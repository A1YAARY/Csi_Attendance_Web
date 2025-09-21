import React, { useEffect, useState } from "react";
import { EmployeeData } from "./EmployeeData";
import { useAuth } from "../../context/AuthContext";

const EmployeeLayout = () => {
  const { getallusers } = useAuth();
  const [allusers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredUsers, setFilteredUsers] = useState([]);

  // Fetch all users when component mounts
  useEffect(() => {
    fetchAllUsers();
  }, []);

  // Filter users based on search term
  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredUsers(allusers);
    } else {
      const filtered = allusers.filter(
        (user) =>
          user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.department?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.role?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredUsers(filtered);
    }
  }, [searchTerm, allusers]);

  const fetchAllUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log("Fetching all users...");
      const response = await getallusers();
      console.log("Raw response:", response);

      // Handle different response formats
      let usersData = [];
      if (response && Array.isArray(response)) {
        usersData = response;
      } else if (response && response.data && Array.isArray(response.data)) {
        usersData = response.data;
      } else if (response && response.users && Array.isArray(response.users)) {
        usersData = response.users;
      } else if (response && response.success && response.data) {
        usersData = Array.isArray(response.data)
          ? response.data
          : [response.data];
      }

      console.log("Processed users data:", usersData);
      setAllUsers(usersData);
      setFilteredUsers(usersData);
    } catch (err) {
      console.error("Error fetching users:", err);
      setError("Failed to fetch users. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center p-4">
          <div className="animate-spin rounded-full h-8 w-8 sm:h-12 sm:w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-base sm:text-lg text-gray-600">Loading users...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center p-4 max-w-md mx-auto">
          <div className="text-red-500 text-4xl sm:text-6xl mb-4">⚠️</div>
          <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-2">
            Error Loading Users
          </h2>
          <p className="text-sm sm:text-base text-gray-600 mb-4">{error}</p>
          <button
            onClick={fetchAllUsers}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors text-sm sm:text-base"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-2 sm:p-4 lg:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="bg-white rounded-lg shadow-sm mb-4 sm:mb-6 p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="text-center sm:text-left">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-800">
                Employee Management
              </h1>
              <p className="text-sm sm:text-base text-gray-600 mt-1">
                Manage your organization's employees
              </p>
            </div>

            {/* Search Bar */}
            <div className="w-full sm:w-auto sm:min-w-[300px]">
              <input
                type="text"
                placeholder="Search employees by name, email, department, or role..."
                value={searchTerm}
                onChange={handleSearch}
                className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
              />
            </div>
          </div>

          {/* Results Count - Mobile Friendly */}
          {searchTerm && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <p className="text-xs sm:text-sm text-gray-600 text-center sm:text-left">
                {filteredUsers.length > 0
                  ? `Found ${filteredUsers.length} employee${
                      filteredUsers.length !== 1 ? "s" : ""
                    } matching "${searchTerm}"`
                  : `No employees found matching "${searchTerm}"`}
              </p>
            </div>
          )}
        </div>

        {/* Table Header - Desktop Only */}
        <div className="hidden lg:block bg-white rounded-t-lg shadow-sm">
          <div className="grid grid-cols-12 gap-4 p-4 border-b border-gray-200 bg-gray-50 rounded-t-lg">
            <div className="col-span-1 flex justify-center">
              <input type="checkbox" className="rounded" />
            </div>
            <div className="col-span-4 text-sm font-semibold text-gray-700 uppercase tracking-wide">
              Employee
            </div>
            <div className="col-span-3 text-sm font-semibold text-gray-700 uppercase tracking-wide">
              Department
            </div>
            <div className="col-span-2 text-sm font-semibold text-gray-700 uppercase tracking-wide">
              Role
            </div>
            <div className="col-span-2 text-sm font-semibold text-gray-700 uppercase tracking-wide text-center">
              Work Hours
            </div>
          </div>
        </div>

        {/* Employee Data */}
        <EmployeeData allusers={filteredUsers} />
      </div>
    </div>
  );
};

export default EmployeeLayout;
