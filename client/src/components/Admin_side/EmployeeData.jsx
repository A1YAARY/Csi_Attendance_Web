import React from "react";
import { records } from "../../../public/records";

export const EmployeeData = () => {
  return (
  <div className="">{records.map((record, index) => (
      <div key={index} className="border-[0.5px] border-[#00000033] rounded-[10px] flex justify-between p-[24px] gap-[10px] text-[14px] text-[#6C7278] font-normal">
      
      <div className="flex gap-[16px] items-center">
        <input type="checkbox" name="" id="" />
        <img className="h-[24px]" src="//Avatar.png" alt="" />
        <p className="text-[16px] font-medium text-black">{records.name}</p>
      </div>
      <div className="flex justify-between w-[60%] ">
        <p>{record.email}</p>
        <p>{record.department}</p>
        <p>{record.role}</p>
        <p>{record.workHours}</p>
      </div>
      <img src="/3dots.svg" alt="" />
    </div>
  ))}
  </div>
  );
};
