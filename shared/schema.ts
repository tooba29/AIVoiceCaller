import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const campaigns = pgTable("campaigns", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  firstPrompt: text("first_prompt").notNull(),
  systemPersona: text("system_persona").notNull(),
  selectedVoiceId: text("selected_voice_id"),
  status: text("status").notNull().default("draft"), // draft, active, paused, completed
  totalLeads: integer("total_leads").default(0),
  completedCalls: integer("completed_calls").default(0),
  successfulCalls: integer("successful_calls").default(0),
  failedCalls: integer("failed_calls").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const leads = pgTable("leads", {
  id: serial("id").primaryKey(),
  campaignId: integer("campaign_id").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  contactNo: text("contact_no").notNull(),
  status: text("status").notNull().default("pending"), // pending, calling, completed, failed
  callDuration: integer("call_duration"), // in seconds
  createdAt: timestamp("created_at").defaultNow(),
});

export const voices = pgTable("voices", {
  id: text("id").primaryKey(), // ElevenLabs voice ID
  name: text("name").notNull(),
  description: text("description"),
  isCloned: boolean("is_cloned").default(false),
  sampleUrl: text("sample_url"),
  settings: jsonb("settings"),
  category: text("category"),
});

export const knowledgeBase = pgTable("knowledge_base", {
  id: serial("id").primaryKey(),
  fileName: text("file_name").notNull(),
  fileSize: integer("file_size").notNull(),
  uploadedAt: timestamp("uploaded_at").defaultNow(),
});

export const callLogs = pgTable("call_logs", {
  id: serial("id").primaryKey(),
  campaignId: integer("campaign_id"),
  leadId: integer("lead_id"),
  phoneNumber: text("phone_number").notNull(),
  status: text("status").notNull(), // initiated, ringing, answered, completed, failed
  duration: integer("duration"), // in seconds
  twilioCallSid: text("twilio_call_sid"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertCampaignSchema = createInsertSchema(campaigns).omit({
  id: true,
  createdAt: true,
  totalLeads: true,
  completedCalls: true,
  successfulCalls: true,
  failedCalls: true,
});

export const insertLeadSchema = createInsertSchema(leads).omit({
  id: true,
  createdAt: true,
  status: true,
  callDuration: true,
});

export const insertVoiceSchema = createInsertSchema(voices);

export const insertKnowledgeBaseSchema = createInsertSchema(knowledgeBase).omit({
  id: true,
  uploadedAt: true,
});

export const insertCallLogSchema = createInsertSchema(callLogs).omit({
  id: true,
  createdAt: true,
});

export type Campaign = typeof campaigns.$inferSelect;
export type InsertCampaign = z.infer<typeof insertCampaignSchema>;
export type Lead = typeof leads.$inferSelect;
export type InsertLead = z.infer<typeof insertLeadSchema>;
export type Voice = typeof voices.$inferSelect;
export type InsertVoice = z.infer<typeof insertVoiceSchema>;
export type KnowledgeBase = typeof knowledgeBase.$inferSelect;
export type InsertKnowledgeBase = z.infer<typeof insertKnowledgeBaseSchema>;
export type CallLog = typeof callLogs.$inferSelect;
export type InsertCallLog = z.infer<typeof insertCallLogSchema>;

// Additional schemas for API requests
export const testCallSchema = z.object({
  phoneNumber: z.string().min(10, "Phone number is required"),
  campaignId: z.number().optional(),
});

export const voiceCloneSchema = z.object({
  name: z.string().min(1, "Voice name is required"),
  description: z.string().optional(),
});

export type TestCallRequest = z.infer<typeof testCallSchema>;
export type VoiceCloneRequest = z.infer<typeof voiceCloneSchema>;

export interface Voice {
  id: string;
  name: string;
  description: string;
  isCloned: boolean;
  sampleUrl?: string;
  settings?: {
    stability: number;
    similarity_boost: number;
    style: number;
    use_speaker_boost: boolean;
  };
  category?: string;
}
