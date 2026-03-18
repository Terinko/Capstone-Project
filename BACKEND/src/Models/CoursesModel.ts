import { supabase } from "../Database/supabaseClient.js";

function normalizeCourseCode(value: string) {
  return value.trim().replace(/\s+/g, " ").toUpperCase();
}

export async function getAllCourses() {
  const { data, error } = await supabase
    .from("Courses")
    .select(
      "Course_Id, Course_Code, Course_Name, Course_Name_Alt, Major, Professor",
    );

  if (error) throw error;
  return data ?? [];
}

// Find existing courses with the same course code
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

// Update a course field
export async function updateCourse(
  courseId: number,
  updates: {
    courseCode?: string;
    courseName?: string;
    courseNameAlt?: string;
    major?: string;
    professor?: string;
  },
) {
  const payload: Record<string, unknown> = {};

  if (updates.courseCode !== undefined) {
    payload.Course_Code = updates.courseCode;
  }
  if (updates.courseName !== undefined) {
    payload.Course_Name = updates.courseName;
  }
  if (updates.courseNameAlt !== undefined) {
    payload.Course_Name_Alt = updates.courseNameAlt;
  }
  if (updates.major !== undefined) {
    payload.Major = updates.major;
  }
  if (updates.professor !== undefined) {
    payload.Professor = updates.professor;
  }

  const { data, error } = await supabase
    .from("Courses")
    .update(payload)
    .eq("Course_Id", courseId)
    .select(
      "Course_Id, Course_Code, Course_Name, Course_Name_Alt, Major, Professor",
    )
    .single();

  if (error) throw error;
  return data;
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
