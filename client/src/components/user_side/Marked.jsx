import React from "react";
import { motion } from "framer-motion";

const Marked = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-green-50 to-white p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="w-full max-w-md sm:max-w-lg bg-white rounded-xl sm:rounded-2xl shadow-2xl border border-gray-100"
      >
        <div className="p-6 sm:p-8 lg:p-10 text-center">
          {/* Success Icon */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="mx-auto flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 mb-4 sm:mb-6 bg-green-100 rounded-full"
          >
            <motion.svg
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ delay: 0.5, duration: 0.8 }}
              className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={3}
                d="M5 13l4 4L19 7"
              />
            </motion.svg>
          </motion.div>

          {/* Success Message */}
          <motion.h2
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="text-[20px] sm:text-[24px] lg:text-[28px] font-bold text-gray-900 mb-2 sm:mb-3"
          >
            Attendance Marked!
          </motion.h2>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="text-[14px] sm:text-[16px] lg:text-[18px] text-gray-600 mb-4 sm:mb-6"
          >
            Your attendance has been successfully recorded for today.
          </motion.p>

          {/* Time Info */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            className="p-3 sm:p-4 bg-green-50 rounded-lg mb-6 sm:mb-8"
          >
            <p className="text-[12px] sm:text-[13px] lg:text-[14px] text-green-700 font-medium">
              Marked at: {new Date().toLocaleTimeString()}
            </p>
            <p className="text-[11px] sm:text-[12px] text-green-600 mt-1">
              {new Date().toLocaleDateString()}
            </p>
          </motion.div>

          {/* Action Button */}
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.5 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => window.history.back()}
            className="w-full px-4 sm:px-6 py-3 sm:py-4 bg-green-600 hover:bg-green-700 text-white font-semibold text-[14px] sm:text-[15px] lg:text-[16px] rounded-lg sm:rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            Back to Dashboard
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
};

export default Marked;
