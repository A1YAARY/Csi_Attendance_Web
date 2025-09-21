import React from "react";
import { Link, useNavigate } from "react-router-dom";

const Navbar = () => {
  const navigate = useNavigate();
  
  const showlogout = () => {
    navigate("/ShowLogOut");
  };

  return (
    <div className="navbar fixed top-0 left-0 right-0 z-50 w-full h-[60px] sm:h-[70px] lg:h-[80px] bg-white border-b border-slate-200 shadow-sm">
      <div className="flex justify-between items-center h-full px-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center">
          <img 
            src="/logo.svg" 
            alt="Atharva College Logo" 
            className="h-[40px] w-auto sm:h-[50px] lg:h-[60px] hover:scale-105 transition-transform duration-200"
          />
        </Link>
        
        <div className="flex items-center space-x-3 sm:space-x-4">
          <button
            onClick={showlogout}
            className="flex items-center justify-center w-[36px] h-[36px] sm:w-[40px] sm:h-[40px] lg:w-[44px] lg:h-[44px] rounded-full hover:bg-gray-100 transition-colors duration-200"
          >
            <img 
              src="/profile.svg" 
              alt="Profile" 
              className="w-[24px] h-[24px] sm:w-[28px] sm:h-[28px] lg:w-[32px] lg:h-[32px]"
            />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Navbar;
