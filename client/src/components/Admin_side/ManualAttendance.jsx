import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/authStore';
import { toast } from 'react-toastify';

const ManualAttendance = () => {
  const { user, getAuthHeaders, getAllUsers, BASE_URL } = useAuth(); // Use getAllUsers from authStore
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [markingDate, setMarkingDate] = useState(new Date().toISOString().split('T')[0]);
  const [workingHours, setWorkingHours] = useState('8');
  const [reason, setReason] = useState('Phone not working - marked by admin');
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Fetch all users on component mount
  useEffect(() => {
    fetchUsers();
  }, []);

  // Filter users based on search query
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredUsers(users);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = users.filter(
        (user) =>
          user.name?.toLowerCase().includes(query) ||
          user.email?.toLowerCase().includes(query) ||
          user.department?.toLowerCase().includes(query) ||
          user.institute?.toLowerCase().includes(query)
      );
      setFilteredUsers(filtered);
    }
  }, [searchQuery, users]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      
      // Use the getAllUsers function from authStore
      const data = await getAllUsers();
      
      console.log('Fetched users:', data); // Debug log
      
      if (data.success) {
        // Filter only users (not admins)
        const regularUsers = (data.users || data.data || []).filter(u => u.role === 'user');
        console.log('Regular users:', regularUsers); // Debug log
        setUsers(regularUsers);
        setFilteredUsers(regularUsers);
        
        if (regularUsers.length === 0) {
          toast.info('No users found in the system');
        }
      } else {
        toast.error(data.message || 'Failed to fetch users');
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load users: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUserSelect = (user) => {
    setSelectedUser(user);
    setShowConfirmModal(false);
  };

  const handleMarkPresent = async () => {
    if (!selectedUser) {
      toast.error('Please select a user first');
      return;
    }

    if (!reason.trim()) {
      toast.error('Please provide a reason for manual attendance');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${BASE_URL}/admin/manual-mark-present`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
        },
        body: JSON.stringify({
          userId: selectedUser._id,
          date: markingDate,
          reason: reason,
          workingHours: parseInt(workingHours),
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(data.message || 'User marked present successfully!');
        setShowConfirmModal(false);
        // Reset form
        setSelectedUser(null);
        setReason('Phone not working - marked by admin');
        setWorkingHours('8');
        setMarkingDate(new Date().toISOString().split('T')[0]);
      } else {
        toast.error(data.message || 'Failed to mark attendance');
      }
    } catch (error) {
      console.error('Error marking attendance:', error);
      toast.error('Failed to mark attendance. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-600 mb-2">
            Manual Attendance Marking
          </h1>
          <p className="text-gray-400">
            Mark users present manually when they're unable to scan QR code (e.g., phone issues)
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* User Selection Panel */}
          <div className="lg:col-span-2 bg-gray-800/50 backdrop-blur-lg rounded-xl p-6 shadow-2xl border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-white">Select User</h2>
              <button
                onClick={fetchUsers}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-all"
              >
                🔄 Refresh
              </button>
            </div>

            {/* Search Bar */}
            <div className="mb-4">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="🔍 Search by name, email, department, or institute..."
                className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* User List */}
            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                <p className="text-gray-400 mt-4">Loading users...</p>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">😕</div>
                <p className="text-gray-400 text-lg mb-2">
                  {searchQuery ? 'No users found matching your search' : 'No users available'}
                </p>
                <p className="text-gray-500 text-sm">
                  {!searchQuery && 'Please register users first or check your organization settings'}
                </p>
              </div>
            ) : (
              <div className="max-h-[500px] overflow-y-auto space-y-3">
                {filteredUsers.map((userItem) => (
                  <div
                    key={userItem._id}
                    onClick={() => handleUserSelect(userItem)}
                    className={`p-4 rounded-lg cursor-pointer transition-all border ${
                      selectedUser?._id === userItem._id
                        ? 'bg-blue-600/30 border-blue-500 shadow-lg'
                        : 'bg-gray-900/50 border-gray-700 hover:bg-gray-900 hover:border-gray-600'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-white">{userItem.name}</h3>
                        <p className="text-gray-400 text-sm">{userItem.email}</p>
                        <div className="flex gap-3 mt-2">
                          <span className="text-xs bg-purple-600/30 text-purple-300 px-2 py-1 rounded">
                            {userItem.department || 'General'}
                          </span>
                          <span className="text-xs bg-green-600/30 text-green-300 px-2 py-1 rounded">
                            {userItem.institute || 'N/A'}
                          </span>
                        </div>
                      </div>
                      {selectedUser?._id === userItem._id && (
                        <div className="ml-4">
                          <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Marking Details Panel */}
          <div className="bg-gray-800/50 backdrop-blur-lg rounded-xl p-6 shadow-2xl border border-gray-700">
            <h2 className="text-2xl font-bold text-white mb-4">Marking Details</h2>

            {selectedUser ? (
              <div className="space-y-4">
                {/* Selected User Info */}
                <div className="bg-blue-900/20 border border-blue-500/50 rounded-lg p-4">
                  <p className="text-sm text-gray-400 mb-1">Selected User</p>
                  <p className="text-lg font-semibold text-white">{selectedUser.name}</p>
                  <p className="text-sm text-gray-400">{selectedUser.email}</p>
                  <div className="flex gap-2 mt-2">
                    <span className="text-xs bg-purple-600/30 text-purple-300 px-2 py-1 rounded">
                      {selectedUser.department}
                    </span>
                    <span className="text-xs bg-green-600/30 text-green-300 px-2 py-1 rounded">
                      {selectedUser.institute}
                    </span>
                  </div>
                </div>

                {/* Date Selection */}
                <div>
                  <label className="block text-gray-300 mb-2 font-medium">Date</label>
                  <input
                    type="date"
                    value={markingDate}
                    onChange={(e) => setMarkingDate(e.target.value)}
                    max={new Date().toISOString().split('T')[0]}
                    className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Working Hours */}
                <div>
                  <label className="block text-gray-300 mb-2 font-medium">Working Hours</label>
                  <select
                    value={workingHours}
                    onChange={(e) => setWorkingHours(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="4">4 hours (Half Day)</option>
                    <option value="6">6 hours</option>
                    <option value="8">8 hours (Full Day)</option>
                    <option value="9">9 hours</option>
                    <option value="10">10 hours</option>
                  </select>
                </div>

                {/* Reason */}
                <div>
                  <label className="block text-gray-300 mb-2 font-medium">Reason *</label>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Why are you marking this attendance manually?"
                    rows="4"
                    className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                {/* Confirm Button */}
                <button
                  onClick={() => setShowConfirmModal(true)}
                  disabled={loading || !reason.trim()}
                  className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white py-4 rounded-lg font-semibold hover:from-green-600 hover:to-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                >
                  {loading ? 'Marking...' : 'Mark Present'}
                </button>
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">👤</div>
                <p className="text-gray-400">Select a user from the list to mark their attendance</p>
              </div>
            )}
          </div>
        </div>

        {/* Confirmation Modal */}
        {showConfirmModal && selectedUser && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-xl p-8 max-w-md w-full border border-gray-700 shadow-2xl">
              <h3 className="text-2xl font-bold text-white mb-4">Confirm Manual Attendance</h3>
              <div className="space-y-3 mb-6">
                <p className="text-gray-300">
                  <span className="text-gray-500">User:</span>{' '}
                  <span className="font-semibold">{selectedUser.name}</span>
                </p>
                <p className="text-gray-300">
                  <span className="text-gray-500">Date:</span>{' '}
                  <span className="font-semibold">{new Date(markingDate).toLocaleDateString()}</span>
                </p>
                <p className="text-gray-300">
                  <span className="text-gray-500">Working Hours:</span>{' '}
                  <span className="font-semibold">{workingHours} hours</span>
                </p>
                <p className="text-gray-300">
                  <span className="text-gray-500">Reason:</span>{' '}
                  <span className="font-semibold">{reason}</span>
                </p>
              </div>
              <p className="text-yellow-400 text-sm mb-6">
                ⚠️ This action will mark the user as present and create an audit trail.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowConfirmModal(false)}
                  className="flex-1 bg-gray-700 text-white py-3 rounded-lg font-semibold hover:bg-gray-600 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleMarkPresent}
                  disabled={loading}
                  className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 text-white py-3 rounded-lg font-semibold hover:from-green-600 hover:to-emerald-700 transition-all disabled:opacity-50"
                >
                  {loading ? 'Confirming...' : 'Confirm'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ManualAttendance;
