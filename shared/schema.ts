// shared/schema.ts

import {
  mysqlTable,
  int,
  text,
  varchar,
  timestamp,
  boolean,
  json
} from "drizzle-orm/mysql-core";
import { relations } from "drizzle-orm";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

export const users = mysqlTable("users", {
  id: varchar("id", { length: 36 }).primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at").defaultNow()
});

export const campaigns = mysqlTable("campaigns", {
  id: int("id").primaryKey().autoincrement(),
  userId: varchar("user_id", { length: 36 }).notNull().references(() => users.id),
  name: text("name").notNull(),
  firstPrompt: text("first_prompt").notNull(),
  systemPersona: text("system_persona").notNull(),
  selectedVoiceId: text("selected_voice_id"),
  status: text("status").default("draft"),
  totalLeads: int("total_leads").default(0),
  completedCalls: int("completed_calls").default(0),
  successfulCalls: int("successful_calls").default(0),
  failedCalls: int("failed_calls").default(0),
  pausedAt: text("paused_at"),
  resumedAt: text("resumed_at"),
  lastProcessedLeadId: int("last_processed_lead_id"),
  batchJobId: text("batch_job_id"),
  createdAt: timestamp("created_at").defaultNow()
});

export const leads = mysqlTable("leads", {
  id: int("id").primaryKey().autoincrement(),
  campaignId: int("campaign_id").notNull().references(() => campaigns.id),
  firstName: text("first_name"),
  lastName: text("last_name"),
  contactNo: text("contact_no").notNull(),
  status: text("status").default("pending"),
  callDuration: int("call_duration"),
  createdAt: timestamp("created_at").defaultNow()
});

export const callLogs = mysqlTable("call_logs", {
  id: int("id").primaryKey().autoincrement(),
  campaignId: int("campaign_id").notNull().references(() => campaigns.id),
  leadId: int("lead_id").references(() => leads.id),
  phoneNumber: text("phone_number"),
  status: text("status"),
  duration: int("duration"),
  twilioCallSid: text("twilio_call_sid"),
  elevenLabsConversationId: text("elevenlabs_conversation_id"),
  transcription: text("transcription"),
  createdAt: timestamp("created_at").defaultNow()
});

export const voices = mysqlTable("voices", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  isCloned: boolean("is_cloned").default(false),
  sampleUrl: text("sample_url"),
  settings: json("settings"),
  category: text("category") // premade | cloned | generated
});

export const knowledgeBaseFiles = mysqlTable("knowledge_base_files", {
  id: int("id").primaryKey().autoincrement(),
  campaignId: int("campaign_id").notNull().references(() => campaigns.id),
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
