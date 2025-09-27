import React, { useEffect, useState } from 'react';
import { EmployeeData}  from './EmployeeData'; // Correct named import
import { useAuth } from '../../context/authStore';
import { Search, Filter, X } from 'lucide-react';

const EmployeeLayout2 = () => {
    const { getAllUsers } = useAuth();
    const [allUsers, setAllUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [departmentFilter, setDepartmentFilter] = useState('all');
    const [instituteFilter, setInstituteFilter] = useState('all');
    const [filteredUsers, setFilteredUsers] = useState([]);

    const fetchAllUsers = async () => {
        try {
            setLoading(true);
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
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAllUsers();
    }, []);

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
        <div className="p-6 max-w-7xl mx-auto">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Employee Management</h1>
                <p className="text-gray-600">Manage your organization's employees.</p>
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
