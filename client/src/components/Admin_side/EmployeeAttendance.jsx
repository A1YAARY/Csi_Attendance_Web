import React from "react";
import { records } from "../../../public/records";
export const EmployeeAttendance = () => {
  console.log(records);

  // useEffect(() => {
  //     console.log(records);
  // },[records])
  return (
    <div>
      <div className="flex flex-col">
        <div className="-m-1.5 overflow-x-auto">
          <div className="p-1.5 min-w-full inline-block align-middle">
            <div className="border border-gray-200 rounded-[24px] divide-y p-[24px] divide-gray-200">
              <div className="overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-[#B3D6FF]">
                    <tr>
                      <th
                        scope="col"
                        className="text-start border-[1px] border-[#E0E0E0] px-[12px] text-[12px] font-semibold text-black">
                        ID
                      </th>
                      <th
                        scope="col"
                        className="text-start border-[1px] border-[#E0E0E0] px-[12px] text-[12px] font-semibold text-black">
                        Name
                      </th>
                      <th
                        scope="col"
                        className="text-start border-[1px] border-[#E0E0E0] px-[12px] text-[12px] font-semibold text-black">
                        Role
                      </th>
                      <th
                        scope="col"
                        className="text-start border-[1px] border-[#E0E0E0] px-[12px] text-[12px] font-semibold text-black">
                        Department
                      </th>
                      <th
                        scope="col"
                        className="text-start border-[1px] border-[#E0E0E0] p-[12px] text-[12px] font-semibold text-black">
                        Date
                      </th>
                      <th
                        scope="col"
                        className="text-start border-[1px] border-[#E0E0E0] p-[12px] text-[12px] font-semibold text-black">
                        Status
                      </th>
                      <th
                        scope="col"
                        className="text-start border-[1px] border-[#E0E0E0] p-[12px] text-[12px] font-semibold text-black">
                        Check-in
                      </th>
                      <th
                        scope="col"
                        className="text-start border-[1px] border-[#E0E0E0] p-[12px] text-[12px] font-semibold text-black">
                        Check-out
                      </th>
                      <th
                        scope="col"
                        className="text-start border-[1px] border-[#E0E0E0] p-[12px] text-[12px] font-semibold text-black">
                        Work Hours
                      </th>
                      <th
                        scope="col"
                        className="text-start border-[1px] border-[#E0E0E0] p-[12px] text-[12px] font-semibold text-black">
                        Check-in Count
                      </th>
                    </tr>
                  </thead>
                  {records.map((record, index) => (
                    <tbody key={index} className="divide-y divide-gray-200">
                    <tr>
                      <td
                        scope="col"
                        className="text-start border-[1px] border-[#E0E0E0] p-[12px] text-[12px] font-normal text-black">
                        {record.id}
                      </td>
                      <td
                        scope="col"
                        className="text-start border-[1px] border-[#E0E0E0] p-[12px] text-[12px] font-normal text-black">
                        {record.name}
                      </td>
                      <td
                        scope="col"
                        className="text-start border-[1px] border-[#E0E0E0] p-[12px] text-[12px] font-normal text-black">
                        {record.role}
                      </td>
                      <td
                        scope="col"
                        className="text-start border-[1px] border-[#E0E0E0] p-[12px] text-[12px] font-normal text-black">
                        {record.department}
                      </td>
                      <td
                        scope="col"
                        className="text-start border-[1px] border-[#E0E0E0] p-[12px] text-[12px] font-normal text-black">
                        {record.date}
                      </td>
                      <td
                        scope="col"
                        className="text-start border-[1px] border-[#E0E0E0] p-[12px] text-[12px] font-normal text-black">
                        {record.status}
                      </td>
                      <td
                        scope="col"
                        className="text-start border-[1px] border-[#E0E0E0] p-[12px] text-[12px] font-normal text-black">
                        {record.checkIn}
                      </td>
                      <td
                        scope="col"
                        className="text-start border-[1px] border-[#E0E0E0] p-[12px] text-[12px] font-normal text-black">
                        {record.checkOut}
                      </td>
                      <td
                        scope="col"
                        className="text-start border-[1px] border-[#E0E0E0] p-[12px] text-[12px] font-normal text-black">
                        {record.workHours}
                      </td>
                      <td
                        scope="col"
                        className="text-start border-[1px] border-[#E0E0E0] p-[12px] text-[12px] font-normal text-black">
                        {record.checkInCount}
                      </td>
                    </tr>
                  </tbody>
                  ))}
                </table>
              </div>
            </div>
            <div className="py-1 px-4 justify-end flex">
              <nav className="flex items-center" aria-label="Pagination">
                <button
                  type="button"
                  className="min-w-10 flex justify-center items-center text-gray-800 hover:bg-gray-100 focus:outline-hidden focus:bg-gray-100 py-2.5 text-sm rounded-full disabled:opacity-50 disabled:pointer-events-none"
                  aria-current="page">
                  1
                </button>
                <button
                  type="button"
                  className="min-w-10 flex justify-center items-center text-gray-800 hover:bg-gray-100 focus:outline-hidden focus:bg-gray-100 py-2.5 text-sm rounded-full disabled:opacity-50 disabled:pointer-events-none">
                  2
                </button>
                <button
                  type="button"
                  className="min-w-10 flex justify-center items-center text-gray-800 hover:bg-gray-100 focus:outline-hidden focus:bg-gray-100 py-2.5 text-sm rounded-full disabled:opacity-50 disabled:pointer-events-none">
                  3
                </button>
                <button
                  type="button"
                  className="p-2.5 min-w-10 inline-flex justify-center items-center gap-x-2 text-sm rounded-full text-gray-800 hover:bg-gray-100 focus:outline-hidden focus:bg-gray-100 disabled:opacity-50 disabled:pointer-events-none"
                  aria-label="Previous">
                  <span aria-hidden="true">
                    <img src="/left.svg" alt="" />
                  </span>
                  <span className="sr-only">Previous</span>
                </button>
                <button
                  type="button"
                  className="p-2.5 min-w-10 inline-flex justify-center items-center gap-x-2 text-sm rounded-full text-gray-800 hover:bg-gray-100 focus:outline-hidden focus:bg-gray-100 disabled:opacity-50 disabled:pointer-events-none"
                  aria-label="Next">
                  <span className="sr-only">Next</span>
                  <span aria-hidden="true">
                    <img src="/right.svg" alt="" />
                  </span>
                </button>
              </nav>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
