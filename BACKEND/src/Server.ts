import express from "express";
import type { Request, Response, NextFunction } from "express";
import cors from "cors";
import { adminCoursesRouter } from "./Routers/AdminCourseRouter.js";
import { RequireAdmin, RequireAuth } from "./Middleware/RequireAuth.js";
import { getAllCourses, getCoursesByMajor } from "./Models/CoursesModel.js";
import { authRouter } from "./Routers/AuthRouter.js";
import { createAccountRouter } from "./Routers/CreateAccountRouter.js";
import { authProfileRouter } from "./Routers/AuthProfileRouter.js";
import { forgotPasswordRouter } from "./Routers/ForgotPasswordRouter.js"; // ← NEW
import { autofillRouter } from "./Routers/AutofillRouter.js";
import { facultyCoursesRouter } from "./Routers/FacultyCourseRouter.js";
import AuditRouter from "./Routers/AuditRouter.js";
import { historyRouter } from "./Routers/HistoryRouter.js";

const app = express();
app.disable("x-powered-by");

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_API_KEY) {
  throw new Error("Missing Supabase environment variables");
}

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// Public routes (no auth required)
app.use("/api/auth", authRouter);
app.use("/api/auth", createAccountRouter);
app.use("/api/auth", forgotPasswordRouter); // ← NEW: forgot-password, verify-code, reset-password
app.use("/api/history", historyRouter);

// Protected routes
app.use("/api/auth", RequireAuth, authProfileRouter);
app.use("/api/faculty", RequireAuth, facultyCoursesRouter);
app.use("/api/admin", RequireAdmin, adminCoursesRouter);
app.use("/api/audit-logs", AuditRouter);
app.use("/api/autofill", autofillRouter);

app.get("/health", (_req: Request, res: Response) => res.json({ ok: true }));

app.get("/courses", async (req: Request, res: Response) => {
  try {
    const courses = await getAllCourses();

    // Derive the list of majors present in the DB dynamically
    const majors = [...new Set(courses.map((c) => c.Major))].sort();

    const grouped: Record<
      string,
      {
        courseCode: string;
        courseName: string;
        offerings: { id: string; altName: string | null }[];
      }[]
    > = {};

    for (const major of majors) {
      grouped[major] = await getCoursesByMajor(major);
    }

    res.json(grouped);
  } catch (error) {
    console.error("Error fetching courses:", error);
    res.status(500).json({ error: "Failed to fetch courses" });
  }
});

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const msg = err instanceof Error ? err.message : "Internal server error";
  res.status(500).json({ error: msg });
});

const port = Number(process.env.PORT ?? 3001);
app.listen(port, () => {
  console.log(`Server listening on ${port}`);
});
