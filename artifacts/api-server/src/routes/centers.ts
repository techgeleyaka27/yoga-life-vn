import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { centersTable, usersTable, enrollmentsTable, membershipsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "../lib/auth.js";

const router: IRouter = Router();

async function getMemberCount(centerId: number): Promise<number> {
  const memberships = await db.select().from(membershipsTable).where(eq(membershipsTable.centerId, centerId));
  const membershipIds = memberships.map(m => m.id);
  if (membershipIds.length === 0) return 0;
  const enrollments = await db.select().from(enrollmentsTable);
  return enrollments.filter(e => membershipIds.includes(e.membershipId) && e.status === "active").length;
}

router.get("/centers", async (_req, res) => {
  try {
    const centers = await db.select().from(centersTable);
    const users = await db.select().from(usersTable);
    const userMap = new Map(users.map(u => [u.id, u.fullName]));

    const result = await Promise.all(centers.map(async c => ({
      id: c.id,
      name: c.name,
      address: c.address,
      city: c.city,
      phone: c.phone,
      email: c.email,
      description: c.description,
      imageUrl: c.imageUrl,
      adminId: c.adminId,
      adminName: c.adminId ? userMap.get(c.adminId) ?? null : null,
      memberCount: await getMemberCount(c.id),
      createdAt: c.createdAt.toISOString(),
    })));

    res.json({ centers: result, total: result.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/centers", requireAuth, async (req, res) => {
  try {
    const { name, address, city, phone, email, description, imageUrl } = req.body;
    if (!name || !address || !city || !phone || !email) {
      res.status(400).json({ error: "Required fields missing" });
      return;
    }
    const [center] = await db.insert(centersTable).values({
      name, address, city, phone, email,
      description: description ?? null,
      imageUrl: imageUrl ?? null,
    }).returning();
    res.status(201).json({
      id: center.id,
      name: center.name,
      address: center.address,
      city: center.city,
      phone: center.phone,
      email: center.email,
      description: center.description,
      imageUrl: center.imageUrl,
      adminId: center.adminId,
      adminName: null,
      memberCount: 0,
      createdAt: center.createdAt.toISOString(),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/centers/:id", async (req, res) => {
  try {
    const [center] = await db.select().from(centersTable).where(eq(centersTable.id, Number(req.params.id))).limit(1);
    if (!center) {
      res.status(404).json({ error: "Center not found" });
      return;
    }
    let adminName = null;
    if (center.adminId) {
      const [admin] = await db.select().from(usersTable).where(eq(usersTable.id, center.adminId)).limit(1);
      adminName = admin?.fullName ?? null;
    }
    res.json({
      id: center.id,
      name: center.name,
      address: center.address,
      city: center.city,
      phone: center.phone,
      email: center.email,
      description: center.description,
      imageUrl: center.imageUrl,
      adminId: center.adminId,
      adminName,
      memberCount: await getMemberCount(center.id),
      createdAt: center.createdAt.toISOString(),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/centers/:id", requireAuth, async (req, res) => {
  try {
    const { name, address, city, phone, email, description, imageUrl } = req.body;
    const [center] = await db.update(centersTable)
      .set({
        ...(name && { name }),
        ...(address && { address }),
        ...(city && { city }),
        ...(phone && { phone }),
        ...(email && { email }),
        ...(description !== undefined && { description }),
        ...(imageUrl !== undefined && { imageUrl }),
      })
      .where(eq(centersTable.id, Number(req.params.id)))
      .returning();
    if (!center) {
      res.status(404).json({ error: "Center not found" });
      return;
    }
    res.json({
      id: center.id,
      name: center.name,
      address: center.address,
      city: center.city,
      phone: center.phone,
      email: center.email,
      description: center.description,
      imageUrl: center.imageUrl,
      adminId: center.adminId,
      adminName: null,
      memberCount: await getMemberCount(center.id),
      createdAt: center.createdAt.toISOString(),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/centers/:id", requireAuth, async (req, res) => {
  try {
    await db.delete(centersTable).where(eq(centersTable.id, Number(req.params.id)));
    res.json({ message: "Center deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/centers/:id/assign-admin", requireAuth, async (req, res) => {
  try {
    const { userId } = req.body;
    const centerId = Number(req.params.id);
    await db.update(centersTable).set({ adminId: userId }).where(eq(centersTable.id, centerId));
    await db.update(usersTable).set({ role: "center_admin", centerId }).where(eq(usersTable.id, userId));
    res.json({ message: "Admin assigned successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
