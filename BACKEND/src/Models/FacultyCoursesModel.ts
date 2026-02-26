import { supabase } from "../Database/supabaseClient.js";

// Return just the course IDs a faculty member "owns"
export async function getFacultyCourseIds(facultyId: number) {
  const { data, error } = await supabase
    .from("Faculty_Courses")
    .select("Course_Id")
    .eq("Faculty_Id", facultyId);

  if (error) throw new Error(error.message);

  return (data ?? [])
    .map((row: any) => row.Course_Id as number)
    .filter((id) => typeof id === "number");
}

// Convenience: return actual course rows for the faculty member
// (optional, but usually handy)
export async function getFacultyCourses(facultyId: number) {
  const { data, error } = await supabase
    .from("Faculty_Courses")
    .select("Courses(Course_Id, Course_Code, Course_Name, Major, Professor)")
    .eq("Faculty_Id", facultyId);

  if (error) throw new Error(error.message);

  return (data ?? []).map((row: any) => row.Courses).filter(Boolean);
}
