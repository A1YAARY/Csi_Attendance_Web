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
      const filtered = allusers.filter(user => 
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
        usersData = Array.isArray(response.data) ? response.data : [response.data];
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
      <div className="p-6 bg-gray-50 min-h-screen">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-lg shadow-sm p-8">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
              <p className="ml-4 text-gray-600">Loading users...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <div className="text-red-500 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <p className="text-lg text-red-600 mb-4">Error Loading Users</p>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={fetchAllUsers}
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
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Employees</h1>
          <p className="text-gray-600">Manage your organization's employees</p>
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="flex items-center space-x-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Employees ({filteredUsers.length})
              </h2>
              
              <button className="flex items-center px-3 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
                Sort
              </button>

              <button className="flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
                </svg>
                Advanced Filters
              </button>
            </div>

            <div className="relative">
              <input
                type="text"
                placeholder="Search Employees"
                value={searchTerm}
                onChange={handleSearch}
                className="w-64 pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Users List */}
        <div className="bg-white rounded-lg shadow-sm">
          {/* Table Header */}
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex justify-between items-center text-sm font-medium text-gray-500">
              <div className="flex gap-[16px] items-center">
                <input type="checkbox" className="w-4 h-4" />
                <div className="w-[44px]"></div> {/* Avatar space */}
                <p className="text-gray-700 font-semibold">Employee</p>
              </div>
              <div className="flex justify-between w-[60%] items-center">
                <p className="flex-1 text-center font-semibold">Email</p>
                <p className="flex-1 text-center font-semibold">Department</p>
                <p className="flex-1 text-center font-semibold">Role</p>
                <p className="flex-1 text-center font-semibold">Work Hours</p>
              </div>
              <div className="w-8"></div> {/* Menu space */}
            </div>
          </div>

          {/* Employee Data */}
          <div className="p-6">
            <EmployeeData allusers={filteredUsers} />
          </div>
        </div>

        {/* Debug Information (Remove in production) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h3 className="text-sm font-medium text-yellow-800 mb-2">Debug Info:</h3>
            <p className="text-sm text-yellow-700">Total users: {allusers.length}</p>
            <p className="text-sm text-yellow-700">Filtered users: {filteredUsers.length}</p>
            <p className="text-sm text-yellow-700">Search term: "{searchTerm}"</p>
            <details className="mt-2">
              <summary className="text-sm text-yellow-700 cursor-pointer">View raw data</summary>
              <pre className="text-xs text-yellow-600 mt-2 overflow-auto max-h-40">
                {JSON.stringify(allusers, null, 2)}
              </pre>
            </details>
          </div>
        )}
      </div>
    </div>
  );
};

export default EmployeeLayout;
