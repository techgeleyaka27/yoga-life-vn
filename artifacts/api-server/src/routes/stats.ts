import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { usersTable, centersTable, classesTable, enrollmentsTable, membershipsTable } from "@workspace/db/schema";
import { requireAuth } from "../lib/auth.js";

const router: IRouter = Router();

router.get("/stats", requireAuth, async (req, res) => {
  try {
    const { centerId } = req.query;

    const users = await db.select().from(usersTable);
    const centers = await db.select().from(centersTable);
    const classes = await db.select().from(classesTable);
    const enrollments = await db.select().from(enrollmentsTable);
    const memberships = await db.select().from(membershipsTable);

    let filteredMembershipIds = memberships.map(m => m.id);
    if (centerId) {
      const cid = Number(centerId);
      filteredMembershipIds = memberships.filter(m => m.centerId === cid).map(m => m.id);
    }

    const filteredEnrollments = centerId
      ? enrollments.filter(e => filteredMembershipIds.includes(e.membershipId))
      : enrollments;

    const activeEnrollments = filteredEnrollments.filter(e => e.status === "active").length;
    const totalMembers = centerId
      ? new Set(filteredEnrollments.map(e => e.userId)).size
      : users.filter(u => u.role === "student").length;

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const newMembersThisMonth = centerId
      ? new Set(filteredEnrollments.filter(e => e.createdAt >= startOfMonth).map(e => e.userId)).size
      : users.filter(u => u.role === "student" && u.createdAt >= startOfMonth).length;

    const revenue = filteredEnrollments.reduce((sum, e) => sum + (e.amountPaid || 0), 0);
    const totalClasses = centerId
      ? classes.filter(c => c.centerId === Number(centerId)).length
      : classes.length;

    res.json({
      totalMembers,
      activeEnrollments,
      totalCenters: centers.length,
      totalClasses,
      revenue,
      newMembersThisMonth,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
