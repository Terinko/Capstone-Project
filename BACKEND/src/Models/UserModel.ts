import { supabase } from "../Database/supabaseClient.js";

export async function findStudentByEmail(email: string) {
  const { data } = await supabase
    .from("Student")
    .select(
      "Student_Id, Student_Qu_Email, FirstName, LastName, Major, Password",
    )
    .eq("Student_Qu_Email", email)
    .single();
  return data ?? null;
}

export async function findFacultyByEmail(email: string) {
  const { data } = await supabase
    .from("Faculty_Admin")
    .select("Faculty_Id, Faculty_Qu_Email, FirstName, LastName, Type, Password")
    .eq("Faculty_Qu_Email", email)
    .single();
  return data ?? null;
}
