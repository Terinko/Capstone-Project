import express from "express";
import type { Request, Response, NextFunction } from "express";
import cors from "cors";
import { adminCoursesRouter } from "./Routers/AdminCourseRouter.js";
import { RequireAdmin } from "./Middleware/RequireAdmin.js";

type MajorOption =
  | "Software Engineering"
  | "Computer Science"
  | "Mechanical Engineering"
  | "Industrial Engineering";

interface ClassOption {
  id: string;
  label: string;
  courseId?: string;
}
const COMPUTER_SCIENCE_CLASSES: ClassOption[] = [
  { id: "1", label: "CSC-491", courseId: "CSC-491" },
  { id: "2", label: "CSC-110", courseId: "CSC-110" },
  { id: "3", label: "CSC-111", courseId: "CSC-111" },
  { id: "4", label: "CSC-325", courseId: "CSC-325" },
  { id: "5", label: "CSC-215", courseId: "CSC-215" },
  { id: "6", label: "CSC-320", courseId: "CSC-320" },
  { id: "7", label: "CSC-210", courseId: "CSC-210" },
  { id: "8", label: "CSC-492", courseId: "CSC-492" },
  { id: "9", label: "CSC-315", courseId: "CSC-315" },
  { id: "10", label: "CSC-375", courseId: "CSC-375" },
  { id: "11", label: "CSC-340", courseId: "CSC-340" },
  { id: "12", label: "CSC-310", courseId: "CSC-310" },
  { id: "13", label: "CSC-490", courseId: "CSC-490" },
  { id: "14", label: "CSC-493", courseId: "CSC-493" },
  { id: "15", label: "CSC-494", courseId: "CSC-494" },
];

const SOFTWARE_ENGINEERING_CLASSES: ClassOption[] = [
  { id: "1", label: "SER-491", courseId: "SER-491" },
  { id: "2", label: "SER-340", courseId: "SER-340" },
  { id: "3", label: "SER-341", courseId: "SER-341" },
  { id: "4", label: "SER-325", courseId: "SER-325" },
  { id: "5", label: "SER-350", courseId: "SER-350" },
  { id: "6", label: "SER-330", courseId: "SER-330" },
  { id: "7", label: "SER-210", courseId: "SER-210" },
  { id: "8", label: "SER-492", courseId: "SER-492" },
  { id: "9", label: "SER-225", courseId: "SER-225" },
  { id: "10", label: "SER-375", courseId: "SER-375" },
  { id: "11", label: "SER-120", courseId: "SER-120" },
  { id: "12", label: "SER-305", courseId: "SER-305" },
  { id: "13", label: "SER-490", courseId: "SER-490" },
];

const MAJOR_CLASSES: Record<MajorOption, ClassOption[]> = {
  "Software Engineering": SOFTWARE_ENGINEERING_CLASSES,
  "Computer Science": COMPUTER_SCIENCE_CLASSES,
  "Mechanical Engineering": [],
  "Industrial Engineering": [],
};

/**
 * Express app instance for the Admin Course Management backend.
 * This file is intentionally kept small:
 * - server-wide middleware
 * - router mounting
 * - health + error handling
 * - bootstrapping listen()
 */
const app = express();

app.disable("x-powered-by");

/**
 * Fail fast if required environment variables are missing.
 * This prevents a half-running server that fails later with confusing Supabase errors.
 */
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_API_KEY) {
  throw new Error("Missing Supabase environment variables");
}

/**
 * CORS configuration:
 * - origin: true mirrors the request origin (useful during dev)
 * - credentials: true allows cookies/authorization headers if you add them later
 *
 * If you deploy this publicly, consider restricting `origin` to your frontend domain.
 */
app.use(cors({ origin: true, credentials: true }));

/**
 * Parse JSON request bodies for all routes.
 * (Needed for POST/PUT requests from the admin UI.)
 */
app.use(express.json());

/**
 * Admin API routes:
 * All /api/admin/* endpoints must pass RequireAdmin first.
 * This ensures only authorized admin sessions can access the course/skill mapping APIs.
 */
app.use("/api/admin", RequireAdmin, adminCoursesRouter);

/**
 * Lightweight health endpoint for monitoring and local debugging.
 * Useful to confirm the server is reachable and the process is alive.
 */
app.get("/health", (_req: Request, res: Response) => res.json({ ok: true }));

/**
 * Courses endpoints
 */
app.get("/courses", (req: Request, res: Response) => {
  res.send(MAJOR_CLASSES);
})

/*app.post("/courses", (req: Request, res: Response) => {
  
})

app.post("/student", (req: Request, res: Response) => {
  
})*/

/**
 * Global error handler:
 * - Catches errors thrown in routes/middleware
 * - Sends a consistent JSON error shape to the frontend
 *
 * Note: In production, you might avoid returning raw error messages
 * and instead log them server-side with a request id.
 */
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const msg = err instanceof Error ? err.message : "Internal server error";
  res.status(500).json({ error: msg });
});

/**
 * Start the server:
 * - Uses PORT env var if provided (common in hosting platforms)
 * - Defaults to 3001 for local development
 */
const port = Number(process.env.PORT ?? 3001);

app.listen(port, () => {
  console.log(`Server listening on ${port}`);
});
