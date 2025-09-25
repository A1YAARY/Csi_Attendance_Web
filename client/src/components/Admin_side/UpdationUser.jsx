// import React from 'react'

// const UpdationUser = () => {
//     return (
//         <div>

//         </div>
//     )
// }

// export default UpdationUser
import { useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";

const UpdationPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { getAdminRecords } = useAuth();
  const [Records, setRecords] = useState(null);
  const initialData = location.state?.teacher;

  const [formData, setFormData] = useState(initialData || {});

  useEffect(() => {
  const fetchData = async () => {
    try {
      const records = await getAdminRecords();
      console.log("Records:", records);
      setRecords(records);
      // Assuming records = { dept, checkInTime, checkOutTime }
    } catch (error) {
      console.error("Error fetching records:", error);
    }
  };

  fetchData();
}, []);

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const updateInfo = () => {
    navigate("/admin")
  }

  const handleSubmit = (e) => {
    e.preventDefault();
    // console.log("Updated Data:", formData);
    // alert("User updated (locally)");
    navigate("/");
  };

  return (
    <div>
      <div>
        <div className="w-screen h-[110px] flex justify-center items-center p-[16px] border-slate-200 border-b-[1px]">
          <img src="./logo.svg" alt="atharva logo" />
        </div>
      </div>
      <div className="flex flex-row">
        <div className="absolute left-65 w-[25%] h-[76vh] mx-auto mt-10 bg-white p-6 shadow-lg rounded-lg">
          <h2 className="text-2xl font-bold mb-4">Teacher Profile</h2>
          {/* <form onSubmit={handleSubmit} className="space-y-4">
        {['name', 'email', 'institute', 'department', 'role', 'work time'].map(field => (
          <div key={field}>
            <label className="block font-medium capitalize">{field}:</label>
            <input
              type="text"
              name={field}
              value={formData[field] || ''}
              onChange={handleChange}
              className="w-[100%] p-2 border border-gray-300 rounded"
            />
          </div>
        ))}
        <button
          type="submit"
          className="w-[40%] bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700"
        >
          Update
        </button>
      </form> */}
          <div className="flex-1 flex flex-col justify-center items-center px-4 sm:px-6 lg:px-8 pt-16 sm:pt-20 lg:pt-24 pb-8">
            {/* Avatar section with responsive sizing */}
            <div className="flex justify-center items-center mb-8 sm:mb-12 lg:mb-16">
              <div className="avatar w-[60%] gap-3 flex flex-col justify-center items-center">
                <img
                  src="/Avatar.png"
                  alt="avatar"
                  className="h-[140px] w-[140px] sm:h-[160px] sm:w-[160px] lg:h-[182px] lg:w-[182px] xl:h-[200px] xl:w-[200px]"
                />
                <span className="font-medium text-[14px] sm:text-[22px] lg:text-[24px] xl:text-[28px] mt-3 sm:mt-4">
                  {Records?.attendanceRecords?.[0]?.name}
                </span>
                <span className="w-[230%] p-1 border border-gray-300 rounded-xl text-gray-600 text-[14px] sm:text-[15px] lg:text-[16px] xl:text-[18px] mt-1">
                  Engineering,{Records?.attendanceRecords?.[0]?.department}
                </span>
                <span className="w-[230%] p-1 border border-gray-300 rounded-xl text-gray-600 text-[14px] sm:text-[15px] lg:text-[16px] xl:text-[18px] mt-1">
                  {Records?.attendanceRecords?.[0]?.organizationId || "N/A"}
                </span>
                <span className="w-[230%] p-1 border border-gray-300 rounded-xl text-gray-600 text-[14px] sm:text-[15px] lg:text-[16px] xl:text-[18px] mt-1">
                  {Records?.attendanceRecords?.[0]?.workingHours}
                </span>
                <span className="w-[230%] p-1 border border-gray-300 rounded-xl text-gray-600 text-[14px] sm:text-[15px] lg:text-[16px] xl:text-[18px] mt-1">
                  {Records?.attendanceRecords?.[0]?.role}
                </span>
              </div>
            </div>
          </div>
        </div>
        <div className="absolute right-60 w-[40%] mx-auto mt-10 bg-white p-6 shadow-lg rounded-lg">
          <h2 className="text-2xl font-bold mb-4">Edit Profile</h2>
          <img onClick={updateInfo} src="./cross.png" alt="cancle" className="absolute right-7 top-10 cursor-pointer"/>
          <form onSubmit={handleSubmit} className="space-y-4">
            {[
              "name",
              "email/Id",
              "institute",
              "department",
              "role",
              "working hours",
            ].map((field) => (
              <div key={field}>
                <label className="block font-medium capitalize">{field}:</label>
                <input
                  type="text"
                  name={field}
                  value={formData[field] || ""}
                  onChange={handleChange}
                  className="w-[100%] p-2 border border-gray-300 rounded"
                />
              </div>
            ))}
            <button
              type="submit"
              onClick={updateInfo}
              className="w-[30%] bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 cursor-pointer"
            >
              Update
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default UpdationPage;
