import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { requireAuth } from "./auth";
import multer from "multer";
import path from "path";
import fs from "fs";
import csv from "csv-parser";
import twilio, { Twilio } from "twilio";
import FormData from "form-data";
import fetch from "node-fetch";
import { 
  insertCampaignSchema, 
  insertLeadSchema,
  testCallSchema,
  voiceCloneSchema,
  type InsertLead,
  type Voice,
  type Campaign,
  type Lead,
  type User
} from "@shared/schema";
import { z } from "zod";
import { Request } from 'express';
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import ffmpeg from 'fluent-ffmpeg';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import { WebSocketServer, WebSocket, RawData } from 'ws';
import { IncomingMessage } from "http";
import { log } from "./vite";

interface MulterRequest extends Request {
  file?: Express.Multer.File;
}

interface AuthenticatedRequest extends Request {
  user?: any; // Use any to avoid passport type conflicts
}

// Configure multer for file uploads
const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
});

// Configure ffmpeg path
ffmpeg.setFfmpegPath(ffmpegInstaller.path);

// Add these interfaces at the top of the file
interface ElevenLabsVoice {
  voice_id: string;
  name: string;
  category: string;
  labels?: {
    accent?: string;
    description?: string;
  };
  preview_url: string;
  settings: {
    stability: number;
    similarity_boost: number;
    style: number;
    use_speaker_boost: boolean;
  };
}

interface ElevenLabsVoicesResponse {
  voices: ElevenLabsVoice[];
}

interface ElevenLabsErrorResponse {
  detail?: string;
}

interface ElevenLabsAddVoiceResponse {
  voice_id: string;
}

interface ElevenLabsMessage {
  type: string;
  audio?: {
    chunk: string;
  };
  audio_event?: {
    audio_base_64: string;
  };
  ping_event?: {
    event_id: string;
  };
  agent_response_event?: {
    agent_response: string;
  };
  user_transcription_event?: {
    user_transcript: string;
  };
}

interface TwilioMessage {
  event: string;
  start?: {
    streamSid: string;
    callSid: string;
    customParameters?: {
      campaignId: string;
    };
  };
  media?: {
    payload: string;
  };
}

interface ElevenLabsSignedUrlResponse {
  signed_url: string;
}

interface ElevenLabsWebSocket extends WebSocket {
  readyState: 0 | 1 | 2 | 3;
}

interface ElevenLabsResponse {
  signed_url: string;
}

