import { Router, type Request, type Response } from "express";
import { supabase } from "../Database/supabaseClient.js";
import { hashPassword } from "../Utils/password.js";

export const createAccountRouter = Router();

createAccountRouter.post("/register", async (req: Request, res: Response) => {
  const { userType, firstName, lastName, email, major, password } = req.body;

  if (!email || !password || !firstName || !lastName) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const fullEmail = `${email}@quinnipiac.edu`;
  const hashedPassword = await hashPassword(password); // Hash before DB insert

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
        Password: hashedPassword, // Store the hash, never the plaintext
        FirstName: firstName,
        LastName: lastName,
        Major: major,
      })
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });

    return res.status(201).json({
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

    return res.status(201).json({
      userId: data.Faculty_Id,
      userType: "Faculty/Administrator",
      userEmail: data.Faculty_Qu_Email,
    });
  }
});
