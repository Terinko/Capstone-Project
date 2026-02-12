import { supabase } from "../Database/supabaseClient.js";

export async function getAllSkillsAndCompetencies() {
  const { data, error } = await supabase
    .from("Skills")
    .select("Skill_Id, Skill_name, Type, Description")
    .order("Skill_name", { ascending: true });

  if (error) throw new Error(error.message);

  const skills = (data ?? []).filter((x) => x.Type === false);
  const competencies = (data ?? []).filter((x) => x.Type === true);

  return { skills, competencies };
}

// Find existing skill by description (skills only), case-insensitive
export async function findSkillByDescription(description: string) {
  const { data, error } = await supabase
    .from("Skills")
    .select("Skill_Id, Skill_name, Type, Description")
    .eq("Type", false)
    .ilike("Description", description)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data ?? null;
}

export async function createSkillWithDescription(description: string) {
  const { data, error } = await supabase
    .from("Skills")
    .insert([
      {
        Skill_name: "Skill",
        Type: false,
        Description: description,
      },
    ])
    .select("Skill_Id, Skill_name, Type, Description")
    .single();

  if (error) throw new Error(error.message);
  return data;
}

// Delete skill row (does NOT delete mappings; router will delete mappings first)
export async function deleteSkillById(skillId: number) {
  const { error } = await supabase
    .from("Skills")
    .delete()
    .eq("Skill_Id", skillId);
  if (error) throw new Error(error.message);
}
