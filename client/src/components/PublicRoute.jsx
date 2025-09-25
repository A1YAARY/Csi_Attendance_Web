import React, { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const PublicRoute = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading, isAuthenticated, isAdmin } = useAuth();

  useEffect(() => {
    // Don't do anything while loading
    if (loading) return;

    // Define public paths that don't require authentication
    const publicPaths = ["/login", "/register", "/reset-password"];
    const isPublicPath = publicPaths.includes(location.pathname);

    // If user is authenticated and trying to access public pages (except reset-password)
    if (isAuthenticated()) {
      // Allow reset-password even for authenticated users
      if (location.pathname === "/reset-password") {
        return; // Don't redirect, allow access to reset password
      }

      // For other public paths, redirect authenticated users to their dashboard
      if (isPublicPath) {
        if (isAdmin()) {
          navigate("/admin", { replace: true });
        } else {
          navigate("/teacherinfo", { replace: true }); // Fixed path casing
        }
      }
    }
  }, [navigate, location.pathname, loading, isAuthenticated, isAdmin]);

  // Show loading while auth is being checked
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Render the public route content
  return children;
};

export default PublicRoute;
