import { type Request, type Response } from "express";
import { findMajorByName } from "../Models/MajorModel.js";
import {
  getSkillIdsForMajor,
  getSkillsForMajor,
} from "../Models/SkillMajorMappingModel.js";
import { getAllSkillsAndCompetencies } from "../Models/SkillsModel.js";

export const getSkillsDataset = async (req: Request, res: Response) => {
  try {
    const scopeRaw = (req.query.scope as string | undefined)
      ?.trim()
      .toLowerCase();
    const scope: "major" | "all" = scopeRaw === "all" ? "all" : "major";

    if (scope === "major") {
      const majorName = (req.query.major as string | undefined)?.trim();
      if (!majorName) {
        return res.status(400).json({
          error: "Missing required query param: major (when scope=major)",
        });
      }

      const major = await findMajorByName(majorName);
      if (!major)
        return res.status(404).json({ error: `Major not found: ${majorName}` });

      const rows = await getSkillsForMajor(major.id);
      const skills = rows.filter((x) => x.Type === false);
      const competencies = rows.filter((x) => x.Type === true);

      return res.json({ scope, major, skills, competencies });
    }

    const majorName = (req.query.major as string | undefined)?.trim();
    let major: { id: number; name: string } | null = null;
    let majorSet: Set<number> | null = null;

    if (majorName) {
      major = await findMajorByName(majorName);
      if (major) {
        majorSet = new Set(await getSkillIdsForMajor(major.id));
      }
    }

    const all = await getAllSkillsAndCompetencies();
    const tag = (arr: any[]) =>
      arr.map((s) => ({
        ...s,
        majorMatch: majorSet ? majorSet.has(s.Skill_Id) : false,
      }));

    const skills = tag(all.skills);
    const competencies = tag(all.competencies);

    return res.json({ scope, major, skills, competencies });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    res.status(500).json({ error: msg });
  }
};
