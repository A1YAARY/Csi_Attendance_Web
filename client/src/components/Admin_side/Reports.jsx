import React, { useEffect, useState } from "react";
import { useAuth } from "../../context/authStore";
import { toast } from "react-toastify";
import SuccessPopup from "./SuccessPopUp";

const Reports = () => {
  const [activeTab, setActiveTab] = useState("single");
  const [loading, setLoading] = useState(false);
  const { user, getAuthHeaders } = useAuth();
  const [showPopup, setShowPopup] = useState(false);
  const [orginizationcodemain, setOrginizationcodemain] = useState(localStorage.getItem("organizationcode") || "");
  useEffect(() => {
    console.log(user,orginizationcodemain);



  }, [user])


  const handleSuccess = async () => {

    // Simulate successful action (upload/register)
    await new Promise((res) => setTimeout(res, 1000));

    setShowPopup(true);
    setTimeout(() => setShowPopup(false), 1000); // Auto-hide
  };

  // Fixed: Corrected the typo and logic for organization code
  const getOrganizationCode = () => {
    // Try localStorage first, then fall back to user object
    const storedOrgCode = localStorage.getItem("organizationcode");

    if (storedOrgCode) return storedOrgCode;

    // Fall back to user's organization information
    return (
      user?.organizationId?.name ||
      user?.organization?.name ||
      user?.organizationCode ||
      null
    );
  };

  const organizationCode = getOrganizationCode();

  // Single user registration state
  const [singleUser, setSingleUser] = useState({
    name: "",
    email: "",
    institute: "",
    department: "",
    password: "",
  });

  // Bulk upload state
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadResults, setUploadResults] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const baseurl =
    import.meta.env.VITE_BACKEND_BASE_URL || "http://localhost:3000";

  // Register user using the admin's organization automatically
  const registerUserInOrganization = async (userData) => {
    try {
      // Check if organization code is available
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

  // Handle single user form submission
  const handleSingleUserSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Check if organization code is available
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
      });

      if (response.message === "User registered successfully") {
        toast.success("User registered successfully!");
        setSingleUser({
          name: "",
          email: "",
          institute: "",
          department: "",
          password: "",
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

  // Handle file selection
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

  // Handle drag and drop
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

  // Handle bulk upload using correct API endpoint
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
    formData.append("excel", selectedFile); // must be 'excel' to match multer.single('excel')
    formData.append("organizationCode", organizationCode); // optional, backend may fallback to admin org

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

  // Download template (fixed endpoint)
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
    <div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            User Registration
          </h1>
          <p className="text-gray-600">
            Register users for organization:{" "}
            <span className="font-semibold text-blue-600">
              {organizationCode || "Loading..."}
            </span>
          </p>
        </div>

        {/* Show warning if no organization code */}
        {!organizationCode && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-800">
              <strong>Warning:</strong> No organization code found. Please
              ensure you're logged in properly or contact support.
            </p>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab("single")}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === "single"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
              >
                Single User
              </button>
              <button
                onClick={() => setActiveTab("bulk")}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === "bulk"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
              >
                Bulk Upload
              </button>
            </nav>
          </div>
        </div>

        {/* Single User Registration Tab */}
        {activeTab === "single" && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Register Single User
            </h2>
            <form onSubmit={handleSingleUserSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={singleUser.name}
                    onChange={(e) =>
                      setSingleUser({ ...singleUser, name: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter full name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={singleUser.email}
                    onChange={(e) =>
                      setSingleUser({ ...singleUser, email: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter email address"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Institute *
                  </label>
                  <input
                    type="text"
                    required
                    value={singleUser.institute}
                    onChange={(e) =>
                      setSingleUser({
                        ...singleUser,
                        institute: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., engineering"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Department *
                  </label>
                  <input
                    type="text"
                    required
                    value={singleUser.department}
                    onChange={(e) =>
                      setSingleUser({
                        ...singleUser,
                        department: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., CMPN"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Temporary Password *
                  </label>
                  <input
                    type="password"
                    required
                    value={singleUser.password}
                    onChange={(e) =>
                      setSingleUser({ ...singleUser, password: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter temporary password"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    User will receive an email to set their permanent password
                  </p>
                </div>
              </div>
              <div className="p-4">
                <SuccessPopup show={showPopup} message="Registered Successful!" />
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  onClick={handleSuccess}
                  disabled={loading || !organizationCode}
                  className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {loading && (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  )}
                  {loading ? "Registering..." : "Register User"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Bulk Upload Tab */}
        {activeTab === "bulk" && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Bulk User Registration
            </h2>

            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
              <h3 className="text-sm font-medium text-blue-800 mb-2">
                📋 Template Requirements
              </h3>
              <p className="text-sm text-blue-700 mb-2">
                Your Excel file must contain the following columns:
              </p>
              <ul className="text-sm text-blue-700 list-disc list-inside">
                <li>
                  <strong>email</strong> - Valid email address
                </li>
                <li>
                  <strong>name</strong> - Full name
                </li>
                <li>
                  <strong>institute</strong> - Institute name
                </li>
                <li>
                  <strong>department</strong> - Department name
                </li>
                <li>
                  <strong>password</strong> - Temporary password
                </li>
              </ul>
            </div>

            <div className="mb-6">
              <button
                onClick={downloadTemplate}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                📥 Download Excel Template
              </button>
            </div>

            {/* File Upload Area */}
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${dragActive
                ? "border-blue-400 bg-blue-50"
                : "border-gray-300 hover:border-gray-400"
                }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              {!selectedFile ? (
                <div>
                  <div className="mx-auto w-12 h-12 text-gray-400 mb-4">📄</div>
                  <p className="text-lg font-medium text-gray-900 mb-2">
                    {dragActive ? "Release to upload" : "Drop Excel file here"}
                  </p>
                  <p className="text-gray-500 mb-4">or</p>
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={(e) =>
                      e.target.files[0] && handleFileSelect(e.target.files[0])
                    }
                    className="hidden"
                    id="file-input"
                  />
                  <label
                    htmlFor="file-input"
                    className="cursor-pointer inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                  >
                    Select Excel File
                  </label>
                  <p className="text-xs text-gray-400 mt-2">
                    Only Excel files (.xlsx, .xls) are supported. Max size: 10MB
                  </p>
                </div>
              ) : (
                <div className="bg-green-50 border border-green-200 rounded-md p-4">
                  <div className="flex items-center justify-center">
                    <div className="flex-shrink-0">
                      <div className="h-5 w-5 text-green-400">✅</div>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-green-800">
                        File Ready for Upload
                      </h3>
                      <p className="text-sm text-green-700">
                        {selectedFile.name} (
                        {(selectedFile.size / 1024).toFixed(1)} KB)
                      </p>
                    </div>
                    <div className="ml-auto">
                      <button
                        onClick={() => setSelectedFile(null)}
                        className="text-green-700 hover:text-green-900 text-lg"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {selectedFile && (
              <div className="mt-6 flex justify-end">
                <button
                  onClick={handleBulkUpload}
                  disabled={loading || !organizationCode}
                  className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {loading && (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  )}
                  {loading ? "Processing..." : "Upload Users"}
                </button>
              </div>
            )}

            {/* Upload Results */}
            {uploadResults && (
              <div className="mt-6 bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-medium text-gray-900 mb-3">
                  Upload Results
                </h3>

                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="text-center bg-green-100 rounded-lg p-3">
                    <p className="text-2xl font-bold text-green-600">
                      {uploadResults.summary?.successful || 0}
                    </p>
                    <p className="text-sm text-gray-600">Successful</p>
                  </div>
                  <div className="text-center bg-red-100 rounded-lg p-3">
                    <p className="text-2xl font-bold text-red-600">
                      {uploadResults.summary?.errors || 0}
                    </p>
                    <p className="text-sm text-gray-600">Failed</p>
                  </div>
                  <div className="text-center bg-yellow-100 rounded-lg p-3">
                    <p className="text-2xl font-bold text-yellow-600">
                      {uploadResults.summary?.duplicates || 0}
                    </p>
                    <p className="text-sm text-gray-600">Duplicates</p>
                  </div>
                </div>

                {uploadResults.results?.errors &&
                  uploadResults.results.errors.length > 0 && (
                    <div className="mb-4">
                      <h4 className="font-medium text-red-800 mb-2">
                        ❌ Errors:
                      </h4>
                      <div className="max-h-32 overflow-y-auto bg-white rounded border p-2">
                        {uploadResults.results.errors.map((error, index) => (
                          <p key={index} className="text-sm text-red-700 mb-1">
                            <strong>Row {error.row}:</strong> {error.error}
                            {error.email && (
                              <span className="font-medium">
                                {" "}
                                ({error.email})
                              </span>
                            )}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}

                {uploadResults.results?.duplicates &&
                  uploadResults.results.duplicates.length > 0 && (
                    <div className="mb-4">
                      <h4 className="font-medium text-yellow-800 mb-2">
                        ⚠️ Duplicates:
                      </h4>
                      <div className="max-h-32 overflow-y-auto bg-white rounded border p-2">
                        {uploadResults.results.duplicates.map(
                          (duplicate, index) => (
                            <p
                              key={index}
                              className="text-sm text-yellow-700 mb-1"
                            >
                              <strong>Row {duplicate.row}:</strong>{" "}
                              {duplicate.email} - User already exists
                            </p>
                          )
                        )}
                      </div>
                    </div>
                  )}

                {uploadResults.results?.success &&
                  uploadResults.results.success.length > 0 && (
                    <div>
                      <h4 className="font-medium text-green-800 mb-2">
                        ✅ Successfully Created:
                      </h4>
                      <div className="max-h-32 overflow-y-auto bg-white rounded border p-2">
                        {uploadResults.results.success
                          .slice(0, 10)
                          .map((success, index) => (
                            <p
                              key={index}
                              className="text-sm text-green-700 mb-1"
                            >
                              <strong>Row {success.row}:</strong> {success.name}{" "}
                              ({success.email})
                            </p>
                          ))}
                        {uploadResults.results.success.length > 10 && (
                          <p className="text-sm text-green-600 font-medium">
                            ... and {uploadResults.results.success.length - 10}{" "}
                            more
                          </p>
                        )}
                      </div>
                    </div>
                  )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Reports;
