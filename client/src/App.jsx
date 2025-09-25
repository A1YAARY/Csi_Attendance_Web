import "./App.css";
import TeacherInfo from "./components/user_side/TeacherInfo";
import { motion, AnimatePresence } from "framer-motion";
import AnimationPage from "./components/user_side/AnimationPage";
import React, { useEffect, useRef, useState } from "react";
import NewQrcode from "./components/user_side/Newqrcode";
import { Route, Routes, useLocation, Navigate } from "react-router-dom";
import Logout from "./components/user_side/LogoutPage";
import Dashboad from "./components/user_side/Dashboad";
import { LoginPage } from "./components/user_side/LoginPage";
import OrganizationRegister from "./components/user_side/OrganizationRegister";
import AdminHome from "./components/Admin_side/AdminHome";
import ProtectedRoute from "./components/ProtectedRoute";
import PublicRoute from "./components/PublicRoute";
import { useAuth } from "./context/AuthContext";
import { useAdminProtection } from "./hooks/useAdminProtection";
import "cally";
import AdminProtected from "./components/AdminProtected";
import ClickSpark from "./reactbitscomponents/ClickSpark";
import ResetPass from "./components/Admin_side/ResetPass";

function App() {
  const location = useLocation();
  const { isAuthenticated, isAdmin } = useAuth();

  return (
    <>
      <ClickSpark
        sparkColor="#000000"
        sparkSize={10}
        sparkRadius={15}
        sparkCount={8}
        duration={400}
      >
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            {/* Public Routes - Accessible without authentication */}
            <Route
              path="/login"
              element={
                <PublicRoute>
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                  >
                    <LoginPage />
                  </motion.div>
                </PublicRoute>
              }
            />

            <Route
              path="/register"
              element={
                <PublicRoute>
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                  >
                    <OrganizationRegister />
                  </motion.div>
                </PublicRoute>
              }
            />

            {/* PASSWORD RESET ROUTE - COMPLETELY PUBLIC - No Protection at all */}
            <Route
              path="/reset-password"
              element={
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.3 }}
                >
                  <ResetPass />
                </motion.div>
              }
            />

            {/* Alternative route for backward compatibility */}
            <Route
              path="/ResetPass"
              element={<Navigate to="/reset-password" replace />}
            />

            {/* Protected Routes - Require authentication */}
            <Route
              path="/teacherinfo"
              element={
                <ProtectedRoute>
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                  >
                    <TeacherInfo />
                  </motion.div>
                </ProtectedRoute>
              }
            />

            <Route
              path="/animation"
              element={
                <ProtectedRoute>
                  <AnimationPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/scanqr"
              element={
                <ProtectedRoute>
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.3 }}
                  >
                    <NewQrcode />
                  </motion.div>
                </ProtectedRoute>
              }
            />

            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <motion.div
                    initial={{ opacity: 0, x: -100 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 100 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Dashboad />
                  </motion.div>
                </ProtectedRoute>
              }
            />

            <Route
              path="/showlogout"
              element={
                <ProtectedRoute>
                  <Logout />
                </ProtectedRoute>
              }
            />

            {/* Admin Routes */}
            <Route
              path="/admin/*"
              element={
                <ProtectedRoute>
                  <AdminProtected>
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.3 }}
                    >
                      <AdminHome />
                    </motion.div>
                  </AdminProtected>
                </ProtectedRoute>
              }
            />

            {/* Root route - redirect based on authentication and role */}
            <Route
              path="/"
              element={(() => {
                const token = localStorage.getItem("accessToken");
                if (token) {
                  // Check user role for proper redirection
                  const userData = localStorage.getItem("userData");
                  if (userData) {
                    try {
                      const user = JSON.parse(userData);
                      if (user.role === "organization") {
                        return <Navigate to="/admin" replace />;
                      } else {
                        return <Navigate to="/teacherinfo" replace />;
                      }
                    } catch (error) {
                      console.error("Error parsing userData:", error);
                      localStorage.removeItem("userData");
                      localStorage.removeItem("accessToken");
                      return <Navigate to="/login" replace />;
                    }
                  }
                  // Default to teacherinfo if userData is not available
                  return <Navigate to="/teacherinfo" replace />;
                }
                return <Navigate to="/login" replace />;
              })()}
            />

            {/* Catch all - redirect to appropriate page based on authentication */}
            <Route
              path="*"
              element={(() => {
                const token = localStorage.getItem("accessToken");
                if (token) {
                  const userData = localStorage.getItem("userData");
                  if (userData) {
                    try {
                      const user = JSON.parse(userData);
                      if (user.role === "organization") {
                        return <Navigate to="/admin" replace />;
                      } else {
                        return <Navigate to="/teacherinfo" replace />;
                      }
                    } catch (error) {
                      console.error("Error parsing userData:", error);
                      localStorage.removeItem("userData");
                      localStorage.removeItem("accessToken");
                      return <Navigate to="/login" replace />;
                    }
                  }
                  return <Navigate to="/teacherinfo" replace />;
                }
                return <Navigate to="/login" replace />;
              })()}
            />
          </Routes>
        </AnimatePresence>
      </ClickSpark>
    </>
  );
}

export default App;
