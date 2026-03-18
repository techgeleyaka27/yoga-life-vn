import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const instructorsTable = pgTable("instructors", {
  id: serial("id").primaryKey(),
  fullName: text("full_name").notNull(),
  bio: text("bio"),
  specialties: text("specialties").notNull().default("[]"),
  experience: text("experience"),
  imageUrl: text("image_url"),
  centerId: integer("center_id").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertInstructorSchema = createInsertSchema(instructorsTable).omit({ id: true, createdAt: true });
export type InsertInstructor = z.infer<typeof insertInstructorSchema>;
export type Instructor = typeof instructorsTable.$inferSelect;