// Helper function to update ElevenLabs agent with current knowledge base
async function updateAgentKnowledgeBase(elevenLabsApiKey: string, campaignId: number) {
  const agentId = process.env.ELEVENLABS_AGENT_ID || process.env.ELEVEN_LABS_AGENT_ID;
  
  if (!agentId) {
    console.log('No agent ID configured, skipping agent update');
    return;
  }

  try {
    // Get all current knowledge base files for this campaign
    const knowledgeBaseFiles = await storage.getKnowledgeBaseByCampaign(campaignId);
    const knowledgeBaseDocuments = knowledgeBaseFiles
      .filter(file => file.elevenlabsDocId)
      .map(file => ({
        type: "file",
        name: file.filename.replace('.pdf', ''), // Remove .pdf extension for cleaner name
        id: file.elevenlabsDocId,
        usage_mode: "prompt"
      }));

    console.log('Updating agent with knowledge base:', {
      agentId,
      campaignId,
      knowledgeBaseDocuments
    });

    // Update the agent with current knowledge base using correct structure
    const updateResponse = await fetch(`https://api.elevenlabs.io/v1/convai/agents/${agentId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': elevenLabsApiKey,
      },
      body: JSON.stringify({
        conversation_config: {
          agent: {
            prompt: {
              knowledge_base: knowledgeBaseDocuments
            }
          }
        }
      }),
    });

    if (!updateResponse.ok) {
      const errorData = await updateResponse.text();
      console.error('Failed to update agent knowledge base:', {
        status: updateResponse.status,
        statusText: updateResponse.statusText,
        error: errorData
      });
    } else {
      const result = await updateResponse.json();
      console.log('Successfully updated agent knowledge base:', {
        agentId,
        knowledgeBaseCount: knowledgeBaseDocuments.length
      });
    }
  } catch (error) {
    console.error('Error updating agent knowledge base:', error);
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  
  // PDF Knowledge Base Upload (requires authentication)
  app.post("/api/upload-pdf", requireAuth, upload.single('pdf'), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No PDF file uploaded" });
      }

      if (req.file.mimetype !== 'application/pdf') {
        // Clean up uploaded file
        fs.unlinkSync(req.file.path);
        return res.status(400).json({ error: "File must be a PDF" });
      }

      const { campaignId } = req.body;
      if (!campaignId) {
        fs.unlinkSync(req.file.path);
        return res.status(400).json({ error: "Campaign ID is required" });
      }

      // Get campaign and verify ownership
      const campaign = await storage.getCampaign(parseInt(campaignId));
      if (!campaign || campaign.userId !== req.user!.id) {
        fs.unlinkSync(req.file.path);
        return res.status(404).json({ error: "Campaign not found or access denied" });
      }

      // Check for duplicate filename
        const isDuplicate = await storage.checkDuplicateKnowledgeBase(
          req.file.originalname,
          parseInt(campaignId)
        );

        if (isDuplicate) {
          fs.unlinkSync(req.file.path);
          return res.status(400).json({ 
            error: "A file with this name already exists for this campaign. Please upload a different file or rename it." 
          });
      }

      // Get existing knowledge base files for this campaign
      const existingFiles = await storage.getKnowledgeBaseByCampaign(parseInt(campaignId));

      // ElevenLabs integration logic remains the same but with user authentication
      const elevenLabsApiKey = process.env.ELEVENLABS_API_KEY || process.env.ELEVEN_LABS_API_KEY;
      const agentId = process.env.ELEVENLABS_AGENT_ID || process.env.ELEVEN_LABS_AGENT_ID;

      let elevenlabsDocId = null;

      if (elevenLabsApiKey) {
        try {
          // Delete existing files from ElevenLabs knowledge base
          for (const file of existingFiles) {
            if (file.elevenlabsDocId) {
              try {
                const deleteResponse = await fetch(`https://api.elevenlabs.io/v1/convai/knowledge-base/${file.elevenlabsDocId}`, {
                  method: 'DELETE',
                  headers: {
                    'xi-api-key': elevenLabsApiKey,
                  },
                });

                if (deleteResponse.ok || deleteResponse.status === 404) {
                  console.log(`Successfully deleted knowledge base document: ${file.elevenlabsDocId}`);
                } else {
                  console.error('Failed to delete specific file from ElevenLabs:', await deleteResponse.text());
                }
              } catch (deleteError) {
                console.error('Error deleting existing knowledge base file:', deleteError);
              }
            }
          }

          // Upload new knowledge base file using the correct endpoint
          const formData = new FormData();
          formData.append('file', fs.createReadStream(req.file.path), {
            filename: req.file.originalname,
            contentType: 'application/pdf'
          });

          console.log('Uploading to ElevenLabs knowledge base:', req.file.originalname);
          
          const uploadResponse = await fetch('https://api.elevenlabs.io/v1/convai/knowledge-base/file', {
            method: 'POST',
            headers: {
              'xi-api-key': elevenLabsApiKey,
            },
            body: formData,
          });

          if (!uploadResponse.ok) {
            const errorText = await uploadResponse.text();
            console.error('ElevenLabs upload failed:', {
              status: uploadResponse.status,
              statusText: uploadResponse.statusText,
              error: errorText
            });
          } else {
            const uploadResult = await uploadResponse.json() as { id?: string; name?: string };
            elevenlabsDocId = uploadResult.id;
            console.log('Successfully uploaded to ElevenLabs:', {
              id: uploadResult.id,
              name: uploadResult.name
            });
          }

        } catch (elevenLabsError) {
          console.error('ElevenLabs integration error:', elevenLabsError);
        }
      }

      // Delete existing knowledge base files from database
      await storage.deleteKnowledgeBaseByCampaign(parseInt(campaignId));

      // Save new knowledge base file to database
      const knowledgeBaseFile = await storage.createKnowledgeBase({
        campaignId: parseInt(campaignId),
        filename: req.file.originalname,
        fileUrl: req.file.path,
        elevenlabsDocId: elevenlabsDocId
      });

      // Update the agent with the new knowledge base AFTER saving to database
      if (elevenLabsApiKey && elevenlabsDocId) {
        try {
          await updateAgentKnowledgeBase(elevenLabsApiKey, parseInt(campaignId));
        } catch (agentUpdateError) {
          console.error('Failed to update agent after database save:', agentUpdateError);
        }
      }

      // Clean up uploaded file
      fs.unlinkSync(req.file.path);

      res.json({ 
        message: "PDF uploaded successfully",
        knowledgeBase: {
          ...knowledgeBaseFile,
          fileSize: req.file.size
        }
      });

    } catch (error) {
      console.error('PDF upload error:', error);
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      res.status(500).json({ error: "Failed to upload PDF" });
    }
  });

  // Get all campaigns (user-specific) with real-time stats
  app.get("/api/campaigns", requireAuth, async (req: any, res) => {
    try {
      const campaigns = await storage.getAllCampaigns(req.user!.id);
      
      // Add knowledge base information and calculate real-time stats for each campaign
      const campaignsWithRealStats = await Promise.all(
        campaigns.map(async (campaign) => {
          // Get knowledge base info
          const knowledgeBaseFiles = await storage.getKnowledgeBaseByCampaign(campaign.id);
          
          // Get actual leads data for real-time stats
          const leads = await storage.getLeadsByCampaign(campaign.id);
          const callLogs = await storage.getCallLogsByCampaign(campaign.id);
          
          // Calculate real stats from actual data
          const totalLeads = leads.length;
          const completedLeads = leads.filter(l => l.status === 'completed');
          const failedLeads = leads.filter(l => l.status === 'failed');
          const pendingLeads = leads.filter(l => l.status === 'pending');
          const callingLeads = leads.filter(l => l.status === 'calling');
          
          // Calculate call stats
          const completedCalls = completedLeads.length + failedLeads.length;
          const successfulCalls = completedLeads.length;
          const failedCalls = failedLeads.length;
          
          // Calculate average duration from call logs
          const completedCallLogs = callLogs.filter(log => log.status === 'completed' && log.duration);
          const totalDuration = completedCallLogs.reduce((sum, log) => sum + (log.duration || 0), 0);
          const averageDuration = completedCallLogs.length > 0 
            ? Math.round(totalDuration / completedCallLogs.length) 
            : 0;
          
          return {
            ...campaign,
            // Override with real-time calculated stats
            totalLeads,
            completedCalls,
            successfulCalls,
            failedCalls,
            // Add extra stats for dashboard
            pendingLeads: pendingLeads.length,
            callingLeads: callingLeads.length,
            averageDuration,
            knowledgeBaseId: knowledgeBaseFiles.length > 0 ? knowledgeBaseFiles[0].id.toString() : null
          };
        })
      );
      
      res.json({ campaigns: campaignsWithRealStats });
    } catch (error) {
      console.error('Get campaigns error:', error);
      res.status(500).json({ error: "Failed to fetch campaigns" });
    }
  });

  // Create campaign (requires authentication)
  app.post("/api/campaigns", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const validatedData = insertCampaignSchema.parse({
        ...req.body,
        userId: req.user!.id
      });

      const campaign = await storage.createCampaign(validatedData);
      res.status(201).json(campaign);
    } catch (error) {
      console.error('Create campaign error:', error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid campaign data", details: error.errors });
      } else {
        res.status(500).json({ error: "Failed to create campaign" });
      }
    }
  });

  // Get specific campaign (with ownership check)
  app.get("/api/campaigns/:id", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const campaignId = parseInt(req.params.id);
      const campaign = await storage.getCampaign(campaignId);
      
      if (!campaign || campaign.userId !== req.user!.id) {
        return res.status(404).json({ error: "Campaign not found" });
      }
      
      res.json(campaign);
        } catch (error) {
      console.error('Get campaign error:', error);
      res.status(500).json({ error: "Failed to fetch campaign" });
    }
  });

  // Update campaign (with ownership check)
  app.put("/api/campaigns/:id", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const campaignId = parseInt(req.params.id);
      
      // Check ownership first
      const existingCampaign = await storage.getCampaign(campaignId);
      if (!existingCampaign || existingCampaign.userId !== req.user!.id) {
        return res.status(404).json({ error: "Campaign not found" });
      }

      const updatedCampaign = await storage.updateCampaign(campaignId, req.body);
      
      if (!updatedCampaign) {
        return res.status(404).json({ error: "Campaign not found" });
      }
      
      res.json(updatedCampaign);
    } catch (error) {
      console.error('Update campaign error:', error);
      res.status(500).json({ error: "Failed to update campaign" });
    }
  });

  // Delete campaign (with ownership check)
  app.delete("/api/campaigns/:id", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const campaignId = parseInt(req.params.id);
      
      console.log(`[Delete Campaign] Attempting to delete campaign ${campaignId} for user ${req.user?.id}`);
      
      // Check ownership first
      const existingCampaign = await storage.getCampaign(campaignId);
      
      console.log(`[Delete Campaign] Found campaign:`, existingCampaign ? 'Yes' : 'No');
      console.log(`[Delete Campaign] Campaign user ID:`, existingCampaign?.userId);
      console.log(`[Delete Campaign] Request user ID:`, req.user?.id);
      
      if (!existingCampaign || existingCampaign.userId !== req.user!.id) {
        console.log(`[Delete Campaign] Access denied - campaign not found or ownership mismatch`);
        return res.status(404).json({ error: "Campaign not found" });
      }

      // Get knowledge base files for this campaign before deletion
      const knowledgeBaseFiles = await storage.getKnowledgeBaseByCampaign(campaignId);
      console.log(`[Delete Campaign] Found ${knowledgeBaseFiles.length} knowledge base files to clean up`);

      // Delete knowledge base files from ElevenLabs first
      const elevenLabsApiKey = process.env.ELEVENLABS_API_KEY || process.env.ELEVEN_LABS_API_KEY;
      let elevenlabsCleanupResults: string[] = [];
      
      if (elevenLabsApiKey && knowledgeBaseFiles.length > 0) {
        console.log(`[Delete Campaign] Cleaning up ElevenLabs knowledge base files...`);
        
        for (const kbFile of knowledgeBaseFiles) {
          if (kbFile.elevenlabsDocId) {
            try {
              const deleteUrl = `https://api.elevenlabs.io/v1/convai/knowledge-base/${kbFile.elevenlabsDocId}`;
              console.log(`[Delete Campaign] Deleting ElevenLabs document: ${kbFile.elevenlabsDocId}`);
              
              const deleteResponse = await fetch(deleteUrl, {
                method: 'DELETE',
                headers: {
                  'xi-api-key': elevenLabsApiKey,
                },
              });

              if (deleteResponse.ok || deleteResponse.status === 404) {
                elevenlabsCleanupResults.push(`✓ Deleted ${kbFile.filename}`);
                console.log(`[Delete Campaign] Successfully deleted ${kbFile.filename} from ElevenLabs`);
              } else {
                const errorText = await deleteResponse.text();
                elevenlabsCleanupResults.push(`✗ Failed to delete ${kbFile.filename}: ${errorText}`);
                console.error(`[Delete Campaign] Failed to delete ${kbFile.filename}:`, errorText);
              }
            } catch (error) {
              elevenlabsCleanupResults.push(`✗ Error deleting ${kbFile.filename}: ${error}`);
              console.error(`[Delete Campaign] Error deleting ${kbFile.filename}:`, error);
            }
          }
        }

        // Update the agent to remove all knowledge base references
        try {
          const agentId = process.env.ELEVENLABS_AGENT_ID || process.env.ELEVEN_LABS_AGENT_ID;
          
          if (agentId) {
            console.log(`[Delete Campaign] Updating agent to remove knowledge base references`);
            
            const updateResponse = await fetch(`https://api.elevenlabs.io/v1/convai/agents/${agentId}`, {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
                'xi-api-key': elevenLabsApiKey,
              },
              body: JSON.stringify({
                conversation_config: {
                  agent: {
                    prompt: {
                      knowledge_base: [] // Empty knowledge base
                    }
                  }
                }
              }),
            });

            if (!updateResponse.ok) {
              const errorData = await updateResponse.text();
              console.error(`[Delete Campaign] Failed to update agent:`, errorData);
            } else {
              console.log(`[Delete Campaign] Successfully cleared agent knowledge base`);
            }
          }
        } catch (error) {
          console.error(`[Delete Campaign] Failed to update agent knowledge base:`, error);
        }
      }

      console.log(`[Delete Campaign] Proceeding with local deletion...`);
      const deleted = await storage.deleteCampaign(campaignId);
      
      if (!deleted) {
        console.log(`[Delete Campaign] Deletion failed`);
        return res.status(404).json({ error: "Campaign not found" });
      }
      
      console.log(`[Delete Campaign] Campaign ${campaignId} deleted successfully`);
      
      const responseMessage = elevenlabsCleanupResults.length > 0 
        ? `Campaign deleted successfully. Knowledge base cleanup: ${elevenlabsCleanupResults.join(', ')}`
        : "Campaign deleted successfully";
      
      res.json({ 
        message: responseMessage,
        knowledgeBaseCleanup: elevenlabsCleanupResults
      });
    } catch (error) {
      console.error('Delete campaign error:', error);
      res.status(500).json({ error: "Failed to delete campaign" });
    }
  });

  // Leads routes (with campaign ownership checks)
  app.get("/api/campaigns/:id/leads", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const campaignId = parseInt(req.params.id);
      
      // Check campaign ownership
      const campaign = await storage.getCampaign(campaignId);
      if (!campaign || campaign.userId !== req.user!.id) {
        return res.status(404).json({ error: "Campaign not found" });
      }
      
      const leads = await storage.getLeadsByCampaign(campaignId);
      res.json(leads);
    } catch (error) {
      console.error('Get leads error:', error);
      res.status(500).json({ error: "Failed to fetch leads" });
    }
  });

  // Delete all leads for a campaign
  app.delete("/api/campaigns/:id/leads", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const campaignId = parseInt(req.params.id);
      
      // Check campaign ownership
      const campaign = await storage.getCampaign(campaignId);
      if (!campaign || campaign.userId !== req.user!.id) {
        return res.status(404).json({ error: "Campaign not found" });
      }
      
      // Get all leads for the campaign
      const leads = await storage.getLeadsByCampaign(campaignId);
      
      // Delete all leads
      for (const lead of leads) {
        await storage.deleteLead(lead.id);
      }
      
      // Update campaign lead count
      await storage.updateCampaign(campaignId, {
        totalLeads: 0,
        completedCalls: 0,
        successfulCalls: 0,
        failedCalls: 0
      });
      
      res.json({ 
        success: true, 
        message: `Deleted ${leads.length} leads`,
        deletedCount: leads.length 
      });
    } catch (error) {
      console.error('Delete leads error:', error);
      res.status(500).json({ error: "Failed to delete leads" });
    }
  });

  // Get all voices (fetch from ElevenLabs + local cloned voices)
  app.get("/api/voices", async (req, res) => {
    try {
      const elevenLabsApiKey = process.env.ELEVENLABS_API_KEY?.trim() || process.env.ELEVEN_LABS_API_KEY?.trim();
      let allVoices: any[] = [];

      // Fetch voices from ElevenLabs API
      if (elevenLabsApiKey) {
        try {
          const response = await fetch("https://api.elevenlabs.io/v1/voices", {
            headers: {
              "xi-api-key": elevenLabsApiKey,
              "Accept": "application/json"
            }
          });

                      if (response.ok) {
              const data = await response.json() as ElevenLabsVoicesResponse;
              const elevenLabsVoices = data.voices.map((voice: ElevenLabsVoice) => ({
                id: voice.voice_id,
                name: voice.name,
                description: voice.labels?.description || voice.labels?.accent || `${voice.category} voice`,
                isCloned: voice.category === "cloned",
                category: voice.category as "premade" | "cloned" | "generated",
                sampleUrl: voice.preview_url,
                settings: voice.settings
              }));
              allVoices.push(...elevenLabsVoices);
            } else {
            console.error('ElevenLabs API error:', response.status, response.statusText);
            // Fall back to default voices if API fails
            const localVoices = await storage.getAllVoices();
            allVoices.push(...localVoices);
          }
    } catch (error) {
          console.error('Error fetching ElevenLabs voices:', error);
          // Fall back to default voices if API fails
          const localVoices = await storage.getAllVoices();
          allVoices.push(...localVoices);
        }
      } else {
        console.warn('No ElevenLabs API key found, using default voices only');
        // Use default voices if no API key
        const localVoices = await storage.getAllVoices();
        allVoices.push(...localVoices);
      }

      // Also get any additional locally cloned voices
      const localVoices = await storage.getAllVoices();
      const localClonedVoices = localVoices.filter(voice => 
        voice.isCloned && !allVoices.find(v => v.id === voice.id)
      );
      allVoices.push(...localClonedVoices);

      res.json({ voices: allVoices });
    } catch (error) {
      console.error('Get voices error:', error);
      res.status(500).json({ error: "Failed to fetch voices" });
    }
  });

  // Update Agent Configuration
  app.post("/api/update-agent", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const { firstPrompt, systemPersona, campaignId, voiceId, knowledgeBaseId, payload } = req.body;

      if (!firstPrompt) {
        return res.status(400).json({ error: "First prompt is required" });
      }

      // Update ElevenLabs agent if API key is available
      const elevenLabsApiKey = process.env.ELEVENLABS_API_KEY || process.env.ELEVEN_LABS_API_KEY;
      const agentId = process.env.ELEVENLABS_AGENT_ID || process.env.ELEVEN_LABS_AGENT_ID;
      
      if (elevenLabsApiKey && agentId) {
        try {
          const response = await fetch(`https://api.elevenlabs.io/v1/convai/agents/${agentId}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'xi-api-key': elevenLabsApiKey,
            },
            body: JSON.stringify(payload),
          });

          if (!response.ok) {
            const errorData = await response.json();
            console.error('ElevenLabs API error details:', JSON.stringify(errorData, null, 2));
            let errorMessage = 'Unknown error occurred';
            
            if (typeof errorData === 'object' && errorData !== null) {
              const typedError = errorData as { detail?: unknown; message?: string };
              if (typedError.detail) {
                errorMessage = typeof typedError.detail === 'string' 
                  ? typedError.detail 
                  : JSON.stringify(typedError.detail);
              } else if (typedError.message) {
                errorMessage = typedError.message;
              }
            } else if (typeof errorData === 'string') {
              errorMessage = errorData;
            }

            throw new Error(`ElevenLabs API error: ${errorMessage}`);
          }
        } catch (error: any) {
          console.error('ElevenLabs agent update error:', error);
          return res.status(500).json({ 
            error: error.message || "Failed to update ElevenLabs agent",
            details: error.response?.data || error.response || undefined
          });
        }
      }

      // Update or create campaign
      let campaign;
      if (campaignId) {
        campaign = await storage.updateCampaign(parseInt(campaignId), {
          firstPrompt,
          systemPersona,
          selectedVoiceId: voiceId
        });
      } else {
        const userId = req.user?.id;
        if (!userId) {
          return res.status(401).json({ error: "User not authenticated" });
        }
        
        campaign = await storage.createCampaign({
          name: `Campaign ${Date.now()}`,
          userId: userId,
          firstPrompt: "",
          systemPersona: "",
          selectedVoiceId: null,
          status: "draft",
          createdAt: null,
          totalLeads: null,
          completedCalls: null,
          successfulCalls: null,
          failedCalls: null
        });
      }

      // Add knowledge base information to the returned campaign
      const knowledgeBaseFiles = campaign ? await storage.getKnowledgeBaseByCampaign(campaign.id) : [];
      const campaignWithKnowledgeBase = campaign ? {
        ...campaign,
        knowledgeBaseId: knowledgeBaseFiles.length > 0 ? knowledgeBaseFiles[0].id.toString() : null
      } : null;
      
      res.json({ success: true, campaign: campaignWithKnowledgeBase });
    } catch (error: any) {
      console.error('Agent update error:', error);
      res.status(500).json({ 
        error: error.message || "Failed to update agent configuration",
        details: error.response?.data || undefined
      });
    }
  });

  // Proxy voice preview requests
  app.get("/api/voice-preview/:voiceId", async (req, res) => {
    try {
      const elevenLabsApiKey = process.env.ELEVENLABS_API_KEY?.trim() || process.env.ELEVEN_LABS_API_KEY?.trim();
      
      if (!elevenLabsApiKey) {
        return res.status(400).json({ 
          error: "ElevenLabs API key is required." 
        });
      }

      const voiceId = req.params.voiceId;
      
      // Get voice details to get the preview URL
      const voiceResponse = await fetch(`https://api.elevenlabs.io/v1/voices/${voiceId}`, {
        headers: {
          "xi-api-key": elevenLabsApiKey,
          "Accept": "application/json"
        }
      });

      if (!voiceResponse.ok) {
        return res.status(voiceResponse.status).json({
          error: `Failed to get voice details: ${voiceResponse.statusText}`
        });
      }

      const voiceData = await voiceResponse.json() as ElevenLabsVoice;
      
      if (!voiceData.preview_url) {
        return res.status(404).json({
          error: "No preview available for this voice"
        });
      }

      // Fetch the audio file with proper headers
      const audioResponse = await fetch(voiceData.preview_url, {
        headers: {
          "Accept": "audio/mpeg",
          "Range": req.headers.range || "bytes=0-"
        }
      });
      
      if (!audioResponse.ok) {
        return res.status(audioResponse.status).json({
          error: `Failed to fetch audio: ${audioResponse.statusText}`
        });
      }

      // Get content info
      const contentType = audioResponse.headers.get('content-type');
      const contentLength = audioResponse.headers.get('content-length');

      // Set response headers
      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('Content-Type', contentType || 'audio/mpeg');
      if (contentLength) {
        res.setHeader('Content-Length', contentLength);
      }
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.setHeader('Access-Control-Allow-Origin', '*');

      // Stream the audio data
      if (!audioResponse.body) {
        throw new Error('No audio data received');
      }

      audioResponse.body.pipe(res);

    } catch (error) {
      console.error('Voice preview error:', error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : "Failed to get voice preview" 
      });
    }
  });

  // Add this function after imports
  async function convertToMp3(inputPath: string): Promise<string> {
    const outputPath = inputPath.replace(/\.[^/.]+$/, "") + ".mp3";
    
    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .toFormat('mp3')
        .on('error', (err: Error) => {
          console.error('Audio conversion error:', err);
          reject(err);
        })
        .on('end', () => {
          console.log('Audio conversion completed');
          resolve(outputPath);
        })
        .save(outputPath);
    });
  }

  // Clone Voice
  app.post("/api/clone-voice", upload.single('audio'), async (req: MulterRequest, res) => {
    try {
      console.log('Debug - Starting voice clone process');
      if (!req.file) {
        return res.status(400).json({ error: "No audio file uploaded" });
      }
      console.log('Debug - File received:', {
        filename: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size
      });

      // Convert audio to MP3 if needed
      let audioFilePath = req.file.path;
      if (req.file.mimetype !== 'audio/mp3' && req.file.mimetype !== 'audio/mpeg') {
        try {
          console.log('Debug - Converting audio to MP3');
          audioFilePath = await convertToMp3(req.file.path);
          console.log('Debug - Audio converted successfully:', audioFilePath);
        } catch (conversionError) {
          console.error('Debug - Audio conversion failed:', conversionError);
          fs.unlinkSync(req.file.path);
          return res.status(400).json({ error: "Failed to convert audio file to MP3" });
        }
      }

      // Validate file size (50MB max)
      const maxSize = 50 * 1024 * 1024; // 50MB
      if (req.file.size > maxSize) {
        fs.unlinkSync(req.file.path);
        if (audioFilePath !== req.file.path) {
          fs.unlinkSync(audioFilePath);
        }
        return res.status(400).json({ error: "Audio file must be smaller than 50MB" });
      }

      const validation = voiceCloneSchema.safeParse(req.body);
      if (!validation.success) {
        fs.unlinkSync(req.file.path);
        if (audioFilePath !== req.file.path) {
          fs.unlinkSync(audioFilePath);
        }
        return res.status(400).json({ error: validation.error.errors });
      }

      const { name, description } = validation.data;
      console.log('Debug - Validated request data:', { name, description });

      // Clone voice with ElevenLabs
      const elevenLabsApiKey = process.env.ELEVENLABS_API_KEY || process.env.ELEVEN_LABS_API_KEY;
      if (!elevenLabsApiKey) {
        fs.unlinkSync(req.file.path);
        if (audioFilePath !== req.file.path) {
          fs.unlinkSync(audioFilePath);
        }
        return res.status(400).json({ error: "ElevenLabs API key is required for voice cloning" });
      }
      console.log('Debug - ElevenLabs API key found');

      try {
        console.log('Debug - Initializing ElevenLabs client');
        const elevenlabs = new ElevenLabsClient({
          apiKey: elevenLabsApiKey,
          baseUrl: "https://api.elevenlabs.io"
        });

        // Test the API key first
        console.log('Debug - Testing API connection');
        try {
          const voices = await elevenlabs.voices.getAll();
          console.log('Debug - API connection successful, found voices:', voices.voices?.length || 0);
        } catch (testError: any) {
          console.error('Debug - API test failed:', {
            error: testError,
            message: testError.message,
            response: testError.response?.data
          });
          throw new Error(`ElevenLabs API connection failed: ${testError.message}`);
        }

        // Create voice clone using the SDK
        console.log('Debug - Starting voice clone with ElevenLabs');
        let clonedVoice;
        try {
          const fileStream = fs.createReadStream(audioFilePath);
          console.log('Debug - Created file stream');
          
          clonedVoice = await elevenlabs.voices.ivc.create({
            name,
            description,
            files: [fileStream]
          });
          console.log('Debug - Voice clone response:', clonedVoice);
        } catch (apiError: any) {
          console.error('Debug - ElevenLabs API error:', {
            status: apiError.response?.status,
            message: apiError.message,
            data: apiError.response?.data,
            stack: apiError.stack
          });

          if (apiError.response?.status === 429) {
            throw new Error("Voice cloning rate limit exceeded. Please try again later.");
          }
          if (apiError.response?.status === 400) {
            throw new Error("Invalid audio file. Please ensure the file is a clear voice recording.");
          }
          if (apiError.response?.status === 401) {
            throw new Error("Invalid API key. Please check your ElevenLabs API key.");
          }

          throw new Error(`Voice cloning failed: ${apiError.message}`);
        }

        if (!clonedVoice || !clonedVoice.voiceId) {
          console.error('Debug - No voice ID in response:', clonedVoice);
          throw new Error('Failed to create voice clone - no voice ID returned');
        }

        // Fetch the newly created voice details
        console.log('Debug - Fetching voice details for:', clonedVoice.voiceId);
        const voiceDetails = await elevenlabs.voices.get(clonedVoice.voiceId).catch((error) => {
          console.error('Debug - Failed to fetch voice details:', error);
          throw new Error('Voice was cloned but failed to fetch details. Please refresh the voice list.');
        });
        
        console.log('Debug - Voice details fetched:', {
          id: voiceDetails.voiceId,
          name: voiceDetails.name,
          previewUrl: voiceDetails.previewUrl
        });

        // Store voice in local storage
        const voice = await storage.createVoice({
          id: clonedVoice.voiceId,
          name,
          description: description || 'Cloned Voice',
          isCloned: true,
          sampleUrl: voiceDetails.previewUrl,
          settings: voiceDetails.settings,
          category: 'cloned'
        });

        // Clean up files at the end
        fs.unlinkSync(req.file.path);
        if (audioFilePath !== req.file.path) {
          fs.unlinkSync(audioFilePath);
        }

        res.json({ success: true, voice });
      } catch (error: any) {
        console.error('Debug - Voice clone error details:', {
          message: error.message,
          stack: error.stack,
          response: error.response?.data
        });
        fs.unlinkSync(req.file.path);
        if (audioFilePath !== req.file.path) {
          fs.unlinkSync(audioFilePath);
        }
        res.status(error.response?.status || 500).json({ 
          error: error instanceof Error ? error.message : "Failed to clone voice" 
        });
      }
    } catch (error: any) {
      console.error('Debug - Unexpected error:', {
        message: error.message,
        stack: error.stack
      });
      if (req.file?.path) {
        fs.unlinkSync(req.file.path);
      }
      res.status(500).json({ 
        error: error instanceof Error ? error.message : "Failed to clone voice" 
      });
    }
  });

  // Upload CSV Leads
  app.post("/api/upload-csv", upload.single('csv'), async (req: MulterRequest, res) => {
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
      const filePath = req.file.path;
      
      // Parse CSV file
      await new Promise<void>((resolve, reject) => {
        fs.createReadStream(filePath)
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
      if (req.file?.path) {
        fs.unlinkSync(req.file.path);
      }
      res.status(500).json({ 
        error: error instanceof Error ? error.message : "Failed to upload CSV" 
      });
    }
  });

  // Make Test Call
  app.post("/api/make-outbound-call", async (req, res) => {
    try {
      const validation = testCallSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: validation.error.errors });
      }

      const { phoneNumber, campaignId, firstName } = validation.data;

      // Get campaign for first prompt
      const campaign = campaignId ? await storage.getCampaign(campaignId) : null;

      if (!campaignId) {
        return res.status(400).json({ error: "campaignId is required for test calls" });
      }

      console.log("[Backend] Triggering test call for", firstName);
      console.log("[Payload]", {
        dynamic_variables: { first_name: firstName }
      });
      if (campaign?.firstPrompt) {
        console.log("[ElevenLabs] first_message =>", campaign.firstPrompt);
      }

      // Create call log
      const callLog = await storage.createCallLog({
        campaignId: campaignId,  // campaignId is guaranteed to exist by validation above
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
      const ngrokUrl = process.env.NGROK_URL;

      if (!twilioAccountSid || !twilioAuthToken || !twilioPhoneNumber || !ngrokUrl) {
        throw new Error('Missing required Twilio credentials or NGROK_URL');
      }

      try {
        const twilioClient: Twilio = twilio(twilioAccountSid, twilioAuthToken);
        
        // Ensure ngrokUrl uses https
        const secureNgrokUrl = ngrokUrl.replace(/^http:/, 'https:');

        // Create TwiML URL with required parameters
        const twimlUrl = new URL(`${secureNgrokUrl}/outbound-call-twiml`);
        twimlUrl.searchParams.append('campaignId', campaignId.toString());
        twimlUrl.searchParams.append('firstName', firstName || 'there');
        twimlUrl.searchParams.append('isTestCall', 'true');

        console.log("[Twilio] Making call with TwiML URL:", twimlUrl.toString());

        const call = await twilioClient.calls.create({
          to: phoneNumber,
          from: twilioPhoneNumber,
          url: twimlUrl.toString(),
          statusCallback: `${secureNgrokUrl}/api/twilio/status`,
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
          message: "Test call initiated successfully" 
        });
      } catch (error) {
        console.error('Twilio call error:', error);
        await storage.updateCallLog(callLog.id, {
          status: "failed",
        });
        res.status(500).json({ 
          error: error instanceof Error ? error.message : "Failed to make call via Twilio" 
        });
      }
    } catch (error) {
      console.error('Test call error:', error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : "Failed to make test call" 
      });
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

      // Reset campaign stats based on actual data before starting
      const completedLeads = leads.filter(l => l.status === 'completed');
      const failedLeads = leads.filter(l => l.status === 'failed');
      
      await storage.updateCampaign(campaignId, { 
        status: "active",
        totalLeads: leads.length,
        completedCalls: completedLeads.length + failedLeads.length,
        successfulCalls: completedLeads.length,
        failedCalls: failedLeads.length
      });

      // Start processing calls asynchronously
      processCanpaign(campaignId);

      res.json({ 
        success: true, 
        message: `Campaign started with ${leads.length} leads`,
        campaign: { 
          ...campaign, 
          status: "active",
          totalLeads: leads.length,
          completedCalls: completedLeads.length + failedLeads.length,
          successfulCalls: completedLeads.length,
          failedCalls: failedLeads.length
        }
      });
    } catch (error) {
      console.error('Campaign start error:', error);
      res.status(500).json({ error: "Failed to start campaign" });
    }
  });

  // Reset Campaign Stats (utility endpoint)
  app.post("/api/campaigns/:id/reset-stats", async (req, res) => {
    try {
      const campaignId = parseInt(req.params.id);
      
      const campaign = await storage.getCampaign(campaignId);
      if (!campaign) {
        return res.status(404).json({ error: "Campaign not found" });
      }

      const leads = await storage.getLeadsByCampaign(campaignId);
      const completedLeads = leads.filter(l => l.status === 'completed');
      const failedLeads = leads.filter(l => l.status === 'failed');
      
      await storage.updateCampaign(campaignId, {
        totalLeads: leads.length,
        completedCalls: completedLeads.length + failedLeads.length,
        successfulCalls: completedLeads.length,
        failedCalls: failedLeads.length
      });

      const updatedCampaign = await storage.getCampaign(campaignId);
      
      res.json({ 
        success: true, 
        message: "Campaign stats reset successfully",
        campaign: updatedCampaign
      });
    } catch (error) {
      console.error('Reset stats error:', error);
      res.status(500).json({ error: "Failed to reset campaign stats" });
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
        
        // Update lead status if this call has a lead associated
        if (callLog.leadId) {
          let leadStatus = 'pending';
          if (CallStatus === 'completed') {
            // Determine if call was successful based on duration
            const duration = parseInt(CallDuration || '0');
            leadStatus = duration > 10 ? 'completed' : 'failed'; // Consider calls > 10 seconds as successful
          } else if (CallStatus === 'failed' || CallStatus === 'busy' || CallStatus === 'no-answer') {
            leadStatus = 'failed';
          }
          
          await storage.updateLead(callLog.leadId, { status: leadStatus });
        }
        
        // Update campaign stats if this was part of a campaign
        if (callLog.campaignId && CallStatus === 'completed') {
          const campaign = await storage.getCampaign(callLog.campaignId);
          if (campaign) {
            const duration = parseInt(CallDuration || '0');
            const isSuccessful = duration > 10; // Consider calls > 10 seconds as successful
            
            await storage.updateCampaign(callLog.campaignId, {
              completedCalls: (campaign.completedCalls ?? 0) + 1,
              successfulCalls: isSuccessful ? (campaign.successfulCalls ?? 0) + 1 : (campaign.successfulCalls ?? 0),
              failedCalls: !isSuccessful ? (campaign.failedCalls ?? 0) + 1 : (campaign.failedCalls ?? 0),
            });
          }
        } else if (callLog.campaignId && (CallStatus === 'failed' || CallStatus === 'busy' || CallStatus === 'no-answer')) {
          // Handle failed calls
          const campaign = await storage.getCampaign(callLog.campaignId);
          if (campaign) {
            await storage.updateCampaign(callLog.campaignId, {
              failedCalls: (campaign.failedCalls ?? 0) + 1,
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

  // Initialize Campaign
  app.post("/api/campaigns/initialize", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const { name, type } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: "User not authenticated" });
      }
      
      if (type !== 'new' && type !== 'existing') {
        return res.status(400).json({ error: "Invalid campaign type. Must be 'new' or 'existing'" });
      }

      if (type === 'new') {
        // Create a new campaign
        const campaign = await storage.createCampaign({
          name: name || `Campaign ${Date.now()}`,
          userId: userId,
          firstPrompt: "",
          systemPersona: "",
          selectedVoiceId: null,
          status: "draft",
          createdAt: new Date(),
          totalLeads: 0,
          completedCalls: 0,
          successfulCalls: 0,
          failedCalls: 0
        });

        // Add knowledge base information to the newly created campaign
        const knowledgeBaseFiles = await storage.getKnowledgeBaseByCampaign(campaign.id);
        const campaignWithKnowledgeBase = {
          ...campaign,
          knowledgeBaseId: knowledgeBaseFiles.length > 0 ? knowledgeBaseFiles[0].id.toString() : null
        };

        res.json({ success: true, campaign: campaignWithKnowledgeBase });
      } else {
        // Return list of existing campaigns for selection (user-specific)
        const campaigns = await storage.getAllCampaigns(userId);
        res.json({ success: true, campaigns });
      }
    } catch (error) {
      console.error('Campaign initialization error:', error);
      res.status(500).json({ error: "Failed to initialize campaign" });
    }
  });

  // Select Existing Campaign
  app.post("/api/campaigns/select", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const { campaignId } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: "User not authenticated" });
      }
      
      if (!campaignId) {
        return res.status(400).json({ error: "Campaign ID is required" });
      }

      const campaign = await storage.getCampaign(parseInt(campaignId));
      if (!campaign) {
        return res.status(404).json({ error: "Campaign not found" });
      }

      // Check if the campaign belongs to the authenticated user
      if (campaign.userId !== userId) {
        return res.status(403).json({ error: "Access denied to this campaign" });
      }

      // Add knowledge base information to the campaign
      const knowledgeBaseFiles = await storage.getKnowledgeBaseByCampaign(campaign.id);
      const campaignWithKnowledgeBase = {
        ...campaign,
        knowledgeBaseId: knowledgeBaseFiles.length > 0 ? knowledgeBaseFiles[0].id.toString() : null
      };

      res.json({ success: true, campaign: campaignWithKnowledgeBase });
    } catch (error) {
      console.error('Campaign selection error:', error);
      res.status(500).json({ error: "Failed to select campaign" });
    }
  });

  // WebSocket server for handling media streams
  const httpServer = createServer(app);
  
  // Create a path-based router for WebSocket connections
  const wsRouter = (req: IncomingMessage): boolean => {
    if (!req.url) return false;
    // Match paths like /outbound-media-stream/123
    return /^\/outbound-media-stream\/\d+$/.test(req.url);
  };

  const wss = new WebSocketServer({ 
    server: httpServer,
    verifyClient: (info: { req: IncomingMessage }) => {
      return wsRouter(info.req);
    },
    clientTracking: true
  });

  console.log("[Server] WebSocket server configured with dynamic path routing");

  // Store active WebSocket connections
  const activeConnections = new Map<string, {
    twilioWs: WebSocket;
    elevenLabsWs: WebSocket | null;
    streamSid: string;
    callSid: string;
    campaignId?: number;
  }>();

  // Store connection parameters
  const connectionParams = new Map<string, {
    isTestCall: boolean;
    firstName: string;
    leadId?: string;
  }>();

  const setupElevenLabsConnection = async (
    lead: Lead,
    ws: WebSocket,
    streamSid: string,
    callSid: string,
    campaignId?: number
  ) => {
    let elevenlabsWs: WebSocket | null = null;
    
    try {
      // Get signed URL for ElevenLabs conversation
      const elevenLabsApiKey = process.env.ELEVENLABS_API_KEY || process.env.ELEVEN_LABS_API_KEY;
      const elevenLabsAgentId = process.env.ELEVENLABS_AGENT_ID || process.env.ELEVEN_LABS_AGENT_ID;

      console.log("=== ElevenLabs Credentials Check ===");
      console.log("API Key exists:", !!elevenLabsApiKey);
      console.log("API Key length:", elevenLabsApiKey?.length);
      console.log("Agent ID:", elevenLabsAgentId);
      console.log("================================");

      if (!elevenLabsApiKey || !elevenLabsAgentId) {
        throw new Error('Missing ElevenLabs credentials');
      }

      // Get campaign data
      const campaign = campaignId ? await storage.getCampaign(campaignId) : null;

      if (!campaign?.systemPersona) {
        console.warn("[ElevenLabs] No system persona found in campaign:", campaignId);
      }

      console.log("[Backend] Triggering call for", lead.firstName);
      
      // Get the first name from lead or use fallback
      const firstName = lead.firstName || "there";

      // Get knowledge base documents for this campaign
      const knowledgeBaseFiles = campaignId ? await storage.getKnowledgeBaseByCampaign(campaignId) : [];
      const knowledgeBaseIds = knowledgeBaseFiles
        .filter(file => file.elevenlabsDocId)
        .map(file => file.elevenlabsDocId);

      console.log("[ElevenLabs] Knowledge base documents:", {
        campaignId,
        filesFound: knowledgeBaseFiles.length,
        validDocIds: knowledgeBaseIds.length,
        docIds: knowledgeBaseIds
      });

      // Use template variables in the prompts instead of pre-interpolating
      const promptText = campaign?.systemPersona ||
        "You are a friendly, professional sales assistant talking to {{first_name}}. You help potential customers by clearly explaining services, answering questions, and guiding them toward the right solution. Always be helpful, confident, and respectful of their time.";

      const firstMsgText = campaign?.firstPrompt ||
        "Hi {{first_name}}, I'm Sarah from our team. How can I assist you today?";

      // Log the template texts
      console.log("[ElevenLabs] Template messages:", {
        promptText,
        firstMsgText
      });

      // Build the config override with template variables and knowledge base
      const configOverride = {
        agent: {
          prompt: { prompt: promptText },
          first_message: firstMsgText,
          knowledge_base: knowledgeBaseIds.length > 0 ? knowledgeBaseIds : undefined
        }
      };

      // Log the final override configuration
      console.log("[ElevenLabs] Config override:", configOverride);

      // Get signed URL
      const signedUrlEndpoint = `https://api.elevenlabs.io/v1/convai/conversation/get_signed_url?agent_id=${elevenLabsAgentId}`;
      console.log("[ElevenLabs] Making API request to:", signedUrlEndpoint);

      const response = await fetch(
        signedUrlEndpoint,
        {
          method: "GET",
          headers: {
            "xi-api-key": elevenLabsApiKey
          }
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("[ElevenLabs] API error details:", {
          status: response.status,
          statusText: response.statusText,
          error: errorText,
          url: response.url
        });
        throw new Error(`Failed to get signed URL: ${response.statusText} - ${errorText}`);
      }

      const data = await response.json() as { signed_url: string };
      if (!data.signed_url) {
        throw new Error('Invalid response from ElevenLabs API - missing signed_url');
      }

      console.log("[ElevenLabs] Successfully got signed URL");

      // Create WebSocket connection
      console.log("[ElevenLabs] Connecting to WebSocket");
      const newWs = new WebSocket(data.signed_url);
      elevenlabsWs = newWs;

      newWs.on('open', () => {
        console.log("[ElevenLabs] WebSocket connected, sending configuration");
        
        // Send the conversation start message with template variables
        const payload = {
          type: "conversation_initiation_client_data",
          conversation_config_override: configOverride,
          dynamic_variables: {
            first_name: firstName
          }
        };

        // Log the complete payload with detailed formatting
        console.log("[ElevenLabs] Sending payload:", JSON.stringify(payload, null, 2));
        console.log("[ElevenLabs] Payload type:", typeof payload.type);
        console.log("[ElevenLabs] Dynamic variables:", payload.dynamic_variables);
        console.log("[ElevenLabs] Config override:", payload.conversation_config_override);

        // Send the configuration
        newWs.send(JSON.stringify(payload));

        if (streamSid) {
          activeConnections.set(streamSid, {
            twilioWs: ws,
            elevenLabsWs: newWs,
            streamSid,
            callSid,
            campaignId
          });
        }
      });

      newWs.on('message', (data: RawData) => {
        try {
          const message = JSON.parse(data.toString()) as ElevenLabsMessage;
          
          switch (message.type) {
            case "conversation_initiation_metadata":
              console.log("[ElevenLabs] Conversation initiated");
              break;
            
            case "audio":
              if (streamSid) {
                const audioChunk = message.audio?.chunk || message.audio_event?.audio_base_64;
                if (audioChunk) {
                  ws.send(JSON.stringify({ 
                    event: "media", 
                    streamSid, 
                    media: { payload: audioChunk }
                  }));
                }
              }
              break;
            
            case "interruption":
              if (streamSid) {
                ws.send(JSON.stringify({ event: "clear", streamSid }));
              }
              break;
            
            case "ping":
              if (message.ping_event?.event_id) {
                newWs.send(JSON.stringify({ 
                  type: "pong", 
                  event_id: message.ping_event.event_id 
                }));
              }
              break;
            
            case "agent_response":
              console.log(`[ElevenLabs] Agent response: ${message.agent_response_event?.agent_response}`);
              break;
            
            case "user_transcript":
              console.log(`[ElevenLabs] User transcript: ${message.user_transcription_event?.user_transcript}`);
              break;
            
            default:
              console.log(`[ElevenLabs] Unhandled message type: ${message.type}`);
          }
        } catch (error) {
          console.error("[ElevenLabs] Error processing message:", error);
        }
      });

      newWs.on('error', error => {
        console.error("[ElevenLabs] WebSocket error:", error);
      });

      newWs.on('close', () => {
        console.log("[ElevenLabs] WebSocket disconnected");
        if (streamSid) {
          activeConnections.delete(streamSid);
        }
      });

    } catch (error) {
      console.error("[ElevenLabs] Setup error:", error);
      ws.close();
    }

    return elevenlabsWs;
  };

  // Update the WebSocket connection handler to pass the lead data
  wss.on('connection', async (ws: WebSocket, req: IncomingMessage) => {
    console.info("[Server] New WebSocket connection for outbound call");
    console.log("[WebSocket] Raw request details:", {
      url: req.url,
      headers: req.headers
    });
    
    let streamSid: string | null = null;
    let callSid: string | null = null;
    let campaignId: number | null = null;
    let elevenlabsWs: WebSocket | null = null;
    let currentLead: Lead | null = null;

    try {
      if (!req.url) {
        console.error("[WebSocket] No URL in request");
        ws.close();
        return;
      }

      // Extract campaignId from path using regex
      const pathMatch = req.url.match(/^\/outbound-media-stream\/(\d+)$/);
      console.log("[WebSocket] Path matching:", {
        url: req.url,
        pathMatch
      });

      if (!pathMatch || !pathMatch[1]) {
        console.error("[WebSocket] Invalid path format:", req.url);
        ws.close();
        return;
      }

      campaignId = parseInt(pathMatch[1], 10);
      console.log("[WebSocket] Extracted campaignId:", campaignId);
      
      // Validate campaignId
      if (isNaN(campaignId)) {
        console.error("[WebSocket] Invalid campaignId:", pathMatch[1]);
        ws.close();
        return;
      }

      // Get stored parameters
      const key = `${campaignId}_params`;
      const params = connectionParams.get(key);
      
      console.log("[WebSocket] Retrieved connection params:", {
        key,
        hasParams: !!params,
        params
      });

      if (!params) {
        console.error("[WebSocket] No stored parameters found for campaignId:", campaignId);
        ws.close();
        return;
      }

      const { isTestCall, firstName, leadId } = params;
      
      // For test calls, create a temporary lead object
      if (isTestCall) {
        currentLead = {
          id: 0,
          campaignId,
          firstName,
          lastName: 'Test',
          contactNo: '',
          status: 'pending',
          callDuration: null,
          createdAt: new Date()
        };
      } 
      // For campaign calls, fetch the lead data
      else if (leadId) {
        const leads = await storage.getLeadsByCampaign(campaignId);
        currentLead = leads.find(l => l.id === parseInt(leadId)) || null;
      }

      if (!currentLead) {
        console.error("[WebSocket] No lead data found", { isTestCall, leadId, campaignId });
        ws.close();
        return;
      }

      // Clean up stored parameters
      connectionParams.delete(key);

      ws.on('message', async (message: RawData) => {
        try {
          const msg = JSON.parse(message.toString()) as TwilioMessage;
          
          switch (msg.event) {
            case "start":
              if (msg.start) {
                streamSid = msg.start.streamSid;
                callSid = msg.start.callSid;
                console.log(`[Twilio] Stream started - StreamSid: ${streamSid}, CallSid: ${callSid}, CampaignId: ${campaignId}, LeadId: ${leadId}, TestCall: ${isTestCall}`);
                
                if (currentLead && streamSid && callSid && campaignId !== null) {
                  elevenlabsWs = await setupElevenLabsConnection(currentLead, ws, streamSid, callSid, campaignId);
                } else {
                  console.error("[Twilio] Missing required data for call setup", { 
                    hasLead: !!currentLead, 
                    streamSid, 
                    callSid, 
                    campaignId 
                  });
                  ws.close();
                }
              }
              break;
            
            case "media":
              if (elevenlabsWs?.readyState === WebSocket.OPEN && msg.media?.payload) {
                elevenlabsWs.send(JSON.stringify({ 
                  type: "user_audio_chunk",
                  user_audio_chunk: msg.media.payload 
                }));
              }
              break;
            
            case "stop":
              console.log(`[Twilio] Stream ${streamSid} ended`);
              if (streamSid) {
                activeConnections.delete(streamSid);
              }
              if (elevenlabsWs?.readyState === WebSocket.OPEN) {
                elevenlabsWs.close();
              }
              break;
            
            default:
              console.log(`[Twilio] Unhandled event: ${msg.event}`);
          }
        } catch (error) {
          console.error("[Twilio] Error processing message:", error);
        }
      });

      ws.on('close', () => {
        console.log("[Twilio] Client disconnected", { streamSid, callSid });
        if (streamSid) {
          activeConnections.delete(streamSid);
        }
        if (elevenlabsWs?.readyState === WebSocket.OPEN) {
          elevenlabsWs.close();
        }
      });

    } catch (error) {
      console.error("[WebSocket] Setup error:", error);
      ws.close();
    }
  });

  // Update TwiML endpoint to handle test calls
  app.all("/outbound-call-twiml", (req, res) => {
    const baseUrl = process.env.NGROK_URL;
    const campaignId = req.query.campaignId;
    const leadId = req.query.leadId;
    const firstName = req.query.firstName;
    const isTestCall = req.query.isTestCall === 'true';
    
    console.log("[TwiML] Incoming request params:", { 
      campaignId, 
      leadId, 
      firstName, 
      isTestCall,
      rawQuery: req.query
    });

    if (!baseUrl) {
      return res.status(500).send('Missing NGROK_URL environment variable');
    }

    // Validate required parameters
    if (!campaignId) {
      return res.status(400).send('Missing campaignId parameter');
    }

    // Ensure baseUrl uses https
    const secureBaseUrl = baseUrl.replace(/^http:/, 'https:');
    const wsUrl = secureBaseUrl.replace(/^https:/, 'wss:');

    // Build WebSocket URL with campaignId in the path
    const streamUrl = `${wsUrl}/outbound-media-stream/${campaignId}`;
    
    console.log("[TwiML] URL construction details:", {
      baseUrl,
      secureBaseUrl,
      wsUrl,
      streamUrl
    });

    // Store parameters for later use
    const params = {
      isTestCall,
      firstName: firstName?.toString() || 'there',
      leadId: leadId?.toString()
    };
    
    const key = `${campaignId}_params`;
    connectionParams.set(key, params);
    
    console.log("[TwiML] Stored connection parameters:", {
      key,
      params,
      allStoredParams: Array.from(connectionParams.entries())
    });

    // Escape XML special characters in the stream URL
    const escapedStreamUrl = streamUrl
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');

    const twimlResponse = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Connect>
    <Stream url="${escapedStreamUrl}" track="inbound_track" />
  </Connect>
</Response>`;

    console.log("[TwiML] Generated response:", twimlResponse);

    res.type("text/xml").send(twimlResponse);
  });

  // Get Dashboard Analytics
  app.get("/api/analytics/dashboard", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user?.id;
      
      // Calculate analytics from local data
      const campaigns = await storage.getAllCampaigns(userId);
      const allCallLogs = await storage.getAllCallLogs();
      
      // Filter call logs for user's campaigns if needed
      const userCampaignIds = campaigns.map(c => c.id);
      const userCallLogs = allCallLogs.filter(log => 
        log.campaignId && userCampaignIds.includes(log.campaignId)
      );
      
             // Calculate today's calls
       const today = new Date();
       today.setHours(0, 0, 0, 0);
       const todayCallLogs = userCallLogs.filter(log => {
         if (!log.createdAt) return false;
         const callDate = new Date(log.createdAt);
         return callDate >= today;
       });
      
      // Calculate metrics
      const activeCampaigns = campaigns.filter(c => c.status === 'active').length;
      const callsToday = todayCallLogs.length;
      const successfulCalls = userCallLogs.filter(log => log.status === 'completed').length;
      const totalCalls = userCallLogs.length;
      const successRate = totalCalls > 0 ? (successfulCalls / totalCalls) : 0;
      const totalMinutes = userCallLogs.reduce((sum, log) => sum + (log.duration || 0), 0);

      const analyticsData = {
        charts: [
          { name: "calls_today", type: "call_success", data: callsToday },
          { name: "active_campaigns", type: "active_campaigns", data: activeCampaigns },
          { name: "success_rate", type: "success_rate", data: successRate },
          { name: "total_minutes", type: "total_minutes", data: Math.round(totalMinutes / 60) }
        ]
      };

      res.json(analyticsData);
    } catch (error) {
      console.error('Analytics fetch error:', error);
      
      // Return default analytics if there's an error
      const defaultAnalytics = {
          charts: [
          { name: "calls_today", type: "call_success", data: 0 },
          { name: "active_campaigns", type: "active_campaigns", data: 0 },
          { name: "success_rate", type: "success_rate", data: 0 },
          { name: "total_minutes", type: "total_minutes", data: 0 }
        ]
      };
      
      res.json(defaultAnalytics);
    }
  });

  // Update Dashboard Settings
  app.patch("/api/analytics/dashboard/settings", async (req, res) => {
    try {
      const elevenLabsApiKey = process.env.ELEVENLABS_API_KEY || process.env.ELEVEN_LABS_API_KEY;
      
      if (!elevenLabsApiKey) {
        return res.status(400).json({ 
          error: "ElevenLabs API key is required" 
        });
      }

      const { charts } = req.body;
      
      if (!Array.isArray(charts)) {
        return res.status(400).json({
          error: "Invalid request format. 'charts' must be an array."
        });
      }

      const response = await fetch("https://api.elevenlabs.io/v1/convai/settings/dashboard", {
        method: "PATCH",
        headers: {
          "xi-api-key": elevenLabsApiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ charts }),
      });

      if (!response.ok) {
        const errorData = await response.json() as { detail?: string };
        throw new Error(errorData.detail || 'Failed to update dashboard settings');
      }

      const data = await response.json();
      res.json({ 
        success: true, 
        message: "Dashboard settings updated successfully",
        data 
      });
    } catch (error) {
      console.error('Dashboard settings update error:', error);
      
      // Improved error handling
      let errorMessage = "Failed to update dashboard settings";
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'object' && error !== null) {
        try {
          errorMessage = JSON.stringify(error);
        } catch {
          errorMessage = "Unknown error occurred while updating dashboard settings";
        }
      }
      
      log(`Dashboard update failed: ${errorMessage}`, "ERROR");
      res.status(500).json({ error: errorMessage });
    }
  });

  // Delete Knowledge Base File
  app.delete("/api/knowledge-base/:id", async (req, res) => {
    try {
      const fileId = parseInt(req.params.id);
      const { campaignId } = req.body;

      if (!campaignId) {
        return res.status(400).json({ error: "Campaign ID is required" });
      }

      // Get the knowledge base entry
      const allKnowledgeBase = await storage.getAllKnowledgeBase();
      const knowledgeBaseFile = allKnowledgeBase.find(kb => kb.id === fileId);

      if (!knowledgeBaseFile) {
        return res.status(404).json({ error: "Knowledge base file not found" });
      }

      // Delete from ElevenLabs
      const elevenLabsApiKey = process.env.ELEVENLABS_API_KEY || process.env.ELEVEN_LABS_API_KEY;

      let elevenlabsDeleteSuccess = false;

      if (elevenLabsApiKey && knowledgeBaseFile.elevenlabsDocId) {
        try {
          log(`KnowledgeBase doc ID: ${knowledgeBaseFile.elevenlabsDocId}`, "DELETE");
          
          // Validate document ID
          if (!knowledgeBaseFile.elevenlabsDocId.trim()) {
            throw new Error('Invalid ElevenLabs document ID: ID is empty or whitespace');
          }

          // Delete specific file from knowledge base using the correct endpoint
          const deleteUrl = `https://api.elevenlabs.io/v1/convai/knowledge-base/${knowledgeBaseFile.elevenlabsDocId}`;
          log(`Deleting document from: ${deleteUrl}`, "DELETE");
          
          const deleteResponse = await fetch(deleteUrl, {
            method: 'DELETE',
            headers: {
              'xi-api-key': elevenLabsApiKey,
            },
          });

          // Log response details
          log(`Delete response status: ${deleteResponse.status} ${deleteResponse.statusText}`, "DELETE");
          const responseText = await deleteResponse.text();
          log(`Delete response body: ${responseText || 'No response body'}`, "DELETE");

          // We consider 404 as success since it means the file is already gone
          if (deleteResponse.ok || deleteResponse.status === 404) {
            elevenlabsDeleteSuccess = true;
            log('Successfully deleted file from ElevenLabs', "DELETE");
            
            // Update the agent after deleting knowledge base
            await updateAgentKnowledgeBase(elevenLabsApiKey, campaignId);
          } else {
            log(`Failed to delete file from ElevenLabs: ${responseText}`, "DELETE");
          }

        } catch (error) {
          console.error('ElevenLabs deletion error:', error);
          // Continue with local deletion even if ElevenLabs fails
        }
      }

      // Delete from local storage
      const localDeleteSuccess = await storage.deleteKnowledgeBase(fileId);

      if (!localDeleteSuccess) {
        return res.status(500).json({ 
          error: "Failed to delete knowledge base file from local storage",
          elevenlabsStatus: elevenlabsDeleteSuccess ? 'success' : 'failed'
        });
      }

      // Update campaign (no need to update campaign since knowledge base files are tracked separately)
      const campaign = await storage.getCampaign(parseInt(campaignId));
      console.log(`Knowledge base file ${fileId} deleted for campaign ${campaignId}`);
      // Knowledge base files are tracked in the knowledgeBaseFiles table, not on campaigns

      res.json({ 
        success: true, 
        message: elevenlabsDeleteSuccess 
          ? "Knowledge base file deleted successfully from both local storage and ElevenLabs" 
          : "Knowledge base file deleted from local storage, but there were some issues with ElevenLabs deletion",
        elevenlabsStatus: elevenlabsDeleteSuccess ? 'success' : 'failed'
      });
    } catch (error) {
      console.error('Knowledge base deletion error:', error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : "Failed to delete knowledge base file",
        elevenlabsStatus: 'failed'
      });
    }
  });

  return httpServer;
}

