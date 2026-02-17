import { Router, type Request, type Response } from "express";
import { supabase } from "../Database/supabaseClient.js";
import { hashPassword } from "../Utils/password.js";

export const authProfileRouter = Router();

/**
 * GET /api/auth/me
 * Returns the current user's profile info.
 * Identity is resolved from the verified JWT payload (req.user),
 * so no userId needs to be passed from the frontend.
 */
authProfileRouter.get("/me", async (req: Request, res: Response) => {
  try {
    const { userId, userType } = req.user!;

    if (userType === "Student") {
      const { data, error } = await supabase
        .from("Student")
        .select("FirstName, LastName, Student_Qu_Email, Major")
        .eq("Student_Id", userId)
        .single();

      if (error || !data) {
        return res.status(404).json({ error: "Student account not found" });
      }

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

      if (error || !data) {
        return res.status(404).json({ error: "Faculty account not found" });
      }

      return res.json({
        firstName: data.FirstName,
        lastName: data.LastName,
        email: data.Faculty_Qu_Email,
      });
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    res.status(500).json({ error: msg });
  }
});

/**
 * PUT /api/auth/me
 * Updates the current user's profile.
 * Body: { firstName, lastName, major?, password? }
 */
authProfileRouter.put("/me", async (req: Request, res: Response) => {
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

    if (password) {
      updatePayload.Password = await hashPassword(password);
    }

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

    res.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    res.status(500).json({ error: msg });
  }
});
