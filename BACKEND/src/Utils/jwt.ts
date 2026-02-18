import jwt from "jsonwebtoken";

const SECRET = process.env.JWT_SECRET;
if (!SECRET) throw new Error("JWT_SECRET env variable is not set");
const JWT_SECRET: string = SECRET;

const EXPIRES_IN = "8h"; // Token expires after 8 hours

export interface TokenPayload {
  userId: number;
  userType: "Student" | "Faculty/Administrator" | "Administrator";
  userEmail: string;
}

export function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: EXPIRES_IN });
}

export function verifyToken(token: string): TokenPayload {
  return jwt.verify(token, JWT_SECRET) as TokenPayload;
}
