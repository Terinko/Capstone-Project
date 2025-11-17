import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./index.css";
import App from "./App.tsx";
import Login from "./login.tsx";
import CreateAccount from "./createAcct.tsx";

createRoot(document.getElementById("root")!).render(
  <BrowserRouter>
    <Routes>
      <Route path="/">
        <Route index element={<App />}></Route>
        <Route path="/login" element={<Login />} />
        <Route path="/createaccount" element={<CreateAccount />}></Route>
      </Route>
    </Routes>
  </BrowserRouter>
);
