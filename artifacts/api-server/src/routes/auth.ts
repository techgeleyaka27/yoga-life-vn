import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { usersTable, passwordResetsTable } from "@workspace/db/schema";
import { eq, and, gt } from "drizzle-orm";
import crypto from "crypto";
import { hashPassword, generateToken, createSession, getSession, deleteSession, requireAuth } from "../lib/auth.js";
import { sendEmail } from "../lib/gmail.js";

const router: IRouter = Router();

router.post("/auth/login", async (req, res) => {
  try {
    const body = req.body || {};
    const email = body.email || body.data?.email;
    const password = body.password || body.data?.password;
    if (!email || !password) {
      res.status(400).json({ error: "Email and password required" });
      return;
    }
    const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
    if (!user || user.passwordHash !== hashPassword(password)) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }
    const token = generateToken(user.id);
    createSession(token, user.id);
    res.json({
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        phone: user.phone,
        role: user.role,
        centerId: user.centerId,
        avatarUrl: user.avatarUrl,
        createdAt: user.createdAt.toISOString(),
      },
      token,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/auth/register", async (req, res) => {
  try {
    const body = req.body || {};
    const { email, password, fullName, phone } = body;
    if (!email || !password || !fullName) {
      res.status(400).json({ error: "Email, password, and full name required" });
      return;
    }
    const [existing] = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
    if (existing) {
      res.status(400).json({ error: "Email already registered" });
      return;
    }
    const [user] = await db.insert(usersTable).values({
      email,
      passwordHash: hashPassword(password),
      fullName,
      phone: phone || null,
      role: "student",
    }).returning();
    const token = generateToken(user.id);
    createSession(token, user.id);
    res.status(201).json({
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        phone: user.phone,
        role: user.role,
        centerId: user.centerId,
        avatarUrl: user.avatarUrl,
        createdAt: user.createdAt.toISOString(),
      },
      token,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/auth/me", requireAuth, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    res.json({
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      phone: user.phone,
      role: user.role,
      centerId: user.centerId,
      avatarUrl: user.avatarUrl,
      createdAt: user.createdAt.toISOString(),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/auth/logout", requireAuth, (req, res) => {
  const token = (req as any).token;
  deleteSession(token);
  res.json({ message: "Logged out successfully" });
});

// POST /auth/forgot-password — send reset email
router.post("/auth/forgot-password", async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!email) {
      res.status(400).json({ error: "Email required" });
      return;
    }

    // Always return success to avoid email enumeration
    res.json({ message: "If an account exists, a reset link has been sent." });

    // Async: check user + send email
    const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
    if (!user) return;

    // Generate a secure token
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Invalidate old tokens for this email
    await db.delete(passwordResetsTable).where(eq(passwordResetsTable.email, email));

    // Store new token
    await db.insert(passwordResetsTable).values({ email, token, expiresAt });

    // Determine app URL for the reset link
    const appUrl = process.env.REPLIT_DEV_DOMAIN
      ? `https://${process.env.REPLIT_DEV_DOMAIN}`
      : "https://yoga-life-international.replit.app";

    const resetLink = `${appUrl}/reset-password?token=${token}`;

    await sendEmail({
      to: user.email,
      subject: "Reset your YOGA LIFE INTERNATIONAL password",
      html: `
        <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;background:#fff;">
          <h2 style="font-family:Georgia,serif;color:#1a4a3a;margin-bottom:8px;">Reset Your Password</h2>
          <p style="color:#555;margin-bottom:24px;">Hi ${user.fullName},<br>We received a request to reset your password for your YOGA LIFE INTERNATIONAL account.</p>
          <a href="${resetLink}" style="display:inline-block;padding:14px 28px;background:#1a4a3a;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:15px;">Reset Password</a>
          <p style="color:#888;font-size:13px;margin-top:24px;">This link expires in <strong>1 hour</strong>. If you didn't request this, you can safely ignore this email.</p>
          <hr style="border:none;border-top:1px solid #eee;margin:24px 0;"/>
          <p style="color:#aaa;font-size:12px;">YOGA LIFE INTERNATIONAL · Bringing wellness to Vietnam</p>
        </div>
      `,
    });
  } catch (err) {
    console.error("Forgot password error:", err);
    // Don't expose error to client (already responded)
  }
});

// POST /auth/reset-password — verify token & set new password
router.post("/auth/reset-password", async (req, res) => {
  try {
    const { token, newPassword } = req.body || {};
    if (!token || !newPassword) {
      res.status(400).json({ error: "Token and new password required" });
      return;
    }
    if (newPassword.length < 8) {
      res.status(400).json({ error: "Password must be at least 8 characters" });
      return;
    }

    const now = new Date();
    const [reset] = await db
      .select()
      .from(passwordResetsTable)
      .where(
        and(
          eq(passwordResetsTable.token, token),
          eq(passwordResetsTable.used, false),
          gt(passwordResetsTable.expiresAt, now)
        )
      )
      .limit(1);

    if (!reset) {
      res.status(400).json({ error: "Invalid or expired reset link. Please request a new one." });
      return;
    }

    // Update user password
    await db.update(usersTable)
      .set({ passwordHash: hashPassword(newPassword) })
      .where(eq(usersTable.email, reset.email));

    // Mark token as used
    await db.update(passwordResetsTable)
      .set({ used: true })
      .where(eq(passwordResetsTable.id, reset.id));

    res.json({ message: "Password reset successfully. You can now log in." });
  } catch (err) {
    console.error("Reset password error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /auth/verify-reset-token — check if token is valid (for frontend preflight)
router.get("/auth/verify-reset-token", async (req, res) => {
  try {
    const { token } = req.query as { token?: string };
    if (!token) {
      res.status(400).json({ valid: false });
      return;
    }
    const now = new Date();
    const [reset] = await db
      .select()
      .from(passwordResetsTable)
      .where(
        and(
          eq(passwordResetsTable.token, token),
          eq(passwordResetsTable.used, false),
          gt(passwordResetsTable.expiresAt, now)
        )
      )
      .limit(1);
    res.json({ valid: !!reset, email: reset?.email });
  } catch {
    res.status(500).json({ valid: false });
  }
});

export default router;
