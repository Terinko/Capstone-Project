import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./index.css";
import "./App.css";
import App from "./App.tsx";
import StudentDashboard from "./studentDashboard.tsx";
import FacultyDashboard from "./facultyDashboard.tsx";
import AdminDashboard from "./AdminDashboard.tsx";
import UnmappedCourses from "./UnmappedCourses.tsx";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";

createRoot(document.getElementById("root")!).render(
  <BrowserRouter>
    <Routes>
      <Route path="/">
        <Route index element={<App />}></Route>
        <Route path="/studentdashboard" element={<StudentDashboard />}></Route>
        <Route path="/facultyAdmin" element={<FacultyDashboard />}></Route>
        <Route path="/adminDashboard" element={<AdminDashboard />}></Route>
        <Route path="/unmapped" element={<UnmappedCourses />}></Route>
      </Route>
    </Routes>
  </BrowserRouter>,
);

//The Key for OpenRouter: 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
