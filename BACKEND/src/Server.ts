import express from "express";
import type { Request, Response, NextFunction } from "express";
import cors from "cors";
import { adminCoursesRouter } from "./Routers/AdminCourseRouter.js";
import { RequireAdmin } from "./Middleware/RequireAdmin.js";

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
