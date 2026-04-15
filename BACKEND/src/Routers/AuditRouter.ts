import express from "express";
import { RequireAuth } from "../Middleware/RequireAuth.js";
import {
  getAuditLogs,
  exportAuditLogs,
} from "../Controllers/AuditController.js";

const router = express.Router();

router.get("/", RequireAuth, getAuditLogs);
router.get("/export", RequireAuth, exportAuditLogs);

export default router;
