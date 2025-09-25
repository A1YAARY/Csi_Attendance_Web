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
    }, 1200); // delay for smoother effect
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="h-[100dvh] bg-white">
      <div className="w-full h-full flex justify-center relative overflow-hidden">
        <AnimatePresence mode="wait">
          {/* LOGO STEP */}
          {(step === "logoOnly" || step === "logoAndText") && (
            <motion.div
              key="logo"
              className="absolute flex flex-col items-center justify-center h-screen"
              initial={{ scale: 0, y: 0, opacity: 0 }}
              animate={{
                scale: step === "logoOnly" ? 1 : 0.7,
                y: step === "logoOnly" ? 0 : -260, // smooth upward movement
                opacity: 1, // never fades out
              }}
              transition={{
                type: "spring",
                stiffness: 90,
                damping: 18,
              }}
            >
              {/* Logo Image */}
              <motion.img
                src="/Checkmark.png"
                alt="Checkmark"
                className="h-[156px] w-[152px]"
                transition={{
                  type: "spring",
                  stiffness: 150,
                  damping: 15,
                }}
              />

              {/* Logo Title */}
              <motion.span
                className="font-semibold text-[30px] mt-4"
                initial={{ opacity: 1, y: 20 }}
                animate={{
                //   opacity: step === "logoOnly" ? 1 : 0, // fades out as we move to details
                scale: step === "logoOnly" ? 1 : 1.3,                  
                y: step === "logoOnly" ? 0 : 10,
                }}
                transition={{ duration: 0.6 }}
              >
                Attendance Marked
              </motion.span>
            </motion.div>
          )}

          {/* DETAILS & DASHBOARD BUTTON */}
          {step === "logoAndText" && (
            <motion.div
              className="w-full h-full relative flex flex-col pb-[22px] items-center justify-end"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8, duration: 0.7 }}
            >
              {/* FADE-IN DETAILS */}
              <motion.div
                className="markedD flex flex-col items-center"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  delay: 1,
                  duration: 0.7,
                  ease: [0.16, 1, 0.3, 1],
                }}
              >
                <div className="marked flex flex-col justify-center items-center h-[100px] w-[350px] gap-[10px]">
                  <div className="text flex flex-col justify-center items-center">
                    <span className="text-gray-400">
                      Your entry has been marked
                    </span>
                  </div>
                </div>

                {/* DETAILS CARD */}
                <motion.div
                  className="detail h-[450px] w-[350px] flex flex-col gap-[5px]"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.3, duration: 0.6 }}
                >
                  <span className="font-semibold">Details:</span>
                  <div className="info flex flex-col justify-center items-center h-[410px] border-slate-300 border-[1px] rounded-2xl shadow-md bg-white">
                    {[
                      ["Name",user?.name || "N/A"],
                      ["Employee ID", user?.id || "N/A"],
                      ["Department", "EXTC"],
                      ["Date", new Date().toLocaleDateString()],
                    ].map(([label, value], i) => (
                      <motion.div
                        key={i}
                        className="info1 h-[64px] w-[310px] flex flex-col gap-[12px]"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 1.5 + i * 0.1 }}
                      >
                        <span className="text-sm font-semibold">{label}</span>
                        <span className="text-xs text-gray-500">{value}</span>
                      </motion.div>
                    ))}

                    {/* Check-in & Check-out */}
                    <motion.div
                      className="info1 h-[64px] w-[310px] flex justify-between"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 1.9 }}
                    >
                      <div className="checkIn flex flex-col gap-[12px]">
                        <span className="text-sm font-semibold">
                          Check-in time
                        </span>
                        <span className="text-xs text-gray-500">9:40 AM</span>
                      </div>
                      <div className="checkOut flex flex-col gap-[12px]">
                        <span className="text-sm font-semibold">
                          Check-out time
                        </span>
                        <span className="text-xs text-gray-500">---</span>
                      </div>
                    </motion.div>
                  </div>

                  {/* BUTTON */}
                  <motion.button
                    onClick={hidden3}
                    className="flex justify-center items-center mt-[20px] rounded-lg text-sm gap-3 bg-[#1D61E7] text-white w-[350px] h-[48px] shadow-[0px_4px_4px_0px_#00000040]"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    transition={{ type: "spring", stiffness: 200, damping: 12 }}
                  >
                    Go to Dashboard
                  </motion.button>
                </motion.div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default AnimationPage;
