import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast, ToastContainer } from 'react-toastify';
import {
  Smartphone,
  Monitor,
  Tablet,
  Check,
  X,
  Clock,
  User,
  Mail,
  Calendar,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import 'react-toastify/dist/ReactToastify.css';

const DeviceChangeRequests = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingRequest, setProcessingRequest] = useState(null);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [actionType, setActionType] = useState('');
  const [adminReason, setAdminReason] = useState('');

  const BASE_URL = import.meta.env.VITE_BACKEND_BASE_URL|| "http://localhost:5000";

  // Fetch device change requests
  const fetchRequests = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("accessToken");
      const response = await axios.get(`${BASE_URL}/admin/device-change-requests`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.data.success) {
        setRequests(response.data.requests || []);
      } else {
        toast.error("Failed to fetch device change requests");
      }
    } catch (error) {
      console.error("Error fetching requests:", error);
      toast.error("Error loading device change requests");
    } finally {
      setLoading(false);
    }
  };

  // Handle approve/reject request - CORRECTED FUNCTION
  const handleRequest = async (action) => {
    if (!selectedRequest) return;

    try {
      setProcessingRequest(selectedRequest._id);
      const token = localStorage.getItem("accessToken");

      const requestData = {
        userId: selectedRequest._id,
        action: action,
        reason: adminReason.trim() || `Request ${action}d by admin`
      };

      const response = await axios.post(
        `${BASE_URL}/admin/handle-device-change-request`,
        requestData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.data.success) {
        toast.success(`Device change request ${action}d successfully!`);
        fetchRequests(); // Refresh the list
        closeModal();
      } else {
        toast.error(response.data.message || `Failed to ${action} request`);
      }
    } catch (error) {
      console.error(`Error ${action}ing request:`, error);
      toast.error(error.response?.data?.message || `Error ${action}ing request`);
    } finally {
      setProcessingRequest(null);
    }
  };

  // Open modal for action confirmation
  const openModal = (request, action) => {
    setSelectedRequest(request);
    setActionType(action);
    setAdminReason('');
    setShowModal(true);
  };

  // Close modal
  const closeModal = () => {
    setShowModal(false);
    setSelectedRequest(null);
    setActionType('');
    setAdminReason('');
  };

  // Get device icon based on type
  const getDeviceIcon = (deviceType) => {
    switch (deviceType?.toLowerCase()) {
      case 'android':
      case 'ios':
        return <Smartphone className="w-5 h-5" />;
      case 'web':
        return <Monitor className="w-5 h-5" />;
      case 'tablet':
        return <Tablet className="w-5 h-5" />;
      default:
        return <Monitor className="w-5 h-5" />;
    }
  };

  // Format date to IST
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex items-center space-x-2">
          <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
          <span className="text-gray-600">Loading device change requests...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Device Change Requests</h1>
              <p className="text-gray-600 mt-1">
                Manage pending device change requests from users
              </p>
            </div>
            <div className="flex items-center space-x-4 mt-4 md:mt-0">
              <button
                onClick={fetchRequests}
                disabled={loading}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center">
                <Clock className="w-5 h-5 text-yellow-600 mr-2" />
                <span className="text-yellow-800 font-medium">Pending Requests</span>
              </div>
              <p className="text-2xl font-bold text-yellow-900 mt-1">{requests.length}</p>
            </div>
          </div>
        </div>

        {/* Requests List */}
        {requests.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
            <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Pending Requests</h3>
            <p className="text-gray-600">There are no device change requests at the moment.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map((request) => (
              <div
                key={request._id}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
              >
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* User Info */}
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <User className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900">{request.name}</h3>
                        <div className="flex items-center text-sm text-gray-600">
                          <Mail className="w-4 h-4 mr-1" />
                          {request.email}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center text-sm text-gray-600">
                      <Calendar className="w-4 h-4 mr-2" />
                      Requested: {formatDate(request.deviceChangeRequest.requestedAt)}
                    </div>
                  </div>

                  {/* Device Info */}
                  <div className="space-y-4">
                    {/* Current Device */}
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Current Device</h4>
                      <div className="flex items-center space-x-2 text-sm text-gray-600 bg-gray-50 p-2 rounded">
                        {getDeviceIcon(request.deviceInfo?.type)}
                        <span>{request.deviceInfo?.type || 'Unknown'}</span>
                        <span className="text-xs text-gray-500">
                          ({request.deviceInfo?.deviceId?.slice(0, 12)}...)
                        </span>
                      </div>
                    </div>

                    {/* New Device */}
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Requested Device</h4>
                      <div className="flex items-center space-x-2 text-sm text-green-600 bg-green-50 p-2 rounded">
                        {getDeviceIcon(request.deviceChangeRequest.newDeviceType)}
                        <span>{request.deviceChangeRequest.newDeviceType}</span>
                        <span className="text-xs text-green-500">
                          ({request.deviceChangeRequest.newDeviceId?.slice(0, 12)}...)
                        </span>
                      </div>
                    </div>

                    {/* Reason */}
                    {request.deviceChangeRequest.reason && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-1">Reason</h4>
                        <p className="text-sm text-gray-600 italic">
                          "{request.deviceChangeRequest.reason}"
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col justify-center space-y-3 lg:items-end">
                    <div className="flex space-x-3">
                      <button
                        onClick={() => openModal(request, 'approve')}
                        disabled={processingRequest === request._id}
                        className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                      >
                        <Check className="w-4 h-4" />
                        <span>Approve</span>
                      </button>

                      <button
                        onClick={() => openModal(request, 'reject')}
                        disabled={processingRequest === request._id}
                        className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
                      >
                        <X className="w-4 h-4" />
                        <span>Reject</span>
                      </button>
                    </div>

                    {processingRequest === request._id && (
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Processing...</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              {actionType === 'approve' ? 'Approve' : 'Reject'} Device Change Request
            </h3>

            <p className="text-gray-600 mb-4">
              Are you sure you want to {actionType} the device change request for{' '}
              <strong>{selectedRequest?.name}</strong>?
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason (Optional)
              </label>
              <textarea
                value={adminReason}
                onChange={(e) => setAdminReason(e.target.value)}
                placeholder={`Enter reason for ${actionType}ing this request...`}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                rows="3"
              />
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={closeModal}
                disabled={processingRequest}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                Cancel
              </button>

              <button
                onClick={() => handleRequest(actionType)}
                disabled={processingRequest}
                className={`px-4 py-2 rounded-lg text-white disabled:opacity-50 transition-colors ${actionType === 'approve'
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-red-600 hover:bg-red-700'
                  }`}
              >
                {processingRequest ? (
                  <div className="flex items-center space-x-2">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Processing...</span>
                  </div>
                ) : (
                  `${actionType === 'approve' ? 'Approve' : 'Reject'} Request`
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <ToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />
    </div>
  );
};

export default DeviceChangeRequests;
