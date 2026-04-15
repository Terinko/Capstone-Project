import { type Request, type Response } from "express";
import { supabase } from "../Database/supabaseClient.js";
import { findFacultyByEmail, findStudentByEmail } from "../Models/UserModel.js";
import { verifyPassword, hashPassword } from "../Utils/password.js";
import { signToken } from "../Utils/jwt.js";
import { getMajors } from "../Models/MajorsModel.js";
import nodemailer from "nodemailer";

// --- 1. LOGIN & LOGOUT ---

export const login = async (req: Request, res: Response) => {
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

  // Check Faculty table
  const faculty = await findFacultyByEmail(fullEmail);
  if (faculty && (await verifyPassword(password, faculty.Password))) {
    const userTypeStr =
      faculty.Type === true ? "Administrator" : "Faculty/Administrator";
    const token = signToken({
      userId: faculty.Faculty_Id,
      userType: userTypeStr,
      userEmail: fullEmail,
    });

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

  return res.status(401).json({ error: "Invalid email or password" });
};

export const logout = async (req: Request, res: Response) => {
  const { user_id, email, user_type } = req.body;
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
  return res.json({ message: "Logged out successfully" });
};

// --- 2. REGISTRATION ---

export const fetchMajors = async (_req: Request, res: Response) => {
  try {
    const majors = await getMajors();
    res.json(majors);
  } catch (error: any) {
    console.error("Error fetching majors:", error);
    res.status(500).json({ error: "Failed to fetch majors" });
  }
};

export const register = async (req: Request, res: Response) => {
  const { userType, firstName, lastName, email, major, password } = req.body;

  if (!email || !password || !firstName || !lastName) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const fullEmail = `${email}@quinnipiac.edu`;
  const hashedPassword = await hashPassword(password);

  if (userType === "Student") {
    const { data: existing } = await supabase
      .from("Student")
      .select("Student_Id")
      .eq("Student_Qu_Email", fullEmail)
      .single();

    if (existing)
      return res
        .status(409)
        .json({ error: "An account with this email already exists" });

    const { data, error } = await supabase
      .from("Student")
      .insert({
        Student_Qu_Email: fullEmail,
        Password: hashedPassword,
        FirstName: firstName,
        LastName: lastName,
        Major: major,
      })
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });

    const token = signToken({
      userId: data.Student_Id,
      userType: "Student",
      userEmail: data.Student_Qu_Email,
    });
    return res
      .status(201)
      .json({
        token,
        userId: data.Student_Id,
        userType: "Student",
        userEmail: data.Student_Qu_Email,
      });
  } else {
    const { data: existing } = await supabase
      .from("Faculty_Admin")
      .select("Faculty_Id")
      .eq("Faculty_Qu_Email", fullEmail)
      .single();

    if (existing)
      return res
        .status(409)
        .json({ error: "An account with this email already exists" });

    const { data, error } = await supabase
      .from("Faculty_Admin")
      .insert({
        Faculty_Qu_Email: fullEmail,
        Password: hashedPassword,
        FirstName: firstName,
        LastName: lastName,
        Type: false,
      })
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });

    const token = signToken({
      userId: data.Faculty_Id,
      userType: "Faculty/Administrator",
      userEmail: data.Faculty_Qu_Email,
    });
    return res
      .status(201)
      .json({
        token,
        userId: data.Faculty_Id,
        userType: "Faculty/Administrator",
        userEmail: data.Faculty_Qu_Email,
      });
  }
};

