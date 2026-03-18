import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const centersTable = pgTable("centers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  address: text("address").notNull(),
  city: text("city").notNull(),
  phone: text("phone").notNull(),
  email: text("email").notNull(),
  description: text("description"),
  imageUrl: text("image_url"),
  adminId: integer("admin_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertCenterSchema = createInsertSchema(centersTable).omit({ id: true, createdAt: true });
export type InsertCenter = z.infer<typeof insertCenterSchema>;
export type Center = typeof centersTable.$inferSelect;
