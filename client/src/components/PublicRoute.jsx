import React, { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/authStore";

const PublicRoute = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { loading, isAuthenticated, isAdmin } = useAuth();

  useEffect(() => {
    if (loading) return;

    const publicPaths = ["/login", "/register", "/reset-password"];
    const isPublicPath = publicPaths.includes(location.pathname);

    if (isAuthenticated()) {
      // Allow reset-password even when authenticated
      if (location.pathname === "/reset-password") return;

      if (isPublicPath) {
        if (isAdmin()) navigate("/admin", { replace: true });
        else navigate("/teacherinfo", { replace: true });
      }
    }
  }, [navigate, location.pathname, loading, isAuthenticated, isAdmin]);

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

  return children;
};

export default PublicRoute;
