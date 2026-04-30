import { type Request, type Response } from "express";
import {
  getCourseMappings,
  replaceCourseMappings,
  replaceMappingsForCourseIds,
} from "../Models/CourseSkillMappingModel.js";
import {
  getAllSkillsAndCompetencies,
  findSkillByName,
  createSkillWithName,
} from "../Models/SkillsModel.js";
import {
  getFacultyName,
  getVisibleCoursesForFaculty,
  getUnassignedCourses,
  assignCourseToFaculty,
} from "../Models/FacultyCoursesModel.js";
import {
  getCourseById,
  updateCourse,
  findCoursesByCode,
  createCourse,
  findPairedCoursesByCodeAndProfessor,
} from "../Models/CoursesModel.js";
import { findMajorByName } from "../Models/MajorModel.js";
import { linkSkillToMajor } from "../Models/SkillMajorMappingModel.js";

export { resolveOrCreateSkill } from "./AdminCourseController.js";

// --- Helper Function ---
function getFacultyId(req: Request): number {
  const user = (req as any).user;
  const id = Number(user?.userId);
  return Number.isInteger(id) && id > 0 ? id : NaN;
}

// --- Controller Functions ---

export const getCourses = async (req: Request, res: Response) => {
  try {
    const facultyId = getFacultyId(req);
    if (!Number.isFinite(facultyId)) {
      return res
        .status(400)
        .json({ error: "Missing or invalid faculty session" });
    }

    const status = (req.query.status as string | undefined)?.trim();
    const facultyFullName = await getFacultyName(facultyId);
    const courses = await getVisibleCoursesForFaculty(
      facultyId,
      facultyFullName,
    );

    const codesWithAlt = new Set<string>(
      courses.filter((c) => c.Course_Name_Alt).map((c) => c.Course_Code),
    );

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
          courseName: c.Course_Name,
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
};

export const getCourseMapping = async (req: Request, res: Response) => {
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
};

type UpdateMappingBody = { skillIds?: number[]; competencyIds?: number[] };

export const updateCourseMapping = async (
  req: Request<{ courseId: string }, unknown, UpdateMappingBody>,
  res: Response,
) => {
  try {
    const facultyId = getFacultyId(req);
    if (!Number.isFinite(facultyId)) {
      return res
        .status(400)
        .json({ error: "Missing or invalid faculty session" });
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

    const existingCourse = await getCourseById(courseId);

    const skillIds = Array.isArray(req.body.skillIds) ? req.body.skillIds : [];
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

    const syncedVisibleCourseIds = pairedCourses
      .map((c) => c.Course_Id)
      .filter((id) => visibleIds.has(id));

    const allCourseIdsToReplace = [courseId, ...syncedVisibleCourseIds];

    await replaceMappingsForCourseIds(allCourseIdsToReplace, uniqueIds);
    const updated = await getCourseMappings(courseId);

    res.json({
      updated,
      syncedCourseIds: syncedVisibleCourseIds,
      syncedCount: syncedVisibleCourseIds.length,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    res.status(500).json({ error: msg });
  }
};

export const claimCourse = async (req: Request, res: Response) => {
  try {
    const facultyId = getFacultyId(req);
    if (!Number.isFinite(facultyId)) {
      return res
        .status(400)
        .json({ error: "Missing or invalid faculty session" });
    }

    const courseId = Number(req.params.courseId);
    if (!Number.isInteger(courseId) || courseId <= 0) {
      return res.status(400).json({ error: "Invalid courseId" });
    }

    const unassignedCourses = await getUnassignedCourses();
    const isUnassigned = unassignedCourses.some(
      (c) => c.Course_Id === courseId,
    );

    if (!isUnassigned) {
      return res
        .status(403)
        .json({ error: "Course is already assigned or unavailable" });
    }

    const facultyFullName = await getFacultyName(facultyId);
    const updated = await updateCourse(courseId, {
      professor: facultyFullName,
    });

    res.json(updated);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    res.status(500).json({ error: msg });
  }
};

export const fetchUnassignedCourses = async (req: Request, res: Response) => {
  try {
    const status = (req.query.status as string | undefined)?.trim();
    const courses = await getUnassignedCourses();

    const rows = await Promise.all(
      courses.map(async (c) => {
        const { skills, competencies } = await getCourseMappings(c.Course_Id);
        const completion =
          skills.length > 0 && competencies.length > 0 ? "Mapped" : "Unmapped";

        return {
          id: c.Course_Id,
          course: c.Course_Code,
          courseName: c.Course_Name,
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
};

export const getSkillsOptions = async (_req: Request, res: Response) => {
  try {
    const options = await getAllSkillsAndCompetencies();
    res.json(options);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    res.status(500).json({ error: msg });
  }
};

export const checkCourseCode = async (req: Request, res: Response) => {
  try {
    const facultyId = getFacultyId(req);
    if (!Number.isFinite(facultyId)) {
      return res
        .status(400)
        .json({ error: "Missing or invalid faculty session" });
    }

    const courseCode = (req.query.courseCode as string | undefined)?.trim();
    if (!courseCode) {
      return res.status(400).json({ error: "Missing courseCode" });
    }

    const matches = await findCoursesByCode(courseCode);

    res.json({
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
    res.status(500).json({ error: msg });
  }
};

type CreateCourseBody = {
  courseCode?: string;
  courseName?: string;
  alternateCourseTitle?: string;
  major?: string;
  skillNames?: string[];
  competencyIds?: number[];
};

export const createNewCourse = async (
  req: Request<Record<string, never>, unknown, CreateCourseBody>,
  res: Response,
) => {
  try {
    const facultyId = getFacultyId(req);
    if (!Number.isFinite(facultyId)) {
      return res
        .status(400)
        .json({ error: "Missing or invalid faculty session" });
    }

    const courseCode = req.body.courseCode?.trim() ?? "";
    const courseName = req.body.courseName?.trim() ?? "";
    const alternateCourseTitle = req.body.alternateCourseTitle?.trim() ?? "";
    const major = req.body.major?.trim() ?? "";

    if (!courseCode || !courseName || !major) {
      return res
        .status(400)
        .json({ error: "courseCode, courseName, and major are required" });
    }

    const resolvedMajor = await findMajorByName(major);
    if (!resolvedMajor) {
      return res.status(400).json({ error: `Major not found: ${major}` });
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

      if (existingSkill?.Skill_Id) {
        const skillId = Number(existingSkill.Skill_Id);
        resolvedSkillIds.push(skillId);
        await linkSkillToMajor(skillId, resolvedMajor.id);
      } else {
        const createdSkill = await createSkillWithName(normalizedSkillName);
        const skillId = Number(createdSkill.Skill_Id);
        resolvedSkillIds.push(skillId);
        await linkSkillToMajor(skillId, resolvedMajor.id);
      }
    }

    const competencyIds = rawCompetencyIds
      .map(Number)
      .filter((id) => Number.isInteger(id) && id > 0);
    const allMappingIds = Array.from(
      new Set([...resolvedSkillIds, ...competencyIds]),
    );

    const facultyFullName = await getFacultyName(facultyId);

    const newCourse = await createCourse({
      courseCode,
      courseName,
      major,
      professor: facultyFullName,
      ...(alternateCourseTitle ? { courseNameAlt: alternateCourseTitle } : {}),
    });

    await assignCourseToFaculty(facultyId, Number(newCourse.Course_Id));

    if (allMappingIds.length > 0) {
      await replaceCourseMappings(Number(newCourse.Course_Id), allMappingIds);
    }

    const mapping = await getCourseMappings(Number(newCourse.Course_Id));

    res.status(201).json({
      course: newCourse,
      mapping,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    res.status(500).json({ error: msg });
  }
};
