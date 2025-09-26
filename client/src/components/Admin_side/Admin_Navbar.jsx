import React, { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { Search, Menu, X } from "lucide-react";
import { useNavigate } from "react-router-dom";

export const Admin_Navbar = () => {
  const { activeAdminView, setAdminView, user, logout } = useAuth();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);

  // Effect to sync radio buttons with activeAdminView on load and update
  useEffect(() => {
    const navIds = [
      "nav-home",
      "nav-employees",
      "nav-records",
      "nav-reports",
      "nav-qr",
      "nav-ai",
    ];
    navIds.forEach((id) => {
      const radio = document.getElementById(id);
      if (radio) {
        if (
          id === "nav-home" &&
          (activeAdminView === "home" || !activeAdminView)
        ) {
          radio.checked = true;
        } else if (id === "nav-employees" && activeAdminView === "employees") {
          radio.checked = true;
        } else if (id === "nav-records" && activeAdminView === "records") {
          radio.checked = true;
        } else if (id === "nav-reports" && activeAdminView === "reports") {
          radio.checked = true;
        } else if (
          id === "nav-qr" &&
          (activeAdminView === "qr" || activeAdminView === "qrcodes")
        ) {
          radio.checked = true;
        } else if (
          id === "nav-ai" &&
          (activeAdminView === "ai" || activeAdminView === "ai-test")
        ) {
          radio.checked = true;
        } else {
          radio.checked = false;
        }
      }
    });
  }, [activeAdminView]);

  // Handler when a nav item is clicked
  const handleNavChange = (view) => {
    setAdminView(view);
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
    setAdminView("settings");
  };

  const navItems = [
    { id: "nav-home", view: "home", icon: "/Home.svg", label: "Home" },
    {
      id: "nav-employees",
      view: "employees",
      icon: "/Employees.svg",
      label: "Employees",
    },
    {
      id: "nav-records",
      view: "records",
      icon: "/Record.svg",
      label: "Records",
    },
    {
      id: "nav-reports",
      view: "reports",
      icon: "/register-svgrepo-com.svg",
      label: "Registration",
    },
    { id: "nav-qr", view: "qr", icon: "/QR.svg", label: "QR" },
    {
      id: "nav-ai",
      view: "ai",
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
  ];

  const isActiveView = (view) => {
    if (view === "home") return activeAdminView === "home" || !activeAdminView;
    if (view === "qr")
      return activeAdminView === "qr" || activeAdminView === "qrcodes";
    if (view === "ai")
      return activeAdminView === "ai" || activeAdminView === "ai-test";
    return activeAdminView === view;
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

          {/* Search Section - Adaptive */}
          {/* <div className="flex-1 max-w-xs xs:max-w-sm sm:max-w-md md:max-w-lg lg:max-w-xl xl:max-w-2xl mx-2 xs:mx-4 sm:mx-6 lg:mx-8">
            <div className="relative">
              <input
                type="text"
                placeholder={searchFocused ? "Search..." : "🔍︎"}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
                className="w-full input input-sm sm:input-md bg-white border border-gray-300 rounded-lg text-xs xs:text-sm sm:text-base placeholder:text-center placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              />
            </div>
          </div> */}

          {/* User Profile Section */}
          <div className="flex items-center gap-2">
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
                  onChange={() => handleNavChange(item.view)}
                  checked={isActiveView(item.view)}
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
                  onClick={() => handleNavChange(item.view)}
                  className={`rounded-lg px-2 md:px-3 lg:px-4 py-2 md:py-3 gap-1 md:gap-2 text-xs md:text-sm lg:text-base font-medium flex items-center transition-all duration-200 hover:scale-105 whitespace-nowrap ${
                    isActiveView(item.view)
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
      <div className="md:hidden bg-white">
        {/* Mobile Menu Toggle Bar */}
        <div
          className={`transition-all duration-300 ease-in-out border-b border-gray-200 ${
            isMobileMenuOpen ? "shadow-sm" : ""
          }`}
        >
          <div className="flex justify-between items-center px-4 py-3">
            <span className="text-gray-700 font-medium text-sm">
              Navigation Menu
            </span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">
                {navItems.find((item) => isActiveView(item.view))?.label ||
                  "Home"}
              </span>
            </div>
          </div>
        </div>

        {/* Mobile Menu Items - Collapsible */}
        <div
          className={`overflow-hidden transition-all duration-300 ease-in-out ${
            isMobileMenuOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
          }`}
        >
          <div className="px-4 pb-4 bg-gray-50">
            <ul className="space-y-1 mt-4">
              {navItems.map((item) => (
                <li key={`mobile-${item.id}`}>
                  <button
                    onClick={() => handleNavChange(item.view)}
                    className={`w-full text-left p-3 sm:p-4 rounded-lg flex items-center gap-3 transition-all duration-200 text-sm sm:text-base font-medium ${
                      isActiveView(item.view)
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
            </ul>
          </div>
        </div>
      </div>

      {/* Mobile Menu Backdrop */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-20 z-10 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
    </div>
  );
};
