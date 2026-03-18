import { pgTable, serial, integer, timestamp, pgEnum, real, text } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const enrollmentStatusEnum = pgEnum("enrollment_status", ["active", "expired", "cancelled", "pending"]);

export const enrollmentsTable = pgTable("enrollments", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  membershipId: integer("membership_id").notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  status: enrollmentStatusEnum("status").notNull().default("active"),
  amountPaid: real("amount_paid").notNull(),
  debtAmount: real("debt_amount").notNull().default(0),
  paymentMethod: text("payment_method"),
  packageDurationMonths: integer("package_duration_months").notNull().default(1),
  salesPerson: text("sales_person"),
  activationDate: timestamp("activation_date"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertEnrollmentSchema = createInsertSchema(enrollmentsTable).omit({ id: true, createdAt: true });
export type InsertEnrollment = z.infer<typeof insertEnrollmentSchema>;
export type Enrollment = typeof enrollmentsTable.$inferSelect;
