import { 
  campaigns, 
  leads, 
  voices, 
  knowledgeBaseFiles, 
  callLogs,
  users,
  type Campaign, 
  type InsertCampaign, 
  type Lead, 
  type InsertLead,
  type Voice,
  type InsertVoice,
  type KnowledgeBaseFile,
  type InsertKnowledgeBaseFile,
  type CallLog,
  type InsertCallLog,
  type User,
  type InsertUser
} from "../shared/schema.js";
import { db } from "./db";
import { eq, and } from "drizzle-orm";

export interface IStorage {
  // User operations
  createUser(user: InsertUser): Promise<User>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserById(id: string): Promise<User | undefined>;
  updateUser(id: string, updates: Partial<User>): Promise<User | undefined>;

  // Campaign operations
  createCampaign(campaign: InsertCampaign): Promise<Campaign>;
  getCampaign(id: number): Promise<Campaign | undefined>;
  getAllCampaigns(userId?: string): Promise<Campaign[]>;
  updateCampaign(id: number, updates: Partial<Campaign>): Promise<Campaign | undefined>;
  deleteCampaign(id: number): Promise<boolean>;

  // Lead operations
  createLead(lead: InsertLead): Promise<Lead>;
  getLeadsByCampaign(campaignId: number): Promise<Lead[]>;
  updateLead(id: number, updates: Partial<Lead>): Promise<Lead | undefined>;
  createLeadsBatch(leads: InsertLead[]): Promise<Lead[]>;
  deleteLead(id: number): Promise<void>;

  // Voice operations
  createVoice(voice: InsertVoice): Promise<Voice>;
  getAllVoices(): Promise<Voice[]>;
  getVoice(id: string): Promise<Voice | undefined>;
  deleteVoice(id: string): Promise<boolean>;

  // Knowledge base operations
  createKnowledgeBase(kb: InsertKnowledgeBaseFile): Promise<KnowledgeBaseFile>;
  getAllKnowledgeBase(): Promise<KnowledgeBaseFile[]>;
  getKnowledgeBaseByCampaign(campaignId: number): Promise<KnowledgeBaseFile[]>;
  checkDuplicateKnowledgeBase(fileName: string, campaignId: number): Promise<boolean>;
  deleteKnowledgeBase(id: number): Promise<boolean>;
  deleteKnowledgeBaseByCampaign(campaignId: number): Promise<void>;

