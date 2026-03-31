import { Router, type Request, type Response } from "express";
import { findMajorByName } from "../Models/MajorModel.js";
import {
  getSkillIdsForMajor,
  getSkillsForMajor,
} from "../Models/SkillMajorMappingModel.js";
import { getAllSkillsAndCompetencies } from "../Models/SkillsModel.js";

export const autofillRouter = Router();

autofillRouter.get("/skills-dataset", async (req: Request, res: Response) => {
  try {
    const scopeRaw = (req.query.scope as string | undefined)
      ?.trim()
      .toLowerCase();
    const scope: "major" | "all" = scopeRaw === "all" ? "all" : "major";

    // MAJOR scope
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

    // ALL scope (optionally with majorMatch flags if major is provided)
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

    return res.json({
      scope,
      major,
      skills: tag(all.skills),
      competencies: tag(all.competencies),
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return res.status(500).json({ error: msg });
  }
});
