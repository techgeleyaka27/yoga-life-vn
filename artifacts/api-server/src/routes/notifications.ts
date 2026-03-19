import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { enrollmentsTable, usersTable, membershipsTable } from "@workspace/db/schema";
import { requireAuth } from "../lib/auth.js";

const router: IRouter = Router();

// ── GET /api/notifications ───────────────────────────────────────────────────
// Returns near-expiry memberships and upcoming birthdays
router.get("/notifications", requireAuth, async (req, res) => {
  try {
    const { centerId, daysAhead = 7 } = req.query;
    const days = Number(daysAhead);

    const now = new Date();
    const futureDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

    // 1. Near-expiry enrollments ──────────────────────────────────────────────
    const enrollments = await db.select().from(enrollmentsTable);
    const users = await db.select().from(usersTable);
    const memberships = await db.select().from(membershipsTable);

    const userMap = new Map(users.map(u => [u.id, u]));
    const membershipMap = new Map(memberships.map(m => [m.id, m]));

    let expiringEnrollments = enrollments
      .filter(e => {
        const end = new Date(e.endDate);
        return e.status === "active" && end >= now && end <= futureDate;
      })
      .map(e => {
        const user = userMap.get(e.userId);
        const membership = membershipMap.get(e.membershipId);
        const endDate = new Date(e.endDate);
        const daysLeft = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return {
          type: "expiry" as const,
          enrollmentId: e.id,
          userId: e.userId,
          userName: user?.fullName ?? "",
          userEmail: user?.email ?? "",
          userPhone: user?.phone ?? "",
          membershipName: membership?.name ?? "",
          centerId: membership?.centerId ?? 0,
          endDate: e.endDate.toISOString(),
          daysLeft,
          priority: daysLeft <= 2 ? "high" : daysLeft <= 4 ? "medium" : "low",
        };
      })
      .sort((a, b) => a.daysLeft - b.daysLeft);

    if (centerId) {
      expiringEnrollments = expiringEnrollments.filter(e => e.centerId === Number(centerId));
    }

    // 2. Upcoming birthdays ────────────────────────────────────────────────────
    const upcomingBirthdays = users
      .filter(u => u.role === "student" && u.dateOfBirth)
      .map(u => {
        const dob = u.dateOfBirth!;
        // Parse month-day regardless of year
        const parts = dob.split("-");
        if (parts.length < 3) return null;
        const birthMonth = parseInt(parts[1], 10) - 1;
        const birthDay = parseInt(parts[2], 10);

        // Birthday this year
        const birthdayThisYear = new Date(now.getFullYear(), birthMonth, birthDay);
        // If birthday already passed this year, check next year
        let nextBirthday = birthdayThisYear;
        if (birthdayThisYear < now) {
          nextBirthday = new Date(now.getFullYear() + 1, birthMonth, birthDay);
        }

        const daysLeft = Math.ceil((nextBirthday.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        if (daysLeft > days) return null;

        return {
          type: "birthday" as const,
          userId: u.id,
          userName: u.fullName,
          userEmail: u.email,
          userPhone: u.phone ?? "",
          dateOfBirth: u.dateOfBirth!,
          nextBirthday: nextBirthday.toISOString(),
          daysLeft,
          isToday: daysLeft === 0,
          priority: daysLeft === 0 ? "high" : daysLeft <= 2 ? "medium" : "low",
        };
      })
      .filter(Boolean)
      .sort((a, b) => a!.daysLeft - b!.daysLeft) as {
        type: "birthday"; userId: number; userName: string; userEmail: string;
        userPhone: string; dateOfBirth: string; nextBirthday: string;
        daysLeft: number; isToday: boolean; priority: "high" | "medium" | "low";
      }[];

    // 3. Outstanding debts summary ─────────────────────────────────────────────
    const debtSummary = enrollments
      .filter(e => (e.debtAmount ?? 0) > 0)
      .reduce((s, e) => ({
        count: s.count + 1,
        total: s.total + (e.debtAmount ?? 0),
      }), { count: 0, total: 0 });

    const totalCount = expiringEnrollments.length + upcomingBirthdays.length + (debtSummary.count > 0 ? 1 : 0);

    res.json({
      total: totalCount,
      expiringMemberships: expiringEnrollments,
      upcomingBirthdays,
      debtSummary,
    });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
