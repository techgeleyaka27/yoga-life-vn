import { pgTable, text, serial, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const heroContentTable = pgTable("hero_content", {
  id: serial("id").primaryKey(),
  headline: text("headline").notNull(),
  subheadline: text("subheadline").notNull(),
  ctaText: text("cta_text").notNull(),
  imageUrl: text("image_url"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const testimonialsTable = pgTable("testimonials", {
  id: serial("id").primaryKey(),
  authorName: text("author_name").notNull(),
  authorRole: text("author_role"),
  content: text("content").notNull(),
  rating: integer("rating").notNull().default(5),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const siteSettingsTable = pgTable("site_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const onlineClassesContentTable = pgTable("online_classes_content", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  instructor: text("instructor").notNull(),
  duration: text("duration").notNull().default("45 min"),
  level: text("level").notNull().default("all_levels"),
  category: text("category").notNull().default("Hatha"),
  thumbnailUrl: text("thumbnail_url").notNull(),
  videoId: text("video_id").notNull(),
  featured: boolean("featured").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  displayOrder: integer("display_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertHeroContentSchema = createInsertSchema(heroContentTable).omit({ id: true, updatedAt: true });
export type InsertHeroContent = z.infer<typeof insertHeroContentSchema>;
export type HeroContent = typeof heroContentTable.$inferSelect;

export const insertTestimonialSchema = createInsertSchema(testimonialsTable).omit({ id: true, createdAt: true });
export type InsertTestimonial = z.infer<typeof insertTestimonialSchema>;
export type Testimonial = typeof testimonialsTable.$inferSelect;

export const teachersContentTable = pgTable("teachers_content", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  title: text("title").notNull(),
  bio: text("bio").notNull(),
  certifications: text("certifications").notNull().default(""),
  styles: text("styles").notNull().default("[]"),
  photoUrl: text("photo_url"),
  displayOrder: integer("display_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertOnlineClassSchema = createInsertSchema(onlineClassesContentTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertOnlineClass = z.infer<typeof insertOnlineClassSchema>;
export type OnlineClassContent = typeof onlineClassesContentTable.$inferSelect;

export const insertTeacherSchema = createInsertSchema(teachersContentTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertTeacher = z.infer<typeof insertTeacherSchema>;
export type TeacherContent = typeof teachersContentTable.$inferSelect;

export const classDefinitionsTable = pgTable("class_definitions", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  defaultDuration: integer("default_duration").notNull().default(60),
  level: text("level").notNull().default("all_levels"),
  category: text("category").notNull().default("Hatha"),
  color: text("color").default("#4a7c59"),
  imageUrl: text("image_url"),
  benefits: text("benefits").notNull().default("[]"),
  isActive: boolean("is_active").notNull().default(true),
  displayOrder: integer("display_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertClassDefinitionSchema = createInsertSchema(classDefinitionsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertClassDefinition = z.infer<typeof insertClassDefinitionSchema>;
export type ClassDefinition = typeof classDefinitionsTable.$inferSelect;

export const trainingApplicationsTable = pgTable("training_applications", {
  id: serial("id").primaryKey(),
  fullName: text("full_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  program: text("program").notNull(),
  message: text("message"),
  status: text("status").notNull().default("new"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type TrainingApplication = typeof trainingApplicationsTable.$inferSelect;
