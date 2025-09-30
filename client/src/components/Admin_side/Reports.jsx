import React, { useEffect, useState } from "react";
import { useAuth } from "../../context/authStore";
import { toast } from "react-toastify";
import SuccessPopup from "./SuccessPopUp";

const Reports = () => {
  const [activeTab, setActiveTab] = useState("single");
  const [loading, setLoading] = useState(false);
  const { user, getAuthHeaders } = useAuth();
  const [showPopup, setShowPopup] = useState(false);
  const [orginizationcodemain, setOrginizationcodemain] = useState(
    localStorage.getItem("organizationcode") || ""
  );

  useEffect(() => {
    console.log(user, orginizationcodemain);
  }, [user]);

  const handleSuccess = async () => {
    await new Promise((res) => setTimeout(res, 1000));
    setShowPopup(true);
    setTimeout(() => setShowPopup(false), 1000);
  };

  const getOrganizationCode = () => {
    const storedOrgCode = localStorage.getItem("organizationcode");
    if (storedOrgCode) return storedOrgCode;
    return (
      user?.organizationId?.name ||
      user?.organization?.name ||
      user?.organizationCode ||
      null
    );
  };

  const organizationCode = getOrganizationCode();

  // **ENHANCED: Single user registration state with new fields**
  const [singleUser, setSingleUser] = useState({
    name: "",
    email: "",
    institute: "",
    department: "",
    password: "",
    phone: "", // NEW
    workingHoursStart: "09:00", // NEW
    workingHoursEnd: "18:00", // NEW
    weeklySchedule: {
      // NEW
      monday: true,
      tuesday: true,
      wednesday: true,
      thursday: true,
      friday: true,
      saturday: false,
      sunday: false,
    },
    customHolidays: [], // NEW - Array of date strings
  });

  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadResults, setUploadResults] = useState(null);
  const [dragActive, setDragActive] = useState(false);

  const baseurl =
    import.meta.env.VITE_BACKEND_BASE_URL || "http://localhost:9000";

  const registerUserInOrganization = async (userData) => {
    try {
      if (!organizationCode) {
        throw new Error(
          "Organization code not found. Please ensure you're properly logged in as an admin."
        );
      }

      const response = await fetch(`${baseurl}/auth2/register-user`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
        },
        body: JSON.stringify({
          ...userData,
          organizationCode: organizationCode,
          role: "user",
        }),
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Registration error:", error);
      throw error;
    }
  };

  // **ENHANCED: Handle single user form submission with all fields**
  const handleSingleUserSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!organizationCode) {
        toast.error(
          "Organization information not found. Please login again or contact support."
        );
        setLoading(false);
        return;
      }

      const response = await registerUserInOrganization({
        name: singleUser.name,
        email: singleUser.email,
        institute: singleUser.institute,
        department: singleUser.department,
        password: singleUser.password,
        phone: singleUser.phone, // NEW
        workingHoursStart: singleUser.workingHoursStart, // NEW
        workingHoursEnd: singleUser.workingHoursEnd, // NEW
        weeklySchedule: singleUser.weeklySchedule, // NEW
        customHolidays: singleUser.customHolidays, // NEW
      });

      if (response.message === "User registered successfully") {
        toast.success("User registered successfully!");
        // Reset form
        setSingleUser({
          name: "",
          email: "",
          institute: "",
          department: "",
          password: "",
          phone: "",
          workingHoursStart: "09:00",
          workingHoursEnd: "18:00",
          weeklySchedule: {
            monday: true,
            tuesday: true,
            wednesday: true,
            thursday: true,
            friday: true,
            saturday: false,
            sunday: false,
          },
          customHolidays: [],
        });
      } else {
        toast.error(response.message || "Registration failed");
      }
    } catch (error) {
      console.error("Registration error:", error);
      toast.error(error.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (file) => {
    if (
      file &&
      (file.type ===
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
        file.type === "application/vnd.ms-excel" ||
        file.name.endsWith(".xlsx") ||
        file.name.endsWith(".xls"))
    ) {
      setSelectedFile(file);
      setUploadResults(null);
      toast.success("Excel file selected successfully!");
    } else {
      toast.error("Please select a valid Excel (.xlsx or .xls) file");
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleBulkUpload = async () => {
    if (!selectedFile) {
      toast.error("Please select an Excel file first");
      return;
    }

    if (!organizationCode) {
      toast.error("Organization information not found. Please login again.");
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append("excel", selectedFile);
    formData.append("organizationCode", organizationCode);

    try {
      const response = await fetch(`${baseurl}/bulk/upload-users`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        setUploadResults(data);
        handleSuccess();
        toast.success(
          `Bulk upload completed! ${data.summary.successful} users created`
        );
        setSelectedFile(null);
      } else {
        toast.error(data.message || "Bulk upload failed");
        console.error("Bulk upload error:", data);
      }
    } catch (error) {
      console.error("Bulk upload error:", error);
      toast.error("Bulk upload failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const downloadTemplate = async () => {
    try {
      const response = await fetch(`${baseurl}/bulk/template`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
        },
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", "bulk_user_registration_template.xlsx");
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
        toast.success("Template downloaded successfully!");
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to download template");
      }
    } catch (error) {
      console.error("Template download error:", error);
      toast.error("Failed to download template");
    }
  };

  return (
    <div className="min-h-screenbg-white p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-600 mb-2">
            User Registration
          </h1>
          <p className="text-gray-400">
            Register users for organization:{" "}
            <span className="text-blue-400 font-semibold">
              {organizationCode || "Loading..."}
            </span>
          </p>
          {!organizationCode && (
            <div className="mt-4 p-4 bg-red-900/20 border border-red-500/50 rounded-lg">
              <p className="text-red-400">
                ⚠️ <strong>Warning:</strong> No organization code found. Please
                ensure you're logged in properly or contact support.
              </p>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex space-x-4 mb-6">
          <button
            onClick={() => setActiveTab("single")}
            className={`px-6 py-3 rounded-lg font-semibold transition-all ${activeTab === "single"
                ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg"
                : "bg-gray-800 text-gray-400 hover:bg-gray-700"
              }`}
          >
            Single User
          </button>
          <button
            onClick={() => setActiveTab("bulk")}
            className={`px-6 py-3 rounded-lg font-semibold transition-all ${activeTab === "bulk"
                ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg"
                : "bg-gray-800 text-gray-400 hover:bg-gray-700"
              }`}
          >
            Bulk Upload
          </button>
        </div>

        {/* Single User Registration */}
        {activeTab === "single" && (
          <div className="text-black backdrop-blur-lg rounded-xl p-8 shadow-2xl border border-gray-700">
            <h2 className="text-2xl font-bold text-blacak mb-6">
              Register Single User
            </h2>
            <form onSubmit={handleSingleUserSubmit} className="space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-gray-900 mb-2 font-medium">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    value={singleUser.name}
                    onChange={(e) =>
                      setSingleUser({ ...singleUser, name: e.target.value })
                    }
                    className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="John Doe"
                    required
                  />
                </div>
                <div>
                  <label className="block text-gray-900 mb-2 font-medium">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    value={singleUser.email}
                    onChange={(e) =>
                      setSingleUser({ ...singleUser, email: e.target.value })
                    }
                    className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="john@example.com"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-gray-900 mb-2 font-medium">
                    Institute/Branch *
                  </label>
                  <input
                    type="text"
                    value={singleUser.institute}
                    onChange={(e) =>
                      setSingleUser({
                        ...singleUser,
                        institute: e.target.value,
                      })
                    }
                    className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Mumbai Office"
                    required
                  />
                </div>
                <div>
                  <label className="block text-gray-900 mb-2 font-medium">
                    Department *
                  </label>
                  <input
                    type="text"
                    value={singleUser.department}
                    onChange={(e) =>
                      setSingleUser({
                        ...singleUser,
                        department: e.target.value,
                      })
                    }
                    className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Engineering"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-gray-900 mb-2 font-medium">
                    Password *
                  </label>
                  <input
                    type="password"
                    value={singleUser.password}
                    onChange={(e) =>
                      setSingleUser({ ...singleUser, password: e.target.value })
                    }
                    className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Temporary password"
                    required
                  />
                </div>
                <div>
                  <label className="block text-gray-900 mb-2 font-medium">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={singleUser.phone}
                    onChange={(e) =>
                      setSingleUser({ ...singleUser, phone: e.target.value })
                    }
                    className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="9876543210"
                  />
                </div>
              </div>

              {/* Working Hours */}
              <div className="border-t border-gray-700 pt-6">
                <h3 className="text-xl font-semibold text-white mb-4">
                  Working Hours
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-gray-900 mb-2 font-medium">
                      Start Time
                    </label>
                    <input
                      type="time"
                      value={singleUser.workingHoursStart}
                      onChange={(e) =>
                        setSingleUser({
                          ...singleUser,
                          workingHoursStart: e.target.value,
                        })
                      }
                      className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-900 mb-2 font-medium">
                      End Time
                    </label>
                    <input
                      type="time"
                      value={singleUser.workingHoursEnd}
                      onChange={(e) =>
                        setSingleUser({
                          ...singleUser,
                          workingHoursEnd: e.target.value,
                        })
                      }
                      className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Weekly Schedule */}
              <div className="border-t border-gray-700 pt-6">
                <h3 className="text-xl font-semibold text-white mb-4">
                  Weekly Schedule
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                  {Object.keys(singleUser.weeklySchedule).map((day) => (
                    <label
                      key={day}
                      className="flex items-center space-x-2 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={singleUser.weeklySchedule[day]}
                        onChange={(e) =>
                          setSingleUser({
                            ...singleUser,
                            weeklySchedule: {
                              ...singleUser.weeklySchedule,
                              [day]: e.target.checked,
                            },
                          })
                        }
                        className="w-5 h-5 text-blue-500 bg-gray-900 border-gray-600 rounded focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="text-gray-900 capitalize">{day}</span>
                    </label>
                  ))}
                </div>
                <p className="text-sm text-gray-400 mt-2">
                  ✓ Checked = Working day | ✗ Unchecked = Weekly off
                </p>
              </div>

              {/* Custom Holidays */}
              <div className="border-t border-gray-700 pt-6">
                <h3 className="text-xl font-semibold text-white mb-4">
                  Custom Holidays (Optional)
                </h3>
                <div className="space-y-3">
                  <input
                    type="date"
                    onChange={(e) => {
                      if (
                        e.target.value &&
                        !singleUser.customHolidays.includes(e.target.value)
                      ) {
                        setSingleUser({
                          ...singleUser,
                          customHolidays: [
                            ...singleUser.customHolidays,
                            e.target.value,
                          ],
                        });
                        e.target.value = "";
                      }
                    }}
                    className="w-full md:w-1/2 px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="flex flex-wrap gap-2">
                    {singleUser.customHolidays.map((date, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-3 py-1 bg-purple-600/30 border border-purple-500/50 rounded-full text-sm text-purple-900"
                      >
                        {new Date(date).toLocaleDateString()}
                        <button
                          type="button"
                          onClick={() =>
                            setSingleUser({
                              ...singleUser,
                              customHolidays:
                                singleUser.customHolidays.filter(
                                  (_, i) => i !== index
                                ),
                            })
                          }
                          className="ml-2 text-purple-900 hover:text-red-400"
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !organizationCode}
                className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-4 rounded-lg font-semibold hover:from-blue-600 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
              >
                {loading ? "Registering..." : "Register User"}
              </button>
            </form>
          </div>
        )}

        {/* Bulk Upload Tab */}
        {activeTab === "bulk" && (
          <div className=" backdrop-blur-lg rounded-xl p-8 shadow-2xl border border-gray-700">
            <h2 className="text-2xl font-bold text-white mb-6">
              Bulk User Upload
            </h2>

            {/* Template Download */}
            <div className="mb-8 p-6  border border-blue-500/50 rounded-lg">
              <h3 className="text-lg font-semibold text-blue-900 mb-3">
                📋 Step 1: Download Template
              </h3>
              <p className="text-gray-900 mb-4">
                Your Excel file must contain the following columns:
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4 text-sm">
                <span className="text-green-400">• email *</span>
                <span className="text-green-400">• name *</span>
                <span className="text-green-400">• institute *</span>
                <span className="text-green-400">• department *</span>
                <span className="text-green-400">• password *</span>
                <span className="text-gray-400">• phone</span>
                <span className="text-gray-400">• workingHoursStart</span>
                <span className="text-gray-400">• workingHoursEnd</span>
                <span className="text-gray-400">• weeklySchedule (7 days)</span>
                <span className="text-gray-400">• customHolidays</span>
              </div>
              <button
                onClick={downloadTemplate}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-semibold transition-all"
              >
                Download Excel Template
              </button>
            </div>

            {/* File Upload */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-blue-900 mb-3">
                📤 Step 2: Upload Filled Template
              </h3>
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-lg p-12 text-center transition-all ${dragActive
                    ? "border-blue-500 bg-blue-900/20"
                    : "border-gray-600 hover:border-gray-500"
                  }`}
              >
                <div className="text-6xl mb-4">📄</div>
                <p className="text-xl text-white mb-2">
                  {dragActive ? "Release to upload" : "Drop Excel file here"}
                </p>
                <p className="text-gray-400 mb-4">or</p>
                <label
                  htmlFor="file-input"
                  className="inline-block bg-gray-700 hover:bg-gray-600 text-white px-6 py-3 rounded-lg cursor-pointer font-semibold transition-all"
                >
                  Browse Files
                </label>
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={(e) =>
                    e.target.files[0] && handleFileSelect(e.target.files[0])
                  }
                  className="hidden"
                  id="file-input"
                />
                <p className="text-sm text-gray-500 mt-4">
                  Only Excel files (.xlsx, .xls) are supported. Max size: 10MB
                </p>
              </div>

              {selectedFile && (
                <div className="mt-4 p-4 bg-green-900/20 border border-green-500/50 rounded-lg flex items-center justify-between">
                  <div>
                    <p className="text-green-400 font-semibold">
                      ✓ {selectedFile.name}
                    </p>
                    <p className="text-gray-400 text-sm">
                      {(selectedFile.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedFile(null)}
                    className="text-red-400 hover:text-red-900"
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>

            <button
              onClick={handleBulkUpload}
              disabled={!selectedFile || loading || !organizationCode}
              className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-4 rounded-lg font-semibold hover:from-blue-600 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
            >
              {loading ? "Uploading..." : "Upload and Register Users"}
            </button>

            {/* Upload Results */}
            {uploadResults && (
              <div className="mt-8 space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-green-900/30 border border-green-500/50 rounded-lg p-4 text-center">
                    <div className="text-3xl font-bold text-green-400">
                      {uploadResults.summary?.successful || 0}
                    </div>
                    <div className="text-gray-900">Successful</div>
                  </div>
                  <div className="bg-red-900/30 border border-red-500/50 rounded-lg p-4 text-center">
                    <div className="text-3xl font-bold text-red-400">
                      {uploadResults.summary?.errors || 0}
                    </div>
                    <div className="text-gray-900">Failed</div>
                  </div>
                  <div className="bg-yellow-900/30 border border-yellow-500/50 rounded-lg p-4 text-center">
                    <div className="text-3xl font-bold text-yellow-400">
                      {uploadResults.summary?.duplicates || 0}
                    </div>
                    <div className="text-gray-900">Duplicates</div>
                  </div>
                </div>

                {uploadResults.results?.errors?.length > 0 && (
                  <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-4">
                    <h4 className="font-semibold text-red-400 mb-3">
                      ❌ Errors ({uploadResults.results.errors.length})
                    </h4>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {uploadResults.results.errors.map((error, index) => (
                        <div
                          key={index}
                          className="text-sm text-gray-900 bg-gray-900/50 p-2 rounded"
                        >
                          <strong>Row {error.row}:</strong> {error.error}
                          {error.email && (
                            <span className="text-gray-400">
                              {" "}
                              ({error.email})
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {uploadResults.results?.duplicates?.length > 0 && (
                  <div className="bg-yellow-900/20 border border-yellow-500/50 rounded-lg p-4">
                    <h4 className="font-semibold text-yellow-400 mb-3">
                      ⚠️ Duplicates ({uploadResults.results.duplicates.length})
                    </h4>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {uploadResults.results.duplicates.map(
                        (duplicate, index) => (
                          <div
                            key={index}
                            className="text-sm text-gray-900 bg-gray-900/50 p-2 rounded"
                          >
                            <strong>Row {duplicate.row}:</strong>{" "}
                            {duplicate.email} - User already exists
                          </div>
                        )
                      )}
                    </div>
                  </div>
                )}

                {uploadResults.results?.success?.length > 0 && (
                  <div className="bg-green-900/20 border border-green-500/50 rounded-lg p-4">
                    <h4 className="font-semibold text-green-400 mb-3">
                      ✅ Successfully Registered (
                      {uploadResults.results.success.length})
                    </h4>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {uploadResults.results.success
                        .slice(0, 10)
                        .map((success, index) => (
                          <div
                            key={index}
                            className="text-sm text-gray-900 bg-gray-900/50 p-2 rounded"
                          >
                            <strong>Row {success.row}:</strong> {success.name}{" "}
                            <span className="text-gray-400">
                              ({success.email})
                            </span>
                          </div>
                        ))}
                      {uploadResults.results.success.length > 10 && (
                        <div className="text-gray-400 text-sm text-center">
                          ... and {uploadResults.results.success.length - 10}{" "}
                          more
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {showPopup && <SuccessPopup />}
    </div>
  );
};

export default Reports;
