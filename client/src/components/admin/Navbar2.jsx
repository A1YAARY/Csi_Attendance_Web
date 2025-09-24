import React from "react";

const Navbar2 = () => {
  return (
    <div className="w-full flex justify-center bg-[#f9f9f9] py-4 shadow">
      <div className="flex justify-evenly px-6 items-center w-full max-w-4xl">
        {/* Home */}
        <button className="flex items-center space-x-2  text-black hover:text-blue-500 cursor-poinnter font-medium">
          <img src="/home_icon.svg" alt="home_icon" className="h-6 w-6" />
          <span>Home</span>
          
        </button>

        {/* Employees */}
        <button className="flex items-center space-x-2 text-black hover:text-blue-500 cursor-pointer">
          <img src="/employee_icon.svg" alt="employee_icon" className="h-6 w-6" />
          <span>Employees</span>
        </button>

        {/* Records */}
        <button className="flex items-center space-x-2 text-black hover:text-blue-500 cursor-pointer">
          <img src="/records_icon.svg" alt="records_icon" className="h-6 w-6" />
          <span>Records</span>
        </button>

        {/* Reports */}
        <button className="flex items-center space-x-2 text-black hover:text-blue-500 cursor-pointer">
          <img src="/report_icon.svg" alt="reports_icon" className="h-6 w-6" />
          <span>Reports</span>
        </button>

        {/* QR */}
        <button className="flex items-center space-x-2 text-black hover:text-blue-500 cursor-pointer">
          <img src="/qr_icon.svg" alt="qr_icon" className="h-6 w-6" />
          <span>QR</span>
        </button>
      </div>
    </div>
  );
};

export default Navbar2
