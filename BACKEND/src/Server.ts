import express from "express";
import type { Request, Response, NextFunction } from "express";
import cors from "cors";
import path from "path"; // ← NEW: Imported path module
import { adminCoursesRouter } from "./Routers/AdminCourseRouter.js";
import { RequireAdmin, RequireAuth } from "./Middleware/RequireAuth.js";
import { getAllCourses, getCoursesByMajor } from "./Models/CoursesModel.js";
import { authRouter } from "./Routers/AuthRouter.js";
import { createAccountRouter } from "./Routers/CreateAccountRouter.js";
import { authProfileRouter } from "./Routers/AuthProfileRouter.js";
import { forgotPasswordRouter } from "./Routers/ForgotPasswordRouter.js";
import { autofillRouter } from "./Routers/AutofillRouter.js";
import { facultyCoursesRouter } from "./Routers/FacultyCourseRouter.js";
import AuditRouter from "./Routers/AuditRouter.js";

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
app.use("/api/auth", forgotPasswordRouter);

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

// ← NEW: Serve static frontend files directly from the FRONTEND/dist folder
// This assumes you run your server from the root of the BACKEND directory
const frontendDistPath = path.join(process.cwd(), "../FRONTEND/dist");
app.use(express.static(frontendDistPath));

// ← NEW: Catch-all route to handle React Router SPA routing
// MUST be placed AFTER API routes, but BEFORE the error handler
app.get(/(.*)/, (req: Request, res: Response) => {
  res.sendFile(path.join(frontendDistPath, "index.html"));
});

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const msg = err instanceof Error ? err.message : "Internal server error";
  res.status(500).json({ error: msg });
});

const port = Number(process.env.PORT ?? 3001);
app.listen(port, () => {
  console.log(`Server listening on ${port}`);
});