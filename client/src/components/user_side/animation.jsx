import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";

const AnimationPage = () => {
  const user = JSON.parse(localStorage.getItem("userData"));
  const navigate = useNavigate();

  const hidden3 = () => {
    navigate("/Dashboard");
  };

  const [step, setStep] = useState("logoOnly");

  useEffect(() => {
    const timer = setTimeout(() => {
      setStep("logoAndText");
    }, 1200);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-white p-4">
      <AnimatePresence mode="wait">
        {step === "logoOnly" && (
          <motion.div
            key="logo-animation"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="flex flex-col items-center"
          >
            <motion.div
              animate={{
                rotate: [0, 360],
                scale: [1, 1.1, 1],
              }}
              transition={{
                duration: 2,
                ease: "easeInOut",
                times: [0, 0.5, 1],
              }}
              className="relative"
            >
              <motion.img
                src="/logo.svg"
                alt="Atharva College Logo"
                className="w-[140px] h-[140px] sm:w-[180px] sm:h-[180px] lg:w-[220px] lg:h-[220px] xl:w-[250px] xl:h-[250px] drop-shadow-lg"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5, duration: 0.6 }}
                className="absolute inset-0 rounded-full border-2 border-blue-200 animate-ping"
              />
            </motion.div>
          </motion.div>
        )}

        {step === "logoAndText" && (
          <motion.div
            key="welcome-screen"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="flex flex-col items-center text-center max-w-md sm:max-w-lg lg:max-w-xl"
          >
            <motion.img
              src="/logo.svg"
              alt="Atharva College Logo"
              className="w-[100px] h-[100px] sm:w-[120px] sm:h-[120px] lg:w-[140px] lg:h-[140px] mb-6 sm:mb-8 drop-shadow-md"
              initial={{ scale: 1.3, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.6 }}
            />

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.8 }}
              className="space-y-3 sm:space-y-4"
            >
              <h1 className="text-[28px] sm:text-[32px] lg:text-[36px] xl:text-[40px] font-bold text-gray-800 leading-tight">
                Welcome Back!
              </h1>

              {user && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6, duration: 0.6 }}
                  className="text-[18px] sm:text-[20px] lg:text-[22px] text-blue-600 font-medium"
                >
                  Hello, {user.name}
                </motion.p>
              )}

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8, duration: 0.6 }}
                className="text-[14px] sm:text-[16px] lg:text-[18px] text-gray-600 px-4"
              >
                Ready to manage your attendance efficiently
              </motion.p>
            </motion.div>

            <motion.button
              onClick={hidden3}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.2, duration: 0.6 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="mt-8 sm:mt-10 px-8 sm:px-10 lg:px-12 py-3 sm:py-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold text-[14px] sm:text-[16px] lg:text-[18px] rounded-full shadow-lg hover:shadow-xl transition-all duration-200"
            >
              Get Started
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AnimationPage;
