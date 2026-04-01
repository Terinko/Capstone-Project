import { Router, type Request, type Response } from "express";
import { findFacultyByEmail, findStudentByEmail } from "../Models/UserModel.js";
import { verifyPassword } from "../Utils/password.js";
import { signToken } from "../Utils/jwt.js";
import { supabase } from "../Database/supabaseClient.js"; // <-- Added Supabase for Audit Logs

export const authRouter = Router();

authRouter.post("/login", async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  const fullEmail = email.endsWith("@quinnipiac.edu")
    ? email
    : `${email}@quinnipiac.edu`;

  // Check Student table
  const student = await findStudentByEmail(fullEmail);
  if (student && (await verifyPassword(password, student.Password))) {
    const token = signToken({
      userId: student.Student_Id,
      userType: "Student",
      userEmail: student.Student_Qu_Email,
    });

    // --- Insert Audit Log for Student ---
    try {
      await supabase.from("AuditLogs").insert({
        user_id: student.Student_Id,
        email: student.Student_Qu_Email || fullEmail,
        user_type: "STUDENT",
        action: "LOGIN",
      });
    } catch (auditError) {
      console.error("Failed to insert student audit log:", auditError);
    }

    return res.json({ token, userType: "Student" });
  }

  // Check Faculty/Admin table
  const faculty = await findFacultyByEmail(fullEmail);
  if (faculty && (await verifyPassword(password, faculty.Password))) {
    const userTypeStr =
      faculty.Type === true ? "Administrator" : "Faculty/Administrator";

    const token = signToken({
      userId: faculty.Faculty_Id,
      userType: userTypeStr,
      userEmail: fullEmail,
    });

    // --- Insert Audit Log for Faculty/Admin ---
    try {
      await supabase.from("AuditLogs").insert({
        user_id: faculty.Faculty_Id,
        email: fullEmail,
        user_type: faculty.Type === true ? "ADMIN" : "FACULTY",
        action: "LOGIN",
      });
    } catch (auditError) {
      console.error("Failed to insert faculty/admin audit log:", auditError);
    }

    return res.json({ token, userType: userTypeStr });
  }

  // If no match found or wrong password
  return res.status(401).json({ error: "Invalid email or password" });
});

// --- Capture Logout Event (Stateless) ---
authRouter.post("/logout", async (req: Request, res: Response) => {
  const { user_id, email, user_type } = req.body;

  // Record the logout action purely for auditing purposes
  if (user_id && email && user_type) {
    try {
      await supabase.from("AuditLogs").insert({
        user_id,
        email,
        user_type,
        action: "LOGOUT",
      });
    } catch (auditError) {
      console.error("Failed to insert logout audit log:", auditError);
    }
  }

  return res.json({ success: true, message: "Logged out successfully" });
});
