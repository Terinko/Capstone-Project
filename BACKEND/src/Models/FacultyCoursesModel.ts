import { supabase } from "../Database/supabaseClient.js";

// Return just the course IDs a faculty member "owns"
export async function getFacultyCourseIds(facultyId: number) {
  const { data, error } = await supabase
    .from("Faculty_Courses")
    .select("Course_Id")
    .eq("Faculty_Id", facultyId);

  console.log("getFacultyCourseIds raw data:", data);
  console.log("getFacultyCourseIds raw error:", error);

  if (error) throw new Error(error.message);

  return (data ?? [])
    .map((row: any) => Number(row.Course_Id))
    .filter((id) => Number.isInteger(id) && id > 0);
}

// Convenience: return actual course rows for the faculty member
export async function getFacultyCourses(facultyId: number) {
  const { data, error } = await supabase
    .from("Faculty_Courses")
    .select("Courses(Course_Id, Course_Code, Course_Name, Major, Professor)")
    .eq("Faculty_Id", facultyId);

  if (error) throw new Error(error.message);

  return (data ?? []).map((row: any) => row.Courses).filter(Boolean);
}

export async function assignCourseToFaculty(
  facultyId: number,
  courseId: number,
) {
  const { error } = await supabase.from("Faculty_Courses").insert([
    {
      Faculty_Id: facultyId,
      Course_Id: courseId,
    },
  ]);

  if (error) throw new Error(error.message);
}
