import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { classesTable, centersTable, instructorsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "../lib/auth.js";

const router: IRouter = Router();

router.get("/classes", async (req, res) => {
  try {
    const { centerId, instructorId } = req.query;
    let classes = await db.select().from(classesTable);
    if (centerId) classes = classes.filter(c => c.centerId === Number(centerId));
    if (instructorId) classes = classes.filter(c => c.instructorId === Number(instructorId));

    const centers = await db.select().from(centersTable);
    const instructors = await db.select().from(instructorsTable);
    const centerMap = new Map(centers.map(c => [c.id, c.name]));
    const instructorMap = new Map(instructors.map(i => [i.id, i.fullName]));

    const result = classes.map(c => ({
      id: c.id, name: c.name, description: c.description,
      instructorId: c.instructorId, instructorName: c.instructorId ? instructorMap.get(c.instructorId) ?? null : null,
      centerId: c.centerId, centerName: centerMap.get(c.centerId) ?? "",
      dayOfWeek: c.dayOfWeek, startTime: c.startTime, endTime: c.endTime,
      capacity: c.capacity, level: c.level, isActive: c.isActive,
      createdAt: c.createdAt.toISOString(),
    }));
    res.json({ classes: result, total: result.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/classes", requireAuth, async (req, res) => {
  try {
    const { name, description, instructorId, centerId, dayOfWeek, startTime, endTime, capacity, level, isActive } = req.body;
    const [c] = await db.insert(classesTable).values({
      name, description: description ?? null, instructorId: instructorId ?? null,
      centerId, dayOfWeek, startTime, endTime, capacity,
      level: level ?? "all_levels", isActive: isActive !== undefined ? isActive : true,
    }).returning();
    const [center] = await db.select().from(centersTable).where(eq(centersTable.id, c.centerId)).limit(1);
    res.status(201).json({
      id: c.id, name: c.name, description: c.description,
      instructorId: c.instructorId, instructorName: null,
      centerId: c.centerId, centerName: center?.name ?? "",
      dayOfWeek: c.dayOfWeek, startTime: c.startTime, endTime: c.endTime,
      capacity: c.capacity, level: c.level, isActive: c.isActive,
      createdAt: c.createdAt.toISOString(),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/classes/:id", requireAuth, async (req, res) => {
  try {
    const { name, description, instructorId, dayOfWeek, startTime, endTime, capacity, level, isActive } = req.body;
    const [c] = await db.update(classesTable)
      .set({
        ...(name && { name }), ...(description !== undefined && { description }),
        ...(instructorId !== undefined && { instructorId }),
        ...(dayOfWeek && { dayOfWeek }), ...(startTime && { startTime }),
        ...(endTime && { endTime }), ...(capacity !== undefined && { capacity }),
        ...(level && { level }), ...(isActive !== undefined && { isActive }),
      })
      .where(eq(classesTable.id, Number(req.params.id))).returning();
    if (!c) { res.status(404).json({ error: "Not found" }); return; }
    const [center] = await db.select().from(centersTable).where(eq(centersTable.id, c.centerId)).limit(1);
    res.json({
      id: c.id, name: c.name, description: c.description,
      instructorId: c.instructorId, instructorName: null,
      centerId: c.centerId, centerName: center?.name ?? "",
      dayOfWeek: c.dayOfWeek, startTime: c.startTime, endTime: c.endTime,
      capacity: c.capacity, level: c.level, isActive: c.isActive,
      createdAt: c.createdAt.toISOString(),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/classes/:id", requireAuth, async (req, res) => {
  try {
    await db.delete(classesTable).where(eq(classesTable.id, Number(req.params.id)));
    res.json({ message: "Deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
