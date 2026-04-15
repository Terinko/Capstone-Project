import { Router } from "express";
import { getSkillsDataset } from "../Controllers/AutofillController.js";

export const autofillRouter = Router();

autofillRouter.get("/skills-dataset", getSkillsDataset);
