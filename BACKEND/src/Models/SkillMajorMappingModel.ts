import { supabase } from "../Database/supabaseClient.js";

export async function getSkillIdsForMajor(majorId: number): Promise<number[]> {
  const { data, error } = await supabase
    .from("Skill_Major_Mapping")
    .select("Skill_id")
    .eq("Major_id", majorId);

  if (error) throw new Error(error.message);
  return (data ?? []).map((r: any) => r.Skill_id);
}

/**
 * Returns Skills rows for a major (joined through Skill_Major_Mapping).
 * Adds majorMatch: true.
 */
export async function getSkillsForMajor(
  majorId: number,
): Promise<
  Array<{
    Skill_Id: number;
    Skill_name: string;
    Type: boolean;
    majorMatch: boolean;
  }>
> {
  const { data, error } = await supabase
    .from("Skill_Major_Mapping")
    .select("Skill_id, Skills(Skill_Id, Skill_name, Type)")
    .eq("Major_id", majorId);

  if (error) throw new Error(error.message);

  const flattened = (data ?? [])
    .map((row: any) => row.Skills)
    .filter(Boolean)
    .map((s: any) => ({
      Skill_Id: s.Skill_Id,
      Skill_name: s.Skill_name,
      Type: s.Type,
      majorMatch: true,
    }));

  // dedup safety
  const seen = new Set<number>();
  return flattened.filter((s) => {
    if (seen.has(s.Skill_Id)) return false;
    seen.add(s.Skill_Id);
    return true;
  });
}
