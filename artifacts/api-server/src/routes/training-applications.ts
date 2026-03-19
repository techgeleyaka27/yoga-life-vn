import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { trainingApplicationsTable } from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";
import { requireAuth } from "../lib/auth.js";

const router: IRouter = Router();

router.post("/training-applications", async (req, res) => {
  try {
    const { fullName, email, phone, program, message } = req.body;
    if (!fullName || !email || !phone || !program) {
      res.status(400).json({ error: "Full name, email, phone and program are required" });
      return;
    }
    const [app] = await db.insert(trainingApplicationsTable).values({
      fullName: fullName.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      program,
      message: message?.trim() || null,
      status: "new",
    }).returning();
    res.status(201).json({ success: true, id: app.id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/training-applications", requireAuth, async (req, res) => {
  try {
    const apps = await db.select().from(trainingApplicationsTable).orderBy(desc(trainingApplicationsTable.createdAt));
    res.json({ applications: apps, total: apps.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/training-applications/:id/status", requireAuth, async (req, res) => {
  try {
    const { status } = req.body;
    if (!["new", "contacted", "enrolled", "declined"].includes(status)) {
      res.status(400).json({ error: "Invalid status" });
      return;
    }
    await db.update(trainingApplicationsTable)
      .set({ status })
      .where(eq(trainingApplicationsTable.id, Number(req.params.id)));
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/training-applications/:id", requireAuth, async (req, res) => {
  try {
    await db.delete(trainingApplicationsTable).where(eq(trainingApplicationsTable.id, Number(req.params.id)));
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
