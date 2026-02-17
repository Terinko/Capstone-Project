import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import "./index.css";
import "./App.css";
import App from "./App.tsx";
import StudentDashboard from "./studentDashboard.tsx";
import FacultyDashboard from "./facultyDashboard.tsx";
import AdminDashboard from "./AdminDashboard.tsx";
import UnmappedCourses from "./UnmappedCourses.tsx";
import ProtectedRoute from "./components/ProtectedRoute.tsx";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/" element={<App />} />

        {/* Students only */}
        <Route
          path="/studentdashboard"
          element={
            <ProtectedRoute allowedTypes={["Student"]}>
              <StudentDashboard />
            </ProtectedRoute>
          }
        />

        {/* Faculty only */}
        <Route
          path="/facultyAdmin"
          element={
            <ProtectedRoute allowedTypes={["Faculty/Administrator"]}>
              <FacultyDashboard />
            </ProtectedRoute>
          }
        />

        {/* Admins only */}
        <Route
          path="/adminDashboard"
          element={
            <ProtectedRoute allowedTypes={["Administrator"]}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />

        {/* Admins only */}
        <Route
          path="/unmapped"
          element={
            <ProtectedRoute allowedTypes={["Administrator"]}>
              <UnmappedCourses />
            </ProtectedRoute>
          }
        />

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
);
