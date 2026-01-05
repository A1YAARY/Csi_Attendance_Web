import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/authStore';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { User, Mail, Phone, Briefcase, Building, Save, ArrowLeft, Loader } from 'lucide-react';

const UpdationUser = () => {
  const { id } = useParams(); // Get userId from URL params
  const navigate = useNavigate();
  const { getSingleUser, updateUserByAdmin } = useAuth();

  const [userData, setUserData] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'user',
    department: '',
    institute: '',
    workingHours: {
      start: '09:00',
      end: '17:00',
      timezone: 'Asia/Kolkata'
    },
    weeklySchedule: {
      monday: true,
      tuesday: true,
      wednesday: true,
      thursday: true,
      friday: true,
      saturday: false,
      sunday: false
    },
    customHolidays: []
  });

  const [loading, setLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState(null);

  // New holiday input state
  const [newHoliday, setNewHoliday] = useState({
    date: '',
    reason: '',
    isRecurring: false,
    recurringType: null
  });

  useEffect(() => {
    const fetchUser = async () => {
      // Validate userId exists
      if (!id) {
        console.error('No user ID in URL params');
        setError('No user ID provided');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        console.log('Fetching user with ID:', id);

        const response = await getSingleUser(id);
        console.log('Get Single User Response:', response);

        if (response?.success || response?.data || response?.user) {
          const user = response.data || response.user || response;

          console.log('User data received:', user);

          setUserData({
            name: user.name || '',
            email: user.email || '',
            phone: user.phone || '',
            role: user.role || 'user',
            department: user.department || '',
            institute: user.institute || '',
            workingHours: user.workingHours || {
              start: '09:00',
              end: '17:00',
              timezone: 'Asia/Kolkata'
            },
            weeklySchedule: user.weeklySchedule || {
              monday: true,
              tuesday: true,
              wednesday: true,
              thursday: true,
              friday: true,
              saturday: false,
              sunday: false
            },
            customHolidays: user.customHolidays || []
          });
        } else {
          throw new Error(response?.message || 'Failed to fetch user data');
        }
      } catch (err) {
        console.error('Error fetching user:', err);
        setError(err.message || 'Failed to fetch user data');
        toast.error('Failed to load user data');
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [id, getSingleUser]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setUserData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleWorkingHoursChange = (e) => {
    const { name, value } = e.target;
    setUserData(prev => ({
      ...prev,
      workingHours: {
        ...prev.workingHours,
        [name]: value
      }
    }));
  };

  const handleWeeklyScheduleChange = (day) => {
    setUserData(prev => ({
      ...prev,
      weeklySchedule: {
        ...prev.weeklySchedule,
        [day]: !prev.weeklySchedule[day]
      }
    }));
  };

  const handleAddHoliday = () => {
    if (!newHoliday.date || !newHoliday.reason) {
      toast.error('Please provide date and reason for holiday');
      return;
    }

    setUserData(prev => ({
      ...prev,
      customHolidays: [
        ...prev.customHolidays,
        {
          ...newHoliday,
          recurringType: newHoliday.isRecurring ? newHoliday.recurringType : null
        }
      ]
    }));

    setNewHoliday({
      date: '',
      reason: '',
      isRecurring: false,
      recurringType: null
    });

    toast.success('Holiday added');
  };

  const handleRemoveHoliday = (index) => {
    setUserData(prev => ({
      ...prev,
      customHolidays: prev.customHolidays.filter((_, i) => i !== index)
    }));
    toast.info('Holiday removed');
  };

 const handleSubmit = async (e) => {
  e.preventDefault();

  if (!userData.name.trim() || !userData.email.trim()) {
    toast.error('Name and email are required');
    return;
  }

  if (!id) {
    toast.error('User ID is missing');
    return;
  }

  try {
    setIsUpdating(true);
    console.log('Updating user with ID:', id);
    console.log('Update data:', userData);
    
    const response = await updateUserByAdmin(id, userData);
    console.log('Full Update response:', response);

    // Check for success in multiple ways
    if (response && (response.success === true || response.data)) {
      toast.success('User updated successfully!');
      console.log('Update successful, navigating back...');
      
      // Navigate after a short delay
      setTimeout(() => {
        navigate('/admin/employees');
      }, 1000);
    } else {
      // Log the full response to debug
      console.error('Update failed with response:', response);
      throw new Error(response?.message || 'Failed to update user - no success flag');
    }
  } catch (err) {
    console.error('Update error:', err);
    console.error('Error details:', {
      message: err.message,
      stack: err.stack,
      response: err.response
    });
    toast.error(err.message || 'Failed to update user');
  } finally {
    setIsUpdating(false);
  }
};

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <Loader className="animate-spin text-blue-600 mb-4" size={48} />
        <p className="text-lg text-gray-600">Loading user data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="bg-white p-8 rounded-lg shadow-lg text-center max-w-md">
          <p className="text-red-500 mb-4 font-semibold">{error}</p>
          <p className="text-sm text-gray-600 mb-4">User ID from URL: {id || 'Not found'}</p>
          <button
            onClick={() => navigate('/admin/employees')}
            className="bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 transition"
          >
            Back to Employees
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <button
          onClick={() => navigate('/admin/employees')}
          className="flex items-center text-blue-600 hover:text-blue-800 mb-6 transition"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Employees
        </button>

        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Update Employee</h1>
          <p className="text-gray-600">Edit employee information and working schedule</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white shadow-xl rounded-lg overflow-hidden">
          <div className="p-6 space-y-8">

            {/* Basic Information */}
            <div>
              <h2 className="text-xl font-semibold text-gray-800 mb-4 border-b pb-2">Basic Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Name */}
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                    <User className="w-4 h-4 mr-2 text-blue-600" />
                    Full Name <span className="text-red-500 ml-1">*</span>
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={userData.name}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                    placeholder="Enter full name"
                  />
                </div>

                {/* Email */}
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                    <Mail className="w-4 h-4 mr-2 text-blue-600" />
                    Email Address <span className="text-red-500 ml-1">*</span>
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={userData.email}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                    placeholder="Enter email address"
                  />
                </div>

                {/* Phone */}
                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                    <Phone className="w-4 h-4 mr-2 text-blue-600" />
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={userData.phone}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                    placeholder="Enter phone number"
                  />
                </div>

                {/* Role */}
                <div>
                  <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                    <Briefcase className="w-4 h-4 mr-2 text-blue-600" />
                    Role
                  </label>
                  <select
                    id="role"
                    name="role"
                    value={userData.role}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                  >
                    <option value="user">User</option>
                    <option value="organization">Organization Admin</option>
                  </select>
                </div>

                {/* Department */}
                <div>
                  <label htmlFor="department" className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                    <Building className="w-4 h-4 mr-2 text-blue-600" />
                    Department
                  </label>
                  <input
                    type="text"
                    id="department"
                    name="department"
                    value={userData.department}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                    placeholder="Enter department"
                  />
                </div>

                {/* Institute */}
                <div>
                  <label htmlFor="institute" className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                    <Building className="w-4 h-4 mr-2 text-blue-600" />
                    Institute
                  </label>
                  <input
                    type="text"
                    id="institute"
                    name="institute"
                    value={userData.institute}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                    placeholder="Enter institute"
                  />
                </div>
              </div>
            </div>

            {/* Working Hours */}
            <div>
              <h2 className="text-xl font-semibold text-gray-800 mb-4 border-b pb-2">Working Hours</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="start" className="block text-sm font-medium text-gray-700 mb-2">
                    Start Time
                  </label>
                  <input
                    type="time"
                    id="start"
                    name="start"
                    value={userData.workingHours?.start || '09:00'}
                    onChange={handleWorkingHoursChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                  />
                </div>
                <div>
                  <label htmlFor="end" className="block text-sm font-medium text-gray-700 mb-2">
                    End Time
                  </label>
                  <input
                    type="time"
                    id="end"
                    name="end"
                    value={userData.workingHours?.end || '17:00'}
                    onChange={handleWorkingHoursChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                  />
                </div>
              </div>
            </div>

            {/* Weekly Working Days Schedule */}
            <div>
              <h2 className="text-xl font-semibold text-gray-800 mb-4 border-b pb-2">Weekly Working Days</h2>
              <p className="text-sm text-gray-600 mb-4">Select the days this employee should work</p>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((day) => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => handleWeeklyScheduleChange(day)}
                    className={`
                      px-4 py-3 rounded-lg border-2 transition-all font-medium capitalize
                      ${userData.weeklySchedule[day]
                        ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
                      }
                    `}
                  >
                    {day.substring(0, 3)}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Holidays */}
            <div>
              <h2 className="text-xl font-semibold text-gray-800 mb-4 border-b pb-2">Custom Holidays</h2>

              {/* Add New Holiday */}
              <div className="bg-gray-50 p-4 rounded-lg mb-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Add New Holiday</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Date</label>
                    <input
                      type="date"
                      value={newHoliday.date}
                      onChange={(e) => setNewHoliday(prev => ({ ...prev, date: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Reason</label>
                    <input
                      type="text"
                      value={newHoliday.reason}
                      onChange={(e) => setNewHoliday(prev => ({ ...prev, reason: e.target.value }))}
                      placeholder="Holiday reason"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-4 mb-3">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={newHoliday.isRecurring}
                      onChange={(e) => setNewHoliday(prev => ({
                        ...prev,
                        isRecurring: e.target.checked,
                        recurringType: e.target.checked ? 'yearly' : null
                      }))}
                      className="form-checkbox h-4 w-4 text-blue-600"
                    />
                    <span className="text-sm text-gray-700">Recurring Holiday</span>
                  </label>

                  {newHoliday.isRecurring && (
                    <select
                      value={newHoliday.recurringType || 'yearly'}
                      onChange={(e) => setNewHoliday(prev => ({ ...prev, recurringType: e.target.value }))}
                      className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                      <option value="yearly">Yearly</option>
                    </select>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleAddHoliday}
                  className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition"
                >
                  Add Holiday
                </button>
              </div>

              {/* Existing Holidays List */}
              {userData.customHolidays && userData.customHolidays.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Existing Holidays ({userData.customHolidays.length})</h3>
                  {userData.customHolidays.map((holiday, index) => (
                    <div key={index} className="flex items-center justify-between bg-white border border-gray-200 p-3 rounded-lg">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-800">
                          {new Date(holiday.date).toLocaleDateString()} - {holiday.reason}
                        </p>
                        {holiday.isRecurring && (
                          <p className="text-xs text-blue-600">
                            Recurring: {holiday.recurringType}
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveHoliday(index)}
                        className="ml-3 text-red-600 hover:text-red-800 text-sm font-medium"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Submit Button */}
          <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
            <div className="flex items-center justify-end space-x-4">
              <button
                type="button"
                onClick={() => navigate('/admin/employees')}
                className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isUpdating}
                className="flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {isUpdating ? (
                  <>
                    <Loader className="animate-spin w-4 h-4 mr-2" />
                    Updating...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Update Employee
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UpdationUser;
