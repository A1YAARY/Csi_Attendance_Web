import React from "react";
import { motion } from "framer-motion";

const TimePass = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-purple-100 to-blue-100 p-4">
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="text-center"
      >
        <motion.h1
          className="text-[24px] sm:text-[32px] lg:text-[40px] xl:text-[48px] font-bold text-gray-800 mb-4 sm:mb-6"
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          Loading...
        </motion.h1>

        <motion.div
          className="flex justify-center space-x-2 sm:space-x-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5 bg-blue-500 rounded-full"
              animate={{
                scale: [1, 1.5, 1],
                opacity: [0.3, 1, 0.3],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                delay: i * 0.2,
              }}
            />
          ))}
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="text-[14px] sm:text-[16px] lg:text-[18px] text-gray-600 mt-6 sm:mt-8"
        >
          Please wait while we prepare everything...
        </motion.p>
      </motion.div>
    </div>
  );
};

export default TimePass;
