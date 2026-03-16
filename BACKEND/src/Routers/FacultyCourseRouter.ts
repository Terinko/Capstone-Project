import { Router, type Request, type Response } from "express";
import {
  getCourseMappings,
  replaceCourseMappings,
} from "../Models/CourseSkillMappingModel.js";
import { getAllSkillsAndCompetencies } from "../Models/SkillsModel.js";
import {
  getFacultyCourseIds,
  getFacultyName,
  getVisibleCoursesForFaculty,
  getUnassignedCourses,
} from "../Models/FacultyCoursesModel.js";

export const facultyCoursesRouter = Router();

/**
 * All routes sit behind RequireAuth in Server.ts.
 * The middleware attaches the decoded JWT payload to req.user
 * which includes { userId, userType }.
 */
function getFacultyId(req: Request): number {
  const user = (req as any).user;
  const id = Number(user?.userId);
  return Number.isInteger(id) && id > 0 ? id : NaN;
}

/**
 * GET /api/faculty/courses?status=
 * Returns courses visible to this faculty member:
 *   - courses they own via Faculty_Courses
 *   - courses with no professor assigned
 *   - courses whose Professor field matches their full name
 * Rows with a null Course_Name_Alt are hidden when sibling rows for the
 * same Course_Code have a non-null Course_Name_Alt.
 */
facultyCoursesRouter.get("/courses", async (req: Request, res: Response) => {
  try {
    const facultyId = getFacultyId(req);
    if (!Number.isFinite(facultyId)) {
      return res
        .status(400)
        .json({ error: "Missing or invalid faculty session" });
    }

    const status = (req.query.status as string | undefined)?.trim();

    // Look up faculty name for professor-name matching
    const facultyFullName = await getFacultyName(facultyId);

    const courses = await getVisibleCoursesForFaculty(
      facultyId,
      facultyFullName,
    );

    // Find which Course_Codes have at least one row with a non-null altName
    const codesWithAlt = new Set<string>(
      courses.filter((c) => c.Course_Name_Alt).map((c) => c.Course_Code),
    );

    // Filter out the null-altName row for any code that has alternates
    const visibleCourses = courses.filter((c) => {
      if (codesWithAlt.has(c.Course_Code) && !c.Course_Name_Alt) return false;
      return true;
    });

    const rows = await Promise.all(
      visibleCourses.map(async (c) => {
        const { skills, competencies } = await getCourseMappings(c.Course_Id);
        const completion =
          skills.length > 0 && competencies.length > 0 ? "Mapped" : "Unmapped";

        return {
          id: c.Course_Id,
          course: c.Course_Code,
          altName: c.Course_Name_Alt ?? null,
          major: c.Major,
          professor: c.Professor ?? "",
          completion,
          skills,
          competencies,
        };
      }),
    );

    const filtered = rows.filter((r) => {
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
      const facultyId = getFacultyId(req);
      if (!Number.isFinite(facultyId)) {
        return res
          .status(400)
          .json({ error: "Missing or invalid faculty session" });
      }

      const courseId = Number(req.params.courseId);
      if (!Number.isFinite(courseId)) {
        return res.status(400).json({ error: "Invalid courseId" });
      }

      const facultyFullName = await getFacultyName(facultyId);
      const visibleCourses = await getVisibleCoursesForFaculty(
        facultyId,
        facultyFullName,
      );
      const visibleIds = new Set(visibleCourses.map((c) => c.Course_Id));

      if (!visibleIds.has(courseId)) {
        return res
          .status(403)
          .json({ error: "Not allowed to view this course mapping" });
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
      const facultyId = getFacultyId(req);
      if (!Number.isFinite(facultyId)) {
        return res.status(400).json({
          error: "Missing or invalid faculty session",
        });
      }

      const courseId = Number(req.params.courseId);
      if (!Number.isInteger(courseId) || courseId <= 0) {
        return res.status(400).json({ error: "Invalid courseId" });
      }

      const facultyFullName = await getFacultyName(facultyId);
      const visibleCourses = await getVisibleCoursesForFaculty(
        facultyId,
        facultyFullName,
      );
      const visibleIds = new Set(visibleCourses.map((c) => c.Course_Id));

      if (!visibleIds.has(courseId)) {
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
 * GET /api/faculty/unassigned-courses?status=
 * Returns courses with no professor (null, empty, or "N/A").
 * Applies the same completion status filter as the main courses endpoint.
 */
facultyCoursesRouter.get(
  "/unassigned-courses",
  async (req: Request, res: Response) => {
    try {
      const status = (req.query.status as string | undefined)?.trim();

      const courses = await getUnassignedCourses();

      const rows = await Promise.all(
        courses.map(async (c) => {
          const { skills, competencies } = await getCourseMappings(c.Course_Id);
          const completion =
            skills.length > 0 && competencies.length > 0
              ? "Mapped"
              : "Unmapped";

          return {
            id: c.Course_Id,
            course: c.Course_Code,
            altName: c.Course_Name_Alt ?? null,
            major: c.Major,
            professor: c.Professor ?? "",
            completion,
            skills,
            competencies,
          };
        }),
      );

      const filtered = rows.filter((r) => {
        if (status && status !== "All" && r.completion !== status) return false;
        return true;
      });

      res.json(filtered);
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
