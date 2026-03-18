import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { usersTable, enrollmentsTable, membershipsTable } from "@workspace/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth } from "../lib/auth.js";
import crypto from "crypto";

const router: IRouter = Router();

function hashPassword(pw: string) {
  return crypto.createHash("sha256").update(pw + "yoga_life_vn_salt").digest("hex");
}

router.get("/members", requireAuth, async (req, res) => {
  try {
    const { centerId } = req.query;
    if (!centerId) { res.status(400).json({ error: "centerId required" }); return; }

    const memberships = await db.select().from(membershipsTable).where(eq(membershipsTable.centerId, Number(centerId)));
    const membershipIds = memberships.map(m => m.id);

    if (membershipIds.length === 0) { res.json({ members: [] }); return; }

    const enrollments = await db.select().from(enrollmentsTable).orderBy(desc(enrollmentsTable.createdAt));
    const centerEnrollments = enrollments.filter(e => membershipIds.includes(e.membershipId));

    const userIds = [...new Set(centerEnrollments.map(e => e.userId))];
    const users = userIds.length > 0
      ? await db.select().from(usersTable).where(
          userIds.length === 1
            ? eq(usersTable.id, userIds[0])
            : eq(usersTable.id, userIds[0])
        )
      : [];

    const allUsers = await db.select().from(usersTable);
    const userMap = new Map(allUsers.map(u => [u.id, u]));
    const membershipMap = new Map(memberships.map(m => [m.id, m]));

    const members = centerEnrollments.map(e => {
      const user = userMap.get(e.userId);
      const membership = membershipMap.get(e.membershipId);
      return {
        enrollmentId: e.id,
        userId: e.userId,
        fullName: user?.fullName ?? "",
        email: user?.email ?? "",
        phone: user?.phone ?? "",
        gender: user?.gender ?? "",
        dateOfBirth: user?.dateOfBirth ?? "",
        address: user?.address ?? "",
        membershipId: e.membershipId,
        membershipName: membership?.name ?? "",
        membershipType: membership?.type ?? "offline",
        packageDurationMonths: e.packageDurationMonths,
        startDate: e.startDate.toISOString(),
        endDate: e.endDate.toISOString(),
        activationDate: e.activationDate ? e.activationDate.toISOString() : null,
        status: e.status,
        amountPaid: e.amountPaid,
        debtAmount: e.debtAmount,
        paymentMethod: e.paymentMethod ?? "",
        salesPerson: e.salesPerson ?? "",
        createdAt: e.createdAt.toISOString(),
      };
    });

    res.json({ members });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/members", requireAuth, async (req, res) => {
  try {
    const {
      fullName, email, phone, gender, dateOfBirth, address, salesPerson,
      membershipId, packageDurationMonths,
      amountPaid, paymentMethod,
      creationDate, activationDate,
      centerId,
    } = req.body;

    const membership = await db.select().from(membershipsTable).where(eq(membershipsTable.id, Number(membershipId))).limit(1);
    if (!membership[0]) { res.status(404).json({ error: "Membership not found" }); return; }

    const plan = membership[0];
    const durationMonths = Number(packageDurationMonths) || 1;
    const totalPrice = plan.price * durationMonths;
    const paid = Number(amountPaid) || 0;
    const debt = Math.max(0, totalPrice - paid);

    let targetUser = await db.select().from(usersTable).where(eq(usersTable.email, email.trim().toLowerCase())).limit(1);
    let userId: number;

    if (targetUser[0]) {
      userId = targetUser[0].id;
      await db.update(usersTable).set({
        fullName,
        phone: phone || targetUser[0].phone,
        gender: gender || targetUser[0].gender,
        dateOfBirth: dateOfBirth || targetUser[0].dateOfBirth,
        address: address || targetUser[0].address,
      }).where(eq(usersTable.id, userId));
    } else {
      const tempPassword = hashPassword(Math.random().toString(36).slice(2, 10));
      const [newUser] = await db.insert(usersTable).values({
        email: email.trim().toLowerCase(),
        passwordHash: tempPassword,
        fullName,
        phone: phone || null,
        role: "student",
        centerId: Number(centerId) || null,
        gender: gender || null,
        dateOfBirth: dateOfBirth || null,
        address: address || null,
      }).returning();
      userId = newUser.id;
    }

    const startDate = new Date(creationDate || new Date());
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + durationMonths);

    const actDate = activationDate ? new Date(activationDate) : startDate;

    const [enrollment] = await db.insert(enrollmentsTable).values({
      userId,
      membershipId: plan.id,
      startDate,
      endDate,
      status: "active",
      amountPaid: paid,
      debtAmount: debt,
      paymentMethod: paymentMethod || null,
      packageDurationMonths: durationMonths,
      salesPerson: salesPerson || null,
      activationDate: actDate,
    }).returning();

    res.status(201).json({
      enrollmentId: enrollment.id,
      userId,
      debtAmount: debt,
      totalPrice,
      endDate: endDate.toISOString(),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/members/:enrollmentId", requireAuth, async (req, res) => {
  try {
    const { status, amountPaid, debtAmount, paymentMethod, salesPerson, activationDate } = req.body;
    const [updated] = await db.update(enrollmentsTable).set({
      ...(status !== undefined && { status }),
      ...(amountPaid !== undefined && { amountPaid: Number(amountPaid) }),
      ...(debtAmount !== undefined && { debtAmount: Number(debtAmount) }),
      ...(paymentMethod !== undefined && { paymentMethod }),
      ...(salesPerson !== undefined && { salesPerson }),
      ...(activationDate !== undefined && { activationDate: new Date(activationDate) }),
    }).where(eq(enrollmentsTable.id, Number(req.params.enrollmentId))).returning();
    if (!updated) { res.status(404).json({ error: "Not found" }); return; }
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
