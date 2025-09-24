import React from "react";
import { FaSearch, FaUserCircle } from "react-icons/fa";

const Navbar = () => {
  return (
    <div className="flex items-center justify-between px-6 py-4 shadow-md bg-white relative">
      
      {/* Left: Logo + Title */}
      <div className="flex items-center space-x-4 h-4">
        <img src="/Atharva-logo.svg" alt="Atharva Logo" className="h-8 w-auto" />
        <h1 className="font-semibold text-lg">Atharva University</h1>
      </div>

      {/* Center: Search Bar */}
      <div className="absolute left-1/2 transform -translate-x-1/2 w-1/2">
        <div className="relative">
          <input
            type="text"
            placeholder="Search"
            className="w-full pl-4 pr-10 py-2 border rounded-full text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          <FaSearch className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
        </div>
      </div>

      {/* Right: My Account */}
      <div className="flex items-center space-x-2 text-blue-600 cursor-pointer">
        <FaUserCircle size={20} />
        <span className="font-medium">My Account</span>
      </div>
    </div>
  );
};

export default Navbar
