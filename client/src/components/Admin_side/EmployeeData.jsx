import React, { useEffect , useState , useRef} from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export const EmployeeData = ({ allusers }) => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const [openDropdownUserId, setOpenDropdownUserId] = useState(null);
  const { deleteUser } = useAuth();
  const [users, setUsers] = useState(allusers); // Local state
  useEffect(() => {
  setUsers(allusers);
}, [allusers]);




  const toggleDropdown = (userId) => {
  setOpenDropdownUserId((prev) => (prev === userId ? null : userId));
};


  const handleReset = () => {
    // alert('Reset clicked');
    setIsOpen(false);
  };

  // const handleDelete = (userId) => {
  //   // alert('Delete clicked');
  //   setIsOpen(false);
  //   deleteUser(userId);
  // };
  const handleDelete = (userId) => {
  try {
    deleteUser(userId); // API call
    setUsers((prev) => prev.filter((user) => (user._id || user.id) !== userId)); // Remove from local state
    setOpenDropdownUserId(null); // Close dropdown
  } catch (error) {
    console.error("Error deleting user:", error);
    alert("Failed to delete user.");
  }
};


  // Close dropdown if clicked outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // useEffect(() => {
  //   console.log("EmployeeData received allusers:", allusers);
  //   console.log("allusers type:", typeof allusers);
  //   console.log("allusers is array:", Array.isArray(allusers));
  //   console.log("allusers length:", allusers?.length);
  // }, [allusers]);

  // Handle clicking on user row to navigate to single user page
  const handleUserClick = (userId, userEmail) => {
    // console.log("Navigating to user ID:", userId);
    // console.log("User email:", userEmail);
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
    // console.log("Checkbox changed for user:", userId);
  };

  // Handle three dots menu click
  const handleMenuClick = (event, userId) => {
    event.stopPropagation();
    // console.log("Menu clicked for user:", userId);
  };

  // Check if allusers is valid and has data
  if (!allusers || !Array.isArray(allusers)) {
    console.error("allusers is not a valid array:", allusers);
    return (
      <div className="bg-white rounded-lg shadow-sm p-6 sm:p-8 text-center">
        <div className="text-red-500 text-4xl sm:text-6xl mb-4">⚠️</div>
        <h3 className="text-lg sm:text-xl font-semibold text-gray-800 mb-2">
          Invalid user data
        </h3>
        <p className="text-sm sm:text-base text-gray-600">
          Please check the data format
        </p>
      </div>
    );
  }

  if (allusers.length === 0) {
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
        {users.map((record, index) => {
          const userId = record._id || record.id || `user-${index}`;
          const userName = record.name || record.fullName || "Unknown User";
          const userEmail = record.email || "No email provided";
          const userDepartment = record.department || "N/A";
          const userRole = record.role || "N/A";

          return (
            <div
              key={userId}
              onClick={() => handleUserClick(userId, userEmail)}
              className="cursor-pointer hover:bg-gray-50 transition-colors duration-200"
            >
              {/* Desktop Layout - Hidden on mobile */}
              <div className="hidden lg:grid lg:grid-cols-12 lg:gap-4 lg:p-4 lg:items-center">
                <div className="col-span-1 flex justify-center">
                  <input
                    type="checkbox"
                    onClick={(e) => handleCheckboxChange(e, userId)}
                    className="rounded w-4 h-4"
                  />
                </div>
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
                    </div>
                  </div>
                </div>
                <div className="col-span-3">
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
                    {formatWorkingHours(record.workingHours)}
                  </span>
                    {/* <svg
                      className="w-4 h-4"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                    </svg> */}
          
                  <div className="relative inline-block">
  <button
    onClick={(e) => {
      e.stopPropagation();
      toggleDropdown(userId);
    }}
    className="px-2 py-1 text-xl text-gray-700 hover:text-black focus:outline-none"
  >
    ⋮
  </button>
  </div>

  {openDropdownUserId === userId && (
    <div className="absolute right-15 mt-2 w-36 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50">
      <div className="py-1">
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleReset(userId);
            setOpenDropdownUserId(null);
          }}
          className="block w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 text-left"
        >
          Reset
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleDelete(userId);
            setOpenDropdownUserId(null);
          }}
          className="block w-full px-4 py-2 text-sm text-red-600 hover:bg-red-100 text-left border-t border-black"
        >
          Delete
        </button>
      </div>
    </div>
  )}


                </div>
              </div>

              {/* Mobile/Tablet Layout - Hidden on desktop */}
              <div className="lg:hidden p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center flex-1 min-w-0">
                    <input
                      type="checkbox"
                      onClick={(e) => handleCheckboxChange(e, userId)}
                      className="rounded w-4 h-4 mr-3 mt-1 flex-shrink-0"
                    />
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
                        ID: {userId.slice(-6)}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={(e) => handleMenuClick(e, userId)}
                    className="text-gray-400 hover:text-gray-600 p-1 flex-shrink-0"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                    </svg>
                  </button>
                </div>

                {/* Mobile Info Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pl-16 sm:pl-0">
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

                  <div className="bg-gray-50 p-3 rounded-lg sm:col-span-2">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                      Work Hours
                    </p>
                    <p className="text-sm text-gray-700">
                      {formatWorkingHours(record.workingHours)}
                    </p>
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
