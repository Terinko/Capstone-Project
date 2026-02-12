//Tempary revist when doing login and authentication backend.
import type { Request, Response, NextFunction } from "express";

export function RequireAdmin(
  _req: Request,
  _res: Response,
  next: NextFunction,
) {
  // later: validate session/JWT/DB role check
  next();
}
