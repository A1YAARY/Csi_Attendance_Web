import React, { useEffect, useState, useRef } from 'react';
import { EmployeeData } from './EmployeeData'; // Correct named import
import { useAuth } from '../../context/authStore';
import { Search, Filter, X } from 'lucide-react';
import { RefreshCw } from 'lucide-react';

const EmployeeLayout2 = () => {
  const { getAllUsers } = useAuth();
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [instituteFilter, setInstituteFilter] = useState('all');
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const pollingIntervalRef = useRef(null);
  const POLLING_INTERVAL = 5000; // Refresh every 5 seconds

  const fetchAllUsers = async (isManualRefresh = false) => {
    try {
      // Set appropriate loading state
      if (isManualRefresh) {
        setIsRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const response = await getAllUsers();
      console.log("Fetched users:", response);

      // Handle the response structure based on your API
      let usersData = [];
      if (response && response.success && Array.isArray(response.data)) {
        usersData = response.data;
      } else if (response && Array.isArray(response.data)) {
        usersData = response.data;
      } else if (response && Array.isArray(response.users)) {
        usersData = response.users;
      } else if (Array.isArray(response)) {
        usersData = response;
      } else {
        console.error("Unexpected response structure:", response);
        usersData = [];
      }

      setAllUsers(usersData);
      setFilteredUsers(usersData);
    } catch (err) {
      console.error("Error fetching users:", err);
      setError("Failed to fetch users. Please try again.");
    } finally {
      if (isManualRefresh) {
        setIsRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  };

  // Manual refresh handler
  const handleRefresh = () => {
    fetchAllUsers(true); // Pass true to indicate manual refresh
  };

  // Auto-refresh setup with useEffect
  useEffect(() => {
    // Initial fetch on mount
    fetchAllUsers(false);

    // Set up polling for auto-refresh
    const intervalId = setInterval(() => {
      fetchAllUsers(true); // Use refresh state for polling
    }, POLLING_INTERVAL);

    // Cleanup: clear interval when component unmounts
    return () => {
      clearInterval(intervalId);
    };
  }, []); // Empty dependency array - runs once on mount


  useEffect(() => {
    let filtered = [...allUsers];

    // Search filter
    if (searchTerm.trim() !== '') {
      filtered = filtered.filter(user =>
        (user.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (user.email?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (user.department?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (user.institute?.toLowerCase() || '').includes(searchTerm.toLowerCase())
      );
    }

    // Department filter
    if (departmentFilter !== 'all') {
      filtered = filtered.filter(user =>
        user.department?.toLowerCase() === departmentFilter.toLowerCase()
      );
    }

    // Institute filter
    if (instituteFilter !== 'all') {
      filtered = filtered.filter(user =>
        user.institute?.toLowerCase() === instituteFilter.toLowerCase()
      );
    }

    setFilteredUsers(filtered);
  }, [searchTerm, departmentFilter, instituteFilter, allUsers]);

  const handleSearch = (e) => setSearchTerm(e.target.value);
  const handleDepartmentFilter = (e) => setDepartmentFilter(e.target.value);
  const handleInstituteFilter = (e) => setInstituteFilter(e.target.value);

  const clearFilters = () => {
    setSearchTerm('');
    setDepartmentFilter('all');
    setInstituteFilter('all');
  };

  // Get unique departments and institutes for filter dropdowns
  const departments = [...new Set(allUsers.map(user => user.department).filter(Boolean))];
  const institutes = [...new Set(allUsers.map(user => user.institute).filter(Boolean))];

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-lg">Loading Employees...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded text-center">
          <p className="font-semibold">{error}</p>
          <button
            onClick={fetchAllUsers}
            className="mt-2 bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    // <div className="p-6 max-w-7xl mx-auto">
    //     <div className="mb-8">
    //         <h1 className="text-3xl font-bold text-gray-900 mb-2">Employee Management</h1>
    //         <p className="text-gray-600">Manage your organization's employees.</p>
    //     </div>

    //     {/* Search and Filter Controls */}
    //     <div className="mb-6 bg-white p-6 rounded-lg shadow-sm border">
    //         <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
    //             {/* Search Input */}
    //             <div className="relative">
    //                 <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
    //                 <input
    //                     type="text"
    //                     placeholder="Search employees..."
    //                     value={searchTerm}
    //                     onChange={handleSearch}
    //                     className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
    //                 />
    //             </div>

    //             {/* Department Filter */}
    //             <select
    //                 value={departmentFilter}
    //                 onChange={handleDepartmentFilter}
    //                 className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
    //             >
    //                 <option value="all">All Departments</option>
    //                 {departments.map((dept) => (
    //                     <option key={dept} value={dept}>
    //                         {dept}
    //                     </option>
    //                 ))}
    //             </select>

    //             {/* Institute Filter */}
    //             <select
    //                 value={instituteFilter}
    //                 onChange={handleInstituteFilter}
    //                 className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
    //             >
    //                 <option value="all">All Institutes</option>
    //                 {institutes.map((inst) => (
    //                     <option key={inst} value={inst}>
    //                         {inst}
    //                     </option>
    //                 ))}
    //             </select>

    //             {/* Clear Filters Button */}
    //             <button
    //                 onClick={clearFilters}
    //                 className="flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
    //             >
    //                 <X className="h-4 w-4 mr-2" />
    //                 Clear Filters
    //             </button>
    //         </div>

    //         <div className="mt-4 text-sm text-gray-600">
    //             Showing {filteredUsers.length} of {allUsers.length} employees
    //         </div>
    //     </div>

    //     {/* Employee Data Component */}
    //     {filteredUsers.length === 0 ? (
    //         <div className="text-center py-12">
    //             <div className="text-gray-400 mb-4">
    //                 <Filter size={64} className="mx-auto" />
    //             </div>
    //             <h3 className="text-xl font-semibold text-gray-900 mb-2">No employees found</h3>
    //             <p className="text-gray-600">
    //                 {searchTerm || departmentFilter !== 'all' || instituteFilter !== 'all'
    //                     ? "Try adjusting your filters to see more results."
    //                     : "Employees will appear here once they are added."
    //                 }
    //             </p>
    //         </div>
    //     ) : (
    //         <EmployeeData allusers={filteredUsers} onUsersUpdate={fetchAllUsers} />
    //     )}
    // </div>
    // Updated JSX with refresh button
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header with Refresh Button */}
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Employee Management</h1>
          <p className="text-gray-600">Manage your organization's employees.</p>
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
      <div className="mb-6 bg-white p-6 rounded-lg shadow-sm border">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search employees..."
              value={searchTerm}
              onChange={handleSearch}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Department Filter */}
          <select
            value={departmentFilter}
            onChange={handleDepartmentFilter}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Departments</option>
            {departments.map((dept) => (
              <option key={dept} value={dept}>
                {dept}
              </option>
            ))}
          </select>

          {/* Institute Filter */}
          <select
            value={instituteFilter}
            onChange={handleInstituteFilter}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Institutes</option>
            {institutes.map((inst) => (
              <option key={inst} value={inst}>
                {inst}
              </option>
            ))}
          </select>

          {/* Clear Filters Button */}
          <button
            onClick={clearFilters}
            className="flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <X className="h-4 w-4 mr-2" />
            Clear Filters
          </button>
        </div>

        <div className="mt-4 text-sm text-gray-600">
          Showing {filteredUsers.length} of {allUsers.length} employees
        </div>
      </div>

      {/* Employee Data Component */}
      {filteredUsers.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <Filter size={64} className="mx-auto" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No employees found</h3>
          <p className="text-gray-600">
            {searchTerm || departmentFilter !== 'all' || instituteFilter !== 'all'
              ? "Try adjusting your filters to see more results."
              : "Employees will appear here once they are added."
            }
          </p>
        </div>
      ) : (
        <EmployeeData allusers={filteredUsers} onUsersUpdate={fetchAllUsers} />
      )}
    </div>
  );
};

export default EmployeeLayout2;
