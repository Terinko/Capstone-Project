import { Router, type Request, type Response } from "express";
import { supabase } from "../Database/supabaseClient.js";
import { hashPassword } from "../Utils/password.js";
import { signToken } from "../Utils/jwt.js"; // <--- 1. IMPORT THIS
import { getMajors } from "../Models/MajorsModel.js";

export const createAccountRouter = Router();

createAccountRouter.get("/majors", async (_req: Request, res: Response) => {
  try {
    const majors = await getMajors();
    res.json(majors);
  } catch (error: any) {
    console.error("Error fetching majors:", error);
    res.status(500).json({ error: "Failed to fetch majors" });
  }
});

createAccountRouter.post("/register", async (req: Request, res: Response) => {
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

    if (existing) {
      return res
        .status(409)
        .json({ error: "An account with this email already exists" });
    }

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

    // 2. GENERATE TOKEN FOR STUDENT
    const token = signToken({
      userId: data.Student_Id,
      userType: "Student",
      userEmail: data.Student_Qu_Email,
    });

    // 3. RETURN TOKEN IN RESPONSE
    return res.status(201).json({
      token,
      userId: data.Student_Id,
      userType: "Student",
      userEmail: data.Student_Qu_Email,
    });
  } else {
    // Faculty Logic
    const { data: existing } = await supabase
      .from("Faculty_Admin")
      .select("Faculty_Id")
      .eq("Faculty_Qu_Email", fullEmail)
      .single();

    if (existing) {
      return res
        .status(409)
        .json({ error: "An account with this email already exists" });
    }

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

    // 4. GENERATE TOKEN FOR FACULTY
    const token = signToken({
      userId: data.Faculty_Id,
      userType: "Faculty/Administrator",
      userEmail: data.Faculty_Qu_Email,
    });

    // 5. RETURN TOKEN IN RESPONSE
    return res.status(201).json({
      token,
      userId: data.Faculty_Id,
      userType: "Faculty/Administrator",
      userEmail: data.Faculty_Qu_Email,
    });
  }
});
