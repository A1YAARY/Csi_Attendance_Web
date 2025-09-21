import React from "react";
import Card from "./Card";
import Previous from "./Previous";
import Navbar from "./Navbar";
import { LoginPage } from "./LoginPage";
import { useNavigate } from "react-router-dom";

const Dashboard = () => {
  const navigate = useNavigate();
  const hidden = () => {
    navigate("/ScanQR");
  };
  const hidden1 = () => {
    navigate("/ShowLogOut");
  };
  return (
    <div className="min-h-screen w-full">
      {/* Responsive Navbar */}
      <div className="navbar w-full h-[80px] sm:h-[100px] lg:h-[110px] flex justify-between items-end p-4 sm:p-[16px] border-slate-200 border-b-[1px]">
        <img
          src="/logo.svg"
          alt="Atharva logo"
          className="h-auto max-h-[50px] sm:max-h-[60px] lg:max-h-[70px]"
        />
        <img
          onClick={hidden1}
          src="/profile.svg"
          alt="Profile"
          className="h-[32px] w-[32px] sm:h-[36px] sm:w-[36px] lg:h-[40px] lg:w-[40px] cursor-pointer hover:opacity-80 transition-opacity"
        />
      </div>

      {/* Main content with responsive padding */}
      <div className="px-4 sm:px-6 lg:px-[20px] py-4 sm:py-6 lg:py-[20px] flex flex-col gap-6 sm:gap-8 lg:gap-[30px] mb-3 sm:mb-[12px]">
        {/* Welcome section with responsive text */}
        <p className="font-bold text-[24px] sm:text-[28px] lg:text-[32px] xl:text-[36px]">
          Welcome
        </p>

        {/* Card component */}
        <Card />

        {/* Scan QR button with responsive sizing */}
        <button
          onClick={hidden}
          className="text-[13px] sm:text-[14px] lg:text-[15px] flex justify-center items-center p-3 sm:p-[10px] lg:p-[12px] bg-[#1D61E7] hover:bg-[#1a56d1] transition-all duration-200 shadow-[0px_4px_4px_0px_#00000040] active:shadow-[0px_2px_1px_0px_#00000040] rounded-[10px] gap-2 sm:gap-[8px] text-white h-[48px] sm:h-[52px] lg:h-[56px]"
        >
          <img
            src="/QR_logo.svg"
            alt="QR Code"
            className="h-[18px] w-[18px] sm:h-[20px] sm:w-[20px] lg:h-[22px] lg:w-[22px]"
          />
          <p>Scan QR</p>
        </button>

        {/* Previous Attendance section */}
        <div className="flex flex-col gap-2 sm:gap-3 lg:gap-[10px]">
          <h3 className="text-[14px] sm:text-[15px] lg:text-[16px] xl:text-[18px] font-semibold">
            Previous Attendance
          </h3>
          <div className="flex flex-col gap-2 sm:gap-3 lg:gap-4">
            <Previous />
            <Previous />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
