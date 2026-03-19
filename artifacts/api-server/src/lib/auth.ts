import { Request, Response, NextFunction } from "express";
import crypto from "crypto";

const SECRET = "yoga_life_vn_secret_2025";

export function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password + "yoga_life_vn_salt").digest("hex");
}

export function generateToken(userId: number): string {
  const payload = Buffer.from(JSON.stringify({ uid: userId, iat: Date.now() })).toString("base64url");
  const sig = crypto.createHmac("sha256", SECRET).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

export function verifyToken(token: string): number | undefined {
  try {
    const dot = token.lastIndexOf(".");
    if (dot === -1) return undefined;
    const payload = token.slice(0, dot);
    const sig = token.slice(dot + 1);
    const expected = crypto.createHmac("sha256", SECRET).update(payload).digest("base64url");
    const sigBuf = Buffer.from(sig);
    const expBuf = Buffer.from(expected);
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) return undefined;
    const data = JSON.parse(Buffer.from(payload, "base64url").toString());
    return typeof data.uid === "number" ? data.uid : undefined;
  } catch {
    return undefined;
  }
}

export function createSession(_token: string, _userId: number): void {}
export function getSession(_token: string): number | undefined { return undefined; }
export function deleteSession(_token: string): void {}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const token = authHeader.slice(7);
  const userId = verifyToken(token);
  if (!userId) {
    res.status(401).json({ error: "Invalid or expired token" });
    return;
  }
  (req as any).userId = userId;
  (req as any).token = token;
  next();
}
