import type { Request, Response, NextFunction } from "express";
import { verifyToken } from "../Utils/jwt.js";

// Extend Express Request to carry the verified payload
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: number;
        userType: string;
        userEmail: string;
      };
    }
  }
}

export function RequireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "No token provided" });
  }

  const token = authHeader.slice(7);

  try {
    req.user = verifyToken(token); // Verified — attaches payload to request
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

export function RequireAdmin(req: Request, res: Response, next: NextFunction) {
  RequireAuth(req, res, () => {
    if (req.user?.userType !== "Administrator") {
      return res.status(403).json({ error: "Admin access required" });
    }
    next();
  });
}
