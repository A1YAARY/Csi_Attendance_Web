import React from 'react';
import VoiceDashboard from '../../components/VoiceInterface/VoiceDashboard';
import { useAuth } from '../../context/AuthContext';

const VoiceAssistant = () => {
  const { user } = useAuth();

  if (!user || user.role !== 'organization') {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        fontSize: '18px',
        color: '#ef4444'
      }}>
        Access denied. Admin privileges required.
      </div>
    );
  }

  return (
    <VoiceDashboard 
      organizationId={user.organizationId?._id || user.organizationId}
      userId={user._id}
    />
  );
};

export default VoiceAssistant;
