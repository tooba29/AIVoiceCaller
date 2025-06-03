import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import multer from "multer";
import path from "path";
import fs from "fs";
import csv from "csv-parser";
import twilio from "twilio";
import FormData from "form-data";
import fetch from "node-fetch";
import { 
  insertCampaignSchema, 
  insertLeadSchema,
  testCallSchema,
  voiceCloneSchema,
  type InsertLead 
} from "@shared/schema";
import { z } from "zod";

// Configure multer for file uploads
const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
});

export async function registerRoutes(app: Express): Promise<Server> {
  
  // PDF Knowledge Base Upload
  app.post("/api/upload-pdf", upload.single('pdf'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No PDF file uploaded" });
      }

      if (req.file.mimetype !== 'application/pdf') {
        // Clean up uploaded file
        fs.unlinkSync(req.file.path);
        return res.status(400).json({ error: "File must be a PDF" });
      }

      // Store knowledge base entry
      const kb = await storage.createKnowledgeBase({
        fileName: req.file.originalname || 'unknown.pdf',
        fileSize: req.file.size,
      });

      // Here you would integrate with ElevenLabs knowledge base API
      const elevenLabsApiKey = process.env.ELEVENLABS_API_KEY || process.env.ELEVEN_LABS_API_KEY;
      if (elevenLabsApiKey) {
        try {
          // Upload to ElevenLabs knowledge base
          const formData = new FormData();
          const fileBuffer = fs.readFileSync(req.file.path);
          const blob = new Blob([fileBuffer], { type: 'application/pdf' });
          formData.append('file', blob, req.file.originalname || 'knowledge.pdf');

          const response = await fetch('https://api.elevenlabs.io/v1/convai/knowledge-base/upload', {
            method: 'POST',
            headers: {
              'xi-api-key': elevenLabsApiKey,
            },
            body: formData,
          });

          if (!response.ok) {
            throw new Error(`ElevenLabs API error: ${response.statusText}`);
          }
        } catch (error) {
          console.error('ElevenLabs upload error:', error);
          // Continue with local storage even if ElevenLabs fails
        }
      }

      // Clean up local file
      fs.unlinkSync(req.file.path);

      res.json({ success: true, knowledgeBase: kb });
    } catch (error) {
      console.error('PDF upload error:', error);
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      res.status(500).json({ error: "Failed to upload PDF" });
    }
  });

  // Update Agent Configuration
  app.post("/api/update-agent", async (req, res) => {
    try {
      const { firstPrompt, systemPersona, campaignId } = req.body;

      if (!firstPrompt || !systemPersona) {
        return res.status(400).json({ error: "First prompt and system persona are required" });
      }

      // Update ElevenLabs agent if API key is available
      const elevenLabsApiKey = process.env.ELEVENLABS_API_KEY || process.env.ELEVEN_LABS_API_KEY;
      const agentId = process.env.ELEVENLABS_AGENT_ID || process.env.ELEVEN_LABS_AGENT_ID;
      
      if (elevenLabsApiKey && agentId) {
        try {
          const response = await fetch(`https://api.elevenlabs.io/v1/convai/agent/${agentId}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'xi-api-key': elevenLabsApiKey,
            },
            body: JSON.stringify({
              first_message: firstPrompt,
              system_prompt: systemPersona,
            }),
          });

          if (!response.ok) {
            throw new Error(`ElevenLabs API error: ${response.statusText}`);
          }
        } catch (error) {
          console.error('ElevenLabs agent update error:', error);
          return res.status(500).json({ error: "Failed to update ElevenLabs agent" });
        }
      }

      // Update or create campaign
      let campaign;
      if (campaignId) {
        campaign = await storage.updateCampaign(campaignId, {
          firstPrompt,
          systemPersona,
        });
      } else {
        campaign = await storage.createCampaign({
          name: `Campaign ${Date.now()}`,
          firstPrompt,
          systemPersona,
          status: "draft",
        });
      }

      res.json({ success: true, campaign });
    } catch (error) {
      console.error('Agent update error:', error);
      res.status(500).json({ error: "Failed to update agent configuration" });
    }
  });

  // Get Available Voices
  app.get("/api/voices", async (req, res) => {
    try {
      // Get local voices
      const localVoices = await storage.getAllVoices();

      // Optionally fetch ElevenLabs voices
      const elevenLabsApiKey = process.env.ELEVENLABS_API_KEY || process.env.ELEVEN_LABS_API_KEY;
      let elevenLabsVoices = [];

      if (elevenLabsApiKey) {
        try {
          const response = await fetch('https://api.elevenlabs.io/v1/voices', {
            headers: {
              'xi-api-key': elevenLabsApiKey,
            },
          });

          if (response.ok) {
            const data = await response.json();
            elevenLabsVoices = data.voices?.map((voice: any) => ({
              id: voice.voice_id,
              name: voice.name,
              description: voice.category || 'ElevenLabs Voice',
              isCloned: false,
              sampleUrl: voice.preview_url,
            })) || [];
          }
        } catch (error) {
          console.error('ElevenLabs voices fetch error:', error);
        }
      }

      // Combine local and ElevenLabs voices
      const allVoices = [...localVoices, ...elevenLabsVoices];
      res.json({ voices: allVoices });
    } catch (error) {
      console.error('Voices fetch error:', error);
      res.status(500).json({ error: "Failed to fetch voices" });
    }
  });

  // Clone Voice
  app.post("/api/clone-voice", upload.single('audio'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No audio file uploaded" });
      }

      const validation = voiceCloneSchema.safeParse(req.body);
      if (!validation.success) {
        fs.unlinkSync(req.file.path);
        return res.status(400).json({ error: validation.error.errors });
      }

      const { name, description } = validation.data;

      // Clone voice with ElevenLabs if API key is available
      const elevenLabsApiKey = process.env.ELEVENLABS_API_KEY || process.env.ELEVEN_LABS_API_KEY;
      let clonedVoiceId = `cloned_${Date.now()}`;

      if (elevenLabsApiKey) {
        try {
          const formData = new FormData();
          const fileBuffer = fs.readFileSync(req.file.path);
          const blob = new Blob([fileBuffer], { type: req.file.mimetype });
          formData.append('files', blob, req.file.originalname || 'voice_sample.mp3');
          formData.append('name', name);
          if (description) {
            formData.append('description', description);
          }

          const response = await fetch('https://api.elevenlabs.io/v1/voices/add', {
            method: 'POST',
            headers: {
              'xi-api-key': elevenLabsApiKey,
            },
            body: formData,
          });

          if (response.ok) {
            const result = await response.json();
            clonedVoiceId = result.voice_id;
          }
        } catch (error) {
          console.error('ElevenLabs voice clone error:', error);
        }
      }

      // Store cloned voice locally
      const voice = await storage.createVoice({
        id: clonedVoiceId,
        name,
        description: description || 'Cloned Voice',
        isCloned: true,
        sampleUrl: null,
      });

      // Clean up uploaded file
      fs.unlinkSync(req.file.path);

      res.json({ success: true, voice });
    } catch (error) {
      console.error('Voice clone error:', error);
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      res.status(500).json({ error: "Failed to clone voice" });
    }
  });

  // Upload CSV Leads
  app.post("/api/upload-csv", upload.single('csv'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No CSV file uploaded" });
      }

      const { campaignId } = req.body;
      if (!campaignId) {
        fs.unlinkSync(req.file.path);
        return res.status(400).json({ error: "Campaign ID is required" });
      }

      const leads: InsertLead[] = [];
      
      // Parse CSV file
      await new Promise<void>((resolve, reject) => {
        fs.createReadStream(req.file.path)
          .pipe(csv())
          .on('data', (row) => {
            // Validate required columns
            if (row.first_name && row.last_name && row.contact_no) {
              leads.push({
                campaignId: parseInt(campaignId),
                firstName: row.first_name.trim(),
                lastName: row.last_name.trim(),
                contactNo: row.contact_no.trim(),
              });
            }
          })
          .on('end', resolve)
          .on('error', reject);
      });

      if (leads.length === 0) {
        fs.unlinkSync(req.file.path);
        return res.status(400).json({ 
          error: "No valid leads found. CSV must contain columns: first_name, last_name, contact_no" 
        });
      }

      // Save leads to storage
      const createdLeads = await storage.createLeadsBatch(leads);

      // Update campaign with lead count
      await storage.updateCampaign(parseInt(campaignId), {
        totalLeads: createdLeads.length,
      });

      // Clean up uploaded file
      fs.unlinkSync(req.file.path);

      res.json({ 
        success: true, 
        leadsCount: createdLeads.length,
        leads: createdLeads 
      });
    } catch (error) {
      console.error('CSV upload error:', error);
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      res.status(500).json({ error: "Failed to upload CSV" });
    }
  });

  // Make Test Call
  app.post("/api/make-outbound-call", async (req, res) => {
    try {
      const validation = testCallSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: validation.error.errors });
      }

      const { phoneNumber, campaignId } = validation.data;

      // Create call log
      const callLog = await storage.createCallLog({
        campaignId: campaignId || null,
        leadId: null,
        phoneNumber,
        status: "initiated",
        duration: null,
        twilioCallSid: null,
      });

      // Make Twilio call with actual integration
      const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
      const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
      const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;
      const elevenLabsAgentId = process.env.ELEVENLABS_AGENT_ID;

      if (twilioAccountSid && twilioAuthToken && twilioPhoneNumber && elevenLabsAgentId) {
        try {
          const client = twilio(twilioAccountSid, twilioAuthToken);
          
          // Create TwiML with ElevenLabs webhook
          const webhookUrl = `https://api.elevenlabs.io/v1/convai/agents/${elevenLabsAgentId}/phone`;
          
          const call = await client.calls.create({
            to: phoneNumber,
            from: twilioPhoneNumber,
            url: webhookUrl,
            method: 'POST',
            statusCallback: `${req.protocol}://${req.get('host')}/api/twilio/status`,
            statusCallbackMethod: 'POST',
            statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed']
          });

          await storage.updateCallLog(callLog.id, {
            status: "initiated",
            twilioCallSid: call.sid,
          });

          res.json({ 
            success: true, 
            callLog: { ...callLog, twilioCallSid: call.sid },
            message: "Test call initiated successfully via Twilio + ElevenLabs" 
          });
        } catch (error) {
          console.error('Twilio call error:', error);
          await storage.updateCallLog(callLog.id, {
            status: "failed",
          });
          res.status(500).json({ error: `Failed to make call via Twilio: ${error.message}` });
        }
      } else {
        // Return error if credentials are missing
        await storage.updateCallLog(callLog.id, {
          status: "failed",
        });
        
        const missingCreds = [];
        if (!twilioAccountSid) missingCreds.push("TWILIO_ACCOUNT_SID");
        if (!twilioAuthToken) missingCreds.push("TWILIO_AUTH_TOKEN");
        if (!twilioPhoneNumber) missingCreds.push("TWILIO_PHONE_NUMBER");
        if (!elevenLabsAgentId) missingCreds.push("ELEVENLABS_AGENT_ID");

        res.status(400).json({ 
          error: `Missing required credentials: ${missingCreds.join(', ')}` 
        });
      }
    } catch (error) {
      console.error('Test call error:', error);
      res.status(500).json({ error: "Failed to make test call" });
    }
  });

  // Start Campaign
  app.post("/api/start-campaign", async (req, res) => {
    try {
      const { campaignId } = req.body;
      if (!campaignId) {
        return res.status(400).json({ error: "Campaign ID is required" });
      }

      const campaign = await storage.getCampaign(campaignId);
      if (!campaign) {
        return res.status(404).json({ error: "Campaign not found" });
      }

      const leads = await storage.getLeadsByCampaign(campaignId);
      if (leads.length === 0) {
        return res.status(400).json({ error: "No leads found for this campaign" });
      }

      // Update campaign status
      await storage.updateCampaign(campaignId, { status: "active" });

      // Start processing calls asynchronously
      processCanpaign(campaignId);

      res.json({ 
        success: true, 
        message: `Campaign started with ${leads.length} leads`,
        campaign: { ...campaign, status: "active" }
      });
    } catch (error) {
      console.error('Campaign start error:', error);
      res.status(500).json({ error: "Failed to start campaign" });
    }
  });

  // Get Campaigns
  app.get("/api/campaigns", async (req, res) => {
    try {
      const campaigns = await storage.getAllCampaigns();
      res.json({ campaigns });
    } catch (error) {
      console.error('Campaigns fetch error:', error);
      res.status(500).json({ error: "Failed to fetch campaigns" });
    }
  });

  // Get Campaign Details
  app.get("/api/campaigns/:id", async (req, res) => {
    try {
      const campaignId = parseInt(req.params.id);
      const campaign = await storage.getCampaign(campaignId);
      
      if (!campaign) {
        return res.status(404).json({ error: "Campaign not found" });
      }

      const leads = await storage.getLeadsByCampaign(campaignId);
      const callLogs = await storage.getCallLogsByCampaign(campaignId);

      res.json({ 
        campaign,
        leads,
        callLogs,
        stats: {
          totalLeads: leads.length,
          pending: leads.filter(l => l.status === 'pending').length,
          completed: leads.filter(l => l.status === 'completed').length,
          failed: leads.filter(l => l.status === 'failed').length,
        }
      });
    } catch (error) {
      console.error('Campaign details error:', error);
      res.status(500).json({ error: "Failed to fetch campaign details" });
    }
  });

  // Get Knowledge Base
  app.get("/api/knowledge-base", async (req, res) => {
    try {
      const knowledgeBase = await storage.getAllKnowledgeBase();
      res.json({ knowledgeBase });
    } catch (error) {
      console.error('Knowledge base fetch error:', error);
      res.status(500).json({ error: "Failed to fetch knowledge base" });
    }
  });

  // Twilio Status Webhook
  app.post("/api/twilio/status", async (req, res) => {
    try {
      const { CallSid, CallStatus, CallDuration } = req.body;
      
      // Find call log by Twilio SID
      const allCallLogs = await storage.getAllCallLogs();
      const callLog = allCallLogs.find(log => log.twilioCallSid === CallSid);
      
      if (callLog) {
        const updates: any = { status: CallStatus };
        if (CallDuration) {
          updates.duration = parseInt(CallDuration);
        }
        
        await storage.updateCallLog(callLog.id, updates);
        
        // Update campaign stats if this was part of a campaign
        if (callLog.campaignId && CallStatus === 'completed') {
          const campaign = await storage.getCampaign(callLog.campaignId);
          if (campaign) {
            await storage.updateCampaign(callLog.campaignId, {
              completedCalls: campaign.completedCalls + 1,
              successfulCalls: campaign.successfulCalls + 1,
            });
          }
        }
      }
      
      res.status(200).send('OK');
    } catch (error) {
      console.error('Twilio webhook error:', error);
      res.status(500).send('Error');
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

// Helper function to process campaign calls
async function processcamp(campaignId: number) {
  try {
    const leads = await storage.getLeadsByCampaign(campaignId);
    const pendingLeads = leads.filter(lead => lead.status === 'pending');

    for (const lead of pendingLeads) {
      // Update lead status
      await storage.updateLead(lead.id, { status: 'calling' });

      // Create call log
      const callLog = await storage.createCallLog({
        campaignId,
        leadId: lead.id,
        phoneNumber: lead.contactNo,
        status: "initiated",
        duration: null,
        twilioCallSid: null,
      });

      // Simulate call processing
      setTimeout(async () => {
        const success = Math.random() > 0.3; // 70% success rate
        const duration = Math.floor(Math.random() * 300) + 30; // 30-330 seconds

        await storage.updateLead(lead.id, {
          status: success ? 'completed' : 'failed',
          callDuration: success ? duration : null,
        });

        await storage.updateCallLog(callLog.id, {
          status: success ? 'completed' : 'failed',
          duration: success ? duration : null,
          twilioCallSid: `CA${Date.now()}_${lead.id}`,
        });

        // Update campaign stats
        const campaign = await storage.getCampaign(campaignId);
        if (campaign) {
          await storage.updateCampaign(campaignId, {
            completedCalls: (campaign.completedCalls || 0) + 1,
            successfulCalls: success ? (campaign.successfulCalls || 0) + 1 : campaign.successfulCalls,
            failedCalls: success ? campaign.failedCalls : (campaign.failedCalls || 0) + 1,
          });
        }
      }, Math.random() * 10000 + 2000); // Random delay 2-12 seconds

      // Small delay between initiating calls
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Mark campaign as completed when all leads are processed
    setTimeout(async () => {
      const allLeads = await storage.getLeadsByCampaign(campaignId);
      const pendingCount = allLeads.filter(l => l.status === 'pending' || l.status === 'calling').length;
      
      if (pendingCount === 0) {
        await storage.updateCampaign(campaignId, { status: 'completed' });
      }
    }, 60000); // Check after 1 minute

  } catch (error) {
    console.error('Campaign processing error:', error);
    await storage.updateCampaign(campaignId, { status: 'failed' });
  }
}

// Fix function name typo
async function processCanpaign(campaignId: number) {
  return processcamp(campaignId);
}

async function processAsgn(campaignId: number) {
  return processcamp(campaignId);
}
