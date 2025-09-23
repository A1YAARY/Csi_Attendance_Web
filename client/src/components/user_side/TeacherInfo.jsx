import React, { useEffect, useState } from "react";
// import { motion } from 'framer-motion'
import Navbar from "./Navbar";
import { Link, useNavigate } from "react-router-dom";
import { div } from "framer-motion/client";

const TeacherInfo = () => {
  const [loading, setLoading] = useState(true);
  const [userTeacher, setUserTeacher] = useState(null);
  const user = JSON.parse(localStorage.getItem("userData"));
  // useEffect(() => {
  //   if (user) {
  //     setTimeout(() => {
  //     setUserTeacher(userData);
  //     setLoading(false);
  //   }, 1000); // adjust delay as needed
  //     console.log(user);
  //   }
  // }, [user]);
  useEffect(() => {
    // Simulate fetching user from localStorage
    const userData = JSON.parse(localStorage.getItem("userData"));
    
    // Optional: simulate delay
    setTimeout(() => {
      setUserTeacher(userData);
      setLoading(false);
    }, 1000); // adjust delay as needed
  }, []);
  const Dashboard = () => navigate("/dashboard");
  const navigate = useNavigate();
  const hidden = () => {
    navigate("/ScanQR");
  };
  if (loading) {
    return (
      <div className="p-4 sm:p-6 bg-gray-50 min-h-screen flex justify-center items-center">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          <p className="ml-4 text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }
  return (
    // <motion.div
    //     initial = {{ opacity:1 ,x:100}}
    //     animate = {{ opacity:1 ,x:0}}
    //     exit={{opacity:0 , x:-100}}
    //     transition = {{duration:0.2}}
    // >
    <div className="flex flex-col w-full min-h-screen">
      <Navbar />
      {user.role !== "user" ? (
        <button
          onClick={() => {
            navigate("/admin");
          }}
          className="btn btn-dash btn-secondary w-[150px] absolute right-30 top-14 text-red-600 hover:bg-red-200"
        >
          ADMIN
        </button>
      ) : (
        ""
      )}
      {/* Main content container with responsive padding and spacing */}
      <div className="flex-1 flex flex-col justify-center items-center px-4 sm:px-6 lg:px-8 pt-16 sm:pt-20 lg:pt-24 pb-8">
        {/* Avatar section with responsive sizing */}
        <div className="flex justify-center items-center mb-8 sm:mb-12 lg:mb-16">
          <div className="avatar flex flex-col justify-center items-center">
            <img
              src="/Avatar.png"
              alt="avatar"
              className="h-[140px] w-[140px] sm:h-[160px] sm:w-[160px] lg:h-[182px] lg:w-[182px] xl:h-[200px] xl:w-[200px]"
            />
            <span className="font-medium text-[20px] sm:text-[22px] lg:text-[24px] xl:text-[28px] mt-3 sm:mt-4">
              {user?.name}
            </span>
            <span className="text-gray-600 text-[14px] sm:text-[15px] lg:text-[16px] xl:text-[18px] mt-1">
              Teacher, EXTC dept.
            </span>
          </div>
        </div>

        {/* Action buttons section with responsive layout */}
        <div className="w-full max-w-sm sm:max-w-md lg:max-w-lg">
          <div className="flex flex-col justify-center items-center gap-3 sm:gap-4 px-4 sm:px-0">
            <span className="text-xs sm:text-sm text-gray-600 mb-1">
              Scan QR to mark attendance
            </span>

            <button
              onClick={hidden}
              className="flex justify-center items-center rounded-lg text-sm sm:text-base font-medium gap-3 bg-[#1D61E7] hover:bg-[#1a56d1] text-white w-full h-[48px] sm:h-[52px] lg:h-[56px] shadow-[0px_4px_4px_0px_#00000040] active:shadow-[0px_2px_1px_0px_#00000040] transition-all duration-200"
            >
              Scan QR
              <img
                src="/Vector.png"
                className="h-[18px] sm:h-[20px] lg:h-[22px]"
                alt=""
              />
            </button>

            <button
              onClick={Dashboard}
              className="flex justify-center items-center rounded-lg text-sm sm:text-base font-medium border-[1px] border-slate-200 hover:border-slate-300 hover:bg-slate-50 w-full h-[48px] sm:h-[52px] lg:h-[56px] transition-all duration-200"
            >
              View Previous Attendance
            </button>
          </div>
        </div>
      </div>
    </div>
    // </motion.div>
  );
};

export default TeacherInfo;
