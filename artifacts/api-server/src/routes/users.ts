import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { usersTable, centersTable } from "@workspace/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { requireAuth, hashPassword } from "../lib/auth.js";

const router: IRouter = Router();

router.get("/users", requireAuth, async (req, res) => {
  try {
    const { role, centerId } = req.query;
    let users = await db.select().from(usersTable);

    if (role) users = users.filter(u => u.role === role);
    if (centerId) users = users.filter(u => u.centerId === Number(centerId));

    const centers = await db.select().from(centersTable);
    const centerMap = new Map(centers.map(c => [c.id, c.name]));

    const result = users.map(u => ({
      id: u.id,
      email: u.email,
      fullName: u.fullName,
      phone: u.phone,
      role: u.role,
      centerId: u.centerId,
      centerName: u.centerId ? centerMap.get(u.centerId) ?? null : null,
      avatarUrl: u.avatarUrl,
      createdAt: u.createdAt.toISOString(),
    }));

    res.json({ users: result, total: result.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/users", requireAuth, async (req, res) => {
  try {
    const { fullName, email, password, role, centerId, phone } = req.body;
    if (!fullName || !email || !password) {
      res.status(400).json({ error: "Full name, email, and password are required" });
      return;
    }
    const [existing] = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
    if (existing) {
      res.status(400).json({ error: "An account with this email already exists" });
      return;
    }
    const [user] = await db.insert(usersTable).values({
      email,
      passwordHash: hashPassword(password),
      fullName,
      phone: phone || null,
      role: role || "student",
      centerId: centerId ? Number(centerId) : null,
    }).returning();
    let centerName = null;
    if (user.centerId) {
      const [center] = await db.select().from(centersTable).where(eq(centersTable.id, user.centerId)).limit(1);
      centerName = center?.name ?? null;
    }
    res.status(201).json({
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      phone: user.phone,
      role: user.role,
      centerId: user.centerId,
      centerName,
      createdAt: user.createdAt.toISOString(),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/users/:id", requireAuth, async (req, res) => {
  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, Number(req.params.id))).limit(1);
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    let centerName = null;
    if (user.centerId) {
      const [center] = await db.select().from(centersTable).where(eq(centersTable.id, user.centerId)).limit(1);
      centerName = center?.name ?? null;
    }
    res.json({
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      phone: user.phone,
      role: user.role,
      centerId: user.centerId,
      centerName,
      avatarUrl: user.avatarUrl,
      createdAt: user.createdAt.toISOString(),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/users/:id", requireAuth, async (req, res) => {
  try {
    const { fullName, phone, role, centerId, avatarUrl } = req.body;
    const [user] = await db.update(usersTable)
      .set({
        ...(fullName && { fullName }),
        ...(phone !== undefined && { phone }),
        ...(role && { role }),
        ...(centerId !== undefined && { centerId }),
        ...(avatarUrl !== undefined && { avatarUrl }),
      })
      .where(eq(usersTable.id, Number(req.params.id)))
      .returning();
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

router.delete("/users/:id", requireAuth, async (req, res) => {
  try {
    await db.delete(usersTable).where(eq(usersTable.id, Number(req.params.id)));
    res.json({ message: "User deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
