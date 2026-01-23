import React from 'react';
import { User, Clock, Calendar, MapPin, Phone, Mail } from 'lucide-react';
import './EmployeeCard.css';

const EmployeeCard = ({ employee }) => {
  if (!employee || !employee.employee) {
    return (
      <div className="employee-card">
        <div className="no-data">No employee data available</div>
      </div>
    );
  }

  const { employee: emp, statistics, attendance_records, daily_sheets } = employee;

  const formatTime = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'full-day': return '#10b981';
      case 'half-day': return '#f59e0b';
      case 'absent': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getRecentStatus = () => {
    if (daily_sheets && daily_sheets.length > 0) {
      return daily_sheets[0].status;
    }
    return 'unknown';
  };

  const recentStatus = getRecentStatus();

  return (
    <div className="employee-card">
      <div className="employee-header">
        <div className="employee-avatar">
          <User size={24} />
        </div>
        <div className="employee-info">
          <h3 className="employee-name">{emp.name}</h3>
          <p className="employee-role">{emp.department || 'Employee'}</p>
          <p className="employee-institute">{emp.institute}</p>
        </div>
        <div className="status-badge" style={{ backgroundColor: getStatusColor(recentStatus) }}>
          {recentStatus.replace('-', ' ')}
        </div>
      </div>

      <div className="employee-details">
        <div className="detail-row">
          <Mail size={16} />
          <span>{emp.email}</span>
        </div>
        {emp.phone && (
          <div className="detail-row">
            <Phone size={16} />
            <span>{emp.phone}</span>
          </div>
        )}
        {emp.deviceInfo?.isRegistered && (
          <div className="detail-row device-registered">
            <div className="device-status">
              <div className="status-dot" />
              Device Registered
            </div>
          </div>
        )}
      </div>

      {statistics && (
        <div className="statistics-section">
          <h4>Attendance Statistics (Last 30 Days)</h4>
          <div className="stats-grid">
            <div className="stat-item">
              <div className="stat-label">Present Days</div>
              <div className="stat-value">{statistics.present_days}</div>
            </div>
            <div className="stat-item">
              <div className="stat-label">Absent Days</div>
              <div className="stat-value">{statistics.absent_days}</div>
            </div>
            <div className="stat-item">
              <div className="stat-label">Total Hours</div>
              <div className="stat-value">{formatTime(statistics.total_working_hours)}</div>
            </div>
            <div className="stat-item">
              <div className="stat-label">Attendance Rate</div>
              <div className="stat-value">{statistics.attendance_percentage.toFixed(1)}%</div>
            </div>
          </div>
        </div>
      )}

      {daily_sheets && daily_sheets.length > 0 && (
        <div className="recent-activity">
          <h4>Recent Activity</h4>
          <div className="activity-list">
            {daily_sheets.slice(0, 5).map((sheet, index) => (
              <div key={index} className="activity-item">
                <div className="activity-date">
                  {new Date(sheet.date).toLocaleDateString()}
                </div>
                <div className="activity-status" style={{ color: getStatusColor(sheet.status) }}>
                  {sheet.status.replace('-', ' ')}
                </div>
                <div className="activity-hours">
                  {formatTime(sheet.total_working_time)}
                </div>
                <div className="activity-sessions">
                  {sheet.sessions?.length || 0} sessions
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {attendance_records && attendance_records.length > 0 && (
        <div className="attendance-history">
          <h4>Recent Check-ins/Check-outs</h4>
          <div className="attendance-list">
            {attendance_records.slice(0, 6).map((record, index) => (
              <div key={index} className="attendance-item">
                <div className="attendance-type">
                  <div className={`type-indicator ${record.type}`} />
                  {record.type.replace('-', ' ')}
                </div>
                <div className="attendance-time">
                  {new Date(record.istTimestamp).toLocaleString()}
                </div>
                <div className="attendance-verification">
                  {record.verified ? (
                    <span className="verified">✓ Verified</span>
                  ) : (
                    <span className="unverified">⚠ Unverified</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeCard;
