import { Router } from "express";
import { RequireAuth } from "../Middleware/RequireAuth.js";
import {
  login,
  logout,
  fetchMajors,
  register,
  forgotPassword,
  verifyCode,
  resetPassword,
  getProfile,
  updateProfile,
} from "../Controllers/AuthController.js";

export const authRouter = Router();

// --- Public Routes ---
authRouter.post("/login", login);
authRouter.post("/logout", logout);
authRouter.get("/majors", fetchMajors);
authRouter.post("/register", register);
authRouter.post("/forgot-password", forgotPassword);
authRouter.post("/verify-code", verifyCode);
authRouter.post("/reset-password", resetPassword);

// --- Protected Routes ---
// Notice how we apply the middleware directly to these specific routes!
authRouter.get("/me", RequireAuth, getProfile);
authRouter.put("/me", RequireAuth, updateProfile);
