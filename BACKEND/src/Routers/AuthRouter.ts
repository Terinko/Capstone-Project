import { Router, type Request, type Response } from "express";
import { findFacultyByEmail, findStudentByEmail } from "../Models/UserModel.js";
import { verifyPassword } from "../Utils/password.js";
import { signToken } from "../Utils/jwt.js";

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
    return res.json({ token, userType: "Student" });
  }

  // Check Faculty/Admin table
  const faculty = await findFacultyByEmail(fullEmail);
  if (faculty && (await verifyPassword(password, faculty.Password))) {
    const token = signToken({
      userId: faculty.Faculty_Id,
      userType:
        faculty.Type === true ? "Administrator" : "Faculty/Administrator",
      userEmail: faculty.Faculty_Qu_Email,
    });
    return res.json({
      token,
      userType:
        faculty.Type === true ? "Administrator" : "Faculty/Administrator",
    });
  }

  return res.status(401).json({ error: "Invalid email or password" });
});