  // Call log operations
  createCallLog(callLog: InsertCallLog): Promise<CallLog>;
  getCallLogsByCampaign(campaignId: number): Promise<CallLog[]>;
  getAllCallLogs(): Promise<CallLog[]>;
  updateCallLog(id: number, updates: Partial<CallLog>): Promise<CallLog | undefined>;
  deleteCallLog(id: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  
  constructor() {
    // Initialize with some default voices if they don't exist
    this.initializeDefaultVoices();
  }

  private async initializeDefaultVoices() {
    try {
      const existingVoices = await db.select().from(voices).limit(1);
      if (existingVoices.length === 0) {
        const defaultVoices: InsertVoice[] = [
          {
            id: "voice_1",
            name: "Sarah",
            description: "Professional Female",
            isCloned: false,
            category: "premade"
          },
          {
            id: "voice_2", 
            name: "Michael",
            description: "Friendly Male",
            isCloned: false,
            category: "premade"
          },
          {
            id: "voice_3",
            name: "Emma",
            description: "Warm Female",
            isCloned: false,
            category: "premade"
          }
        ];

        await db.insert(voices).values(defaultVoices);
      }
    } catch (error) {
      console.error('Error initializing default voices:', error);
    }
  }

  // User operations
  async createUser(user: InsertUser): Promise<User> {
    const [newUser] = await db.insert(users).values(user).returning();
    return newUser;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    return user;
  }

  async getUserById(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return user;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const [updatedUser] = await db.update(users)
      .set(updates)
      .where(eq(users.id, id))
      .returning();
    return updatedUser;
  }

  // Campaign operations
  async createCampaign(campaign: InsertCampaign): Promise<Campaign> {
    const [newCampaign] = await db.insert(campaigns).values(campaign).returning();
    return newCampaign;
  }

  async getCampaign(id: number): Promise<Campaign | undefined> {
    const [campaign] = await db.select().from(campaigns).where(eq(campaigns.id, id)).limit(1);
    return campaign;
  }

  async getAllCampaigns(userId?: string): Promise<Campaign[]> {
    if (userId) {
      return await db.select().from(campaigns).where(eq(campaigns.userId, userId));
    }
    return await db.select().from(campaigns);
  }

  async updateCampaign(id: number, updates: Partial<Campaign>): Promise<Campaign | undefined> {
    const [updatedCampaign] = await db.update(campaigns)
      .set(updates)
      .where(eq(campaigns.id, id))
      .returning();
    return updatedCampaign;
  }

  async deleteCampaign(id: number): Promise<boolean> {
    try {
      // Delete all related records first to avoid foreign key constraint violations
      
      // 1. Delete all call logs for this campaign
      await db.delete(callLogs).where(eq(callLogs.campaignId, id));
      
      // 2. Delete all leads for this campaign
      await db.delete(leads).where(eq(leads.campaignId, id));
      
      // 3. Delete all knowledge base files for this campaign
      await db.delete(knowledgeBaseFiles).where(eq(knowledgeBaseFiles.campaignId, id));
      
      // 4. Finally delete the campaign itself
      await db.delete(campaigns).where(eq(campaigns.id, id));
      
      return true;
    } catch (error) {
      console.error('Error deleting campaign:', error);
      return false;
    }
  }

  // Lead operations
  async createLead(lead: InsertLead): Promise<Lead> {
    const [newLead] = await db.insert(leads).values(lead).returning();
    return newLead;
  }

  async getLeadsByCampaign(campaignId: number): Promise<Lead[]> {
    return await db.select().from(leads).where(eq(leads.campaignId, campaignId));
  }

  async updateLead(id: number, updates: Partial<Lead>): Promise<Lead | undefined> {
    const [updatedLead] = await db.update(leads)
      .set(updates)
      .where(eq(leads.id, id))
      .returning();
    return updatedLead;
  }

  async createLeadsBatch(leadsData: InsertLead[]): Promise<Lead[]> {
    if (leadsData.length === 0) return [];
    return await db.insert(leads).values(leadsData).returning();
  }

  async deleteLead(id: number): Promise<void> {
    await db.delete(leads).where(eq(leads.id, id));
  }

  // Voice operations
  async createVoice(voice: InsertVoice): Promise<Voice> {
    const [newVoice] = await db.insert(voices).values(voice).returning();
    return newVoice;
  }

  async getAllVoices(): Promise<Voice[]> {
    return await db.select().from(voices);
  }

  async getVoice(id: string): Promise<Voice | undefined> {
    const [voice] = await db.select().from(voices).where(eq(voices.id, id)).limit(1);
    return voice;
  }

  async deleteVoice(id: string): Promise<boolean> {
    try {
      await db.delete(voices).where(eq(voices.id, id));
      return true;
    } catch (error) {
      console.error('Error deleting voice:', error);
      return false;
    }
  }

  // Knowledge base operations
  async createKnowledgeBase(kb: InsertKnowledgeBaseFile): Promise<KnowledgeBaseFile> {
    const [newKB] = await db.insert(knowledgeBaseFiles).values(kb).returning();
    return newKB;
  }

  async getAllKnowledgeBase(): Promise<KnowledgeBaseFile[]> {
    return await db.select().from(knowledgeBaseFiles);
  }

  async getKnowledgeBaseByCampaign(campaignId: number): Promise<KnowledgeBaseFile[]> {
    return await db.select().from(knowledgeBaseFiles).where(eq(knowledgeBaseFiles.campaignId, campaignId));
  }

  async checkDuplicateKnowledgeBase(fileName: string, campaignId: number): Promise<boolean> {
    const [existing] = await db.select()
      .from(knowledgeBaseFiles)
      .where(and(
        eq(knowledgeBaseFiles.filename, fileName),
        eq(knowledgeBaseFiles.campaignId, campaignId)
      ))
      .limit(1);
    return !!existing;
  }

  async deleteKnowledgeBase(id: number): Promise<boolean> {
    try {
      await db.delete(knowledgeBaseFiles).where(eq(knowledgeBaseFiles.id, id));
      return true;
    } catch (error) {
      console.error('Error deleting knowledge base file:', error);
      return false;
    }
  }

  async deleteKnowledgeBaseByCampaign(campaignId: number): Promise<void> {
    await db.delete(knowledgeBaseFiles).where(eq(knowledgeBaseFiles.campaignId, campaignId));
  }

  // Call log operations
  async createCallLog(callLog: InsertCallLog): Promise<CallLog> {
    const [newCallLog] = await db.insert(callLogs).values(callLog).returning();
    return newCallLog;
  }

  async getCallLogsByCampaign(campaignId: number): Promise<CallLog[]> {
    return await db.select().from(callLogs).where(eq(callLogs.campaignId, campaignId));
  }

  async getAllCallLogs(): Promise<CallLog[]> {
    return await db.select().from(callLogs);
  }

  async updateCallLog(id: number, updates: Partial<CallLog>): Promise<CallLog | undefined> {
    const [updatedCallLog] = await db.update(callLogs)
      .set(updates)
      .where(eq(callLogs.id, id))
      .returning();
    return updatedCallLog;
  }

  async deleteCallLog(id: number): Promise<void> {
    await db.delete(callLogs).where(eq(callLogs.id, id));
  }
}

// Export singleton instance
export const storage = new DatabaseStorage();
