// shared/schema.ts

import {
  pgTable,
  serial,
  text,
  varchar,
  timestamp,
  integer,
  boolean,
  json,
  uuid
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at").defaultNow()
});

export const campaigns = pgTable("campaigns", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  firstPrompt: text("first_prompt").notNull(),
  systemPersona: text("system_persona").notNull(),
  selectedVoiceId: text("selected_voice_id"),
  status: text("status").default("draft"),
  totalLeads: integer("total_leads").default(0),
  completedCalls: integer("completed_calls").default(0),
  successfulCalls: integer("successful_calls").default(0),
  failedCalls: integer("failed_calls").default(0),
  createdAt: timestamp("created_at").defaultNow()
});

export const leads = pgTable("leads", {
  id: serial("id").primaryKey(),
  campaignId: integer("campaign_id").notNull().references(() => campaigns.id),
  firstName: text("first_name"),
  lastName: text("last_name"),
  contactNo: text("contact_no").notNull(),
  status: text("status").default("pending"),
  callDuration: integer("call_duration"),
  createdAt: timestamp("created_at").defaultNow()
});

export const callLogs = pgTable("call_logs", {
  id: serial("id").primaryKey(),
  campaignId: integer("campaign_id").notNull().references(() => campaigns.id),
  leadId: integer("lead_id").references(() => leads.id),
  phoneNumber: text("phone_number"),
  status: text("status"),
  duration: integer("duration"),
  twilioCallSid: text("twilio_call_sid"),
  elevenLabsConversationId: text("elevenlabs_conversation_id"),
  createdAt: timestamp("created_at").defaultNow()
});

export const voices = pgTable("voices", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  isCloned: boolean("is_cloned").default(false),
  sampleUrl: text("sample_url"),
  settings: json("settings"),
  category: text("category") // premade | cloned | generated
});

export const knowledgeBaseFiles = pgTable("knowledge_base_files", {
  id: serial("id").primaryKey(),
  campaignId: integer("campaign_id").notNull().references(() => campaigns.id),
  filename: text("filename").notNull(),
  fileUrl: text("file_url").notNull(),
  elevenlabsDocId: text("elevenlabs_doc_id"),
  uploadedAt: timestamp("uploaded_at").defaultNow()
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  campaigns: many(campaigns),
}));

export const campaignsRelations = relations(campaigns, ({ one, many }) => ({
  user: one(users, {
    fields: [campaigns.userId],
    references: [users.id],
  }),
  leads: many(leads),
  callLogs: many(callLogs),
  knowledgeBaseFiles: many(knowledgeBaseFiles),
}));

export const leadsRelations = relations(leads, ({ one, many }) => ({
  campaign: one(campaigns, {
    fields: [leads.campaignId],
    references: [campaigns.id],
  }),
  callLogs: many(callLogs),
}));

export const callLogsRelations = relations(callLogs, ({ one }) => ({
  campaign: one(campaigns, {
    fields: [callLogs.campaignId],
    references: [campaigns.id],
  }),
  lead: one(leads, {
    fields: [callLogs.leadId],
    references: [leads.id],
  }),
}));

export const knowledgeBaseFilesRelations = relations(knowledgeBaseFiles, ({ one }) => ({
  campaign: one(campaigns, {
    fields: [knowledgeBaseFiles.campaignId],
    references: [campaigns.id],
  }),
}));

// Zod schemas for validation
export const insertUserSchema = createInsertSchema(users);
export const selectUserSchema = createSelectSchema(users);
export const insertCampaignSchema = createInsertSchema(campaigns);
export const selectCampaignSchema = createSelectSchema(campaigns);
export const insertLeadSchema = createInsertSchema(leads);
export const selectLeadSchema = createSelectSchema(leads);
export const insertCallLogSchema = createInsertSchema(callLogs);
export const selectCallLogSchema = createSelectSchema(callLogs);
export const insertVoiceSchema = createInsertSchema(voices);
export const selectVoiceSchema = createSelectSchema(voices);
export const insertKnowledgeBaseFileSchema = createInsertSchema(knowledgeBaseFiles);
export const selectKnowledgeBaseFileSchema = createSelectSchema(knowledgeBaseFiles);

// Custom validation schemas
export const testCallSchema = z.object({
  campaignId: z.number(),
  phoneNumber: z.string().min(10),
  firstName: z.string().optional(),
});

export const voiceCloneSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
});

// TypeScript types
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Campaign = typeof campaigns.$inferSelect;
export type InsertCampaign = typeof campaigns.$inferInsert;
export type Lead = typeof leads.$inferSelect;
export type InsertLead = typeof leads.$inferInsert;
export type CallLog = typeof callLogs.$inferSelect;
export type InsertCallLog = typeof callLogs.$inferInsert;
export type Voice = typeof voices.$inferSelect;
export type InsertVoice = typeof voices.$inferInsert;
export type KnowledgeBaseFile = typeof knowledgeBaseFiles.$inferSelect;
export type InsertKnowledgeBaseFile = typeof knowledgeBaseFiles.$inferInsert;
