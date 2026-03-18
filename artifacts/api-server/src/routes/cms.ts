import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { siteSettingsTable, onlineClassesContentTable, teachersContentTable, heroContentTable } from "@workspace/db/schema";
import { eq, asc } from "drizzle-orm";
import { requireAuth } from "../lib/auth.js";
import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";

const router: IRouter = Router();

const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || ".jpg";
    const name = crypto.randomBytes(12).toString("hex") + ext;
    cb(null, name);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    cb(null, allowed.includes(file.mimetype));
  },
});

// ─── File Upload ──────────────────────────────────────────────────────────────

router.post("/cms/upload", requireAuth, upload.single("file"), (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: "No file uploaded or invalid file type" });
    return;
  }
  // Return URL accessible via /api/uploads/:filename
  const url = `/api/uploads/${req.file.filename}`;
  res.json({ url, filename: req.file.filename });
});

// ─── Site Settings ────────────────────────────────────────────────────────────

router.get("/cms/settings", async (_req, res) => {
  try {
    const rows = await db.select().from(siteSettingsTable);
    const settings: Record<string, string> = {};
    rows.forEach(r => { settings[r.key] = r.value; });
    res.json({ settings });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/cms/settings", requireAuth, async (req, res) => {
  try {
    const { settings } = req.body as { settings: Record<string, string> };
    for (const [key, value] of Object.entries(settings)) {
      const existing = await db.select().from(siteSettingsTable).where(eq(siteSettingsTable.key, key)).limit(1);
      if (existing.length > 0) {
        await db.update(siteSettingsTable).set({ value, updatedAt: new Date() }).where(eq(siteSettingsTable.key, key));
      } else {
        await db.insert(siteSettingsTable).values({ key, value });
      }
    }
    const rows = await db.select().from(siteSettingsTable);
    const result: Record<string, string> = {};
    rows.forEach(r => { result[r.key] = r.value; });
    res.json({ settings: result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Online Classes Content ───────────────────────────────────────────────────

router.get("/cms/online-classes", async (_req, res) => {
  try {
    const rows = await db.select().from(onlineClassesContentTable).orderBy(asc(onlineClassesContentTable.displayOrder), asc(onlineClassesContentTable.id));
    res.json({ classes: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/cms/online-classes", requireAuth, async (req, res) => {
  try {
    const { title, description, instructor, duration, level, category, thumbnailUrl, videoId, featured, isActive, displayOrder } = req.body;
    const [row] = await db.insert(onlineClassesContentTable).values({
      title, description, instructor,
      duration: duration || "45 min",
      level: level || "all_levels",
      category: category || "Hatha",
      thumbnailUrl, videoId,
      featured: featured ?? false,
      isActive: isActive ?? true,
      displayOrder: displayOrder ?? 0,
    }).returning();
    res.status(201).json(row);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/cms/online-classes/:id", requireAuth, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { title, description, instructor, duration, level, category, thumbnailUrl, videoId, featured, isActive, displayOrder } = req.body;
    const [row] = await db.update(onlineClassesContentTable)
      .set({ title, description, instructor, duration, level, category, thumbnailUrl, videoId, featured, isActive, displayOrder, updatedAt: new Date() })
      .where(eq(onlineClassesContentTable.id, id))
      .returning();
    if (!row) return res.status(404).json({ error: "Not found" });
    res.json(row);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/cms/online-classes/:id", requireAuth, async (req, res) => {
  try {
    await db.delete(onlineClassesContentTable).where(eq(onlineClassesContentTable.id, Number(req.params.id)));
    res.json({ message: "Deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Teachers Content ─────────────────────────────────────────────────────────

router.get("/cms/teachers", async (_req, res) => {
  try {
    const rows = await db.select().from(teachersContentTable).orderBy(asc(teachersContentTable.displayOrder), asc(teachersContentTable.id));
    const teachers = rows.map(t => ({
      ...t,
      styles: (() => { try { return JSON.parse(t.styles); } catch { return []; } })(),
    }));
    res.json({ teachers });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/cms/teachers", requireAuth, async (req, res) => {
  try {
    const { name, title, bio, certifications, styles, photoUrl, displayOrder, isActive } = req.body;
    const [row] = await db.insert(teachersContentTable).values({
      name, title, bio,
      certifications: certifications || "",
      styles: JSON.stringify(Array.isArray(styles) ? styles : []),
      photoUrl: photoUrl ?? null,
      displayOrder: displayOrder ?? 0,
      isActive: isActive ?? true,
    }).returning();
    res.status(201).json({ ...row, styles: (() => { try { return JSON.parse(row.styles); } catch { return []; } })() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/cms/teachers/:id", requireAuth, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { name, title, bio, certifications, styles, photoUrl, displayOrder, isActive } = req.body;
    const [row] = await db.update(teachersContentTable)
      .set({
        name, title, bio,
        certifications: certifications ?? "",
        styles: JSON.stringify(Array.isArray(styles) ? styles : []),
        photoUrl: photoUrl ?? null,
        displayOrder: displayOrder ?? 0,
        isActive: isActive ?? true,
        updatedAt: new Date(),
      })
      .where(eq(teachersContentTable.id, id))
      .returning();
    if (!row) return res.status(404).json({ error: "Not found" });
    res.json({ ...row, styles: (() => { try { return JSON.parse(row.styles); } catch { return []; } })() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/cms/teachers/:id", requireAuth, async (req, res) => {
  try {
    await db.delete(teachersContentTable).where(eq(teachersContentTable.id, Number(req.params.id)));
    res.json({ message: "Deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Hero image update ────────────────────────────────────────────────────────

router.put("/cms/hero-image", requireAuth, async (req, res) => {
  try {
    const { imageUrl } = req.body;
    const [existing] = await db.select().from(heroContentTable).limit(1);
    if (existing) {
      await db.update(heroContentTable).set({ imageUrl, updatedAt: new Date() }).where(eq(heroContentTable.id, existing.id));
    } else {
      await db.insert(heroContentTable).values({
        headline: "Find Your Inner Peace",
        subheadline: "Join YOGA LIFE VN for a transformative yoga journey.",
        ctaText: "Start Your Journey",
        imageUrl,
      });
    }
    res.json({ imageUrl });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
