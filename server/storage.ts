import { 
  campaigns, 
  leads, 
  voices, 
  knowledgeBase, 
  callLogs,
  type Campaign, 
  type InsertCampaign, 
  type Lead, 
  type InsertLead,
  type Voice,
  type InsertVoice,
  type KnowledgeBase,
  type InsertKnowledgeBase,
  type CallLog,
  type InsertCallLog
} from "@shared/schema";

export interface IStorage {
  // Campaign operations
  createCampaign(campaign: InsertCampaign): Promise<Campaign>;
  getCampaign(id: number): Promise<Campaign | undefined>;
  getAllCampaigns(): Promise<Campaign[]>;
  updateCampaign(id: number, updates: Partial<Campaign>): Promise<Campaign | undefined>;
  deleteCampaign(id: number): Promise<boolean>;

  // Lead operations
  createLead(lead: InsertLead): Promise<Lead>;
  getLeadsByCampaign(campaignId: number): Promise<Lead[]>;
  updateLead(id: number, updates: Partial<Lead>): Promise<Lead | undefined>;
  createLeadsBatch(leads: InsertLead[]): Promise<Lead[]>;

  // Voice operations
  createVoice(voice: InsertVoice): Promise<Voice>;
  getAllVoices(): Promise<Voice[]>;
  getVoice(id: string): Promise<Voice | undefined>;
  deleteVoice(id: string): Promise<boolean>;

  // Knowledge base operations
  createKnowledgeBase(kb: InsertKnowledgeBase): Promise<KnowledgeBase>;
  getAllKnowledgeBase(): Promise<KnowledgeBase[]>;
  deleteKnowledgeBase(id: number): Promise<boolean>;

  // Call log operations
  createCallLog(callLog: InsertCallLog): Promise<CallLog>;
  getCallLogsByCampaign(campaignId: number): Promise<CallLog[]>;
  updateCallLog(id: number, updates: Partial<CallLog>): Promise<CallLog | undefined>;
}

export class MemStorage implements IStorage {
  private campaigns: Map<number, Campaign> = new Map();
  private leads: Map<number, Lead> = new Map();
  private voices: Map<string, Voice> = new Map();
  private knowledgeBase: Map<number, KnowledgeBase> = new Map();
  private callLogs: Map<number, CallLog> = new Map();
  
  private campaignIdCounter = 1;
  private leadIdCounter = 1;
  private kbIdCounter = 1;
  private callLogIdCounter = 1;

  constructor() {
    // Initialize with some default voices
    this.initializeDefaultVoices();
  }

  private initializeDefaultVoices() {
    const defaultVoices: Voice[] = [
      {
        id: "voice_1",
        name: "Sarah",
        description: "Professional Female",
        isCloned: false,
        sampleUrl: null,
      },
      {
        id: "voice_2", 
        name: "Michael",
        description: "Friendly Male",
        isCloned: false,
        sampleUrl: null,
      },
      {
        id: "voice_3",
        name: "Emma",
        description: "Warm Female",
        isCloned: false,
        sampleUrl: null,
      }
    ];

    defaultVoices.forEach(voice => this.voices.set(voice.id, voice));
  }

  // Campaign operations
  async createCampaign(campaign: InsertCampaign): Promise<Campaign> {
    const id = this.campaignIdCounter++;
    const newCampaign: Campaign = {
      ...campaign,
      id,
      totalLeads: 0,
      completedCalls: 0,
      successfulCalls: 0,
      failedCalls: 0,
      createdAt: new Date(),
    };
    this.campaigns.set(id, newCampaign);
    return newCampaign;
  }

  async getCampaign(id: number): Promise<Campaign | undefined> {
    return this.campaigns.get(id);
  }

  async getAllCampaigns(): Promise<Campaign[]> {
    return Array.from(this.campaigns.values());
  }

  async updateCampaign(id: number, updates: Partial<Campaign>): Promise<Campaign | undefined> {
    const campaign = this.campaigns.get(id);
    if (!campaign) return undefined;
    
    const updatedCampaign = { ...campaign, ...updates };
    this.campaigns.set(id, updatedCampaign);
    return updatedCampaign;
  }

  async deleteCampaign(id: number): Promise<boolean> {
    return this.campaigns.delete(id);
  }

  // Lead operations
  async createLead(lead: InsertLead): Promise<Lead> {
    const id = this.leadIdCounter++;
    const newLead: Lead = {
      ...lead,
      id,
      status: "pending",
      callDuration: null,
      createdAt: new Date(),
    };
    this.leads.set(id, newLead);
    return newLead;
  }

  async getLeadsByCampaign(campaignId: number): Promise<Lead[]> {
    return Array.from(this.leads.values()).filter(lead => lead.campaignId === campaignId);
  }

  async updateLead(id: number, updates: Partial<Lead>): Promise<Lead | undefined> {
    const lead = this.leads.get(id);
    if (!lead) return undefined;
    
    const updatedLead = { ...lead, ...updates };
    this.leads.set(id, updatedLead);
    return updatedLead;
  }

  async createLeadsBatch(leads: InsertLead[]): Promise<Lead[]> {
    const createdLeads: Lead[] = [];
    for (const lead of leads) {
      const createdLead = await this.createLead(lead);
      createdLeads.push(createdLead);
    }
    return createdLeads;
  }

  // Voice operations
  async createVoice(voice: InsertVoice): Promise<Voice> {
    this.voices.set(voice.id, voice);
    return voice;
  }

  async getAllVoices(): Promise<Voice[]> {
    return Array.from(this.voices.values());
  }

  async getVoice(id: string): Promise<Voice | undefined> {
    return this.voices.get(id);
  }

  async deleteVoice(id: string): Promise<boolean> {
    return this.voices.delete(id);
  }

  // Knowledge base operations
  async createKnowledgeBase(kb: InsertKnowledgeBase): Promise<KnowledgeBase> {
    const id = this.kbIdCounter++;
    const newKB: KnowledgeBase = {
      ...kb,
      id,
      uploadedAt: new Date(),
    };
    this.knowledgeBase.set(id, newKB);
    return newKB;
  }

  async getAllKnowledgeBase(): Promise<KnowledgeBase[]> {
    return Array.from(this.knowledgeBase.values());
  }

  async deleteKnowledgeBase(id: number): Promise<boolean> {
    return this.knowledgeBase.delete(id);
  }

  // Call log operations
  async createCallLog(callLog: InsertCallLog): Promise<CallLog> {
    const id = this.callLogIdCounter++;
    const newCallLog: CallLog = {
      ...callLog,
      id,
      createdAt: new Date(),
    };
    this.callLogs.set(id, newCallLog);
    return newCallLog;
  }

  async getCallLogsByCampaign(campaignId: number): Promise<CallLog[]> {
    return Array.from(this.callLogs.values()).filter(log => log.campaignId === campaignId);
  }

  async updateCallLog(id: number, updates: Partial<CallLog>): Promise<CallLog | undefined> {
    const callLog = this.callLogs.get(id);
    if (!callLog) return undefined;
    
    const updatedCallLog = { ...callLog, ...updates };
    this.callLogs.set(id, updatedCallLog);
    return updatedCallLog;
  }
}

export const storage = new MemStorage();
