import React, { useState, useEffect } from 'react';
import VoiceInterface from './VoiceInterface';
import EmployeeCard from './EmployeeCard';
import AttendanceChart from './AttendanceChart';
import { Mic, Users, Clock, TrendingUp } from 'lucide-react';
import './VoiceDashboard.css';

const VoiceDashboard = ({ organizationId, userId }) => {
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [voiceData, setVoiceData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [quickStats, setQuickStats] = useState({
    totalEmployees: 0,
    presentToday: 0,
    averageHours: 0,
    attendanceRate: 0
  });

  useEffect(() => {
    fetchQuickStats();
  }, [organizationId]);

  const fetchQuickStats = async () => {
    try {
      const response = await fetch(`http://localhost:8001/attendance/summary`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setQuickStats(data);
      }
    } catch (error) {
      console.error('Error fetching quick stats:', error);
    }
  };

  const handleVoiceDataReceived = (data) => {
    setVoiceData(data);
    if (data && data.employee) {
      setSelectedEmployee(data);
    }
  };

  const StatCard = ({ icon: Icon, title, value, subtitle, color }) => (
    <div className="stat-card">
      <div className="stat-icon" style={{ backgroundColor: color }}>
        <Icon size={24} />
      </div>
      <div className="stat-content">
        <div className="stat-value">{value}</div>
        <div className="stat-title">{title}</div>
        {subtitle && <div className="stat-subtitle">{subtitle}</div>}
      </div>
    </div>
  );

  return (
    <div className="voice-dashboard">
      <div className="dashboard-header">
        <div className="header-content">
          <div className="header-icon">
            <Mic size={32} />
          </div>
          <div className="header-text">
            <h1>Voice Assistant</h1>
            <p>Ask questions about attendance, employees, and reports</p>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="stats-grid">
        <StatCard
          icon={Users}
          title="Total Employees"
          value={quickStats.totalEmployees}
          color="#667eea"
        />
        <StatCard
          icon={TrendingUp}
          title="Present Today"
          value={quickStats.presentToday}
          subtitle={`${quickStats.attendanceRate}% attendance rate`}
          color="#10b981"
        />
        <StatCard
          icon={Clock}
          title="Average Hours"
          value={`${quickStats.averageHours}h`}
          subtitle="Daily average"
          color="#f59e0b"
        />
      </div>

      <div className="dashboard-content">
        {/* Voice Interface */}
        <div className="voice-section">
          <div className="section-header">
            <h2>Voice Commands</h2>
            <p>Try asking: "Show me John's attendance" or "Who is absent today?"</p>
          </div>
          <VoiceInterface
            organizationId={organizationId}
            userId={userId}
            onDataReceived={handleVoiceDataReceived}
          />
        </div>

        {/* Employee Details */}
        {selectedEmployee && (
          <div className="employee-section">
            <div className="section-header">
              <h2>Employee Details</h2>
              <button 
                className="close-button"
                onClick={() => setSelectedEmployee(null)}
              >
                ×
              </button>
            </div>
            <EmployeeCard employee={selectedEmployee} />
          </div>
        )}

        {/* Voice Data Display */}
        {voiceData && !selectedEmployee && (
          <div className="data-section">
            <div className="section-header">
              <h2>Query Results</h2>
            </div>
            <div className="data-content">
              {voiceData.statistics && (
                <div className="statistics-grid">
                  <div className="stat-item">
                    <span className="stat-label">Total Days</span>
                    <span className="stat-value">{voiceData.statistics.total_days}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Present Days</span>
                    <span className="stat-value">{voiceData.statistics.present_days}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Absent Days</span>
                    <span className="stat-value">{voiceData.statistics.absent_days}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Attendance %</span>
                    <span className="stat-value">
                      {voiceData.statistics.attendance_percentage.toFixed(1)}%
                    </span>
                  </div>
                </div>
              )}
              
              {voiceData.attendance_records && (
                <div className="attendance-records">
                  <h3>Recent Attendance</h3>
                  <div className="records-list">
                    {voiceData.attendance_records.slice(0, 5).map((record, index) => (
                      <div key={index} className="record-item">
                        <div className="record-type">{record.type}</div>
                        <div className="record-time">
                          {new Date(record.istTimestamp).toLocaleString()}
                        </div>
                        <div className="record-status">
                          {record.verified ? '✓ Verified' : '⚠ Unverified'}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VoiceDashboard;
