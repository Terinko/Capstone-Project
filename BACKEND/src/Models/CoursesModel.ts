import { supabase } from "../Database/supabaseClient.js";

export async function getAllCourses() {
  const { data, error } = await supabase
    .from("Courses")
    .select("Course_Id, Course_Code, Major");

  if (error) throw error;
  return data ?? [];
}
