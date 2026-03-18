import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { bookingsTable, classesTable, usersTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../lib/auth.js";

const router: IRouter = Router();

// Helper: parse "HH:MM" on a given "YYYY-MM-DD" into a Date
function classDateTime(date: string, time: string): Date {
  const [y, m, d] = date.split("-").map(Number);
  const [h, min] = time.split(":").map(Number);
  return new Date(y, m - 1, d, h, min, 0, 0);
}

// GET /bookings?userId=&date=
router.get("/bookings", requireAuth, async (req, res) => {
  try {
    const reqUserId = (req as any).userId;
    const { userId, date } = req.query;
    const targetUserId = userId ? Number(userId) : reqUserId;

    let bookings = await db.select().from(bookingsTable)
      .where(eq(bookingsTable.userId, targetUserId));

    if (date) {
      bookings = bookings.filter(b => b.bookingDate === date);
    }

    const classes = await db.select().from(classesTable);
    const classMap = new Map(classes.map(c => [c.id, c]));

    const result = bookings.map(b => {
      const cls = classMap.get(b.classId);
      return {
        id: b.id,
        userId: b.userId,
        classId: b.classId,
        className: cls?.name ?? "",
        dayOfWeek: cls?.dayOfWeek ?? "",
        startTime: cls?.startTime ?? "",
        endTime: cls?.endTime ?? "",
        bookingDate: b.bookingDate,
        status: b.status,
        createdAt: b.createdAt.toISOString(),
      };
    });

    res.json({ bookings: result, total: result.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /bookings — book a class for a specific date
// Business rule: booking opens 24 hours before the class starts
router.post("/bookings", requireAuth, async (req, res) => {
  try {
    const reqUserId = (req as any).userId;
    const { classId, bookingDate } = req.body;

    if (!classId || !bookingDate) {
      res.status(400).json({ error: "classId and bookingDate are required" });
      return;
    }

    const [cls] = await db.select().from(classesTable).where(eq(classesTable.id, Number(classId))).limit(1);
    if (!cls) { res.status(404).json({ error: "Class not found" }); return; }

    // Check booking window: must be at least 24h in advance
    const classStart = classDateTime(bookingDate, cls.startTime);
    const now = new Date();
    const hoursUntilClass = (classStart.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (hoursUntilClass < 24) {
      res.status(400).json({ error: "Booking opens 24 hours before the class starts" });
      return;
    }

    // Prevent duplicate active booking
    const existing = await db.select().from(bookingsTable).where(
      and(
        eq(bookingsTable.userId, reqUserId),
        eq(bookingsTable.classId, Number(classId)),
        eq(bookingsTable.bookingDate, bookingDate),
        eq(bookingsTable.status, "confirmed")
      )
    );
    if (existing.length > 0) {
      res.status(409).json({ error: "You already have a booking for this class on this date" });
      return;
    }

    // Check capacity
    const confirmed = await db.select().from(bookingsTable).where(
      and(
        eq(bookingsTable.classId, Number(classId)),
        eq(bookingsTable.bookingDate, bookingDate),
        eq(bookingsTable.status, "confirmed")
      )
    );
    if (confirmed.length >= cls.capacity) {
      res.status(400).json({ error: "Class is fully booked" });
      return;
    }

    const [booking] = await db.insert(bookingsTable).values({
      userId: reqUserId,
      classId: Number(classId),
      bookingDate,
      status: "confirmed",
    }).returning();

    res.status(201).json({
      id: booking.id,
      userId: booking.userId,
      classId: booking.classId,
      className: cls.name,
      dayOfWeek: cls.dayOfWeek,
      startTime: cls.startTime,
      endTime: cls.endTime,
      bookingDate: booking.bookingDate,
      status: booking.status,
      createdAt: booking.createdAt.toISOString(),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /bookings/:id — cancel a booking
// Business rule: must cancel at least 1 hour before class starts
router.delete("/bookings/:id", requireAuth, async (req, res) => {
  try {
    const reqUserId = (req as any).userId;
    const bookingId = Number(req.params.id);

    const [booking] = await db.select().from(bookingsTable)
      .where(eq(bookingsTable.id, bookingId)).limit(1);

    if (!booking) { res.status(404).json({ error: "Booking not found" }); return; }
    if (booking.userId !== reqUserId) { res.status(403).json({ error: "Forbidden" }); return; }
    if (booking.status === "cancelled") {
      res.status(400).json({ error: "Booking already cancelled" });
      return;
    }

    const [cls] = await db.select().from(classesTable).where(eq(classesTable.id, booking.classId)).limit(1);
    if (!cls) { res.status(404).json({ error: "Class not found" }); return; }

    const classStart = classDateTime(booking.bookingDate, cls.startTime);
    const now = new Date();
    const minutesUntilClass = (classStart.getTime() - now.getTime()) / (1000 * 60);

    if (minutesUntilClass < 60) {
      res.status(400).json({ error: "Cannot cancel less than 1 hour before the class starts" });
      return;
    }

    const [updated] = await db.update(bookingsTable)
      .set({ status: "cancelled" })
      .where(eq(bookingsTable.id, bookingId))
      .returning();

    res.json({
      id: updated.id,
      userId: updated.userId,
      classId: updated.classId,
      className: cls.name,
      dayOfWeek: cls.dayOfWeek,
      startTime: cls.startTime,
      endTime: cls.endTime,
      bookingDate: updated.bookingDate,
      status: updated.status,
      createdAt: updated.createdAt.toISOString(),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
