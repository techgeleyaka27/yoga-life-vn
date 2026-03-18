import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const teacherSchedulesTable = pgTable("teacher_schedules", {
  id: serial("id").primaryKey(),
  instructorId: integer("instructor_id").notNull(),
  centerId: integer("center_id").notNull(),
  dayOfWeek: text("day_of_week").notNull(),
  workStart: text("work_start").notNull(),
  morningEnd: text("morning_end"),
  eveningStart: text("evening_start"),
  workEnd: text("work_end").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertTeacherScheduleSchema = createInsertSchema(teacherSchedulesTable).omit({ id: true, createdAt: true });
export type InsertTeacherSchedule = z.infer<typeof insertTeacherScheduleSchema>;
export type TeacherSchedule = typeof teacherSchedulesTable.$inferSelect;
