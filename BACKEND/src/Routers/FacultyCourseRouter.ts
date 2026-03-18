import { Router, type Request, type Response } from "express";
import {
  getAllCourses,
  createCourse,
  findCoursesByCode,
} from "../Models/CoursesModel.js";
import {
  getCourseMappings,
  replaceCourseMappings,
} from "../Models/CourseSkillMappingModel.js";
import {
  getAllSkillsAndCompetencies,
  findSkillByName,
  createSkillWithName,
} from "../Models/SkillsModel.js";

import {
  getFacultyCourseIds,
  assignCourseToFaculty,
} from "../Models/FacultyCoursesModel.js";
import { findFacultyByEmail } from "../Models/UserModel.js";

export const facultyCoursesRouter = Router();

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

function hasNoProfessorAssigned(professor: string): boolean {
  const normalized = professor.trim().toUpperCase();
  return normalized === "" || normalized === "N/A" || normalized === "NULL";
}

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
    const status = (req.query.status as string | undefined)?.trim();

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

        const professor = c.Professor ?? "";
        const ownedByFaculty = facultySet.has(Number(c.Course_Id));
        const unmappedByProfessor = hasNoProfessorAssigned(professor);
        console.log("facultyId:", facultyId);
        console.log("facultyCourseIds:", facultyCourseIds);
        console.log(
          "all course ids:",
          courses.map((c) => c.Course_Id),
        );
        console.log("faculty course ids:", facultyCourseIds);
        return {
          id: c.Course_Id,
          course: c.Course_Code,
          major: c.Major,
          professor,
          completion,
          skills,
          competencies,
          ownedByFaculty,
          unmappedByProfessor,
        };
      }),
    );

    const filtered = rows.filter((r) => {
      if (major && r.major !== major) return false;

      if (status === "YourCourses") {
        return r.ownedByFaculty;
      }

      if (status === "Unmapped") {
        return r.unmappedByProfessor;
      }

      return r.ownedByFaculty || r.unmappedByProfessor;
    });

    res.json(filtered);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    res.status(500).json({ error: msg });
  }
});

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

      const [courses, facultyCourseIds] = await Promise.all([
        getAllCourses(),
        getFacultyCourseIds(facultyId),
      ]);

      const facultySet = new Set<number>(facultyCourseIds);
      const course = courses.find((c) => Number(c.Course_Id) === courseId);

      if (!course) {
        return res.status(404).json({ error: "Course not found" });
      }

      const editable =
        facultySet.has(courseId) ||
        hasNoProfessorAssigned(course.Professor ?? "");

      if (!editable) {
        return res
          .status(403)
          .json({ error: "Not allowed to view/edit this course mapping" });
      }

      const mapping = await getCourseMappings(courseId);
      res.json(mapping);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      res.status(500).json({ error: msg });
    }
  },
);

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

      const [courses, facultyCourseIds] = await Promise.all([
        getAllCourses(),
        getFacultyCourseIds(facultyId),
      ]);

      const facultySet = new Set<number>(facultyCourseIds);
      const course = courses.find((c) => Number(c.Course_Id) === courseId);

      if (!course) {
        return res.status(404).json({ error: "Course not found" });
      }

      const editable =
        facultySet.has(courseId) ||
        hasNoProfessorAssigned(course.Professor ?? "");

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

facultyCoursesRouter.get("/me", async (req: Request, res: Response) => {
  try {
    const email = (req.query.email as string | undefined)?.trim();

    if (!email) {
      return res.status(400).json({ error: "Missing email" });
    }

    const faculty = await findFacultyByEmail(email);

    if (!faculty) {
      return res.status(404).json({ error: "Faculty user not found" });
    }

    return res.json({
      facultyId: faculty.Faculty_Id,
      email: faculty.Faculty_Qu_Email,
      firstName: faculty.FirstName,
      lastName: faculty.LastName,
      type: faculty.Type,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return res.status(500).json({ error: msg });
  }
});

facultyCoursesRouter.get(
  "/courses/check-code",
  async (req: Request, res: Response) => {
    try {
      const courseCode = (req.query.courseCode as string | undefined)?.trim();

      if (!courseCode) {
        return res.status(400).json({ error: "Missing courseCode" });
      }

      const matches = await findCoursesByCode(courseCode);

      return res.json({
        exists: matches.length > 0,
        matches: matches.map((m) => ({
          courseId: m.Course_Id,
          courseCode: m.Course_Code,
          courseName: m.Course_Name,
          alternateCourseTitle: m.Course_Name_Alt ?? "",
          major: m.Major,
        })),
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      return res.status(500).json({ error: msg });
    }
  },
);

type CreateCourseBody = {
  courseCode?: string;
  courseName?: string;
  major?: string;
  skillNames?: string[];
  competencyIds?: number[];
};

facultyCoursesRouter.post(
  "/courses",
  async (
    req: Request<Record<string, never>, unknown, CreateCourseBody>,
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

      const courseCode = req.body.courseCode?.trim() ?? "";
      const courseName = req.body.courseName?.trim() ?? "";
      const major = req.body.major?.trim() ?? "";

      if (!courseCode || !courseName || !major) {
        return res.status(400).json({
          error: "courseCode, courseName, and major are required",
        });
      }

      const rawSkillNames = Array.isArray(req.body.skillNames)
        ? req.body.skillNames
        : [];

      const rawCompetencyIds = Array.isArray(req.body.competencyIds)
        ? req.body.competencyIds
        : [];

      const resolvedSkillIds: number[] = [];

      for (const rawName of rawSkillNames) {
        const normalizedSkillName = String(rawName ?? "").trim();

        if (!normalizedSkillName) continue;

        const existingSkill = await findSkillByName(normalizedSkillName);

        if (existingSkill && existingSkill.Skill_Id) {
          resolvedSkillIds.push(Number(existingSkill.Skill_Id));
        } else {
          const createdSkill = await createSkillWithName(normalizedSkillName);
          resolvedSkillIds.push(Number(createdSkill.Skill_Id));
        }
      }

      const competencyIds = rawCompetencyIds
        .map(Number)
        .filter((id) => Number.isInteger(id) && id > 0);

      const allMappingIds = Array.from(
        new Set([...resolvedSkillIds, ...competencyIds]),
      );

      const newCourse = await createCourse({
        courseCode,
        courseName,
        major,
        professor: "",
      });

      await assignCourseToFaculty(facultyId, Number(newCourse.Course_Id));

      if (allMappingIds.length > 0) {
        await replaceCourseMappings(Number(newCourse.Course_Id), allMappingIds);
      }

      const mapping = await getCourseMappings(Number(newCourse.Course_Id));

      return res.status(201).json({
        course: newCourse,
        mapping,
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      return res.status(500).json({ error: msg });
    }
  },
);
