import { supabase } from "../Database/supabaseClient.js";

export async function getAllCourses() {
  const { data, error } = await supabase
    .from("Courses")
    .select("Course_Id, Course_Code, Course_Name, Major, Professor");

  if (error) throw error;
  return data ?? [];
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
