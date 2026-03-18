import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { instructorsTable, centersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "../lib/auth.js";

const router: IRouter = Router();

router.get("/instructors", async (req, res) => {
  try {
    const { centerId } = req.query;
    let instructors = await db.select().from(instructorsTable);
    if (centerId) instructors = instructors.filter(i => i.centerId === Number(centerId));

    const centers = await db.select().from(centersTable);
    const centerMap = new Map(centers.map(c => [c.id, c.name]));

    const result = instructors.map(i => ({
      id: i.id, fullName: i.fullName, bio: i.bio,
      specialties: JSON.parse(i.specialties || "[]"),
      experience: i.experience, imageUrl: i.imageUrl,
      centerId: i.centerId, centerName: centerMap.get(i.centerId) ?? "",
      createdAt: i.createdAt.toISOString(),
    }));
    res.json({ instructors: result, total: result.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/instructors", requireAuth, async (req, res) => {
  try {
    const { fullName, bio, specialties, experience, imageUrl, centerId } = req.body;
    const [i] = await db.insert(instructorsTable).values({
      fullName, bio: bio ?? null, specialties: JSON.stringify(specialties ?? []),
      experience: experience ?? null, imageUrl: imageUrl ?? null, centerId,
    }).returning();
    const [center] = await db.select().from(centersTable).where(eq(centersTable.id, i.centerId)).limit(1);
    res.status(201).json({
      id: i.id, fullName: i.fullName, bio: i.bio,
      specialties: JSON.parse(i.specialties || "[]"),
      experience: i.experience, imageUrl: i.imageUrl,
      centerId: i.centerId, centerName: center?.name ?? "",
      createdAt: i.createdAt.toISOString(),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/instructors/:id", requireAuth, async (req, res) => {
  try {
    const { fullName, bio, specialties, experience, imageUrl } = req.body;
    const [i] = await db.update(instructorsTable)
      .set({
        ...(fullName && { fullName }), ...(bio !== undefined && { bio }),
        ...(specialties !== undefined && { specialties: JSON.stringify(specialties) }),
        ...(experience !== undefined && { experience }), ...(imageUrl !== undefined && { imageUrl }),
      })
      .where(eq(instructorsTable.id, Number(req.params.id))).returning();
    if (!i) { res.status(404).json({ error: "Not found" }); return; }
    const [center] = await db.select().from(centersTable).where(eq(centersTable.id, i.centerId)).limit(1);
    res.json({
      id: i.id, fullName: i.fullName, bio: i.bio,
      specialties: JSON.parse(i.specialties || "[]"),
      experience: i.experience, imageUrl: i.imageUrl,
      centerId: i.centerId, centerName: center?.name ?? "",
      createdAt: i.createdAt.toISOString(),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/instructors/:id", requireAuth, async (req, res) => {
  try {
    await db.delete(instructorsTable).where(eq(instructorsTable.id, Number(req.params.id)));
    res.json({ message: "Deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
