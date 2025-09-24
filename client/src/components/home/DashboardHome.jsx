import React, { useState, useEffect } from "react";
import {
  FaUserFriends,
  FaClock,
  FaUserTimes,
  FaWalking,
  FaSignOutAlt,
  FaHome,
} from "react-icons/fa";

function StatusCard({ title, value, subtitle, icon: Icon, borderColor, textColor }) {
  return (
    <div className={`bg-white rounded-xl shadow-md p-5 border-l-4 ${borderColor} flex flex-col justify-between`}>
      <div className="flex items-center mb-2">
        {Icon && <Icon className={`text-2xl mr-2 ${textColor}`} />}
        <span className="font-bold text-2xl">{value}</span>
      </div>
      <div className="text-gray-700 font-medium">{title}</div>
      {subtitle && <div className="text-xs mt-1 text-gray-500">{subtitle}</div>}
    </div>
  );
}

function DashboardHome() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [sessionsActive, setSessionsActive] = useState(22);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Example data; replace with backend/API data if available.
  const cards = [
    {
      title: "Total Employees",
      value: 125,
      subtitle: "12 Added Today",
      icon: FaUserFriends,
      borderColor: "border-blue-400",
      textColor: "text-blue-500",
    },
    {
      title: "On Time",
      value: 110,
      subtitle: (
        <span className="text-green-600">↑ 15 more than yesterday</span>
      ),
      icon: FaClock,
      borderColor: "border-green-400",
      textColor: "text-green-500",
    },
    {
      title: "Absent",
      value: 5,
      subtitle: (
        <span className="text-red-500">↑ 2 more than yesterday</span>
      ),
      icon: FaUserTimes,
      borderColor: "border-red-400",
      textColor: "text-red-500",
    },
    {
      title: "Late Arrival",
      value: 8,
      subtitle: (
        <span className="text-green-600">↓ 4 less than yesterday</span>
      ),
      icon: FaClock,
      borderColor: "border-yellow-400",
      textColor: "text-yellow-500",
    },
    {
      title: "Early departures",
      value: 2,
      subtitle: (
        <span className="text-green-600">↓ 2 less than yesterday</span>
      ),
      icon: FaSignOutAlt,
      borderColor: "border-pink-400",
      textColor: "text-pink-500",
    },
    {
      title: "Time off",
      value: 24,
      subtitle: (
        <span className="text-green-600">↓ 2 less than yesterday</span>
      ),
      icon: FaHome,
      borderColor: "border-purple-400",
      textColor: "text-purple-500",
    },
  ];

  return (
    <div className="w-full mx-auto mt-6 px-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        {/* System Status Section */}
        <div className="bg-white rounded-xl shadow-md p-5 flex flex-col justify-between md:row-span-2">
          <div>
            <div className="text-lg text-gray-500 mb-1">System Status:</div>
            <div className="flex items-center mb-3">
              <span className="text-3xl font-extrabold">Active</span>
              <span className="ml-3 w-3 h-3 bg-green-500 rounded-full inline-block"></span>
            </div>
          </div>
          <div className="mb-2">
            <div className="text-base">{currentTime.toLocaleTimeString()}</div>
            <div className="text-xs text-gray-400">
              {currentTime.toLocaleDateString("en-GB")}
            </div>
          </div>
          <div className="text-sm text-gray-600 mt-3">
            Users:{" "}
            <span className="font-semibold">{sessionsActive} Sessions Active</span>
          </div>
        </div>
        {/* Rest Status Cards */}
        <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-6">
          {cards.map((card, idx) => (
            <StatusCard key={card.title}
              title={card.title}
              value={card.value}
              subtitle={card.subtitle}
              icon={card.icon}
              borderColor={card.borderColor}
              textColor={card.textColor}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default DashboardHome;
