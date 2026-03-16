import { supabase } from "../Database/supabaseClient.js";

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
// Each entry has a courseCode and an offerings array (one per version).
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

// Update a course field (used for editable Professor, etc.)
export async function updateCourse(
  courseId: number,
  updates: {
    courseCode?: string;
    courseName?: string;
    major?: string;
    professor?: string;
  },
) {
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
    .select("Course_Id, Course_Code, Course_Name, Major, Professor")
    .single();

  if (error) throw error;
  return data;
}
