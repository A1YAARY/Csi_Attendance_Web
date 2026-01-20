import React, { useEffect, useState } from "react";
import { useAuth } from "../../context/authStore";
import { Search, Menu, X, Bell } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";

export const Admin_Navbar = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);

  const BASE_URL = import.meta.env.VITE_BACKEND_BASE_URL || "http://localhost:5173";

  // Fetch notification count
  const fetchNotificationCount = async () => {
    try {
      const token = localStorage.getItem("accessToken");
      const response = await axios.get(`${BASE_URL}/admin/device-change-requests`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.data.success) {
        setNotificationCount(response?.data?.requests?.length);
      }
    } catch (error) {
      console.error("Error fetching notification count:", error);
    }
  };

  // Fetch notification count on component mount and periodically
  useEffect(() => {
    if (user?.role === "organization") {
      fetchNotificationCount();
      // Refresh notification count every 30 seconds
      const interval = setInterval(fetchNotificationCount, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);



  // Handler when a nav item is clicked
  const handleNavChange = (path) => {
    navigate(path);
    setIsMobileMenuOpen(false);
  };

  // Handle logout functionality
  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  // Handle profile navigation
  const handleProfile = () => {
    navigate("/profile");
  };

  // Handle settings navigation
  const handleSettings = () => {
    navigate("/admin/settings"); // Ensure this route exists or redirect
  };

  // Handle notifications click
  const handleNotifications = () => {
    navigate("/admin/notifications");
    setIsMobileMenuOpen(false);
  };

  const navItems = [
    { id: "nav-home", path: "/admin/dashboard", icon: "/Home.svg", label: "Home" },
    {
      id: "nav-employees",
      path: "/admin/employees",
      icon: "/Employees.svg",
      label: "Employees",
    },
    {
      id: "nav-records",
      path: "/admin/records",
      icon: "/Record.svg",
      label: "Records",
    },
    {
      id: "nav-reports",
      path: "/admin/reports",
      icon: "/register-svgrepo-com.svg",
      label: "Registration",
    },
    { id: "nav-qr", path: "/admin/qrcodes", icon: "/QR.svg", label: "QR" },
    {
      id: "nav-ai",
      path: "/admin/ai",
      icon: (
        <svg
          className="w-4 h-4 sm:w-5 sm:h-5"
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          <path d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2ZM21 9V7L15 1H5C3.9 1 3 1.9 3 3V21C3 22.1 3.9 23 5 23H19C20.1 23 21 22.1 21 21V9M19 21H5V3H13V9H19V21Z" />
        </svg>
      ),
      label: "AI Analytics",
    },
    {
      id: "nav-voice",
      path: "/admin/voice",
      icon: (
        <svg
          className="w-4 h-4 sm:w-5 sm:h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
        </svg>
      ),
      label: "Voice Assistant",
    },
  ];

  const isActiveView = (path) => {
    // Check if current location includes the path
    // For specific matches like 'dashboard', strict check might be better if we have nested routes
    // But since paths are unique enough (/admin/dashboard vs /admin/records), startsWith or includes is fine.
    // However, simplest is:
    return location.pathname.startsWith(path);
  };

  return (
    <div className="w-full">
      {/* Top navbar - Ultra responsive */}
      <div className="bg-base-200 shadow-sm border-b border-gray-200">
        <div className="flex items-center justify-between px-2 xs:px-4 sm:px-6 md:px-8 lg:px-16 xl:px-24 2xl:px-32 py-3 sm:py-4 lg:py-6">
          {/* Logo Section */}
          <div className="flex-shrink-0">
            <img
              className="h-8 xs:h-10 sm:h-12 md:h-14 lg:h-16 xl:h-18 2xl:h-20 w-auto max-w-[120px] xs:max-w-[140px] sm:max-w-[180px] md:max-w-[200px] lg:max-w-[240px] xl:max-w-[280px]"
              src="/logo.svg"
              alt="Logo"
            />
          </div>

          {/* User Profile Section */}
          <div className="flex items-center gap-2">
            {/* Notification Icon */}
            <div className="relative">
              <button
                onClick={handleNotifications}
                className={`btn btn-ghost btn-sm sm:btn-md p-1 sm:p-2 relative ${isActiveView("notifications")
                  ? "bg-blue-50 text-blue-600"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                  }`}
              >
                <Bell className="w-5 h-5 sm:w-6 sm:h-6" />
                {notificationCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 sm:h-5 sm:w-5 flex items-center justify-center font-medium text-[10px] sm:text-xs">
                    {notificationCount > 99 ? '99+' : notificationCount}
                  </span>
                )}
              </button>
            </div>

            <div className="dropdown dropdown-end">
              <div
                tabIndex={0}
                role="button"
                className="btn btn-ghost btn-sm sm:btn-md p-1 sm:p-2"
              >
                <div className="flex items-center gap-1 xs:gap-2">
                  <img
                    className="w-4 h-4 xs:w-5 xs:h-5 sm:w-6 sm:h-6"
                    alt="Profile"
                    src="/profile.svg"
                  />
                  <p className="text-[#1D61E7] text-xs xs:text-sm sm:text-base hidden xs:block max-w-[60px] sm:max-w-[100px] md:max-w-none truncate">
                    {user?.name ? `Hi, ${user.name.split(" ")[0]}` : "Account"}
                  </p>
                </div>
              </div>
              <ul
                tabIndex={0}
                className="menu menu-sm dropdown-content bg-base-100 rounded-box z-[100] mt-3 w-44 sm:w-52 p-2 shadow-lg border border-gray-200"
              >
                <li>
                  <a
                    onClick={handleProfile}
                    className="justify-between cursor-pointer text-sm"
                  >
                    Profile
                    <span className="badge badge-primary badge-xs sm:badge-sm">
                      {user?.role === "organization" ? "Admin" : "User"}
                    </span>
                  </a>
                </li>
                <li>
                  <a
                    onClick={handleSettings}
                    className="cursor-pointer text-sm"
                  >
                    Settings
                  </a>
                </li>
                <li>
                  <hr className="my-1" />
                </li>
                <li>
                  <a
                    onClick={handleLogout}
                    className="cursor-pointer text-red-600 hover:bg-red-50 text-sm"
                  >
                    🚪 Logout
                  </a>
                </li>
              </ul>
            </div>

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="btn btn-ghost btn-sm sm:btn-md p-1 sm:p-2 xl:hidden"
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? (
                <X className="w-5 h-5 sm:w-6 sm:h-6" />
              ) : (
                <Menu className="w-5 h-5 sm:w-6 sm:h-6" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Desktop Navigation - Shows from XL (1280px+) */}
      <div className="bg-white border-b border-gray-300 hidden xl:block">
        <div className="flex justify-center px-4 lg:px-8 xl:px-16 2xl:px-24">
          <ul className="flex items-center gap-2 lg:gap-6 xl:gap-8 2xl:gap-12 py-4 lg:py-6">
            {navItems.map((item) => (
              <li key={item.id}>
                <input
                  type="radio"
                  name="nav-menu"
                  id={item.id}
                  className="hidden peer"
                  onChange={() => handleNavChange(item.path)}
                  checked={isActiveView(item.path)}
                />
                <label
                  htmlFor={item.id}
                  className="peer-checked:bg-primary peer-checked:text-black rounded-lg px-3 lg:px-4 xl:px-6 py-2 lg:py-3 gap-2 text-sm lg:text-base xl:text-lg font-medium flex items-center cursor-pointer transition-all duration-200 hover:bg-gray-100 hover:scale-105"
                >
                  {typeof item.icon === "string" ? (
                    <img
                      src={item.icon}
                      alt={item.label.toLowerCase()}
                      className="w-4 h-4 lg:w-5 lg:h-5"
                    />
                  ) : (
                    item.icon
                  )}
                  <span className="whitespace-nowrap">{item.label}</span>
                </label>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Tablet Navigation - Shows from MD to XL (768px-1279px) */}
      <div className="bg-white border-b border-gray-300 hidden md:block xl:hidden">
        <div className="flex justify-center px-4 md:px-6 lg:px-8">
          <ul className="flex items-center gap-1 md:gap-2 lg:gap-4 py-3 md:py-4 overflow-x-auto">
            {navItems.map((item) => (
              <li key={`tablet-${item.id}`}>
                <button
                  onClick={() => handleNavChange(item.path)}
                  className={`rounded-lg px-2 md:px-3 lg:px-4 py-2 md:py-3 gap-1 md:gap-2 text-xs md:text-sm lg:text-base font-medium flex items-center transition-all duration-200 hover:scale-105 whitespace-nowrap ${isActiveView(item.path)
                    ? "bg-primary text-black shadow-sm"
                    : "hover:bg-gray-100"
                    }`}
                >
                  {typeof item.icon === "string" ? (
                    <img
                      src={item.icon}
                      alt={item.label.toLowerCase()}
                      className="w-3 h-3 md:w-4 md:h-4"
                    />
                  ) : (
                    item.icon
                  )}
                  <span className="hidden md:inline">{item.label}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Mobile Navigation - Shows below MD (768px) */}
      <div className="md:hidden bg-white relative">
        {/* Mobile Menu Toggle Bar */}
        <div
          className={`transition-all duration-300 ease-in-out border-b border-gray-200 ${isMobileMenuOpen ? "shadow-sm" : ""
            }`}
        >
          <div className="flex justify-between items-center px-4 py-3">
            <span className="text-gray-700 font-medium text-sm">
              Navigation Menu
            </span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">
                {navItems.find((item) => isActiveView(item.path))?.label ||
                  "Home"}
              </span>
            </div>
          </div>
        </div>

        {/* Mobile Menu Items - Collapsible */}
        <div
          className={`overflow-hidden transition-all duration-300 ease-in-out bg-white relative z-50 ${isMobileMenuOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
            }`}
        >
          <div className="px-4 pb-4 bg-gray-50">
            <ul className="space-y-1 mt-4">
              {navItems.map((item) => (
                <li key={`mobile-${item.id}`}>
                  <button
                    onClick={() => handleNavChange(item.path)}
                    className={`w-full text-left p-3 sm:p-4 rounded-lg flex items-center gap-3 transition-all duration-200 text-sm sm:text-base font-medium ${isActiveView(item.path)
                      ? "bg-primary text-black shadow-sm transform scale-[1.02]"
                      : "hover:bg-white hover:shadow-sm active:scale-95"
                      }`}
                  >
                    {typeof item.icon === "string" ? (
                      <img
                        src={item.icon}
                        alt={item.label.toLowerCase()}
                        className="w-5 h-5"
                      />
                    ) : (
                      item.icon
                    )}
                    {item.label}
                  </button>
                </li>
              ))}

              {/* Mobile Notification Button */}
              <li>
                <button
                  onClick={handleNotifications}
                  className={`w-full text-left p-3 sm:p-4 rounded-lg flex items-center gap-3 transition-all duration-200 text-sm sm:text-base font-medium ${isActiveView("notifications")
                    ? "bg-primary text-black shadow-sm transform scale-[1.02]"
                    : "hover:bg-white hover:shadow-sm active:scale-95"
                    }`}
                >
                  <div className="relative">
                    <Bell className="w-5 h-5" />
                    {notificationCount > 0 && (
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center font-medium text-[10px]">
                        {notificationCount > 9 ? '9+' : notificationCount}
                      </span>
                    )}
                  </div>
                  Notifications
                </button>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Mobile Menu Backdrop - Fixed z-index issue */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-20 z-40 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
    </div>
  );
};
