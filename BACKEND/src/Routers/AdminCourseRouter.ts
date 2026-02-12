import { Router, type Request, type Response } from "express";
import { getAllCourses } from "../Models/CoursesModel.js";
import {
  getCourseMappings,
  replaceCourseMappings,
  deleteMappingsBySkillId,
} from "../Models/CourseSkillMappingModel.js";
import {
  getAllSkillsAndCompetencies,
  createSkillWithDescription,
  findSkillByDescription,
  deleteSkillById,
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
 * Replaces mapping set.
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

      await replaceCourseMappings(courseId, uniqueIds);

      const updated = await getCourseMappings(courseId);
      res.json(updated);
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
 * Body: { description: string }
 * Creates a new skill with Skill_name="Skill", Type=false, Description=user text
 */
adminCoursesRouter.post("/skills", async (req: Request, res: Response) => {
  try {
    const description = (req.body?.description as string | undefined)?.trim();

    if (!description) {
      return res.status(400).json({ error: "Description is required" });
    }

    // safeguard: block duplicates (skills only)
    const existing = await findSkillByDescription(description);
    if (existing) {
      return res.status(409).json({
        error: "Skill description already exists",
        existing,
      });
    }

    const created = await createSkillWithDescription(description);
    res.status(201).json(created);
  } catch (e: any) {
    console.error("POST /api/admin/skills failed:", e);
    res.status(500).json({ error: e?.message ?? "Unknown error" });
  }
});

adminCoursesRouter.delete(
  "/skills/:skillId",
  async (req: Request, res: Response) => {
    try {
      const skillId = Number(req.params.skillId);
      if (!Number.isInteger(skillId) || skillId <= 0) {
        return res.status(400).json({ error: "Invalid skillId" });
      }

      // 1) remove mappings first
      await deleteMappingsBySkillId(skillId);

      // 2) delete the skill row
      await deleteSkillById(skillId);

      res.json({ ok: true });
    } catch (e: any) {
      console.error("DELETE /api/admin/skills/:skillId failed:", e);
      res.status(500).json({ error: e?.message ?? "Unknown error" });
    }
  },
);
