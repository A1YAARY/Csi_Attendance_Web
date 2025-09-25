import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const ProtectedRoute = ({ children }) => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      // No token, redirect to login
      navigate("/login", { replace: true });
    }
  }, [navigate]);

  // Show loading if auth is being checked
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const token = localStorage.getItem("accessToken");
  if (!token) {
    return null; // Don't render anything while redirecting
  }

  return children;
};

export default ProtectedRoute;
