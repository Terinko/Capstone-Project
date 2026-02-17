import express from "express";
import type { Request, Response, NextFunction } from "express";
import cors from "cors";
import { adminCoursesRouter } from "./Routers/AdminCourseRouter.js";
import { RequireAdmin } from "./Middleware/RequireAdmin.js";
import { getAllCourses } from "./Models/CoursesModel.js";

const app = express();
app.disable("x-powered-by");

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_API_KEY) {
  throw new Error("Missing Supabase environment variables");
}

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

app.use("/api/admin", RequireAdmin, adminCoursesRouter);

app.get("/health", (_req: Request, res: Response) => res.json({ ok: true }));

app.get("/courses", async (req: Request, res: Response) => {
  try {
    const courses = await getAllCourses();

    // 1. Initialize the Standard Majors (so they always show up, even if empty)
    const grouped: Record<string, any[]> = {
      "Software Engineering": [],
      "Computer Science": [],
      "Mechanical Engineering": [],
      "Industrial Engineering": [],
    };

    // 2. Populate from Database
    courses.forEach((c) => {
      // If the DB has "Civil Engineering", this will create that key automatically.
      if (!grouped[c.Major]) {
        grouped[c.Major] = [];
      }

      (grouped as any)[c.Major].push({
        id: String(c.Course_Id),
        label: c.Course_Code,
        courseId: c.Course_Code,
      });
    });

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
