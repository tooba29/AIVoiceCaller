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
import { db } from "./db.js";
import { eq, and, desc } from "drizzle-orm";

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
  updateCallLogByTwilioSid(twilioCallSid: string, updates: Partial<CallLog>): Promise<CallLog | undefined>;
  deleteCallLog(id: number): Promise<void>;
}

class DatabaseStorage implements IStorage {
  // User operations
  async createUser(user: InsertUser): Promise<User> {
    await db.insert(users).values(user);
    const [newUser] = await db.select().from(users).where(eq(users.id, user.id));
    return newUser;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
    return result[0];
  }

  async getUserById(id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    await db.update(users).set(updates).where(eq(users.id, id));
    const [updatedUser] = await db.select().from(users).where(eq(users.id, id));
    return updatedUser;
  }

  // Campaign operations
  async createCampaign(campaign: InsertCampaign): Promise<Campaign> {
    const result = await db.insert(campaigns).values(campaign);
    console.log("Insert result:", result);
    
    // Handle different MySQL2 result formats
    let insertId: number;
    if (result && typeof result === 'object') {
      // Try different possible properties where insertId might be
      insertId = (result as any).insertId || (result as any)[0]?.insertId || (result as any).lastInsertRowid;
      
      if (insertId === undefined || insertId === null) {
        // Fallback: get the last inserted campaign for this user
        const [lastCampaign] = await db
          .select()
          .from(campaigns)
          .where(eq(campaigns.userId, campaign.userId))
          .orderBy(desc(campaigns.id))
          .limit(1);
        
        if (lastCampaign) {
          return lastCampaign;
        } else {
          throw new Error("Failed to retrieve created campaign");
        }
      }
    } else {
      throw new Error("Invalid insert result format");
    }
    
    const finalInsertId = Number(insertId);
    if (isNaN(finalInsertId)) {
      throw new Error(`Invalid insertId: ${insertId}`);
    }
    
    const [newCampaign] = await db.select().from(campaigns).where(eq(campaigns.id, finalInsertId));
    if (!newCampaign) {
      throw new Error(`Campaign with ID ${finalInsertId} not found after creation`);
    }
    
    return newCampaign;
  }

  async getCampaign(id: number): Promise<Campaign | undefined> {
    const result = await db.select().from(campaigns).where(eq(campaigns.id, id)).limit(1);
    return result[0];
  }

  async getAllCampaigns(userId?: string): Promise<Campaign[]> {
    if (userId) {
      return await db.select().from(campaigns).where(eq(campaigns.userId, userId));
    }
    return await db.select().from(campaigns);
  }

  async updateCampaign(id: number, updates: Partial<Campaign>): Promise<Campaign | undefined> {
    console.log(`[Storage] Updating campaign ${id} with:`, updates);
    
    const result = await db.update(campaigns).set(updates).where(eq(campaigns.id, id));
    console.log(`[Storage] Update result:`, result);
    
    const [updatedCampaign] = await db.select().from(campaigns).where(eq(campaigns.id, id));
    console.log(`[Storage] Updated campaign:`, {
      id: updatedCampaign?.id,
      status: updatedCampaign?.status,
      batchJobId: updatedCampaign?.batchJobId
    });
    
    return updatedCampaign;
  }

  async deleteCampaign(id: number): Promise<boolean> {
    const result = await db.delete(campaigns).where(eq(campaigns.id, id));
    return (result as any).affectedRows > 0;
  }

  // Lead operations
  async createLead(lead: InsertLead): Promise<Lead> {
    const result = await db.insert(leads).values(lead);
    
    // Handle different MySQL2 result formats
    let insertId: number;
    if (result && typeof result === 'object') {
      insertId = (result as any).insertId || (result as any)[0]?.insertId || (result as any).lastInsertRowid;
      
      if (insertId === undefined || insertId === null) {
        // Fallback: get the last inserted lead for this campaign
        const [lastLead] = await db
          .select()
          .from(leads)
          .where(eq(leads.campaignId, lead.campaignId))
          .orderBy(desc(leads.id))
          .limit(1);
        
        if (lastLead) {
          return lastLead;
        } else {
          throw new Error("Failed to retrieve created lead");
        }
      }
    } else {
      throw new Error("Invalid insert result format");
    }
    
    const finalInsertId = Number(insertId);
    if (isNaN(finalInsertId)) {
      throw new Error(`Invalid insertId: ${insertId}`);
    }
    
    const [newLead] = await db.select().from(leads).where(eq(leads.id, finalInsertId));
    if (!newLead) {
      throw new Error(`Lead with ID ${finalInsertId} not found after creation`);
    }
    
    return newLead;
  }

  async getLeadsByCampaign(campaignId: number): Promise<Lead[]> {
    return await db.select().from(leads).where(eq(leads.campaignId, campaignId));
  }

  async updateLead(id: number, updates: Partial<Lead>): Promise<Lead | undefined> {
    await db.update(leads).set(updates).where(eq(leads.id, id));
    const [updatedLead] = await db.select().from(leads).where(eq(leads.id, id));
    return updatedLead;
  }

  async createLeadsBatch(leadsData: InsertLead[]): Promise<Lead[]> {
    const results: Lead[] = [];
    for (const lead of leadsData) {
      const createdLead = await this.createLead(lead);
      results.push(createdLead);
    }
    return results;
  }

  async deleteLead(id: number): Promise<void> {
    await db.delete(leads).where(eq(leads.id, id));
  }

  // Voice operations
  async createVoice(voice: InsertVoice): Promise<Voice> {
    await db.insert(voices).values(voice);
    const [newVoice] = await db.select().from(voices).where(eq(voices.id, voice.id));
    return newVoice;
  }

