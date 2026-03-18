import { supabase } from "../Database/supabaseClient.js";

export type CourseUpdates = {
  courseCode?: string;
  courseName?: string;
  major?: string;
  professor?: string;
};

type CourseRow = {
  Course_Id: number;
  Course_Code: string;
  Course_Name: string;
  Course_Name_Alt?: string | null;
  Major: string;
  Professor?: string | null;
};

function normalizeCourseCode(value: string) {
  return value
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "");
}

function extractCourseNumber(value: string) {
  const normalized = normalizeCourseCode(value);
  const match = normalized.match(/(\d+)$/);
  return match ? match[1] : null;
}

function normalizeProfessor(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function getPairedMajor(major: string) {
  const normalized = major.trim().toLowerCase();

  if (normalized === "software engineering") return "Computer Science";
  if (normalized === "computer science") return "Software Engineering";

  return null;
}

export async function getAllCourses() {
  const { data, error } = await supabase
    .from("Courses")
    .select(
      "Course_Id, Course_Code, Course_Name, Course_Name_Alt, Major, Professor",
    )
    .order("Major", { ascending: true })
    .order("Course_Code", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

// Returns courses grouped by Course_Code within a major.
export async function getCoursesByMajor(major: string) {
  const { data, error } = await supabase
    .from("Courses")
    .select("Course_Id, Course_Code, Course_Name_Alt")
    .eq("Major", major)
    .order("Course_Code", { ascending: true });

  if (error) throw error;

  const groupMap: Record<string, { id: string; altName: string | null }[]> = {};

  for (const row of data ?? []) {
    const existing = groupMap[row.Course_Code] ?? [];
    existing.push({
      id: String(row.Course_Id),
      altName: row.Course_Name_Alt ?? null,
    });
    groupMap[row.Course_Code] = existing;
  }

  return Object.entries(groupMap).map(([courseCode, offerings]) => ({
    courseCode,
    offerings,
  }));
}

export async function getCourseById(courseId: number) {
  const { data, error } = await supabase
    .from("Courses")
    .select(
      "Course_Id, Course_Code, Course_Name, Course_Name_Alt, Major, Professor",
    )
    .eq("Course_Id", courseId)
    .single();

  if (error) throw error;
  return data as CourseRow;
}

export async function updateCourse(courseId: number, updates: CourseUpdates) {
  const payload: Record<string, unknown> = {};

  if (updates.courseCode !== undefined)
    payload.Course_Code = updates.courseCode;
  if (updates.courseName !== undefined)
    payload.Course_Name = updates.courseName;
  if (updates.major !== undefined) payload.Major = updates.major;
  if (updates.professor !== undefined) payload.Professor = updates.professor;

  const { data, error } = await supabase
    .from("Courses")
    .update(payload)
    .eq("Course_Id", courseId)
    .select(
      "Course_Id, Course_Code, Course_Name, Course_Name_Alt, Major, Professor",
    )
    .single();

  if (error) throw error;
  return data as CourseRow;
}

export async function findPairedCoursesByCodeAndProfessor(
  sourceCourseId: number,
  sourceCourseCode: string,
  sourceMajor: string,
  sourceProfessor: string,
) {
  const pairedMajor = getPairedMajor(sourceMajor);
  if (!pairedMajor) return [];

  const sourceNumber = extractCourseNumber(sourceCourseCode);
  if (!sourceNumber) return [];

  const normalizedProfessor = normalizeProfessor(sourceProfessor || "");

  const { data, error } = await supabase
    .from("Courses")
    .select(
      "Course_Id, Course_Code, Course_Name, Course_Name_Alt, Major, Professor",
    )
    .eq("Major", pairedMajor);

  if (error) throw error;

  return ((data ?? []) as CourseRow[]).filter((row) => {
    if (row.Course_Id === sourceCourseId) return false;

    const rowNumber = extractCourseNumber(row.Course_Code ?? "");
    const rowProfessor = normalizeProfessor(row.Professor ?? "");

    return rowNumber === sourceNumber && rowProfessor === normalizedProfessor;
  });
}

export async function updateCrossMajorMatchingCoursesByCodeAndProfessor(
  sourceCourseId: number,
  sourceCourseCode: string,
  sourceMajor: string,
  sourceProfessor: string,
  updates: CourseUpdates,
) {
  const matches = await findPairedCoursesByCodeAndProfessor(
    sourceCourseId,
    sourceCourseCode,
    sourceMajor,
    sourceProfessor,
  );

  if (matches.length === 0) return [];

  const payload: Record<string, unknown> = {};

  // keep each row's own code + major
  if (updates.courseName !== undefined)
    payload.Course_Name = updates.courseName;
  if (updates.professor !== undefined) payload.Professor = updates.professor;

  if (Object.keys(payload).length === 0) return matches;

  const ids = matches.map((row) => row.Course_Id);

  const { data, error } = await supabase
    .from("Courses")
    .update(payload)
    .in("Course_Id", ids)
    .select(
      "Course_Id, Course_Code, Course_Name, Course_Name_Alt, Major, Professor",
    );

  if (error) throw error;
  return (data ?? []) as CourseRow[];
}

export async function findCoursesByCode(courseCode: string) {
  const normalizedCode = normalizeCourseCode(courseCode);

  const { data, error } = await supabase
    .from("Courses")
    .select(
      "Course_Id, Course_Code, Course_Name, Course_Name_Alt, Major, Professor",
    );

  if (error) throw error;

  return (data ?? []).filter(
    (row) => normalizeCourseCode(row.Course_Code ?? "") === normalizedCode,
  );
}

export async function createCourse(input: {
  courseCode: string;
  courseName: string;
  courseNameAlt?: string;
  major: string;
  professor?: string;
}) {
  const payload = {
    Course_Code: input.courseCode.trim(),
    Course_Name: input.courseName.trim(),
    Course_Name_Alt: input.courseNameAlt?.trim() || null,
    Major: input.major.trim(),
    Professor: input.professor?.trim() ?? "",
  };

  const { data, error } = await supabase
    .from("Courses")
    .insert([payload])
    .select(
      "Course_Id, Course_Code, Course_Name, Course_Name_Alt, Major, Professor",
    )
    .single();

  if (error) throw error;
  return data;
}
