import React from "react";
import { motion } from "framer-motion";

const Details = ({ user }) => {
  return (
    <div className="w-full max-w-md sm:max-w-lg lg:max-w-xl mx-auto p-4 sm:p-6 lg:p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="bg-white rounded-lg sm:rounded-xl lg:rounded-2xl shadow-lg sm:shadow-xl border border-gray-100"
      >
        <div className="p-4 sm:p-6 lg:p-8">
          <motion.h2
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-[20px] sm:text-[24px] lg:text-[28px] xl:text-[32px] font-bold text-gray-800 mb-4 sm:mb-6 text-center"
          >
            User Details
          </motion.h2>

          <div className="space-y-3 sm:space-y-4 lg:space-y-5">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 bg-gray-50 rounded-lg"
            >
              <span className="text-[14px] sm:text-[15px] lg:text-[16px] font-medium text-gray-600 mb-1 sm:mb-0">
                Name:
              </span>
              <span className="text-[14px] sm:text-[16px] lg:text-[18px] font-semibold text-gray-800">
                {user?.name || "N/A"}
              </span>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 bg-gray-50 rounded-lg"
            >
              <span className="text-[14px] sm:text-[15px] lg:text-[16px] font-medium text-gray-600 mb-1 sm:mb-0">
                Email:
              </span>
              <span className="text-[14px] sm:text-[16px] lg:text-[18px] font-semibold text-gray-800 break-all">
                {user?.email || "N/A"}
              </span>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
              className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 bg-gray-50 rounded-lg"
            >
              <span className="text-[14px] sm:text-[15px] lg:text-[16px] font-medium text-gray-600 mb-1 sm:mb-0">
                Department:
              </span>
              <span className="text-[14px] sm:text-[16px] lg:text-[18px] font-semibold text-gray-800">
                {user?.department || "EXTC"}
              </span>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 }}
              className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 bg-gray-50 rounded-lg"
            >
              <span className="text-[14px] sm:text-[15px] lg:text-[16px] font-medium text-gray-600 mb-1 sm:mb-0">
                Role:
              </span>
              <span className="text-[14px] sm:text-[16px] lg:text-[18px] font-semibold text-blue-600">
                Teacher
              </span>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="mt-6 sm:mt-8"
          >
            <button className="w-full py-3 sm:py-4 px-4 sm:px-6 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold text-[14px] sm:text-[16px] lg:text-[18px] rounded-lg sm:rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl">
              Edit Profile
            </button>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
};

export default Details;
