import React, { createContext, useContext, useState, useEffect } from "react";

const AdminContext = createContext();

export function AdminProvider({ children }) {
  const [activeAdminView, setActiveAdminView] = useState("home");

  // const baseurl = "https://csi-attendance-web.onrender.com";
  const baseurl = import.meta.env.VITE_BACKEND_BASE_URL;
}  