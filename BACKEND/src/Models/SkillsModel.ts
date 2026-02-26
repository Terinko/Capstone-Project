import { supabase } from "../Database/supabaseClient.js";

export async function getAllSkillsAndCompetencies() {
  const { data, error } = await supabase
    .from("Skills")
    // Description removed — names only
    .select("Skill_Id, Skill_name, Type")
    .order("Skill_name", { ascending: true });

  if (error) throw new Error(error.message);

  const skills = (data ?? []).filter((x) => x.Type === false);
  const competencies = (data ?? []).filter((x) => x.Type === true);

  return { skills, competencies };
}

// Find existing skill by NAME (skills only), case-insensitive
export async function findSkillByName(name: string) {
  const trimmed = name.trim();

  const { data, error } = await supabase
    .from("Skills")
    .select("Skill_Id, Skill_name, Type")
    .eq("Type", false)
    .ilike("Skill_name", trimmed)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data ?? null;
}

// Create skill using NAME (no Description)
export async function createSkillWithName(name: string) {
  const trimmed = name.trim();

  const { data, error } = await supabase
    .from("Skills")
    .insert([
      {
        Skill_name: trimmed,
        Type: false,
      },
    ])
    .select("Skill_Id, Skill_name, Type")
    .single();

  if (error) throw new Error(error.message);
  return data;
}

/**
 * Skills should NOT be deleted anymore.
 * Only delete mappings when Save is pressed.
 */
export async function deleteSkillById(_skillId: number) {
  throw new Error(
    "Deleting Skills rows is disabled. Remove skills from a course by updating the Course_Skill_Mapping on Save.",
  );
}
