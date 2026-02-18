import { supabase } from "../Database/supabaseClient.js";

export async function getMajors() {
  // Fetches only the list of majors. very lightweight.
  const { data, error } = await supabase
    .from("Majors")
    .select("name")
    .order("name", { ascending: true });

  if (error) throw error;

  return data?.map((m) => m.name) ?? [];
}
