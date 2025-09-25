import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { toast } from "react-toastify";

export const EmployeeData = ({ allusers, onUsersUpdate }) => {
  const navigate = useNavigate();
  const { deleteUser, makeAuthenticatedRequest, BASE_URL } = useAuth();
  const [users, setUsers] = useState(allusers || []);
  const [openDropdownUserId, setOpenDropdownUserId] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);

  useEffect(() => {
    setUsers(allusers || []);
  }, [allusers]);

  // Reset user device (allow them to register new device)
  const handleResetDevice = async (userId, userEmail) => {
    setActionLoading(`reset-${userId}`);

    try {
      const response = await makeAuthenticatedRequest(
        `${BASE_URL}/admin/reset-user-device`,
        {
          method: "POST",
          body: JSON.stringify({ userId }),
        }
      );

      if (response.success) {
        toast.success(
          `Device reset for ${userEmail}. They can now register a new device.`
        );

        // Update local state
        setUsers((prevUsers) =>
          prevUsers.map((user) =>
            user._id === userId
              ? {
                  ...user,
                  deviceInfo: {
                    isRegistered: false,
                    deviceId: null,
                    deviceType: null,
                    deviceFingerprint: null,
                    registeredAt: null,
                  },
                }
              : user
          )
        );

        if (onUsersUpdate) {
          onUsersUpdate();
        }
      }
    } catch (error) {
      console.error("Error resetting device:", error);
      toast.error("Failed to reset device. Please try again.");
    } finally {
      setActionLoading(null);
      setOpenDropdownUserId(null);
    }
  };

  // Send password reset email to user
  const handleSendResetEmail = async (userId, userEmail) => {
    setActionLoading(`reset-password-${userId}`);

    try {
      const response = await makeAuthenticatedRequest(
        `${BASE_URL}/password/request-reset`,
        {
          method: "POST",
          body: JSON.stringify({ email: userEmail }),
        }
      );

      if (response.message) {
        toast.success(`Password reset email sent to ${userEmail}`);
      }
    } catch (error) {
      console.error("Error sending reset email:", error);
      toast.error("Failed to send reset email. Please try again.");
    } finally {
      setActionLoading(null);
      setOpenDropdownUserId(null);
    }
  };

  const handleDelete = async (userId, userEmail) => {
    if (
      !window.confirm(
        `Are you sure you want to delete ${userEmail}? This action cannot be undone.`
      )
    ) {
      return;
    }

    setActionLoading(`delete-${userId}`);

    try {
      await deleteUser(userId);
      setUsers((prev) =>
        prev.filter((user) => (user._id || user.id) !== userId)
      );
      toast.success(`User ${userEmail} deleted successfully`);

      if (onUsersUpdate) {
        onUsersUpdate();
      }
    } catch (error) {
      console.error("Error deleting user:", error);
      toast.error("Failed to delete user. Please try again.");
    } finally {
      setActionLoading(null);
      setOpenDropdownUserId(null);
    }
  };

  const toggleDropdown = (userId) => {
    setOpenDropdownUserId((prev) => (prev === userId ? null : userId));
  };

  const handleUserClick = (userId) => {
    navigate(`/admin/user/${userId}`);
  };

  const formatWorkingHours = (workingHours) => {
    if (!workingHours) return "N/A";
    if (typeof workingHours === "object") {
      return `${workingHours.start || "09:00"} - ${
        workingHours.end || "17:00"
      }`;
    }
    return workingHours;
  };

  const getDeviceStatus = (user) => {
    if (!user.deviceInfo) return "Not Registered";
    return user.deviceInfo.isRegistered ? "Registered" : "Not Registered";
  };

  if (!users || users.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6 sm:p-8 text-center">
        <div className="text-gray-400 text-4xl sm:text-6xl mb-4">👥</div>
        <h3 className="text-lg sm:text-xl font-semibold text-gray-800 mb-2">
          No users found
        </h3>
        <p className="text-sm sm:text-base text-gray-600">
          Users will appear here once they register
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-b-lg lg:rounded-t-none shadow-sm overflow-hidden">
      <div className="divide-y divide-gray-200">
        {users.map((user, index) => {
          const userId = user._id || user.id || `user-${index}`;
          const userName = user.name || user.fullName || "Unknown User";
          const userEmail = user.email || "No email provided";
          const userDepartment = user.department || "N/A";
          const userRole = user.role || "N/A";
          const deviceStatus = getDeviceStatus(user);

          return (
            <div
              key={userId}
              className="cursor-pointer hover:bg-gray-50 transition-colors duration-200 relative"
            >
              {/* Desktop Layout */}
              <div className="hidden lg:grid lg:grid-cols-12 lg:gap-4 lg:p-4 lg:items-center">
                <div className="col-span-4">
                  <div className="flex items-center">
                    <div className="h-10 w-10 flex-shrink-0 bg-blue-500 rounded-full flex items-center justify-center text-white font-medium text-sm">
                      {userName.charAt(0).toUpperCase()}
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-900">
                        {userName}
                      </p>
                      <p className="text-xs text-gray-500">
                        ID: {userId.slice(-6)}
                      </p>
                      <p className="text-xs text-gray-500 truncate max-w-[200px]">
                        {userEmail}
                      </p>
                      <p className="text-xs text-gray-400">
                        Device: {deviceStatus}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="col-span-2">
                  <span className="inline-flex px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                    {userDepartment}
                  </span>
                </div>
                <div className="col-span-2">
                  <span className="inline-flex px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                    {userRole}
                  </span>
                </div>
                <div className="col-span-2 text-center">
                  <span className="text-sm text-gray-600">
                    {formatWorkingHours(user.workingHours)}
                  </span>
                </div>
                <div className="col-span-2 text-right">
                  <div className="relative inline-block">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleDropdown(userId);
                      }}
                      className="px-3 py-1 text-gray-700 hover:text-black focus:outline-none"
                      disabled={actionLoading}
                    >
                      {actionLoading && actionLoading.includes(userId) ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                      ) : (
                        "⋮"
                      )}
                    </button>

                    {openDropdownUserId === userId && (
                      <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50">
                        <div className="py-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSendResetEmail(userId, userEmail);
                            }}
                            disabled={actionLoading}
                            className="block w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 text-left disabled:opacity-50"
                          >
                            Send Password Reset
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleResetDevice(userId, userEmail);
                            }}
                            disabled={actionLoading}
                            className="block w-full px-4 py-2 text-sm text-blue-600 hover:bg-blue-100 text-left disabled:opacity-50"
                          >
                            Reset Device
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(userId, userEmail);
                            }}
                            disabled={actionLoading}
                            className="block w-full px-4 py-2 text-sm text-red-600 hover:bg-red-100 text-left border-t border-gray-200 disabled:opacity-50"
                          >
                            Delete User
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Mobile Layout */}
              <div className="lg:hidden p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center flex-1 min-w-0">
                    <div className="h-12 w-12 flex-shrink-0 bg-blue-500 rounded-full flex items-center justify-center text-white font-medium">
                      {userName.charAt(0).toUpperCase()}
                    </div>
                    <div className="ml-3 flex-1 min-w-0">
                      <p className="text-base font-medium text-gray-900 truncate">
                        {userName}
                      </p>
                      <p className="text-sm text-gray-500 truncate">
                        {userEmail}
                      </p>
                      <p className="text-xs text-gray-400">
                        Device: {deviceStatus}
                      </p>
                    </div>
                  </div>

                  <div className="relative">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleDropdown(userId);
                      }}
                      className="p-2 text-gray-400 hover:text-gray-600"
                      disabled={actionLoading}
                    >
                      {actionLoading && actionLoading.includes(userId) ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                      ) : (
                        "⋮"
                      )}
                    </button>

                    {openDropdownUserId === userId && (
                      <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50">
                        <div className="py-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSendResetEmail(userId, userEmail);
                            }}
                            disabled={actionLoading}
                            className="block w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 text-left disabled:opacity-50"
                          >
                            Send Password Reset
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleResetDevice(userId, userEmail);
                            }}
                            disabled={actionLoading}
                            className="block w-full px-4 py-2 text-sm text-blue-600 hover:bg-blue-100 text-left disabled:opacity-50"
                          >
                            Reset Device
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(userId, userEmail);
                            }}
                            disabled={actionLoading}
                            className="block w-full px-4 py-2 text-sm text-red-600 hover:bg-red-100 text-left border-t border-gray-200 disabled:opacity-50"
                          >
                            Delete User
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pl-15">
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                      Department
                    </p>
                    <span className="inline-flex px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                      {userDepartment}
                    </span>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                      Role
                    </p>
                    <span className="inline-flex px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                      {userRole}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
