import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import './AttendanceChart.css';

const AttendanceChart = ({ data, title = "Attendance Overview" }) => {
  if (!data || data.length === 0) {
    return (
      <div className="attendance-chart">
        <h3>{title}</h3>
        <div className="no-data">No chart data available</div>
      </div>
    );
  }

  const chartData = data.map((item, index) => ({
    name: item.date || `Day ${index + 1}`,
    present: item.present || 0,
    absent: item.absent || 0,
    fullDay: item.fullDay || 0,
    halfDay: item.halfDay || 0
  }));

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="custom-tooltip">
          <p className="tooltip-label">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} className="tooltip-item" style={{ color: entry.color }}>
              {entry.name}: {entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="attendance-chart">
      <h3>{title}</h3>
      <div className="chart-container">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0, 0, 0, 0.1)" />
            <XAxis 
              dataKey="name" 
              stroke="#64748b"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis 
              stroke="#64748b"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar 
              dataKey="fullDay" 
              stackId="a" 
              fill="#10b981" 
              name="Full Day"
              radius={[0, 0, 4, 4]}
            />
            <Bar 
              dataKey="halfDay" 
              stackId="a" 
              fill="#f59e0b" 
              name="Half Day"
            />
            <Bar 
              dataKey="absent" 
              stackId="b" 
              fill="#ef4444" 
              name="Absent"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="chart-legend">
        <div className="legend-item">
          <div className="legend-color" style={{ backgroundColor: '#10b981' }} />
          <span>Full Day</span>
        </div>
        <div className="legend-item">
          <div className="legend-color" style={{ backgroundColor: '#f59e0b' }} />
          <span>Half Day</span>
        </div>
        <div className="legend-item">
          <div className="legend-color" style={{ backgroundColor: '#ef4444' }} />
          <span>Absent</span>
        </div>
      </div>
    </div>
  );
};

export default AttendanceChart;
