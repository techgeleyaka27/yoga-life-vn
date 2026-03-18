import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { ptBookingsTable, usersTable, instructorsTable, centersTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../lib/auth.js";

const router: IRouter = Router();

// List PT bookings (filter by userId or instructorId or centerId)
router.get("/pt-bookings", requireAuth, async (req, res) => {
  try {
    const { userId, instructorId, centerId, date } = req.query;
    let bookings = await db.select().from(ptBookingsTable);
    if (userId) bookings = bookings.filter(b => b.userId === Number(userId));
    if (instructorId) bookings = bookings.filter(b => b.instructorId === Number(instructorId));
    if (centerId) bookings = bookings.filter(b => b.centerId === Number(centerId));
    if (date) bookings = bookings.filter(b => b.bookingDate === String(date));

    const users = await db.select().from(usersTable);
    const instructors = await db.select().from(instructorsTable);
    const centers = await db.select().from(centersTable);
    const userMap = new Map(users.map(u => [u.id, u.fullName]));
    const instrMap = new Map(instructors.map(i => [i.id, i.fullName]));
    const centerMap = new Map(centers.map(c => [c.id, c.name]));

    const result = bookings.map(b => ({
      id: b.id,
      userId: b.userId,
      userName: userMap.get(b.userId) ?? null,
      instructorId: b.instructorId,
      instructorName: instrMap.get(b.instructorId) ?? null,
      centerId: b.centerId,
      centerName: centerMap.get(b.centerId) ?? null,
      bookingDate: b.bookingDate,
      startTime: b.startTime,
      endTime: calcEndTime(b.startTime, b.durationMinutes),
      durationMinutes: b.durationMinutes,
      status: b.status,
      notes: b.notes,
      createdAt: b.createdAt.toISOString(),
    }));
    res.json({ bookings: result, total: result.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Create a PT booking
router.post("/pt-bookings", requireAuth, async (req, res) => {
  try {
    const reqUser = (req as any).userId;
    const { instructorId, centerId, bookingDate, startTime, durationMinutes, notes } = req.body;
    if (!instructorId || !centerId || !bookingDate || !startTime || !durationMinutes) {
      res.status(400).json({ error: "Missing required fields" });
      return;
    }
    const duration = Number(durationMinutes);
    if (duration !== 30 && duration !== 60) {
      res.status(400).json({ error: "Duration must be 30 or 60 minutes" });
      return;
    }

    // Check for overlap with existing bookings
    const existingBookings = await db.select().from(ptBookingsTable)
      .where(and(
        eq(ptBookingsTable.instructorId, Number(instructorId)),
        eq(ptBookingsTable.bookingDate, bookingDate),
        eq(ptBookingsTable.centerId, Number(centerId)),
      ));

    const toMin = (t: string) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
    const newStart = toMin(startTime);
    const newEnd = newStart + duration;

    for (const b of existingBookings) {
      if (b.status === "cancelled") continue;
      const bStart = toMin(b.startTime);
      const bEnd = bStart + b.durationMinutes;
      if (newStart < bEnd && newEnd > bStart) {
        res.status(400).json({ error: "This time slot is already booked" });
        return;
      }
    }

    const [booking] = await db.insert(ptBookingsTable).values({
      userId: reqUser,
      instructorId: Number(instructorId),
      centerId: Number(centerId),
      bookingDate,
      startTime,
      durationMinutes: duration,
      status: "confirmed",
      notes: notes || null,
    }).returning();

    const [instr] = await db.select().from(instructorsTable).where(eq(instructorsTable.id, booking.instructorId)).limit(1);
    const [center] = await db.select().from(centersTable).where(eq(centersTable.id, booking.centerId)).limit(1);

    res.status(201).json({
      id: booking.id,
      userId: booking.userId,
      instructorId: booking.instructorId,
      instructorName: instr?.fullName ?? null,
      centerId: booking.centerId,
      centerName: center?.name ?? null,
      bookingDate: booking.bookingDate,
      startTime: booking.startTime,
      endTime: calcEndTime(booking.startTime, booking.durationMinutes),
      durationMinutes: booking.durationMinutes,
      status: booking.status,
      notes: booking.notes,
      createdAt: booking.createdAt.toISOString(),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Update PT booking status
router.put("/pt-bookings/:id", requireAuth, async (req, res) => {
  try {
    const { status, notes } = req.body;
    const [booking] = await db.update(ptBookingsTable)
      .set({ ...(status && { status }), ...(notes !== undefined && { notes }) })
      .where(eq(ptBookingsTable.id, Number(req.params.id)))
      .returning();
    if (!booking) { res.status(404).json({ error: "Not found" }); return; }
    res.json({ id: booking.id, status: booking.status, notes: booking.notes });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Cancel PT booking
router.delete("/pt-bookings/:id", requireAuth, async (req, res) => {
  try {
    await db.update(ptBookingsTable)
      .set({ status: "cancelled" })
      .where(eq(ptBookingsTable.id, Number(req.params.id)));
    res.json({ message: "Booking cancelled" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

function calcEndTime(start: string, durationMinutes: number): string {
  const [h, m] = start.split(":").map(Number);
  const total = h * 60 + m + durationMinutes;
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

export default router;
