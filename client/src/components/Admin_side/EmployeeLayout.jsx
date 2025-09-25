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
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");

  // Fetch all users when component mounts
  useEffect(() => {
    fetchAllUsers();
  }, []);

  // Filter users based on search term, department, and role
  useEffect(() => {
    let filtered = [...allusers];

    // Search filter
    if (searchTerm.trim() !== "") {
      filtered = filtered.filter(
        (user) =>
          user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.department?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.role?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Department filter (only one active at a time)
    if (departmentFilter !== "all") {
      filtered = filtered.filter((user) => 
        user.department?.toLowerCase() === departmentFilter.toLowerCase()
      );
    }
    // Role filter (only one active at a time)
    else if (roleFilter !== "all") {
      filtered = filtered.filter((user) => 
        user.role?.toLowerCase() === roleFilter.toLowerCase()
      );
    }

    setFilteredUsers(filtered);
  }, [searchTerm, departmentFilter, roleFilter, allusers]);

  const fetchAllUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getallusers();

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

  const handleDepartmentFilter = (e) => {
    const newDepartment = e.target.value;
    setDepartmentFilter(newDepartment);
    // Reset role filter when department is selected
    if (newDepartment !== "all") {
      setRoleFilter("all");
    }
  };

  const handleRoleFilter = (e) => {
    const newRole = e.target.value;
    setRoleFilter(newRole);
    // Reset department filter when role is selected
    if (newRole !== "all") {
      setDepartmentFilter("all");
    }
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
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors text-sm sm:text-base">
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

          {/* Results Count */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <p className="text-xs sm:text-sm text-gray-600 text-center sm:text-left">
              Showing {filteredUsers.length} of {allusers.length} employees
            </p>
          </div>
        </div>

        {/* Table Header - Desktop Only */}
        <div className="hidden lg:block bg-white rounded-t-lg shadow-sm">
          <div className="grid grid-cols-12 gap-4 p-4 border-b border-gray-200 bg-gray-50 rounded-t-lg">
            <div className="col-span-4 text-sm font-semibold text-gray-700 uppercase tracking-wide pl-10">
              Employee
            </div>
            <div className="col-span-2">
              <select
                value={departmentFilter}
                onChange={handleDepartmentFilter}
                className="font-semibold text-gray-700 uppercase pr-2 tracking-wide text-left border-0 focus:ring-0 focus:bg-blue-50 focus:border-none active:ring-0 text-sm bg-transparent">
                <option value="all">Department</option>
                <option value="cmpn">CMPN</option>
                <option value="extc">EXTC</option>
                <option value="ecs">ECS</option>
                <option value="inft">INFT</option>
              </select>
            </div>
            <div className="col-span-2">
              <select
                value={roleFilter}
                onChange={handleRoleFilter}
                className="font-semibold text-gray-700 uppercase tracking-wide text-left border-0 focus:ring-0 focus:bg-blue-50 focus:border-none active:ring-0 text-sm bg-transparent">
                <option value="all">Role</option>
                <option value="professor">Professor</option>
                <option value="user">User</option>
              </select>
            </div>
            <div className="col-span-2 text-sm font-semibold text-gray-700 uppercase tracking-wide text-center">
              Work Hours
            </div>
            <div className="col-span-2 text-sm font-semibold text-gray-700 uppercase tracking-wide text-center">
              Actions
            </div>
          </div>
        </div>

        {/* Employee Data or No Data Message */}
        {filteredUsers.length > 0 ? (
          <EmployeeData allusers={filteredUsers} />
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
                  d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"
                />
              </svg>
            </div>
            <p className="text-lg text-gray-600 mb-2">
              No employees found
            </p>
            <p className="text-sm text-gray-400">
              {searchTerm || departmentFilter !== "all" || roleFilter !== "all"
                ? "Try adjusting your filters to see more results"
                : "Employees will appear here once they register"}
            </p>
            {(searchTerm || departmentFilter !== "all" || roleFilter !== "all") && (
              <button
                onClick={() => {
                  setSearchTerm("");
                  setDepartmentFilter("all");
                  setRoleFilter("all");
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

export default EmployeeLayout;