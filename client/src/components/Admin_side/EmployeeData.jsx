import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export const EmployeeData = ({ allusers }) => {
  const navigate = useNavigate();

  useEffect(() => {
    console.log("EmployeeData received allusers:", allusers);
    console.log("allusers type:", typeof allusers);
    console.log("allusers is array:", Array.isArray(allusers));
    console.log("allusers length:", allusers?.length);
  }, [allusers]);

  // Handle clicking on user row to navigate to single user page
  const handleUserClick = (userId, userEmail) => {
    console.log("Navigating to user ID:", userId);
    console.log("User email:", userEmail);
    navigate(`/admin/user/${userId}`);
  };

  // Format working hours display
  const formatWorkingHours = (workingHours) => {
    if (!workingHours) return "N/A";

    if (typeof workingHours === "object") {
      return `${workingHours.start || "09:00"} - ${
        workingHours.end || "17:00"
      }`;
    }

    if (typeof workingHours === "string") {
      return workingHours;
    }

    return "N/A";
  };

  // Handle checkbox change
  const handleCheckboxChange = (event, userId) => {
    event.stopPropagation();
    console.log("Checkbox changed for user:", userId);
  };

  // Handle three dots menu click
  const handleMenuClick = (event, userId) => {
    event.stopPropagation();
    console.log("Menu clicked for user:", userId);
  };

  // Check if allusers is valid and has data
  if (!allusers || !Array.isArray(allusers)) {
    console.error("allusers is not a valid array:", allusers);
    return (
      <div className="text-center py-12">
        <div className="mx-auto h-24 w-24 text-red-400">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
            />
          </svg>
        </div>
        <p className="mt-4 text-lg text-red-600">Invalid user data</p>
        <p className="text-sm text-gray-400">Please check the data format</p>
      </div>
    );
  }

  if (allusers.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="mx-auto h-24 w-24 text-gray-400">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1"
              d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z"
            />
          </svg>
        </div>
        <p className="mt-4 text-lg text-gray-600">No users found</p>
        <p className="text-sm text-gray-400">
          Users will appear here once they register
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {allusers.map((record, index) => {
        // Ensure we have a valid user object
        if (!record || typeof record !== "object") {
          console.warn(`Invalid user record at index ${index}:`, record);
          return null;
        }

        const userId = record._id || record.id || `user-${index}`;
        const userName = record.name || "Unknown User";
        const userEmail = record.email || "N/A";
        const userDepartment = record.department || "N/A";
        const userRole = record.role || "N/A";

        return (
          <div
            key={userId}
            onClick={() => handleUserClick(userId, userEmail)}
            className="border-[0.5px] border-[#00000033] rounded-[10px] flex justify-between p-[24px] gap-[10px] text-[14px] text-[#6C7278] font-normal cursor-pointer hover:bg-gray-50 transition-all duration-200 hover:shadow-md"
          >
            <div className="flex gap-[16px] items-center">
              <input
                type="checkbox"
                onClick={(e) => handleCheckboxChange(e, userId)}
                className="cursor-pointer w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <div className="relative">
                <img
                  className="h-[44px] w-[44px] rounded-full object-cover border-2 border-gray-200"
                  src={
                    record.profileImage ||
                    `https://ui-avatars.com/api/?name=${encodeURIComponent(
                      userName
                    )}&size=44&background=4F46E5&color=fff&rounded=true`
                  }
                  alt={userName}
                  onError={(e) => {
                    e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                      userName
                    )}&size=44&background=4F46E5&color=fff&rounded=true`;
                  }}
                />
                {record.isActive !== false && (
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
                )}
              </div>
              <div>
                <p className="text-[16px] font-medium text-black">{userName}</p>
                <p className="text-[12px] text-gray-500">
                  ID: {userId.slice(-6)}
                </p>
              </div>
            </div>
            <div className="flex justify-between w-[60%] items-center">
              <div className="flex-1 truncate">
                <p className="font-medium">{userEmail}</p>
              </div>
              <div className="flex-1 truncate text-center">
                <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                  {userDepartment}
                </span>
              </div>
              <div className="flex-1 truncate text-center">
                <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">
                  {userRole}
                </span>
              </div>
              <div className="flex-1 truncate text-center">
                <p className="text-xs">
                  {formatWorkingHours(record.workingHours)}
                </p>
              </div>
            </div>
            <button
              onClick={(e) => handleMenuClick(e, userId)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
              </svg>
            </button>
          </div>
        );
      })}
    </div>
  );
};
