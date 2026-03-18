import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { membershipsTable, centersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "../lib/auth.js";

const router: IRouter = Router();

const mapMembership = (m: any, centerName: string) => ({
  id: m.id, name: m.name, description: m.description, price: m.price,
  durationDays: m.durationDays, classesPerWeek: m.classesPerWeek,
  centerId: m.centerId, centerName,
  features: JSON.parse(m.features || "[]"),
  isActive: m.isActive, type: m.type ?? "offline",
  createdAt: m.createdAt.toISOString(),
});

router.get("/memberships", async (req, res) => {
  try {
    const { centerId } = req.query;
    let memberships = await db.select().from(membershipsTable);
    if (centerId) memberships = memberships.filter(m => m.centerId === Number(centerId));

    const centers = await db.select().from(centersTable);
    const centerMap = new Map(centers.map(c => [c.id, c.name]));

    const result = memberships.map(m => mapMembership(m, centerMap.get(m.centerId) ?? ""));

    res.json({ memberships: result, total: result.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/memberships", requireAuth, async (req, res) => {
  try {
    const { name, description, price, durationDays, classesPerWeek, centerId, features, isActive, type } = req.body;
    const [m] = await db.insert(membershipsTable).values({
      name, description: description ?? null, price, durationDays,
      classesPerWeek: classesPerWeek ?? null,
      centerId, features: JSON.stringify(features ?? []),
      isActive: isActive !== undefined ? isActive : true,
      type: type ?? "offline",
    }).returning();
    const [center] = await db.select().from(centersTable).where(eq(centersTable.id, m.centerId)).limit(1);
    res.status(201).json(mapMembership(m, center?.name ?? ""));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/memberships/:id", async (req, res) => {
  try {
    const [m] = await db.select().from(membershipsTable).where(eq(membershipsTable.id, Number(req.params.id))).limit(1);
    if (!m) { res.status(404).json({ error: "Not found" }); return; }
    const [center] = await db.select().from(centersTable).where(eq(centersTable.id, m.centerId)).limit(1);
    res.json(mapMembership(m, center?.name ?? ""));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/memberships/:id", requireAuth, async (req, res) => {
  try {
    const { name, description, price, durationDays, classesPerWeek, features, isActive, type } = req.body;
    const [m] = await db.update(membershipsTable)
      .set({
        ...(name && { name }), ...(description !== undefined && { description }),
        ...(price !== undefined && { price }), ...(durationDays !== undefined && { durationDays }),
        ...(classesPerWeek !== undefined && { classesPerWeek }),
        ...(features !== undefined && { features: JSON.stringify(features) }),
        ...(isActive !== undefined && { isActive }),
        ...(type !== undefined && { type }),
      })
      .where(eq(membershipsTable.id, Number(req.params.id))).returning();
    if (!m) { res.status(404).json({ error: "Not found" }); return; }
    const [center] = await db.select().from(centersTable).where(eq(centersTable.id, m.centerId)).limit(1);
    res.json(mapMembership(m, center?.name ?? ""));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/memberships/:id", requireAuth, async (req, res) => {
  try {
    await db.delete(membershipsTable).where(eq(membershipsTable.id, Number(req.params.id)));
    res.json({ message: "Deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
