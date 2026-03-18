import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { heroContentTable, testimonialsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "../lib/auth.js";

const router: IRouter = Router();

router.get("/content/hero", async (_req, res) => {
  try {
    const [hero] = await db.select().from(heroContentTable).limit(1);
    if (!hero) {
      return res.json({
        headline: "Find Your Inner Peace",
        subheadline: "Join YOGA LIFE VN for a transformative yoga journey. Expert instructors, multiple centers across Vietnam.",
        ctaText: "Start Your Journey",
        imageUrl: null,
      });
    }
    res.json({ headline: hero.headline, subheadline: hero.subheadline, ctaText: hero.ctaText, imageUrl: hero.imageUrl });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/content/hero", requireAuth, async (req, res) => {
  try {
    const { headline, subheadline, ctaText, imageUrl } = req.body;
    const [existing] = await db.select().from(heroContentTable).limit(1);
    if (existing) {
      const [updated] = await db.update(heroContentTable)
        .set({ headline, subheadline, ctaText, imageUrl: imageUrl ?? null, updatedAt: new Date() })
        .where(eq(heroContentTable.id, existing.id)).returning();
      res.json({ headline: updated.headline, subheadline: updated.subheadline, ctaText: updated.ctaText, imageUrl: updated.imageUrl });
    } else {
      const [created] = await db.insert(heroContentTable).values({ headline, subheadline, ctaText, imageUrl: imageUrl ?? null }).returning();
      res.json({ headline: created.headline, subheadline: created.subheadline, ctaText: created.ctaText, imageUrl: created.imageUrl });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/content/testimonials", async (_req, res) => {
  try {
    const testimonials = await db.select().from(testimonialsTable);
    const result = testimonials.map(t => ({
      id: t.id, authorName: t.authorName, authorRole: t.authorRole,
      content: t.content, rating: t.rating, avatarUrl: t.avatarUrl,
      createdAt: t.createdAt.toISOString(),
    }));
    res.json({ testimonials: result, total: result.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/content/testimonials", requireAuth, async (req, res) => {
  try {
    const { authorName, authorRole, content, rating, avatarUrl } = req.body;
    const [t] = await db.insert(testimonialsTable).values({
      authorName, authorRole: authorRole ?? null, content, rating,
      avatarUrl: avatarUrl ?? null,
    }).returning();
    res.status(201).json({
      id: t.id, authorName: t.authorName, authorRole: t.authorRole,
      content: t.content, rating: t.rating, avatarUrl: t.avatarUrl,
      createdAt: t.createdAt.toISOString(),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/content/testimonials/:id", requireAuth, async (req, res) => {
  try {
    await db.delete(testimonialsTable).where(eq(testimonialsTable.id, Number(req.params.id)));
    res.json({ message: "Deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
