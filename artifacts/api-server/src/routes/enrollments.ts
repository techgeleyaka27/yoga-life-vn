import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { enrollmentsTable, usersTable, membershipsTable, centersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "../lib/auth.js";

const router: IRouter = Router();

router.get("/enrollments", requireAuth, async (req, res) => {
  try {
    const { userId, centerId, membershipId } = req.query;
    let enrollments = await db.select().from(enrollmentsTable);
    if (userId) enrollments = enrollments.filter(e => e.userId === Number(userId));
    if (membershipId) enrollments = enrollments.filter(e => e.membershipId === Number(membershipId));

    const users = await db.select().from(usersTable);
    const memberships = await db.select().from(membershipsTable);
    const centers = await db.select().from(centersTable);

    const userMap = new Map(users.map(u => [u.id, u]));
    const membershipMap = new Map(memberships.map(m => [m.id, m]));
    const centerMap = new Map(centers.map(c => [c.id, c.name]));

    let result = enrollments.map(e => {
      const user = userMap.get(e.userId);
      const membership = membershipMap.get(e.membershipId);
      const centerName = membership ? centerMap.get(membership.centerId) ?? "" : "";
      return {
        id: e.id, userId: e.userId,
        userFullName: user?.fullName ?? "", userEmail: user?.email ?? "",
        membershipId: e.membershipId, membershipName: membership?.name ?? "",
        membershipType: membership?.type ?? "offline",
        centerId: membership?.centerId ?? 0, centerName,
        startDate: e.startDate.toISOString(), endDate: e.endDate.toISOString(),
        status: e.status, amountPaid: e.amountPaid,
        debtAmount: e.debtAmount ?? 0,
        paymentMethod: e.paymentMethod ?? null,
        packageDurationMonths: e.packageDurationMonths ?? null,
        salesPerson: e.salesPerson ?? null,
        activationDate: e.activationDate ? e.activationDate.toISOString() : null,
        createdAt: e.createdAt.toISOString(),
      };
    });

    if (centerId) result = result.filter(e => e.centerId === Number(centerId));

    res.json({ enrollments: result, total: result.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/enrollments", requireAuth, async (req, res) => {
  try {
    const reqUserId = (req as any).userId;
    const { userId, membershipId, startDate, amountPaid } = req.body;
    const targetUserId = userId || reqUserId;

    const [membership] = await db.select().from(membershipsTable).where(eq(membershipsTable.id, membershipId)).limit(1);
    if (!membership) { res.status(404).json({ error: "Membership not found" }); return; }

    const start = new Date(startDate);
    const end = new Date(start);
    end.setDate(end.getDate() + membership.durationDays);

    const [enrollment] = await db.insert(enrollmentsTable).values({
      userId: targetUserId, membershipId, startDate: start, endDate: end,
      status: "active", amountPaid,
    }).returning();

    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, targetUserId)).limit(1);
    const [center] = await db.select().from(centersTable).where(eq(centersTable.id, membership.centerId)).limit(1);

    res.status(201).json({
      id: enrollment.id, userId: enrollment.userId,
      userFullName: user?.fullName ?? "", userEmail: user?.email ?? "",
      membershipId: enrollment.membershipId, membershipName: membership.name,
      membershipType: membership.type ?? "offline",
      centerId: membership.centerId, centerName: center?.name ?? "",
      startDate: enrollment.startDate.toISOString(), endDate: enrollment.endDate.toISOString(),
      status: enrollment.status, amountPaid: enrollment.amountPaid,
      createdAt: enrollment.createdAt.toISOString(),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/enrollments/:id", requireAuth, async (req, res) => {
  try {
    const { status, endDate } = req.body;
    const [enrollment] = await db.update(enrollmentsTable)
      .set({
        ...(status && { status }),
        ...(endDate && { endDate: new Date(endDate) }),
      })
      .where(eq(enrollmentsTable.id, Number(req.params.id))).returning();
    if (!enrollment) { res.status(404).json({ error: "Not found" }); return; }

    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, enrollment.userId)).limit(1);
    const [membership] = await db.select().from(membershipsTable).where(eq(membershipsTable.id, enrollment.membershipId)).limit(1);
    const [center] = membership ? await db.select().from(centersTable).where(eq(centersTable.id, membership.centerId)).limit(1) : [null];

    res.json({
      id: enrollment.id, userId: enrollment.userId,
      userFullName: user?.fullName ?? "", userEmail: user?.email ?? "",
      membershipId: enrollment.membershipId, membershipName: membership?.name ?? "",
      centerId: membership?.centerId ?? 0, centerName: center?.name ?? "",
      startDate: enrollment.startDate.toISOString(), endDate: enrollment.endDate.toISOString(),
      status: enrollment.status, amountPaid: enrollment.amountPaid,
      createdAt: enrollment.createdAt.toISOString(),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/enrollments/:id", requireAuth, async (req, res) => {
  try {
    await db.delete(enrollmentsTable).where(eq(enrollmentsTable.id, Number(req.params.id)));
    res.json({ message: "Enrollment cancelled" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
