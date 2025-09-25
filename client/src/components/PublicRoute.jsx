import React, { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const PublicRoute = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading } = useAuth(); // Add loading from context

  useEffect(() => {
    // Don't do anything while loading
    if (loading) return;
    
    const token = localStorage.getItem("accessToken");
    
    // Allow access to login and register pages when no token
    const publicPaths = ["/login", "/register"];
    const isPublicPath = publicPaths.includes(location.pathname);
    
    if (token && isPublicPath) {
      // Token exists and user is on public page, redirect based on role
      const userData = localStorage.getItem("userData"); // FIXED: Changed from "user" to "userData"
      if (userData) {
        const parsedUser = JSON.parse(userData);
        if (parsedUser.role === "organization") {
          navigate("/admin", { replace: true });
        } else {
          navigate("/Teacherinfo", { replace: true });
        }
      } else {
        navigate("/Teacherinfo", { replace: true });
      }
    }
  }, [navigate, location.pathname, loading]); // Added loading to dependencies

  // Show loading while auth is being checked
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const token = localStorage.getItem("accessToken");
  const publicPaths = ["/login", "/register"];
  const isPublicPath = publicPaths.includes(location.pathname);

  // If token exists and user is on public page, don't render (will redirect)
  if (token && isPublicPath) {
    return null;
  }

  return children;
};

export default PublicRoute;