  async getAllVoices(): Promise<Voice[]> {
    return await db.select().from(voices);
  }

  async getVoice(id: string): Promise<Voice | undefined> {
    const result = await db.select().from(voices).where(eq(voices.id, id)).limit(1);
    return result[0];
  }

  async deleteVoice(id: string): Promise<boolean> {
    const result = await db.delete(voices).where(eq(voices.id, id));
    return (result as any).affectedRows > 0;
  }

  // Knowledge base operations
  async createKnowledgeBase(kb: InsertKnowledgeBaseFile): Promise<KnowledgeBaseFile> {
    const result = await db.insert(knowledgeBaseFiles).values(kb);
    
    // Handle different MySQL2 result formats
    let insertId: number;
    if (result && typeof result === 'object') {
      insertId = (result as any).insertId || (result as any)[0]?.insertId || (result as any).lastInsertRowid;
      
      if (insertId === undefined || insertId === null) {
        // Fallback: get the last inserted knowledge base file for this campaign
        const [lastKB] = await db
          .select()
          .from(knowledgeBaseFiles)
          .where(eq(knowledgeBaseFiles.campaignId, kb.campaignId))
          .orderBy(desc(knowledgeBaseFiles.id))
          .limit(1);
        
        if (lastKB) {
          return lastKB;
        } else {
          throw new Error("Failed to retrieve created knowledge base file");
        }
      }
    } else {
      throw new Error("Invalid insert result format");
    }
    
    const finalInsertId = Number(insertId);
    if (isNaN(finalInsertId)) {
      throw new Error(`Invalid insertId: ${insertId}`);
    }
    
    const [newKB] = await db.select().from(knowledgeBaseFiles).where(eq(knowledgeBaseFiles.id, finalInsertId));
    if (!newKB) {
      throw new Error(`Knowledge base file with ID ${finalInsertId} not found after creation`);
    }
    
    return newKB;
  }

  async getAllKnowledgeBase(): Promise<KnowledgeBaseFile[]> {
    return await db.select().from(knowledgeBaseFiles);
  }

  async getKnowledgeBaseByCampaign(campaignId: number): Promise<KnowledgeBaseFile[]> {
    return await db.select().from(knowledgeBaseFiles).where(eq(knowledgeBaseFiles.campaignId, campaignId));
  }

  async checkDuplicateKnowledgeBase(fileName: string, campaignId: number): Promise<boolean> {
    const result = await db
      .select()
      .from(knowledgeBaseFiles)
      .where(and(
        eq(knowledgeBaseFiles.filename, fileName),
        eq(knowledgeBaseFiles.campaignId, campaignId)
      ))
      .limit(1);
    return result.length > 0;
  }

  async deleteKnowledgeBase(id: number): Promise<boolean> {
    const result = await db.delete(knowledgeBaseFiles).where(eq(knowledgeBaseFiles.id, id));
    return (result as any).affectedRows > 0;
  }

  async deleteKnowledgeBaseByCampaign(campaignId: number): Promise<void> {
    await db.delete(knowledgeBaseFiles).where(eq(knowledgeBaseFiles.campaignId, campaignId));
  }

  // Call log operations
  async createCallLog(callLog: InsertCallLog): Promise<CallLog> {
    const result = await db.insert(callLogs).values(callLog);
    
    // Handle different MySQL2 result formats
    let insertId: number;
    if (result && typeof result === 'object') {
      insertId = (result as any).insertId || (result as any)[0]?.insertId || (result as any).lastInsertRowid;
      
      if (insertId === undefined || insertId === null) {
        // Fallback: get the last inserted call log for this campaign
        const [lastCallLog] = await db
          .select()
          .from(callLogs)
          .where(eq(callLogs.campaignId, callLog.campaignId))
          .orderBy(desc(callLogs.id))
          .limit(1);
        
        if (lastCallLog) {
          return lastCallLog;
        } else {
          throw new Error("Failed to retrieve created call log");
        }
      }
    } else {
      throw new Error("Invalid insert result format");
    }
    
    const finalInsertId = Number(insertId);
    if (isNaN(finalInsertId)) {
      throw new Error(`Invalid insertId: ${insertId}`);
    }
    
    const [newCallLog] = await db.select().from(callLogs).where(eq(callLogs.id, finalInsertId));
    if (!newCallLog) {
      throw new Error(`Call log with ID ${finalInsertId} not found after creation`);
    }
    
    return newCallLog;
  }

  async getCallLogsByCampaign(campaignId: number): Promise<CallLog[]> {
    return await db.select().from(callLogs).where(eq(callLogs.campaignId, campaignId));
  }

  async getAllCallLogs(): Promise<CallLog[]> {
    return await db.select().from(callLogs);
  }

  async updateCallLog(id: number, updates: Partial<CallLog>): Promise<CallLog | undefined> {
    await db.update(callLogs).set(updates).where(eq(callLogs.id, id));
    const [updatedCallLog] = await db.select().from(callLogs).where(eq(callLogs.id, id));
    return updatedCallLog;
  }

  async updateCallLogByTwilioSid(twilioCallSid: string, updates: Partial<CallLog>): Promise<CallLog | undefined> {
    await db.update(callLogs).set(updates).where(eq(callLogs.twilioCallSid, twilioCallSid));
    const [updatedCallLog] = await db.select().from(callLogs).where(eq(callLogs.twilioCallSid, twilioCallSid));
    return updatedCallLog;
  }

  async deleteCallLog(id: number): Promise<void> {
    await db.delete(callLogs).where(eq(callLogs.id, id));
  }
}

// Export singleton instance
export const storage = new DatabaseStorage();
