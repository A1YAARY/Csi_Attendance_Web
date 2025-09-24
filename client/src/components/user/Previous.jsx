import React from "react";
import StatusLabel from "./StatusLabel";

function Previous() {
  return (
    <div className="text-[14px] flex flex-col gap-[10px]">
      <h5>Week 1</h5>
      <div className="flex flex-col rounded-[16px] border border-slate-300">
        <div className="flex justify-between py-[10px] px-[15px] border-b border-slate-300">
          <p>Monday</p>
          <StatusLabel status="Present" />
          <p className="text-[#797D7F]">30/05/2025</p>
        </div>
        <div className="flex justify-between py-[10px] px-[15px] border-b border-slate-300">
          <p>Monday</p>
          <StatusLabel status="Absent" />
          <p className="text-[#797D7F]">30/05/2025</p>
        </div>
        <div className="flex justify-between py-[10px] px-[15px] border-b border-slate-300">
          <p>Monday</p>
          <StatusLabel status="Half-day" />
          <p className="text-[#797D7F]">30/05/2025</p>
        </div>
        <div className="flex justify-between py-[10px] px-[15px] border-b border-slate-300">
          <p>Monday</p>
          <StatusLabel status="Present" />
          <p className="text-[#797D7F]">30/05/2025</p>
        </div>
        <div className="flex justify-between py-[10px] px-[15px]">
          <p>Monday</p>
          <StatusLabel status="Present" />
          <p className="text-[#797D7F]">30/05/2025</p>
        </div>
      </div>
    </div>
  );
}

export default Previous;
