import express from "express";
import { getGroupedCourses } from "../Controllers/CourseController.js";

const router = express.Router();

// Route: GET /courses/
// This maps to the logic we just wrote in the controller
router.get("/", getGroupedCourses);

export default router;
