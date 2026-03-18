import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { teacherSchedulesTable, instructorsTable, centersTable, classesTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../lib/auth.js";

const router: IRouter = Router();

function formatSchedule(s: any, instrMap: Map<number, string>, centerMap: Map<number, string>) {
  return {
    id: s.id,
    instructorId: s.instructorId,
    instructorName: instrMap.get(s.instructorId) ?? null,
    centerId: s.centerId,
    centerName: centerMap.get(s.centerId) ?? null,
    dayOfWeek: s.dayOfWeek,
    workStart: s.workStart,
    morningEnd: s.morningEnd ?? null,
    eveningStart: s.eveningStart ?? null,
    workEnd: s.workEnd,
    createdAt: s.createdAt?.toISOString?.() ?? null,
  };
}

// List teacher schedules
router.get("/teacher-schedules", async (req, res) => {
  try {
    const { instructorId, centerId } = req.query;
    let schedules = await db.select().from(teacherSchedulesTable);
    if (instructorId) schedules = schedules.filter(s => s.instructorId === Number(instructorId));
    if (centerId) schedules = schedules.filter(s => s.centerId === Number(centerId));

    const instructors = await db.select().from(instructorsTable);
    const centers = await db.select().from(centersTable);
    const instrMap = new Map(instructors.map(i => [i.id, i.fullName]));
    const centerMap = new Map(centers.map(c => [c.id, c.name]));

    const result = schedules.map(s => formatSchedule(s, instrMap, centerMap));
    res.json({ schedules: result, total: result.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Create teacher schedule
router.post("/teacher-schedules", requireAuth, async (req, res) => {
  try {
    const { instructorId, centerId, dayOfWeek, workStart, morningEnd, eveningStart, workEnd } = req.body;
    if (!instructorId || !centerId || !dayOfWeek || !workStart || !workEnd) {
      res.status(400).json({ error: "instructorId, centerId, dayOfWeek, workStart, workEnd required" });
      return;
    }
    const existing = await db.select().from(teacherSchedulesTable)
      .where(and(
        eq(teacherSchedulesTable.instructorId, Number(instructorId)),
        eq(teacherSchedulesTable.centerId, Number(centerId)),
        eq(teacherSchedulesTable.dayOfWeek, dayOfWeek),
      )).limit(1);
    if (existing.length > 0) {
      res.status(400).json({ error: "Schedule already exists for this instructor/center/day. Edit the existing one." });
      return;
    }
    const [s] = await db.insert(teacherSchedulesTable).values({
      instructorId: Number(instructorId),
      centerId: Number(centerId),
      dayOfWeek,
      workStart,
      morningEnd: morningEnd ?? null,
      eveningStart: eveningStart ?? null,
      workEnd,
    }).returning();
    const instructors = await db.select().from(instructorsTable);
    const centers = await db.select().from(centersTable);
    const instrMap = new Map(instructors.map(i => [i.id, i.fullName]));
    const centerMap = new Map(centers.map(c => [c.id, c.name]));
    res.status(201).json(formatSchedule(s, instrMap, centerMap));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Update teacher schedule
router.put("/teacher-schedules/:id", requireAuth, async (req, res) => {
  try {
    const { workStart, morningEnd, eveningStart, workEnd } = req.body;
    const [s] = await db.update(teacherSchedulesTable)
      .set({
        ...(workStart && { workStart }),
        ...(workEnd && { workEnd }),
        morningEnd: morningEnd !== undefined ? morningEnd : undefined,
        eveningStart: eveningStart !== undefined ? eveningStart : undefined,
      })
      .where(eq(teacherSchedulesTable.id, Number(req.params.id)))
      .returning();
    if (!s) { res.status(404).json({ error: "Not found" }); return; }
    const instructors = await db.select().from(instructorsTable);
    const centers = await db.select().from(centersTable);
    const instrMap = new Map(instructors.map(i => [i.id, i.fullName]));
    const centerMap = new Map(centers.map(c => [c.id, c.name]));
    res.json(formatSchedule(s, instrMap, centerMap));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Delete teacher schedule
router.delete("/teacher-schedules/:id", requireAuth, async (req, res) => {
  try {
    await db.delete(teacherSchedulesTable).where(eq(teacherSchedulesTable.id, Number(req.params.id)));
    res.json({ message: "Deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get teacher availability for a specific date
router.get("/teacher-availability/:instructorId", async (req, res) => {
  try {
    const instructorId = Number(req.params.instructorId);
    const { date, centerId } = req.query;
    if (!date || !centerId) {
      res.status(400).json({ error: "date and centerId required" });
      return;
    }

    const dateStr = String(date);
    const dayNames = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
    const dayOfWeek = dayNames[new Date(dateStr + "T00:00:00").getDay()];

    const schedules = await db.select().from(teacherSchedulesTable)
      .where(and(
        eq(teacherSchedulesTable.instructorId, instructorId),
        eq(teacherSchedulesTable.centerId, Number(centerId)),
        eq(teacherSchedulesTable.dayOfWeek, dayOfWeek),
      )).limit(1);

    if (schedules.length === 0) {
      res.json({ available: false, message: "Teacher does not work this day at this center", slots: [] });
      return;
    }

    const schedule = schedules[0];
    const toMinutes = (t: string) => {
      const [h, m] = t.split(":").map(Number);
      return h * 60 + m;
    };
    const fromMinutes = (m: number) => {
      const h = Math.floor(m / 60);
      const min = m % 60;
      return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
    };

    // Build working windows — respects break between morning and evening shifts
    const workWindows: Array<{ start: number; end: number }> = [];
    if (schedule.morningEnd && schedule.eveningStart) {
      workWindows.push({ start: toMinutes(schedule.workStart), end: toMinutes(schedule.morningEnd) });
      workWindows.push({ start: toMinutes(schedule.eveningStart), end: toMinutes(schedule.workEnd) });
    } else {
      workWindows.push({ start: toMinutes(schedule.workStart), end: toMinutes(schedule.workEnd) });
    }

    const classes = await db.select().from(classesTable)
      .where(and(
        eq(classesTable.instructorId, instructorId),
        eq(classesTable.centerId, Number(centerId)),
        eq(classesTable.dayOfWeek, dayOfWeek),
        eq(classesTable.isActive, true),
      ));

    const { ptBookingsTable } = await import("@workspace/db/schema");
    const ptBookings = await db.select().from(ptBookingsTable)
      .where(and(
        eq(ptBookingsTable.instructorId, instructorId),
        eq(ptBookingsTable.bookingDate, dateStr),
        eq(ptBookingsTable.centerId, Number(centerId)),
      ));

    const busy: Array<{ start: number; end: number }> = [];
    for (const cls of classes) {
      busy.push({ start: toMinutes(cls.startTime), end: toMinutes(cls.endTime) });
    }
    for (const b of ptBookings) {
      if (b.status !== "cancelled") {
        busy.push({ start: toMinutes(b.startTime), end: toMinutes(b.startTime) + b.durationMinutes });
      }
    }
    busy.sort((a, b) => a.start - b.start);

    // Slots must fit within a working window and not conflict with busy blocks
    const slots30: string[] = [];
    const slots60: string[] = [];
    for (const window of workWindows) {
      for (let t = window.start; t + 30 <= window.end; t += 30) {
        const end30 = t + 30;
        const end60 = t + 60;
        const blocked30 = busy.some(b => b.start < end30 && b.end > t);
        const blocked60 = busy.some(b => b.start < end60 && b.end > t);
        if (!blocked30) slots30.push(fromMinutes(t));
        if (!blocked60 && end60 <= window.end) slots60.push(fromMinutes(t));
      }
    }

    const busyBlocks = busy.map(b => ({
      start: fromMinutes(b.start),
      end: fromMinutes(b.end),
      type: classes.some(c => toMinutes(c.startTime) === b.start) ? "class" : "pt",
    }));

    const totalWorkMinutes = workWindows.reduce((sum, w) => sum + (w.end - w.start), 0);

    res.json({
      available: true,
      dayOfWeek,
      workStart: schedule.workStart,
      morningEnd: schedule.morningEnd ?? null,
      eveningStart: schedule.eveningStart ?? null,
      workEnd: schedule.workEnd,
      slots30,
      slots60,
      busyBlocks,
      totalWorkMinutes,
      bookedMinutes: busy.reduce((sum, b) => sum + (b.end - b.start), 0),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
