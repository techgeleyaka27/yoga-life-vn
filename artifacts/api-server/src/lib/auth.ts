import { Request, Response, NextFunction } from "express";
import crypto from "crypto";

export function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password + "yoga_life_vn_salt").digest("hex");
}

export function generateToken(userId: number): string {
  return crypto.createHash("sha256").update(`${userId}:${Date.now()}:yoga_life_vn_secret`).digest("hex");
}

const sessions = new Map<string, number>();

export function createSession(token: string, userId: number): void {
  sessions.set(token, userId);
}

export function getSession(token: string): number | undefined {
  return sessions.get(token);
}

export function deleteSession(token: string): void {
  sessions.delete(token);
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const token = authHeader.slice(7);
  const userId = getSession(token);
  if (!userId) {
    res.status(401).json({ error: "Invalid or expired token" });
    return;
  }
  (req as any).userId = userId;
  (req as any).token = token;
  next();
}
