import { Router } from "express";
import {
  getAdminCourses,
  getAdminCourseMapping,
  getAdminFaculty,
  updateAdminCourseMapping,
  updateAdminCourseDetails,
  resolveOrCreateSkill,
} from "../Controllers/AdminCourseController.js";

export const adminCoursesRouter = Router();

adminCoursesRouter.get("/courses", getAdminCourses);
adminCoursesRouter.get("/courses/:courseId/mapping", getAdminCourseMapping);
adminCoursesRouter.put("/courses/:courseId/mapping", updateAdminCourseMapping);
adminCoursesRouter.put("/courses/:courseId", updateAdminCourseDetails);
adminCoursesRouter.post("/skills/resolve", resolveOrCreateSkill);
adminCoursesRouter.get("/faculty", getAdminFaculty);