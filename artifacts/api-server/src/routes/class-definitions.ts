import { Router } from "express";
import { db } from "@workspace/db";
import { classDefinitionsTable } from "@workspace/db/schema";
import { eq, asc } from "drizzle-orm";
import { requireAuth } from "../lib/auth.js";

const router = Router();

router.get("/class-definitions", async (_req, res) => {
  try {
    const defs = await db
      .select()
      .from(classDefinitionsTable)
      .orderBy(asc(classDefinitionsTable.displayOrder), asc(classDefinitionsTable.name));
    const parsed = defs.map(d => ({
      ...d,
      benefits: (() => { try { return JSON.parse(d.benefits); } catch { return []; } })(),
    }));
    res.json({ classDefinitions: parsed, total: parsed.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/class-definitions", requireAuth, async (req, res) => {
  try {
    const { name, description, defaultDuration, level, category, color, imageUrl, benefits, isActive, displayOrder } = req.body;
    const [def] = await db.insert(classDefinitionsTable).values({
      name,
      description: description || "",
      defaultDuration: defaultDuration || 60,
      level: level || "all_levels",
      category: category || "Hatha",
      color: color || "#4a7c59",
      imageUrl: imageUrl || null,
      benefits: Array.isArray(benefits) ? JSON.stringify(benefits) : (benefits || "[]"),
      isActive: isActive !== false,
      displayOrder: displayOrder || 0,
    }).returning();
    res.json({ classDefinition: { ...def, benefits: JSON.parse(def.benefits) } });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/class-definitions/:id", requireAuth, async (req, res) => {
  try {
    const { name, description, defaultDuration, level, category, color, imageUrl, benefits, isActive, displayOrder } = req.body;
    const [def] = await db.update(classDefinitionsTable).set({
      ...(name !== undefined && { name }),
      ...(description !== undefined && { description }),
      ...(defaultDuration !== undefined && { defaultDuration }),
      ...(level !== undefined && { level }),
      ...(category !== undefined && { category }),
      ...(color !== undefined && { color }),
      ...(imageUrl !== undefined && { imageUrl }),
      ...(benefits !== undefined && { benefits: Array.isArray(benefits) ? JSON.stringify(benefits) : benefits }),
      ...(isActive !== undefined && { isActive }),
      ...(displayOrder !== undefined && { displayOrder }),
      updatedAt: new Date(),
    }).where(eq(classDefinitionsTable.id, Number(req.params.id))).returning();
    if (!def) return res.status(404).json({ error: "Not found" });
    res.json({ classDefinition: { ...def, benefits: (() => { try { return JSON.parse(def.benefits); } catch { return []; } })() } });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/class-definitions/:id", requireAuth, async (req, res) => {
  try {
    await db.delete(classDefinitionsTable).where(eq(classDefinitionsTable.id, Number(req.params.id)));
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
