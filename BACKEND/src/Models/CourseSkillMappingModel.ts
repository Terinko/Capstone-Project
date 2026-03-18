import { supabase } from "../Database/supabaseClient.js";

// Pull course + mapped skills (with Type so we can split skills vs competencies)
export async function getCourseMappings(courseId: number) {
  const { data, error } = await supabase
    .from("Courses_Skill_Mapping")
    .select("Skills(Skill_name, Type)")
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
      if (skill.Skill_name) skills.push(skill.Skill_name);
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

export async function replaceMappingsForCourseIds(
  courseIds: number[],
  skillIds: number[],
) {
  const uniqueCourseIds = Array.from(
    new Set(courseIds.map(Number).filter((n) => Number.isInteger(n) && n > 0)),
  );

  if (uniqueCourseIds.length === 0) return;

  const del = await supabase
    .from("Courses_Skill_Mapping")
    .delete()
    .in("Course_Id", uniqueCourseIds);

  if (del.error) throw new Error(del.error.message);

  if (skillIds.length === 0) return;

  const uniqueSkillIds = Array.from(
    new Set(skillIds.map(Number).filter((n) => Number.isInteger(n) && n > 0)),
  );

  const rows = uniqueCourseIds.flatMap((courseId) =>
    uniqueSkillIds.map((skillId) => ({
      Course_Id: courseId,
      Skill_Id: skillId,
    })),
  );

  if (rows.length === 0) return;

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

export async function isCourseFullyMapped(courseId: number) {
  const { data, error } = await supabase
    .from("Courses_Skill_Mapping")
    .select(
      `
      Skill_Id,
      Skills(Type)
    `,
    )
    .eq("Course_Id", courseId);

  if (error) throw new Error(error.message);
  if (!data || data.length === 0) return false;

  let hasSkill = false;
  let hasCompetency = false;

  for (const row of data as any[]) {
    const type = row.Skills?.[0]?.Type;

    if (type === false) hasSkill = true;
    if (type === true) hasCompetency = true;

    if (hasSkill && hasCompetency) return true;
  }

  return false;
}
