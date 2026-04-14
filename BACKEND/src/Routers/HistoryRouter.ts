import { Router, type Request, type Response } from "express";
import {
  saveTalkingPointsForStudent,
  getHistoryForStudent,
  deleteHistoryEntryForStudent,
} from "../Models/HistoryModel.js";

export const historyRouter = Router();

type SaveHistoryBody = {
  studentId?: number;
  courseName?: string;
  courseCode?: string;
  talkingPoints?: string[];
};

/**
 * POST /api/history
 * Body:
 * {
 *   "studentId": 12,
 *   "courseName": "CSC 215",
 *   "talkingPoints": [
 *     "Worked with hash tables",
 *     "Analyzed runtime complexity",
 *     "Built prefix search logic"
 *   ]
 * }
 */
historyRouter.post("/", async (req, res) => {
  try {
    const studentId = Number(req.body.studentId);
    const courseName = String(req.body.courseName ?? "").trim();
    const courseCode = String(req.body.courseCode ?? "").trim();
    const talkingPoints = Array.isArray(req.body.talkingPoints)
      ? req.body.talkingPoints
      : [];

    if (!Number.isInteger(studentId) || studentId <= 0) {
      return res.status(400).json({ error: "Valid studentId is required" });
    }

    if (!courseName) {
      return res.status(400).json({ error: "courseName is required" });
    }

    if (!courseCode) {
      return res.status(400).json({ error: "courseCode is required" });
    }

    if (talkingPoints.length === 0) {
      return res
        .status(400)
        .json({ error: "At least one talking point is required" });
    }

    const saved = await saveTalkingPointsForStudent({
      studentId,
      courseName,
      courseCode,
      talkingPoints,
    });

    res.status(201).json({
      message: "History saved successfully",
      count: saved.length,
      entries: saved,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    res.status(500).json({ error: msg });
  }
});

/**
 * GET /api/history/student/:studentId
 */
historyRouter.get(
  "/student/:studentId",
  async (req: Request, res: Response) => {
    try {
      const studentId = Number(req.params.studentId);

      if (!Number.isInteger(studentId) || studentId <= 0) {
        return res.status(400).json({ error: "Invalid studentId" });
      }

      const history = await getHistoryForStudent(studentId);

      res.json(history);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      res.status(500).json({ error: msg });
    }
  },
);

/**
 * DELETE /api/history/student/:studentId/:historyId
 */
historyRouter.delete(
  "/student/:studentId/:historyId",
  async (req: Request, res: Response) => {
    try {
      const studentId = Number(req.params.studentId);
      const historyId = Number(req.params.historyId);

      if (!Number.isInteger(studentId) || studentId <= 0) {
        return res.status(400).json({ error: "Invalid studentId" });
      }

      if (!Number.isInteger(historyId) || historyId <= 0) {
        return res.status(400).json({ error: "Invalid historyId" });
      }

      const result = await deleteHistoryEntryForStudent(studentId, historyId);

      res.json(result);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unknown error";

      if (msg === "History entry not found for this student") {
        return res.status(404).json({ error: msg });
      }

      res.status(500).json({ error: msg });
    }
  },
);

historyRouter.delete(
  "/student/:studentId",
  async (req: Request, res: Response) => {
    try {
      const studentId = Number(req.params.studentId);

      if (!Number.isInteger(studentId) || studentId <= 0) {
        return res.status(400).json({ error: "Invalid studentId" });
      }

      const history = await getHistoryForStudent(studentId);

      for (const item of history) {
        await deleteHistoryEntryForStudent(studentId, item.id);
      }

      res.json({ success: true });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      res.status(500).json({ error: msg });
    }
  },
);
