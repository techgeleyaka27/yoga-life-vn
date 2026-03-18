import { pgTable, text, serial, integer, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const ptBookingStatusEnum = pgEnum("pt_booking_status", ["pending", "confirmed", "cancelled", "completed"]);

export const ptBookingsTable = pgTable("pt_bookings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  instructorId: integer("instructor_id").notNull(),
  centerId: integer("center_id").notNull(),
  bookingDate: text("booking_date").notNull(),
  startTime: text("start_time").notNull(),
  durationMinutes: integer("duration_minutes").notNull().default(60),
  status: ptBookingStatusEnum("status").notNull().default("confirmed"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertPtBookingSchema = createInsertSchema(ptBookingsTable).omit({ id: true, createdAt: true });
export type InsertPtBooking = z.infer<typeof insertPtBookingSchema>;
export type PtBooking = typeof ptBookingsTable.$inferSelect;
