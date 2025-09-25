// hooks/useAdminProtection.js
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export const useAdminProtection = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user exists and is loaded
    if (user !== null) {
      // If user role is not 'organization', redirect to teacher-info
      if (user.role !== "organization") {
        console.log(
          "❌ Access denied: User role is",
          user.role,
          "- Redirecting to teacher info"
        );
        navigate("/teacher-info", { replace: true });
      } else {
        console.log("✅ Access granted: User is organization admin");
      }
    }
    // Note: We don't redirect if user is null (still loading)
  }, [user, navigate]);

  // Return whether user is authorized
  return user?.role === "organization";
};
