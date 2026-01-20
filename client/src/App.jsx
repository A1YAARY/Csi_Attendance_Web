import "./App.css";
import 'react-toastify/dist/ReactToastify.css';
import { ToastContainer } from 'react-toastify';
import TeacherInfo from "./components/user_side/TeacherInfo";
import { motion, AnimatePresence } from "framer-motion";
import AnimationPage from "./components/user_side/AnimationPage";
import React from "react";
import NewQrcode from "./components/user_side/Newqrcode";
import { Route, Routes, useLocation, Navigate } from "react-router-dom";
import Logout from "./components/user_side/LogoutPage";
import Dashboad from "./components/user_side/Dashboad";
import { LoginPage } from "./components/user_side/LoginPage";
import OrganizationRegister from "./components/user_side/OrganizationRegister";
import AdminHome from "./components/Admin_side/AdminHome";
import ProtectedRoute from "./components/ProtectedRoute";
import PublicRoute from "./components/PublicRoute";
import { useAuth } from "./context/authStore"; // ✅ FIXED IMPORT
import AdminProtected from "./components/AdminProtected";
import ClickSpark from "./reactbitscomponents/ClickSpark";
import ResetPass from "./components/Admin_side/ResetPass";
import UpdationUser from "./components/Admin_side/UpdationUser";
import ManualAttendance from './components/Admin_side/ManualAttendance';

function App() {
  const location = useLocation();
  const { isAuthenticated, isAdmin, user } = useAuth(); // ✅ Now using store

  // Helper function to determine redirect path
  const getRedirectPath = () => {
    if (user?.role === "organization") {
      return "/admin";
    } else {
      return "/teacherinfo";
    }
  };

  return (
    <>
      <ToastContainer position="top-right" autoClose={3000} />
      <ClickSpark
        sparkColor="#000000"
        sparkSize={10}
        sparkRadius={15}
        sparkCount={8}
        duration={400}
      >
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            {/* Public Routes */}
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
            <Route path="/admin/manual-attendance" element={<ManualAttendance />} />


            {/* Password Reset Route */}
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

            <Route
              path="/ResetPass"
              element={<Navigate to="/reset-password" replace />}
            />

            {/* Protected Routes */}
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

            <Route
              path="/admin/edit/:id"
              element={
                <AdminProtected>
                  <UpdationUser />
                </AdminProtected>
              }
            />
            {/* Root route - redirect based on authentication */}
            <Route
              path="/"
              element={
                isAuthenticated()
                  ? (isAdmin() ? <Navigate to="/admin" replace /> : <Navigate to="/teacherinfo" replace />)
                  : <Navigate to="/login" replace />
              }
            />

            {/* Catch all route */}
            <Route
              path="*"
              element={
                isAuthenticated() ? (
                  <Navigate to={getRedirectPath()} replace />
                ) : (
                  <Navigate to="/login" replace />
                )
              }
            />
          </Routes>
        </AnimatePresence>
      </ClickSpark>
    </>
  );
}

export default App;