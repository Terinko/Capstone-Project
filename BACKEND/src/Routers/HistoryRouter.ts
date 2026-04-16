import { Router } from "express";
import {
  saveHistory,
  getStudentHistory,
  deleteHistory,
  clearAllHistory,
} from "../Controllers/HistoryController.js";

export const historyRouter = Router();

historyRouter.post("/", saveHistory);
historyRouter.get("/student/:studentId", getStudentHistory);
historyRouter.delete("/student/:studentId/entry/:historyId", deleteHistory);
historyRouter.delete("/student/:studentId", clearAllHistory);
