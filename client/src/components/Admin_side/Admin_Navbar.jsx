import React, { useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { Search } from "lucide-react";
import { useNavigate } from "react-router-dom";

export const Admin_Navbar = () => {
  const { activeAdminView, setAdminView, user, logout } = useAuth();
  const navigate = useNavigate();

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
        // Check the radio button if it matches current activeAdminView
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
  };

  // Handle logout functionality
  const handleLogout = () => {
    logout();
    navigate("/login"); // Redirect to login page after logout
  };

  // Handle profile navigation
  const handleProfile = () => {
    navigate("/profile"); // Navigate to profile page
  };

  // Handle settings navigation
  const handleSettings = () => {
    setAdminView("settings"); // Or navigate to settings page
  };

  return (
    <div className="">
      <div className="navbar bg-base-200 shadow-sm flex justify-around px-[104px] py-[24px] h-[114px]">
        <a className="">
          <img
            className=" w-[231px] h-[44px]"
            src="/logo.svg"
            alt="Logo"
          />
        </a>
        <input
          type="text"
          placeholder="Search   🔍︎"
          className="input w-24 md:w-[60%] placeholder:text-center placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-black focus:border-transparent"
        />
        <div className="dropdown dropdown-end">
          <div tabIndex={0} role="button" className="btn btn-ghost ">
            <div className="flex gap-[5px]">
              <img
                className=" w-6 "
                alt="Profile"
                src="/profile.svg"
              />
              <p className="text-[#1D61E7]">
                {user?.name ? `Hi, ${user.name.split(" ")[0]}` : "My Account"}
              </p>
            </div>
          </div>
          <ul
            tabIndex={0}
            className="menu menu-sm dropdown-content bg-base-100 rounded-box z-[1] mt-3 w-52 p-2 shadow"
          >
            <li>
              <a
                onClick={handleProfile}
                className="justify-between cursor-pointer"
              >
                Profile
                <span className="badge badge-primary badge-sm">
                  {user?.role === "organization" ? "Admin" : "User"}
                </span>
              </a>
            </li>
            <li>
              <a onClick={handleSettings} className="cursor-pointer">
                Settings
              </a>
            </li>
            <li>
              <hr className="my-1" />
            </li>
            <li>
              <a
                onClick={handleLogout}
                className="cursor-pointer text-red-600 hover:bg-red-50"
              >
                🚪 Logout
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className="bg-white navbar-center hidden lg:flex justify-center border border-t-[1px] border-b-[1px] border-l-0 border-r-0 border-gray-300 w-full">
        <ul className="menu menu-horizontal px-1 py-[24px] gap-[64px]">
          {/* Home */}
          <li>
            <input
              type="radio"
              name="nav-menu"
              id="nav-home"
              className="hidden peer"
              onChange={() => handleNavChange("home")}
            />
            <label
              htmlFor="nav-home"
              className="peer-checked:bg-primary peer-checked:text-black rounded-[10px] p-[15px] gap-[5px] text-[16px] font-normal flex items-center cursor-pointer transition hover:bg-gray-100"
            >
              <img src="/Home.svg" alt="home" />
              Home
            </label>
          </li>

          {/* Employees */}
          <li>
            <input
              type="radio"
              name="nav-menu"
              id="nav-employees"
              className="hidden peer"
              onChange={() => handleNavChange("employees")}
            />
            <label
              htmlFor="nav-employees"
              className="peer-checked:bg-primary peer-checked:text-black rounded-[10px] p-[15px] gap-[5px] text-[16px] font-normal flex items-center cursor-pointer transition hover:bg-gray-100"
            >
              <img src="/Employees.svg" alt="employees" />
              Employees
            </label>
          </li>

          {/* Records */}
          <li>
            <input
              type="radio"
              name="nav-menu"
              id="nav-records"
              className="hidden peer"
              onChange={() => handleNavChange("records")}
            />
            <label
              htmlFor="nav-records"
              className="peer-checked:bg-primary peer-checked:text-black rounded-[10px] p-[15px] gap-[5px] text-[16px] font-normal flex items-center cursor-pointer transition hover:bg-gray-100"
            >
              <img src="/Record.svg" alt="records" />
              Records
            </label>
          </li>

          {/* Reports */}
          <li>
            <input
              type="radio"
              name="nav-menu"
              id="nav-reports"
              className="hidden peer"
              onChange={() => handleNavChange("reports")}
            />
            <label
              htmlFor="nav-reports"
              className="peer-checked:bg-primary peer-checked:text-black rounded-[10px] p-[15px] gap-[5px] text-[16px] font-normal flex items-center cursor-pointer transition hover:bg-gray-100"
            >
              <img src="/Report.svg" alt="reports" />
              Reports
            </label>
          </li>

          {/* QR */}
          <li>
            <input
              type="radio"
              name="nav-menu"
              id="nav-qr"
              className="hidden peer"
              onChange={() => handleNavChange("qr")}
            />
            <label
              htmlFor="nav-qr"
              className="peer-checked:bg-primary peer-checked:text-black rounded-[10px] p-[15px] gap-[5px] text-[16px] font-normal flex items-center cursor-pointer transition hover:bg-gray-100"
            >
              <img src="/QR.svg" alt="qr" />
              QR
            </label>
          </li>

          {/* AI Analytics - NEW */}
          <li>
            <input
              type="radio"
              name="nav-menu"
              id="nav-ai"
              className="hidden peer"
              onChange={() => handleNavChange("ai")}
            />
            <label
              htmlFor="nav-ai"
              className="peer-checked:bg-primary peer-checked:text-black rounded-[10px] p-[15px] gap-[5px] text-[16px] font-normal flex items-center cursor-pointer transition hover:bg-gray-100"
            >
              {/* You can replace this with your AI icon if you have one */}
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2ZM21 9V7L15 1H5C3.9 1 3 1.9 3 3V21C3 22.1 3.9 23 5 23H19C20.1 23 21 22.1 21 21V9M19 21H5V3H13V9H19V21Z" />
              </svg>
              AI Analytics
            </label>
          </li>
        </ul>
      </div>
    </div>
  );
};
