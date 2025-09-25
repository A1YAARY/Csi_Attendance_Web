import React, { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const PublicRoute = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  useEffect(() => {
    const token = localStorage.getItem("accessToken");

    // Allow access to login and register pages when no token
    const publicPaths = ["/login", "/register"];
    const isPublicPath = publicPaths.includes(location.pathname);

    if (token && isPublicPath) {
      // Token exists and user is on public page, redirect based on role
      const userData = localStorage.getItem("user");
      if (userData) {
        const user = JSON.parse(userData);
        if (user.role === "organization") {
          navigate("/admin", { replace: true });
        } else {
          navigate("/Teacherinfo", { replace: true });
        }
      } else {
        navigate("/Teacherinfo", { replace: true });
      }
    }
  }, [navigate, location.pathname]);

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