// Track running campaigns to prevent duplicates
const runningCampaigns = new Set<number>();

// Helper function to process campaign calls
async function processcamp(campaignId: number) {
  // Prevent duplicate campaign processing
  if (runningCampaigns.has(campaignId)) {
    console.log(`[Campaign ${campaignId}] Already running, skipping duplicate processing`);
    return;
  }
  
  runningCampaigns.add(campaignId);
  try {
    console.log(`[Campaign ${campaignId}] Starting campaign processing`);
    
    const leads = await storage.getLeadsByCampaign(campaignId);
    console.log(`[Campaign ${campaignId}] Found ${leads.length} total leads`);
    
    const pendingLeads = leads.filter(lead => lead.status === 'pending');
    console.log(`[Campaign ${campaignId}] Found ${pendingLeads.length} pending leads`);

    if (pendingLeads.length === 0) {
      console.log(`[Campaign ${campaignId}] No pending leads to process`);
      await storage.updateCampaign(campaignId, { status: 'completed' });
      return;
    }

    // Get campaign details for voice settings
    const campaign = await storage.getCampaign(campaignId);
    if (!campaign) {
      throw new Error('Campaign not found');
    }

    // Validate required credentials
    const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
    const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
    const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;
    const elevenLabsApiKey = process.env.ELEVENLABS_API_KEY;
    const elevenLabsAgentId = process.env.ELEVENLABS_AGENT_ID;
    const ngrokUrl = process.env.NGROK_URL;

    if (!twilioAccountSid || !twilioAuthToken || !twilioPhoneNumber || !elevenLabsApiKey || !elevenLabsAgentId || !ngrokUrl) {
      throw new Error('Missing required credentials for voice calls');
    }

    // Initialize Twilio client
    const twilioClient: Twilio = twilio(twilioAccountSid, twilioAuthToken);

    // Process each lead
    for (const lead of pendingLeads) {
      let callLog = null;
      try {
        console.log(`[Campaign ${campaignId}] Processing lead ${lead.id} (${lead.firstName} - ${lead.contactNo})`);
        
        // Check if this lead already has a call log to prevent duplicates
        const allCallLogs = await storage.getAllCallLogs();
        const existingCallLog = allCallLogs.find(log => 
          log.campaignId === campaignId && 
          log.leadId === lead.id && 
          log.status !== 'failed'
        );
        
        if (existingCallLog) {
          console.log(`[Campaign ${campaignId}] Lead ${lead.id} already has a call in progress, skipping`);
          continue;
        }

        // Update lead status
        await storage.updateLead(lead.id, { status: 'calling' });

        // Create call log
        callLog = await storage.createCallLog({
          campaignId,
          leadId: lead.id,
          phoneNumber: lead.contactNo,
          status: "initiated",
          duration: null,
          twilioCallSid: null,
        });

        // Ensure ngrokUrl uses https
        const secureNgrokUrl = ngrokUrl.replace(/^http:/, 'https:');

        // Create TwiML URL for the call with campaignId as query parameter
        const twimlUrl = `${secureNgrokUrl}/outbound-call-twiml?campaignId=${campaignId}&leadId=${lead.id}&firstName=${encodeURIComponent(lead.firstName || 'there')}`;

        // Make the call using Twilio
        const call = await twilioClient.calls.create({
          to: lead.contactNo,
          from: twilioPhoneNumber,
          url: twimlUrl,
          statusCallback: `${secureNgrokUrl}/api/twilio/status`,
          statusCallbackMethod: 'POST',
          statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed']
        });

        // Update call log with Twilio SID
        await storage.updateCallLog(callLog.id, {
          twilioCallSid: call.sid,
        });

        console.log(`[Campaign ${campaignId}] Call initiated for lead ${lead.id} with SID ${call.sid}`);

        // Add delay between calls to prevent overwhelming the system
        await new Promise(resolve => setTimeout(resolve, 5000));

      } catch (error) {
        console.error(`[Campaign ${campaignId}] Error processing lead ${lead.id}:`, error);
        
        // Update lead and call status on error
        await storage.updateLead(lead.id, { status: 'failed' });
        if (callLog) {
          await storage.updateCallLog(callLog.id, {
            status: 'failed',
            duration: 0,
          });
        }

        // Update campaign stats
        const updatedCampaign = await storage.getCampaign(campaignId);
        if (updatedCampaign) {
          await storage.updateCampaign(campaignId, {
            failedCalls: (updatedCampaign.failedCalls || 0) + 1,
          });
        }
      }
    }

    // Check campaign completion periodically
    const checkCompletion = async () => {
      const allLeads = await storage.getLeadsByCampaign(campaignId);
      const pendingCount = allLeads.filter(l => l.status === 'pending' || l.status === 'calling').length;
      
      console.log(`[Campaign ${campaignId}] Completion check: ${pendingCount} leads still pending/calling`);
      
      if (pendingCount === 0) {
        console.log(`[Campaign ${campaignId}] All leads processed, marking campaign as completed`);
        await storage.updateCampaign(campaignId, { status: 'completed' });
        runningCampaigns.delete(campaignId);
      } else {
        // Check again in 1 minute if not complete
        setTimeout(checkCompletion, 60000);
      }
    };

    // Start completion checking
    setTimeout(checkCompletion, 60000);

  } catch (error) {
    console.error(`[Campaign ${campaignId}] Campaign processing error:`, error);
    await storage.updateCampaign(campaignId, { status: 'failed' });
  } finally {
    // Remove from running campaigns when done
    runningCampaigns.delete(campaignId);
    console.log(`[Campaign ${campaignId}] Processing completed, removed from running campaigns`);
  }
}

// Fix function name typo
async function processCanpaign(campaignId: number) {
  return processcamp(campaignId);
}

async function processAsgn(campaignId: number) {
  return processcamp(campaignId);
}
