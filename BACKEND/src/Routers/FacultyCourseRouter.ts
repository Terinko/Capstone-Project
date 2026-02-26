import { Router, type Request, type Response } from "express";
import { getAllCourses } from "../Models/CoursesModel.js";
import {
  getCourseMappings,
  replaceCourseMappings,
} from "../Models/CourseSkillMappingModel.js";
import { getAllSkillsAndCompetencies } from "../Models/SkillsModel.js";
import { getFacultyCourseIds } from "../Models/FacultyCoursesModel.js";

export const facultyCoursesRouter = Router();

/**
 * Helper: parse facultyId from header or query.
 * (Keeps this router usable before you wire auth properly.)
 */
function resolveFacultyId(req: Request): number {
  const fromHeader = req.header("x-faculty-id");
  const fromQuery = req.query.facultyId;

  const raw =
    typeof fromHeader === "string"
      ? fromHeader
      : typeof fromQuery === "string"
        ? fromQuery
        : "";

  const facultyId = Number(raw);
  return Number.isInteger(facultyId) && facultyId > 0 ? facultyId : NaN;
}

/**
 * GET /api/faculty/courses?facultyId=&major=&status=
 * Returns ONLY courses the faculty can edit:
 * - their courses (Faculty_Courses)
 * - OR "Unmapped" courses (not fully mapped yet)
 */
facultyCoursesRouter.get("/courses", async (req: Request, res: Response) => {
  try {
    const facultyId = resolveFacultyId(req);
    if (!Number.isFinite(facultyId)) {
      return res.status(400).json({
        error:
          "Missing/invalid facultyId (use ?facultyId= or x-faculty-id header)",
      });
    }

    const major = (req.query.major as string | undefined)?.trim();
    const status = (req.query.status as string | undefined)?.trim(); // Mapped/Unmapped/All

    const [courses, facultyCourseIds] = await Promise.all([
      getAllCourses(),
      getFacultyCourseIds(facultyId),
    ]);

    const facultySet = new Set<number>(facultyCourseIds);

    const rows = await Promise.all(
      courses.map(async (c) => {
        const { skills, competencies } = await getCourseMappings(c.Course_Id);

        const completion =
          skills.length > 0 && competencies.length > 0 ? "Mapped" : "Unmapped";

        const editable =
          facultySet.has(c.Course_Id) || completion === "Unmapped";

        return {
          id: c.Course_Id,
          course: c.Course_Code,
          major: c.Major,
          professor: c.Professor ?? "",
          completion,
          skills,
          competencies,
          editable,
        };
      }),
    );

    // Keep only editable courses, then apply optional filters
    const filtered = rows.filter((r) => {
      if (!r.editable) return false;
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
 * GET /api/faculty/courses/:courseId/mapping?facultyId=
 * Only allowed if the course is editable (their course OR Unmapped).
 */
facultyCoursesRouter.get(
  "/courses/:courseId/mapping",
  async (req: Request, res: Response) => {
    try {
      const facultyId = resolveFacultyId(req);
      if (!Number.isFinite(facultyId)) {
        return res.status(400).json({
          error:
            "Missing/invalid facultyId (use ?facultyId= or x-faculty-id header)",
        });
      }

      const courseId = Number(req.params.courseId);
      if (!Number.isFinite(courseId)) {
        return res.status(400).json({ error: "Invalid courseId" });
      }

      const facultyCourseIds = await getFacultyCourseIds(facultyId);
      const facultySet = new Set<number>(facultyCourseIds);

      const mapping = await getCourseMappings(courseId);
      const completion =
        mapping.skills.length > 0 && mapping.competencies.length > 0
          ? "Mapped"
          : "Unmapped";

      const editable = facultySet.has(courseId) || completion === "Unmapped";
      if (!editable) {
        return res
          .status(403)
          .json({ error: "Not allowed to view/edit this course mapping" });
      }

      res.json(mapping);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      res.status(500).json({ error: msg });
    }
  },
);

/**
 * PUT /api/faculty/courses/:courseId/mapping?facultyId=
 * Body: { skillIds: number[], competencyIds: number[] }
 *
 * Allowed if:
 * - faculty owns the course, OR
 * - course is Unmapped (not fully mapped yet)
 */
type UpdateMappingBody = {
  skillIds?: number[];
  competencyIds?: number[];
};

facultyCoursesRouter.put(
  "/courses/:courseId/mapping",
  async (
    req: Request<{ courseId: string }, unknown, UpdateMappingBody>,
    res: Response,
  ) => {
    try {
      const facultyId = resolveFacultyId(req);
      if (!Number.isFinite(facultyId)) {
        return res.status(400).json({
          error:
            "Missing/invalid facultyId (use ?facultyId= or x-faculty-id header)",
        });
      }

      const courseId = Number(req.params.courseId);
      if (!Number.isInteger(courseId) || courseId <= 0) {
        return res.status(400).json({ error: "Invalid courseId" });
      }

      // Permission check first
      const facultyCourseIds = await getFacultyCourseIds(facultyId);
      const facultySet = new Set<number>(facultyCourseIds);

      const current = await getCourseMappings(courseId);
      const completion =
        current.skills.length > 0 && current.competencies.length > 0
          ? "Mapped"
          : "Unmapped";

      const editable = facultySet.has(courseId) || completion === "Unmapped";
      if (!editable) {
        return res
          .status(403)
          .json({ error: "Not allowed to edit this course mapping" });
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
 * GET /api/faculty/skills-options
 * Faculty can read options for dropdowns.
 */
facultyCoursesRouter.get(
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
