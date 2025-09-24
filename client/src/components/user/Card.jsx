import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import TimeProgressBar from "./TimeProgressBar";

function Card() {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <>
      <div className="relative  border border-slate-300 overflow-hidden rounded-[16px] py-[18px] px-[16px] flex flex-col transition-all duration-500 shadow-[0px_5px_10px_0px_#00000025] hover:shadow-[0px_5px_10px_0px_#00000040] h-[auto]">
        <div className="absolute inset-0 bg-[url('/src/assets/bg.jpeg')] bg-cover bg-center opacity-50 w-[100vw]"></div>

        <div className="z-10 flex flex-col gap-[10px] overflow-hidden">
          <div className="flex justify-between items-center">
            <p className="text-[20px] font-bold text-xl">Today's Session</p>
            <button
              className="cursor-pointer transition-transform duration-300"
              onClick={() => setIsExpanded((prev) => !prev)}>
              <motion.img
                src="src/assets/ic_baseline-arrow-back-ios.png"
                alt="toggle"
                animate={{ rotate: isExpanded ? 180 : 360 }}
                transition={{ duration: 0.4, ease: "easeInOut" }}
              />
            </button>
          </div>

          <div className="flex justify-between">
            <div className="w-[84px] font-semibold">
              <h4 className="text-[12px] text-[#6C7278]">Entry:</h4>
              <div className="flex">
                <p className="text-[20px]">
                  09:40 <span className="text-[12px]">A.M</span>
                </p>
              </div>
            </div>
            <div className="w-[84px] font-semibold">
              <h4 className="text-[12px] text-[#6C7278]">Exit:</h4>
              <div className="flex">
                <p className="text-[20px]">
                  -- <span className="text-[12px]">{/*P.M*/}</span>
                </p>
              </div>
            </div>

          </div>

          <TimeProgressBar />

          <div className="flex justify-between">
            <div className="w-[84px] font-semibold">
              <h4 className="text-[12px] text-[#6C7278]">Status:</h4>
              <p className="text-[16px] text-[#D56E07]">Ongoing</p>
            </div>
            <div className="w-[84px] font-semibold">
              <h4 className="text-[12px] text-[#6C7278]">Time Elapsed:</h4>
              <div>
                <p className="text-[16px]">2hr 54 m</p>
              </div>
            </div>
            <div className="w-[84px] font-semibold">
              <h4 className="text-[12px] text-[#6C7278]">Reminder:</h4>
              <div>
                <p className="text-[16px]">2 m</p>
              </div>
            </div>
          </div>
          <div className="overflow-hidden">
            <AnimatePresence initial={false}>
              {isExpanded && (
                <motion.div
                  key="details"
                  initial={{ y: -301, opacity: 0, maxHeight: 0 }}
                  animate={{ y: 1, opacity: 1, maxHeight: 500 }}
                  exit={{ y: -301, opacity: 0, maxHeight: 0 }}
                  transition={{ duration: 0.5, ease: "easeInOut" }}
                  className="w-[100%] h-[auto] rounded-[10px]">
                  <div className="py-[25px] px-[4px] w-[84px] font-semibold flex flex-col gap-[18px]">
                    <h4 className="text-[12px] text-[#6C7278]">Details:</h4>
                    <div className="flex flex-col gap-[12px]">
                      <h5 className="text-[14px]">Name:</h5>
                      <p className="text-[12px] font-normal">John Smith</p>
                    </div>
                    <div className="flex flex-col gap-[12px] w-[150px]">
                      <h5 className="text-[14px]">Employee ID:</h5>
                      <p className="text-[12px] font-normal">EMP0234</p>
                    </div>
                    <div className="flex flex-col gap-[12px]">
                      <h5 className="text-[14px]">Department:</h5>
                      <p className="text-[12px] font-normal">EXTC</p>
                    </div>
                    <div className="flex flex-col gap-[12px]">
                      <h5 className="text-[14px]">Date:</h5>
                      <p className="text-[12px] font-normal">05/07/2025</p>
                    </div>
                    <div className="flex w-[300px]">
                      <div className="flex w-[150px] flex-col gap-[12px]">
                        <h5 className="text-[14px]">Check-in time:</h5>
                        <p className="text-[12px] font-normal">08:45</p>
                      </div>
                      <div className="flex w-[150px] flex-col gap-[12px]">
                        <h5 className="text-[14px]">Check-out time:</h5>
                        <p className="text-[12px] font-normal">--</p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </>
  );
}

export default Card;