// --- 3. PASSWORD RESET ---

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
        <div style="font-size: 2rem; font-weight: bold; letter-spacing: 5px; text-align: center; margin: 20px 0;">${code}</div>
        <p>If you didn't request this, you can ignore this email.</p>
      </div>
    `,
  });
}

export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email is required" });

    const fullEmail = email.endsWith("@quinnipiac.edu")
      ? email
      : `${email}@quinnipiac.edu`;
    const student = await findStudentByEmail(fullEmail);
    const faculty = student ? null : await findFacultyByEmail(fullEmail);
    const user = student ?? faculty;

    if (!user)
      return res.json({
        message: "If that email matches an account, a reset code was sent.",
      });

    const code = generateCode();
    const expiry = new Date(Date.now() + 15 * 60 * 1000).toISOString();

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
    res.json({
      message: "If that email matches an account, a reset code was sent.",
    });
  } catch (error: any) {
    res
      .status(500)
      .json({ error: "Failed to process forgot password request." });
  }
};

export const verifyCode = async (req: Request, res: Response) => {
  try {
    const { email, code } = req.body;
    if (!email || !code)
      return res.status(400).json({ error: "Email and code are required" });

    const fullEmail = email.endsWith("@quinnipiac.edu")
      ? email
      : `${email}@quinnipiac.edu`;
    const student = await findStudentByEmail(fullEmail);
    const faculty = student ? null : await findFacultyByEmail(fullEmail);
    const user = student ?? faculty;

    if (!user) return res.status(400).json({ error: "Invalid request" });

    const storedCode = (user as any).reset_code;
    const expiry: string = (user as any).reset_code_expiry;

    if (!storedCode || storedCode !== code)
      return res.status(400).json({ error: "Invalid or expired code" });
    if (new Date(expiry) < new Date())
      return res.status(400).json({ error: "Code has expired" });

    res.json({ message: "Code verified" });
  } catch (error: any) {
    res.status(500).json({ error: "Failed to verify code" });
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { email, code, newPassword } = req.body;
    if (!email || !code || !newPassword)
      return res.status(400).json({ error: "All fields are required" });

    const fullEmail = email.endsWith("@quinnipiac.edu")
      ? email
      : `${email}@quinnipiac.edu`;
    const student = await findStudentByEmail(fullEmail);
    const faculty = student ? null : await findFacultyByEmail(fullEmail);
    const user = student ?? faculty;

    if (!user) return res.status(400).json({ error: "Invalid request" });

    const storedCode = (user as any).reset_code;
    const expiry: string = (user as any).reset_code_expiry;

    if (!storedCode || storedCode !== code)
      return res.status(400).json({ error: "Invalid or expired code" });
    if (new Date(expiry) < new Date())
      return res.status(400).json({ error: "Code has expired" });

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
      const userTypeStr =
        faculty!.Type === true ? "Administrator" : "Faculty/Administrator";
      const token = signToken({
        userId: faculty!.Faculty_Id,
        userType: userTypeStr,
        userEmail: faculty!.Faculty_Qu_Email,
      });
      return res.json({ token, userType: userTypeStr });
    }
  } catch (e: unknown) {
    res.status(500).json({ error: "Internal error resetting password" });
  }
};

// --- 4. PROFILE MANAGEMENT ---

export const getProfile = async (req: Request, res: Response) => {
  try {
    const { userId, userType } = req.user!;

    if (userType === "Student") {
      const { data, error } = await supabase
        .from("Student")
        .select("FirstName, LastName, Student_Qu_Email, Major")
        .eq("Student_Id", userId)
        .single();
      if (error || !data)
        return res.status(404).json({ error: "Student account not found" });
      return res.json({
        firstName: data.FirstName,
        lastName: data.LastName,
        email: data.Student_Qu_Email,
        major: data.Major,
      });
    } else {
      const { data, error } = await supabase
        .from("Faculty_Admin")
        .select("FirstName, LastName, Faculty_Qu_Email")
        .eq("Faculty_Id", userId)
        .single();
      if (error || !data)
        return res.status(404).json({ error: "Faculty account not found" });
      return res.json({
        firstName: data.FirstName,
        lastName: data.LastName,
        email: data.Faculty_Qu_Email,
      });
    }
  } catch (e: unknown) {
    res.status(500).json({ error: "Internal server error" });
  }
};

export const updateProfile = async (req: Request, res: Response) => {
  try {
    const { userId, userType } = req.user!;
    const { firstName, lastName, major, password } = req.body;

    if (!firstName?.trim() || !lastName?.trim()) {
      return res
        .status(400)
        .json({ error: "First and last name are required" });
    }
    if (password && password.length < 6) {
      return res
        .status(400)
        .json({ error: "Password must be at least 6 characters" });
    }

    const updatePayload: Record<string, any> = {
      FirstName: firstName.trim(),
      LastName: lastName.trim(),
    };
    if (password) updatePayload.Password = await hashPassword(password);

    if (userType === "Student") {
      if (major !== undefined) updatePayload.Major = major.trim();
      const { error } = await supabase
        .from("Student")
        .update(updatePayload)
        .eq("Student_Id", userId);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from("Faculty_Admin")
        .update(updatePayload)
        .eq("Faculty_Id", userId);
      if (error) throw error;
    }

    res.json({ message: "Profile updated successfully" });
  } catch (e: unknown) {
    res.status(500).json({ error: "Failed to update profile" });
  }
};
