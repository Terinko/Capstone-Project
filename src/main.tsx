import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./index.css";
import App from "./App.tsx";
import Login from "./login.tsx";
import CreateAccount from "./createAcct.tsx";
import StudentDashboard from "./studentDashboard.tsx";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";

createRoot(document.getElementById("root")!).render(
  <BrowserRouter>
    <Routes>
      <Route path="/">
        <Route index element={<App />}></Route>
        <Route path="/login" element={<Login />} />
        <Route path="/createaccount" element={<CreateAccount />}></Route>
        <Route path="/studentdashboard" element={<StudentDashboard />}></Route>
      </Route>
    </Routes>
  </BrowserRouter>
);
