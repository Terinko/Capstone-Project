import { type Request, type Response } from "express";
import {
  saveTalkingPointsForStudent,
  getHistoryForStudent,
  deleteHistoryEntryForStudent,
} from "../Models/HistoryModel.js";

export const saveHistory = async (req: Request, res: Response) => {
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
    if (talkingPoints.length === 0) {
      return res
        .status(400)
        .json({ error: "talkingPoints array cannot be empty" });
    }

    const saved = await saveTalkingPointsForStudent(
      studentId,
      courseCode,
      courseName,
      talkingPoints,
    );
    res.status(201).json(saved);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    res.status(500).json({ error: msg });
  }
};

export const getStudentHistory = async (req: Request, res: Response) => {
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
};

export const deleteHistory = async (req: Request, res: Response) => {
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
};
