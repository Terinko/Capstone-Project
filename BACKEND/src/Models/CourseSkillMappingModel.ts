import { supabase } from "../Database/supabaseClient.js";

// Pull course + mapped skills (with Type so we can split skills vs competencies)
export async function getCourseMappings(courseId: number) {
  const { data, error } = await supabase
    .from("Courses_Skill_Mapping")
    .select("Skills(Skill_name, Type, Description)")
    .eq("Course_Id", courseId);

  if (error) throw new Error(error.message);

  const skills: string[] = [];
  const competencies: string[] = [];

  for (const row of data ?? []) {
    const skill = (row as any).Skills;
    if (!skill) continue;

    const type = skill.Type as boolean | undefined;

    if (type === true) {
      if (skill.Skill_name) competencies.push(skill.Skill_name);
    } else {
      if (skill.Description) skills.push(skill.Description);
    }
  }

  return { skills, competencies };
}

export async function replaceCourseMappings(
  courseId: number,
  skillIds: number[],
) {
  const del = await supabase
    .from("Courses_Skill_Mapping")
    .delete()
    .eq("Course_Id", courseId);

  if (del.error) throw new Error(del.error.message);

  if (skillIds.length === 0) return;

  const rows = skillIds.map((sid) => ({ Course_Id: courseId, Skill_Id: sid }));

  const ins = await supabase.from("Courses_Skill_Mapping").insert(rows);
  if (ins.error) throw new Error(ins.error.message);
}

// Used when deleting a Skill itself: remove all mappings everywhere
export async function deleteMappingsBySkillId(skillId: number) {
  const del = await supabase
    .from("Courses_Skill_Mapping")
    .delete()
    .eq("Skill_Id", skillId);

  if (del.error) throw new Error(del.error.message);
}
