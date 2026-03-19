import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { enrollmentsTable, usersTable, membershipsTable, centersTable } from "@workspace/db/schema";
import { eq, gt, ne } from "drizzle-orm";
import { requireAuth } from "../lib/auth.js";

const router: IRouter = Router();

// ── GET /api/finance/reports ─────────────────────────────────────────────────
router.get("/finance/reports", requireAuth, async (req, res) => {
  try {
    const { centerId } = req.query;

    const enrollments = await db.select().from(enrollmentsTable);
    const users = await db.select().from(usersTable);
    const memberships = await db.select().from(membershipsTable);
    const centers = await db.select().from(centersTable);

    const userMap = new Map(users.map(u => [u.id, u]));
    const membershipMap = new Map(memberships.map(m => [m.id, m]));
    const centerMap = new Map(centers.map(c => [c.id, c]));

    // Enrich enrollments
    let enriched = enrollments.map(e => {
      const user = userMap.get(e.userId);
      const membership = membershipMap.get(e.membershipId);
      const center = membership ? centerMap.get(membership.centerId) : null;
      return {
        id: e.id,
        userId: e.userId,
        userFullName: user?.fullName ?? "",
        userEmail: user?.email ?? "",
        userPhone: user?.phone ?? "",
        membershipId: e.membershipId,
        membershipName: membership?.name ?? "",
        membershipPrice: membership?.price ?? 0,
        centerId: membership?.centerId ?? 0,
        centerName: center?.name ?? "",
        startDate: e.startDate.toISOString(),
        endDate: e.endDate.toISOString(),
        status: e.status,
        amountPaid: e.amountPaid ?? 0,
        debtAmount: e.debtAmount ?? 0,
        paymentMethod: e.paymentMethod ?? "",
        salesPerson: e.salesPerson ?? "",
        createdAt: e.createdAt.toISOString(),
      };
    });

    if (centerId) {
      enriched = enriched.filter(e => e.centerId === Number(centerId));
    }

    // Summary stats
    const totalRevenue = enriched.reduce((s, e) => s + e.amountPaid, 0);
    const totalDebt = enriched.reduce((s, e) => s + e.debtAmount, 0);
    const totalEnrollments = enriched.length;
    const activeEnrollments = enriched.filter(e => e.status === "active").length;

    // Outstanding debts (debtAmount > 0)
    const debts = enriched
      .filter(e => e.debtAmount > 0)
      .sort((a, b) => b.debtAmount - a.debtAmount);

    // Per-center breakdown
    const centerBreakdown: Record<number, { centerName: string; revenue: number; debt: number; enrollments: number }> = {};
    for (const e of enriched) {
      if (!centerBreakdown[e.centerId]) {
        centerBreakdown[e.centerId] = { centerName: e.centerName, revenue: 0, debt: 0, enrollments: 0 };
      }
      centerBreakdown[e.centerId].revenue += e.amountPaid;
      centerBreakdown[e.centerId].debt += e.debtAmount;
      centerBreakdown[e.centerId].enrollments += 1;
    }

    // Monthly revenue (last 6 months)
    const now = new Date();
    const monthlyRevenue: { month: string; revenue: number; enrollments: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = d.toLocaleString("en-US", { month: "short", year: "numeric" });
      const monthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const monthEnrollments = enriched.filter(e => e.createdAt.startsWith(monthStr));
      monthlyRevenue.push({
        month: label,
        revenue: monthEnrollments.reduce((s, e) => s + e.amountPaid, 0),
        enrollments: monthEnrollments.length,
      });
    }

    // Payment method breakdown
    const paymentMethods: Record<string, number> = {};
    for (const e of enriched) {
      const method = e.paymentMethod || "Not specified";
      paymentMethods[method] = (paymentMethods[method] ?? 0) + e.amountPaid;
    }

    // Recent transactions (all when filtered by center, else last 50)
    const limit = centerId ? enriched.length : 50;
    const recentTransactions = [...enriched]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);

    res.json({
      summary: { totalRevenue, totalDebt, totalEnrollments, activeEnrollments },
      debts,
      centerBreakdown: Object.entries(centerBreakdown).map(([id, data]) => ({ centerId: Number(id), ...data })),
      monthlyRevenue,
      paymentMethods,
      recentTransactions,
    });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/finance/recover-debt/:id ──────────────────────────────────────
// Partially or fully mark debt as recovered
router.post("/finance/recover-debt/:id", requireAuth, async (req, res) => {
  try {
    const enrollmentId = Number(req.params.id);
    const { amountRecovered, note } = req.body;

    const [current] = await db
      .select()
      .from(enrollmentsTable)
      .where(eq(enrollmentsTable.id, enrollmentId))
      .limit(1);

    if (!current) {
      res.status(404).json({ error: "Enrollment not found" });
      return;
    }

    const recovered = Math.min(Number(amountRecovered) || current.debtAmount, current.debtAmount);
    const newDebt = Math.max(0, current.debtAmount - recovered);
    const newAmountPaid = current.amountPaid + recovered;

    const [updated] = await db
      .update(enrollmentsTable)
      .set({
        debtAmount: newDebt,
        amountPaid: newAmountPaid,
        ...(newDebt === 0 ? {} : {}),
      })
      .where(eq(enrollmentsTable.id, enrollmentId))
      .returning();

    res.json({
      success: true,
      enrollment: updated,
      amountRecovered: recovered,
      remainingDebt: newDebt,
      note,
    });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
