import React, { use, useEffect, useState  } from "react";
import {
  Users,
  FileText,
  BarChart3,
  QrCode,
  Home,
  TrendingUp,
  Clock,
  UserCheck,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
const Dashbord = () => {
  const [records, setRecords] = useState([]);
  useAuth();
  const { setAdminView, getAdminRecords  } = useAuth();
  console.log("Admin view set to home");
  const { apiHelpers, routes } = useAuth();

  useEffect(() => {
  const fetchAdminRecords = async () => {
    const data = await getAdminRecords();
    setRecords(data);
    console.log("Fetched admin records:", data);
  };
  fetchAdminRecords();
}, [getAdminRecords]);

  return (
    <div className="h-6 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
      <div className="p-6 w-[100vw]">
        {/* <h1 className="text-2xl font-bold mb-6"></h1> */}
        <div className="flex gap-[20px] justify-center ">
          <div className="border-[1px] border-[#00000033] rounded-[10px] px-[24px] py-[40px] bg-white w-[431px] h-[367px]">
            <div className="flex flex-col justify-between h-full">
              <div className="flex gap-[px] flex-col">
                <div className="text-[16px] font-medium text-black">
                  System Status:
                </div>
                <div className="flex align-center gap-[10px]">
                  <div className=" font-medium flex gap-[16px]">
                    <div className="text-[56px] leading-none">Active</div>
                    <p className="h-[20px] w-[20px] mr-0 my-auto inset-0 bg-[#01AB06] rounded-4xl"></p>
                  </div>
                </div>
              </div>
              <div className="flex gap-[px] flex-col">
                <div className="stat-desc text-[32px] font-medium text-black">
                  12:24:03 A.M.
                </div>
                <div className="stat-time text-[16px] font-medium text-[#6C7278]">
                  01/01/2025
                </div>
              </div>
              <div className="flex gap-[px] flex-col">
                <div className="stat-desc text-[24px] font-medium">Users:</div>
                <div className="stat-desc text-[16px] font-medium text-black">
                  22 Sessions Active
                </div>
              </div>
            </div>
          </div>
          <div className="flex gap-[20px] flex-col">
            <div className="flex gap-[20px]">
              <div className="stats border-[1px] bg-white border-[#00000033] rounded-[10px] px-[23px] py-[29px] w-[270.67px] h-[173.5px]">
                <div className="flex justify-between w-full">
                  <div className="flex flex-col">
                    <div className="justify-between h-full flex flex-col">
                      <p className="text-[32px] font-bold">125</p>
                      <p className="text-[16px] font-semibold text-[#1A1C1E]">
                        Total Employees
                      </p>
                    </div>
                    <div className="flex gap-[8px]">
                      <img className="h-[24px]" src="/add_green.svg" alt="" />
                      <p className="text-[14px] text-[#01AB06] font-medium">
                        12 Added Today
                      </p>
                    </div>
                  </div>
                  <img
                    className="h-[40px]"
                    src="/Total Employees Icon.svg"
                    alt=""
                  />
                </div>
              </div>

              <div className="stats border-[1px] bg-white border-[#00000033] rounded-[10px] px-[23px] py-[29px] w-[270.67px] h-[173.5px]">
                <div className="flex justify-between w-full">
                  <div className="flex flex-col">
                    <div className="justify-between h-full flex flex-col">
                      <p className="text-[32px] font-bold">110</p>
                      <p className="text-[16px] font-semibold text-[#1A1C1E]">
                        On Time
                      </p>
                    </div>
                    <div className="flex gap-[8px]">
                      <img className="h-[24px]" src="/grow_green.svg" alt="" />
                      <p className="text-[14px] text-[#01AB06] font-medium">
                        15 more than yesterday
                      </p>
                    </div>
                  </div>
                  <img
                    className="h-[40px]"
                    src="/Currently Ongoing Icon.svg"
                    alt=""
                  />
                </div>
              </div>

              <div className="stats border-[1px] bg-white border-[#00000033] rounded-[10px] px-[23px] py-[29px] w-[270.67px] h-[173.5px]">
                <div className="flex justify-between w-full">
                  <div className="flex flex-col">
                    <div className="justify-between h-full flex flex-col">
                      <p className="text-[32px] font-bold">5</p>
                      <p className="text-[16px] font-semibold text-[#1A1C1E]">
                        Absent
                      </p>
                    </div>
                    <div className="flex gap-[8px]">
                      <img className="h-[24px]" src="/fall_red.svg" alt="" />
                      <p className="text-[14px] text-[#AB0101] font-medium">
                        2 more than yesterday
                      </p>
                    </div>
                  </div>
                  <img className="h-[40px]" src="/Absent Icon.svg" alt="" />
                </div>
              </div>
            </div>
            <div className="flex gap-[20px] ">
              <div className="stats border-[1px] bg-white border-[#00000033] rounded-[10px] px-[23px] py-[29px] w-[270.67px] h-[173.5px]">
                <div className="flex justify-between w-full">
                  <div className="flex flex-col">
                    <div className="justify-between h-full flex flex-col">
                      <p className="text-[32px] font-bold">8</p>
                      <p className="text-[16px] font-semibold text-[#1A1C1E]">
                        Late Arrival
                      </p>
                    </div>
                    <div className="flex gap-[8px]">
                      <img className="h-[24px]" src="/grow_green.svg" alt="" />
                      <p className="text-[14px] text-[#01AB06] font-medium">
                        4 less than yesterday
                      </p>
                    </div>
                  </div>
                  <img
                    className="h-[40px]"
                    src="/Late Arrivals Icon.svg"
                    alt=""
                  />
                </div>
              </div>

              <div className="stats border-[1px] bg-white border-[#00000033] rounded-[10px] px-[23px] py-[29px] w-[270.67px] h-[173.5px]">
                <div className="flex justify-between w-full">
                  <div className="flex flex-col">
                    <div className="justify-between h-full flex flex-col">
                      <p className="text-[32px] font-bold">2</p>
                      <p className="text-[16px] font-semibold text-[#1A1C1E]">
                        Early Departures
                      </p>
                    </div>
                    <div className="flex gap-[8px]">
                      <img className="h-[24px]" src="/grow_green.svg" alt="" />
                      <p className="text-[14px] text-[#01AB06] font-medium">
                        2 less than yesterday
                      </p>
                    </div>
                  </div>
                  <img
                    className="h-[40px]"
                    src="/Early Departure Icon.svg"
                    alt=""
                  />
                </div>
              </div>

              <div className="stats border-[1px] bg-white border-[#00000033] rounded-[10px] px-[23px] py-[29px] w-[270.67px] h-[173.5px]">
                <div className="flex justify-between w-full">
                  <div className="flex flex-col">
                    <div className="justify-between h-full flex flex-col">
                      <p className="text-[32px] font-bold">24</p>
                      <p className="text-[16px] font-semibold text-[#1A1C1E]">
                        Time Off
                      </p>
                    </div>
                    <div className="flex gap-[8px]">
                      <img className="h-[24px]" src="/grow_blue.svg" alt="" />
                      <p className="text-[14px] text-[#1D61E7] font-medium">
                        2 less than yesterday
                      </p>
                    </div>
                  </div>
                  <img className="h-[40px]" src="/Time off icon.svg" alt="" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => setAdminView("qrcodes")}
              className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 transition-colors">
              <QrCode className="h-8 w-8 mx-auto mb-2 text-gray-400" />
              <p className="text-sm">
                Generate QR codes for attendance tracking and access control
              </p>
            </button>
            <button
              onClick={() => setAdminView("employees")}
              className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 transition-colors">
              <Users className="h-8 w-8 mx-auto mb-2 text-gray-400" />
              <p className="text-sm">
                Manage employee information and profiles
              </p>
            </button>
            <button
              onClick={() => setAdminView("reports")}
              className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 transition-colors">
              <FileText className="h-8 w-8 mx-auto mb-2 text-gray-400" />
              <p className="text-sm">
                View detailed attendance reports and analytics
              </p>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashbord;
