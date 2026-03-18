import { Router, type Request, type Response } from "express";
import {
  getAllCourses,
  getCourseById,
  updateCourse,
  findPairedCoursesByCodeAndProfessor,
  updateCrossMajorMatchingCoursesByCodeAndProfessor,
} from "../Models/CoursesModel.js";

import {
  getCourseMappings,
  replaceMappingsForCourseIds,
} from "../Models/CourseSkillMappingModel.js";
import {
  getAllSkillsAndCompetencies,
  createSkillWithName,
  findSkillByName,
} from "../Models/SkillsModel.js";

export const adminCoursesRouter = Router();

/**
 * GET /api/admin/courses?major=&status=
 * Returns AdminDashboard rows (course + mapping)
 */
adminCoursesRouter.get("/courses", async (req: Request, res: Response) => {
  try {
    const major = (req.query.major as string | undefined)?.trim();
    const status = (req.query.status as string | undefined)?.trim(); // Mapped/Unmapped/All

    const courses = await getAllCourses();

    const rows = await Promise.all(
      courses.map(async (c) => {
        const { skills, competencies } = await getCourseMappings(c.Course_Id);

        const completion =
          skills.length > 0 && competencies.length > 0 ? "Mapped" : "Unmapped";

        return {
          id: c.Course_Id,
          course: c.Course_Code,
          major: c.Major,
          professor: c.Professor ?? "",
          completion,
          skills,
          competencies,
        };
      }),
    );

    const filtered = rows.filter((r) => {
      if (major && r.major !== major) return false;
      if (status && status !== "All" && r.completion !== status) return false;
      return true;
    });

    res.json(filtered);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    res.status(500).json({ error: msg });
  }
});

/**
 * GET /api/admin/courses/:courseId/mapping
 */
adminCoursesRouter.get(
  "/courses/:courseId/mapping",
  async (req: Request, res: Response) => {
    try {
      const courseId = Number(req.params.courseId);
      if (!Number.isFinite(courseId)) {
        return res.status(400).json({ error: "Invalid courseId" });
      }

      const mapping = await getCourseMappings(courseId);
      res.json(mapping);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      res.status(500).json({ error: msg });
    }
  },
);

/**
 * PUT /api/admin/courses/:courseId/mapping
 * Body: { skillIds: number[], competencyIds: number[] }
 * Replaces mapping set on the selected course and any paired opposite-major
 * course with the same original course number + original professor.
 */
type UpdateMappingBody = {
  skillIds?: number[];
  competencyIds?: number[];
};

adminCoursesRouter.put(
  "/courses/:courseId/mapping",
  async (
    req: Request<{ courseId: string }, unknown, UpdateMappingBody>,
    res: Response,
  ) => {
    try {
      const courseId = Number(req.params.courseId);
      if (!Number.isInteger(courseId) || courseId <= 0) {
        return res.status(400).json({ error: "Invalid courseId" });
      }

      const existingCourse = await getCourseById(courseId);

      const skillIds = Array.isArray(req.body.skillIds)
        ? req.body.skillIds
        : [];
      const competencyIds = Array.isArray(req.body.competencyIds)
        ? req.body.competencyIds
        : [];

      const allIds = [...skillIds, ...competencyIds]
        .map(Number)
        .filter((n) => Number.isInteger(n) && n > 0);

      const uniqueIds = Array.from(new Set(allIds));

      const pairedCourses = await findPairedCoursesByCodeAndProfessor(
        courseId,
        existingCourse.Course_Code,
        existingCourse.Major,
        existingCourse.Professor ?? "",
      );

      const allCourseIdsToReplace = [
        courseId,
        ...pairedCourses.map((c) => c.Course_Id),
      ];

      await replaceMappingsForCourseIds(allCourseIdsToReplace, uniqueIds);

      const updated = await getCourseMappings(courseId);

      res.json({
        updated,
        syncedCourseIds: pairedCourses.map((c) => c.Course_Id),
        syncedCount: pairedCourses.length,
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      res.status(500).json({ error: msg });
    }
  },
);

/**
 * GET /api/admin/skills-options
 * returns all skills + competencies for dropdowns
 */
adminCoursesRouter.get(
  "/skills-options",
  async (_req: Request, res: Response) => {
    try {
      const options = await getAllSkillsAndCompetencies();
      res.json(options);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      res.status(500).json({ error: msg });
    }
  },
);

/**
 * POST /api/admin/skills
 * Body: { name: string }
 * Creates a new skill with Skill_name=user text, Type=false
 */
adminCoursesRouter.post("/skills", async (req: Request, res: Response) => {
  try {
    const name = (req.body?.name as string | undefined)?.trim();

    if (!name) {
      return res.status(400).json({ error: "Name is required" });
    }

    // safeguard: block duplicates (skills only)
    const existing = await findSkillByName(name);
    if (existing) {
      return res.status(409).json({
        error: "Skill name already exists",
        existing,
      });
    }

    const created = await createSkillWithName(name);
    res.status(201).json(created);
  } catch (e: any) {
    console.error("POST /api/admin/skills failed:", e);
    res.status(500).json({ error: e?.message ?? "Unknown error" });
  }
});

// Skills should NOT be deleted anymore.
adminCoursesRouter.delete(
  "/skills/:skillId",
  async (_req: Request, res: Response) => {
    return res.status(405).json({
      error:
        "Deleting Skills is disabled. Update a course's mapping (PUT /courses/:courseId/mapping) to remove skills from that course.",
    });
  },
);

/**
 * PUT /api/admin/courses/:courseId
 * Body: { professor?: string, courseCode?: string, courseName?: string, major?: string }
 * Updates the selected course and any paired opposite-major course with the same
 * original course number + original professor.
 */
type UpdateCourseBody = {
  professor?: string;
  courseCode?: string;
  courseName?: string;
  major?: string;
};

adminCoursesRouter.put(
  "/courses/:courseId",
  async (
    req: Request<{ courseId: string }, unknown, UpdateCourseBody>,
    res: Response,
  ) => {
    try {
      const courseId = Number(req.params.courseId);
      if (!Number.isInteger(courseId) || courseId <= 0) {
        return res.status(400).json({ error: "Invalid courseId" });
      }

      const existingCourse = await getCourseById(courseId);

      const updates: UpdateCourseBody = {};

      if (typeof req.body.professor === "string") {
        updates.professor = req.body.professor.trim();
      }
      if (typeof req.body.courseCode === "string") {
        updates.courseCode = req.body.courseCode.trim();
      }
      if (typeof req.body.courseName === "string") {
        updates.courseName = req.body.courseName.trim();
      }
      if (typeof req.body.major === "string") {
        updates.major = req.body.major.trim();
      }

      const updated = await updateCourse(courseId, updates);

      const syncedCourses =
        await updateCrossMajorMatchingCoursesByCodeAndProfessor(
          courseId,
          existingCourse.Course_Code,
          existingCourse.Major,
          existingCourse.Professor ?? "",
          updates,
        );

      res.json({
        updated,
        syncedCount: syncedCourses.length,
        syncedCourses,
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      res.status(500).json({ error: msg });
    }
  },
);
