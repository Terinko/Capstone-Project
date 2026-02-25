import { Router, type Request, type Response } from "express";
import { supabase } from "../Database/supabaseClient.js";
import { findStudentByEmail, findFacultyByEmail } from "../Models/UserModel.js";
import { hashPassword } from "../Utils/password.js";
import { signToken } from "../Utils/jwt.js";
import nodemailer from "nodemailer";

export const forgotPasswordRouter = Router();

function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function sendResetEmail(toEmail: string, code: string): Promise<void> {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });

  await transporter.sendMail({
    from: `"QU App" <${process.env.GMAIL_USER}>`,
    to: toEmail,
    subject: "Your Password Reset Code",
    html: `
      <div style="font-family: sans-serif; max-width: 400px; margin: 0 auto;">
        <h2>Password Reset</h2>
        <p>Use the code below to reset your Quinnipiac account password. It expires in <strong>15 minutes</strong>.</p>
        <div style="font-size: 2rem; font-weight: bold; letter-spacing: 0.3em; padding: 16px; background: #f4f4f4; border-radius: 8px; text-align: center;">
          ${code}
        </div>
        <p style="margin-top: 16px; color: #666;">If you did not request this, you can safely ignore this email.</p>
      </div>
    `,
  });
}

// ─── POST /api/auth/forgot-password ──────────────────────────────────────────
// Body: { email: string }   (prefix only OR full @quinnipiac.edu)
forgotPasswordRouter.post(
  "/forgot-password",
  async (req: Request, res: Response) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email is required" });

    const fullEmail = email.endsWith("@quinnipiac.edu")
      ? email
      : `${email}@quinnipiac.edu`;

    const code = generateCode();
    const expiry = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 min

    // Find user in either table
    const student = await findStudentByEmail(fullEmail);
    const faculty = student ? null : await findFacultyByEmail(fullEmail);

    if (!student && !faculty) {
      // Return 200 even if not found to avoid email enumeration
      return res.json({ ok: true });
    }

    if (student) {
      await supabase
        .from("Student")
        .update({ reset_code: code, reset_code_expiry: expiry })
        .eq("Student_Id", student.Student_Id);
    } else {
      await supabase
        .from("Faculty_Admin")
        .update({ reset_code: code, reset_code_expiry: expiry })
        .eq("Faculty_Id", faculty!.Faculty_Id);
    }

    await sendResetEmail(fullEmail, code);
    return res.json({ ok: true });
  },
);

// ─── POST /api/auth/verify-code ──────────────────────────────────────────────
// Body: { email, code }
// Returns: { valid: true } on success — frontend then proceeds to reset step
forgotPasswordRouter.post(
  "/verify-code",
  async (req: Request, res: Response) => {
    const { email, code } = req.body;
    if (!email || !code)
      return res.status(400).json({ error: "Email and code are required" });

    const fullEmail = email.endsWith("@quinnipiac.edu")
      ? email
      : `${email}@quinnipiac.edu`;

    const student = await findStudentByEmail(fullEmail);
    const faculty = student ? null : await findFacultyByEmail(fullEmail);

    const user = student ?? faculty;
    if (!user) return res.status(400).json({ error: "Invalid code" });

    const storedCode = (user as any).reset_code;
    const expiry: string = (user as any).reset_code_expiry;

    if (!storedCode || storedCode !== code) {
      return res.status(400).json({ error: "Invalid code" });
    }
    if (new Date(expiry) < new Date()) {
      return res.status(400).json({ error: "Code has expired" });
    }

    return res.json({ valid: true });
  },
);

// ─── POST /api/auth/reset-password ───────────────────────────────────────────
// Body: { email, code, newPassword }
// On success clears the reset code and returns a session token (auto-login)
forgotPasswordRouter.post(
  "/reset-password",
  async (req: Request, res: Response) => {
    const { email, code, newPassword } = req.body;
    if (!email || !code || !newPassword)
      return res.status(400).json({ error: "All fields are required" });

    if (newPassword.length < 6)
      return res
        .status(400)
        .json({ error: "Password must be at least 6 characters" });

    const fullEmail = email.endsWith("@quinnipiac.edu")
      ? email
      : `${email}@quinnipiac.edu`;

    const student = await findStudentByEmail(fullEmail);
    const faculty = student ? null : await findFacultyByEmail(fullEmail);

    const user = student ?? faculty;
    if (!user) return res.status(400).json({ error: "Invalid request" });

    const storedCode = (user as any).reset_code;
    const expiry: string = (user as any).reset_code_expiry;

    if (!storedCode || storedCode !== code) {
      return res.status(400).json({ error: "Invalid or expired code" });
    }
    if (new Date(expiry) < new Date()) {
      return res.status(400).json({ error: "Code has expired" });
    }

    const hashed = await hashPassword(newPassword);

    if (student) {
      await supabase
        .from("Student")
        .update({ Password: hashed, reset_code: null, reset_code_expiry: null })
        .eq("Student_Id", student.Student_Id);

      const token = signToken({
        userId: student.Student_Id,
        userType: "Student",
        userEmail: student.Student_Qu_Email,
      });
      return res.json({ token, userType: "Student" });
    } else {
      await supabase
        .from("Faculty_Admin")
        .update({ Password: hashed, reset_code: null, reset_code_expiry: null })
        .eq("Faculty_Id", faculty!.Faculty_Id);

      const userType =
        faculty!.Type === true ? "Administrator" : "Faculty/Administrator";
      const token = signToken({
        userId: faculty!.Faculty_Id,
        userType,
        userEmail: faculty!.Faculty_Qu_Email,
      });
      return res.json({ token, userType });
    }
  },
);
