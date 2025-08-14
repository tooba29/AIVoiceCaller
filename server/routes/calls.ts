import type { Express, Request, Response } from "express";
import express from "express";
import { requireAuth } from "../auth.js";
import { storage } from "../storage.js";
import { testCallSchema } from "../../shared/schema.js";
import twilio, { Twilio } from "twilio";
import { z } from "zod";
import { WebSocketServer, WebSocket, RawData } from 'ws';
import { IncomingMessage } from "http";
import type { Server } from "http";
import fetch from "node-fetch";
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import crypto from "crypto";

interface AuthenticatedRequest extends Request {
  user?: any;
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
  conversation_initiation_metadata?: {
    conversation_id?: string;
    agent_id?: string;
    [key: string]: any;
  };
  conversation_initiation_metadata_event?: {
    conversation_id?: string;
    agent_output_audio_format?: string;
    user_input_audio_format?: string;
    [key: string]: any;
  };
  conversation_id?: string;
  metadata?: {
    conversation_id?: string;
    [key: string]: any;
  };
  data?: {
    conversation_id?: string;
    [key: string]: any;
  };
  [key: string]: any;
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

interface Lead {
  id: number;
  campaignId: number;
  firstName: string;
  lastName: string;
  contactNo: string;
  status: string;
  callDuration: number | null;
  createdAt: Date;
}

interface BatchCallResponse {
  batch_id?: string;
  id?: string;
  status?: string;
  message?: string;
}

// ElevenLabs batch call statuses: pending, in_progress, completed, failed, cancelled
type ElevenLabsCallStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled';

interface BatchStatusResponse {
  batch_id?: string;
  batchId?: string;
  id?: string;
  status: ElevenLabsCallStatus | string;
  totalCallsDispatched?: number;
  totalCallsScheduled?: number;
  createdAtUnix?: number;
  scheduledTimeUnix?: number;
  calls?: Array<{
    phone_number?: string;
    phoneNumber?: string;
    recipient_phone?: string;
    status: ElevenLabsCallStatus | string;
    duration?: number;
    conversation_id?: string;
    conversationId?: string;
    error_message?: string;
    errorMessage?: string;
  }>;
  recipients?: Array<{
    id?: string;
    phone_number?: string;
    phoneNumber?: string;
    recipient_phone?: string;
    status: ElevenLabsCallStatus | string;
    duration?: number;
    conversation_id?: string;
    conversationId?: string;
    createdAtUnix?: number;
    updatedAtUnix?: number;
    error_message?: string;
    errorMessage?: string;
    conversation_initiation_client_data?: {
      dynamic_variables?: {
        lead_id?: string;
        first_name?: string;
        last_name?: string;
        [key: string]: any;
      };
      [key: string]: any;
    };
  }>;
  // Add flexible properties to handle different response structures
  [key: string]: any;
}

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
  campaignId?: string;
  useElevenLabs?: boolean;
}>();

// Helper function to update ElevenLabs agent with current knowledge base
async function updateAgentKnowledgeBase(elevenLabsApiKey: string, campaignId: number) {
  const agentId = process.env.ELEVENLABS_AGENT_ID || process.env.ELEVEN_LABS_AGENT_ID;
  
  if (!agentId) {
    console.log('No agent ID configured, skipping agent update');
    return;
  }

  try {
    const knowledgeBaseFiles = await storage.getKnowledgeBaseByCampaign(campaignId);
    const knowledgeBaseDocuments = knowledgeBaseFiles
      .filter(file => file.elevenlabsDocId)
      .map(file => ({
        type: "file",
        name: file.filename.replace('.pdf', ''),
        id: file.elevenlabsDocId,
        usage_mode: "prompt"
      }));

    console.log('Updating agent with knowledge base:', {
      agentId,
      campaignId,
      knowledgeBaseDocuments
    });

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
      console.log('Successfully updated agent knowledge base:', {
        agentId,
        knowledgeBaseCount: knowledgeBaseDocuments.length
      });
    }
  } catch (error) {
    console.error('Error updating agent knowledge base:', error);
  }
}

const setupElevenLabsConnection = async (
  lead: Lead,
  ws: WebSocket,
  streamSid: string,
  callSid: string,
  campaignId?: number
) => {
  let elevenlabsWs: WebSocket | null = null;
  
  try {
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

    const campaign = campaignId ? await storage.getCampaign(campaignId) : null;

    if (!campaign?.systemPersona) {
      console.warn("[ElevenLabs] No system persona found in campaign:", campaignId);
    }

    console.log("[Backend] Triggering call for", lead.firstName);
    
    const firstName = lead.firstName || "there";

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

    const promptText = campaign?.systemPersona ||
      "You are a friendly, professional sales assistant talking to {{first_name}}. You help potential customers by clearly explaining services, answering questions, and guiding them toward the right solution. Always be helpful, confident, and respectful of their time.";

    const firstMsgText = campaign?.firstPrompt ||
      "Hi {{first_name}}, I'm Sarah from our team. How can I assist you today?";

    console.log("[ElevenLabs] Template messages:", {
      promptText,
      firstMsgText,
      selectedVoiceId: campaign?.selectedVoiceId,
      firstName
    });

    const configOverride = {
      agent: {
        prompt: { prompt: promptText },
        first_message: firstMsgText,
        knowledge_base: knowledgeBaseIds.length > 0 ? knowledgeBaseIds : undefined,
        ...(campaign?.selectedVoiceId && {
          voice: {
            voice_id: campaign.selectedVoiceId
          }
        })
      }
    };

    console.log("[ElevenLabs] Config override:", JSON.stringify(configOverride, null, 2));

    const signedUrlEndpoint = `https://api.elevenlabs.io/v1/convai/conversation/get_signed_url?agent_id=${elevenLabsAgentId}`;
    console.log("[ElevenLabs] Making API request to:", signedUrlEndpoint);

    const response = await fetch(signedUrlEndpoint, {
      method: "GET",
      headers: {
        "xi-api-key": elevenLabsApiKey
      }
    });

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

    console.log("[ElevenLabs] Connecting to WebSocket");
    const newWs = new WebSocket(data.signed_url);
    elevenlabsWs = newWs;

    newWs.on('open', () => {
      console.log("[ElevenLabs] WebSocket connected, sending configuration");
      
      const payload = {
        type: "conversation_initiation_client_data",
        conversation_config_override: configOverride,
        dynamic_variables: {
          first_name: firstName
        }
      };

      //console.log("[ElevenLabs] Sending payload:", JSON.stringify(payload, null, 2));
      console.log("[ElevenLabs] Payload type:", typeof payload.type);
      console.log("[ElevenLabs] Dynamic variables:", payload.dynamic_variables);
      console.log("[ElevenLabs] Config override:", payload.conversation_config_override);

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
        
        console.log(`[ElevenLabs] 📥 Received message type: ${message.type}`);
        //console.log(`[ElevenLabs] 📥 Full message:`, JSON.stringify(message, null, 2));
        
        switch (message.type) {
          case "conversation_initiation_metadata":
            console.log("[ElevenLabs] Conversation initiated");
            console.log("[ElevenLabs] 🔍 Initiation metadata:", JSON.stringify(message.conversation_initiation_metadata, null, 2));
            
            let conversationId: string | null = null;
            
            if (message.conversation_initiation_metadata?.conversation_id) {
              conversationId = message.conversation_initiation_metadata.conversation_id;
              console.log(`[ElevenLabs] ✅ Found Conversation ID in standard location: ${conversationId}`);
            }
            else if ((message as any).conversation_initiation_metadata_event?.conversation_id) {
              conversationId = (message as any).conversation_initiation_metadata_event.conversation_id;
              console.log(`[ElevenLabs] ✅ Found Conversation ID in ElevenLabs event format: ${conversationId}`);
            }
            else if ((message as any).conversation_id) {
              conversationId = (message as any).conversation_id;
              console.log(`[ElevenLabs] ✅ Found Conversation ID at root level: ${conversationId}`);
            }
            else if (message.conversation_initiation_metadata && Object.keys(message.conversation_initiation_metadata).length > 0) {
              console.log(`[ElevenLabs] 🔍 Available keys in initiation metadata:`, Object.keys(message.conversation_initiation_metadata));
              for (const [key, value] of Object.entries(message.conversation_initiation_metadata)) {
                if (key.toLowerCase().includes('conversation') || key.toLowerCase().includes('id')) {
                  conversationId = value as string;
                  console.log(`[ElevenLabs] ✅ Found Conversation ID in field '${key}': ${conversationId}`);
                  break;
                }
              }
            }
            
            if (conversationId) {
              console.log(`[ElevenLabs] ✅ Received Conversation ID: ${conversationId}`);
              console.log(`[ElevenLabs] Context - CampaignId: ${campaignId}, CallSid: ${callSid}, StreamSid: ${streamSid}`);
              
              if (campaignId && callSid) {
                console.log(`[ElevenLabs] Attempting to store conversation ID in database...`);
                (async () => {
                  try {
                    const allCallLogs = await storage.getAllCallLogs();
                    console.log(`[ElevenLabs] Searching for call log with campaignId: ${campaignId}, twilioCallSid: ${callSid}`);
                    console.log(`[ElevenLabs] Total call logs in database: ${allCallLogs.length}`);
                    
                    const callLog = allCallLogs.find(log => 
                      log.campaignId === campaignId && log.twilioCallSid === callSid
                    );
                    
                    if (callLog) {
                      console.log(`[ElevenLabs] ✅ Found matching call log:`, {
                        id: callLog.id,
                        campaignId: callLog.campaignId,
                        leadId: callLog.leadId,
                        twilioCallSid: callLog.twilioCallSid,
                        status: callLog.status
                      });
                      
                      await storage.updateCallLog(callLog.id, {
                        elevenLabsConversationId: conversationId
                      });
                      
                      console.log(`[ElevenLabs] ✅ Successfully updated call log ${callLog.id} with conversation ID: ${conversationId}`);
                      
                      const updatedCallLog = await storage.getAllCallLogs();
                      const verifyLog = updatedCallLog.find(log => log.id === callLog.id);
                      console.log(`[ElevenLabs] ✅ Verification - Call log now has conversation ID:`, verifyLog?.elevenLabsConversationId);
                    } else {
                      console.error(`[ElevenLabs] ❌ No call log found with campaignId: ${campaignId} and twilioCallSid: ${callSid}`);
                      
                      const relevantLogs = allCallLogs.filter(log => 
                        log.campaignId === campaignId || log.twilioCallSid === callSid
                      );
                      console.log(`[ElevenLabs] Debug - Call logs for this campaign/call:`, relevantLogs.map(log => ({
                        id: log.id,
                        campaignId: log.campaignId,
                        twilioCallSid: log.twilioCallSid,
                        status: log.status,
                        conversationId: log.elevenLabsConversationId
                      })));
                    }
                  } catch (error) {
                    console.error("[ElevenLabs] ❌ Error updating call log with conversation ID:", error);
                  }
                })();
              } else {
                console.error(`[ElevenLabs] ❌ Missing required data to store conversation ID - CampaignId: ${campaignId}, CallSid: ${callSid}`);
              }
            } else {
              console.error("[ElevenLabs] ❌ No conversation ID found in any expected location");
              console.error("[ElevenLabs] 🔍 Full message structure for debugging:", JSON.stringify(message, null, 2));
            }
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
          
          case "conversation_ended":
            console.log(`[ElevenLabs] Conversation ended`);
            
            // Handle conversation end - update lead and call status
            if (campaignId && callSid) {
              (async () => {
                try {
                  const allCallLogs = await storage.getAllCallLogs();
                  const callLog = allCallLogs.find(log => 
                    log.campaignId === campaignId && log.twilioCallSid === callSid
                  );
                  
                  if (callLog && callLog.leadId) {
                    // Determine status based on duration and Twilio outcome
                    const callDuration = callLog.duration || 0;
                    const isSuccessful = callDuration > 3;
                    
                    let newLeadStatus = isSuccessful ? 'completed' : 'failed';
                    let newCallStatus: string = isSuccessful ? 'completed' : 'failed';
                    
                    const lower = (callLog.status || '').toLowerCase();
                    if (['no-answer','busy','error','failed','cancelled','canceled'].includes(lower)) {
                      newLeadStatus = 'failed';
                      newCallStatus = lower;
                    }
                    
                    console.log(`[ElevenLabs] Updating lead ${callLog.leadId} status to: ${newLeadStatus} (duration: ${callDuration}s, rawStatus: ${callLog.status})`);
                    
                    // Update lead status
                    await storage.updateLead(callLog.leadId, { status: newLeadStatus });
                    
                    // Update call log status if not already updated
                    if ((callLog.status || '').toLowerCase() !== newCallStatus) {
                      await storage.updateCallLog(callLog.id, { status: newCallStatus });
                    }
                    
                    // Update campaign statistics
                    await updateCampaignStatistics(campaignId);
                  }
                } catch (error) {
                  console.error("[ElevenLabs] Error handling conversation end:", error);
                }
              })();
            }
            break;
          
          default:
            console.log(`[ElevenLabs] Unhandled message type: ${message.type}`);
            
            const messageAny = message as any;
            let foundConversationId: string | null = null;
            
            if (messageAny.conversation_id) {
              foundConversationId = messageAny.conversation_id;
            } else if (messageAny.metadata?.conversation_id) {
              foundConversationId = messageAny.metadata.conversation_id;
            } else if (messageAny.data?.conversation_id) {
              foundConversationId = messageAny.data.conversation_id;
            } else {
              const searchForConversationId = (obj: any, path = ''): string | null => {
                for (const [key, value] of Object.entries(obj)) {
                  const currentPath = path ? `${path}.${key}` : key;
                  if (typeof value === 'string' && key.toLowerCase().includes('conversation') && key.toLowerCase().includes('id')) {
                    return value;
                  } else if (typeof value === 'object' && value !== null) {
                    const result = searchForConversationId(value, currentPath);
                    if (result) return result;
                  }
                }
                return null;
              };
              foundConversationId = searchForConversationId(messageAny);
            }
            
            if (foundConversationId && campaignId && callSid) {
              console.log(`[ElevenLabs] 🎯 Found conversation ID in unhandled message type '${message.type}': ${foundConversationId}`);
              
              (async () => {
                try {
                  const allCallLogs = await storage.getAllCallLogs();
                  const callLog = allCallLogs.find(log => 
                    log.campaignId === campaignId && log.twilioCallSid === callSid
                  );
                  
                  if (callLog && !callLog.elevenLabsConversationId) {
                    await storage.updateCallLog(callLog.id, {
                      elevenLabsConversationId: foundConversationId
                    });
                    console.log(`[ElevenLabs] ✅ Successfully stored conversation ID ${foundConversationId} from message type '${message.type}'`);
                  }
                } catch (error) {
                  console.error("[ElevenLabs] ❌ Error storing conversation ID from unhandled message:", error);
                }
              })();
            }
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
      
      // Handle WebSocket close - in case conversation_ended event was missed
      if (campaignId && callSid) {
        (async () => {
          try {
            // Add a small delay to allow Twilio status callback to process first
            setTimeout(async () => {
              const allCallLogs = await storage.getAllCallLogs();
              const callLog = allCallLogs.find(log => 
                log.campaignId === campaignId && log.twilioCallSid === callSid
              );
              
                             if (callLog && callLog.leadId) {
                 // Get all leads for this campaign and find the specific lead
                 const allLeads = await storage.getLeadsByCampaign(campaignId);
                 const currentLead = allLeads.find(lead => lead.id === callLog.leadId);
                 
                 // Only update if lead is still in calling status (not already processed)
                 if (currentLead && currentLead.status === 'calling') {
                  console.log(`[ElevenLabs] WebSocket closed, updating lead ${callLog.leadId} from calling status`);
                  
                  // Determine status based on call duration
                  const callDuration = callLog.duration || 0;
                  const isSuccessful = callDuration > 3;
                  const newLeadStatus = isSuccessful ? 'completed' : 'failed';
                  
                  await storage.updateLead(callLog.leadId, { status: newLeadStatus });
                  
                  // Update campaign statistics
                  await updateCampaignStatistics(campaignId);
                }
              }
            }, 2000); // 2 second delay
          } catch (error) {
            console.error("[ElevenLabs] Error handling WebSocket close:", error);
          }
        })();
      }
    });

  } catch (error) {
    console.error("[ElevenLabs] Setup error:", error);
    ws.close();
  }

  return elevenlabsWs;
};

export function registerCallRoutes(app: Express): void {
  
  // Make Test Call with ElevenLabs Integration
  // Uses Twilio for phone connection + ElevenLabs for conversation (with transcription webhooks)
  app.post("/api/make-outbound-call", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const validation = testCallSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: validation.error.errors });
      }

      const { phoneNumber, campaignId, firstName } = validation.data;

      const campaign = campaignId ? await storage.getCampaign(campaignId) : null;

      if (!campaignId) {
        return res.status(400).json({ error: "campaignId is required for test calls" });
      }

      if (!campaign || campaign.userId !== req.user!.id) {
        return res.status(404).json({ error: "Campaign not found" });
      }

      console.log("[Backend] Triggering test call for", firstName);
      console.log("[Payload]", {
        dynamic_variables: { first_name: firstName }
      });
      if (campaign?.firstPrompt) {
        console.log("[ElevenLabs] first_message =>", campaign.firstPrompt);
      }

      const callLog = await storage.createCallLog({
        campaignId: campaignId,
        leadId: null,
        phoneNumber,
        status: "initiated",
        duration: null,
        twilioCallSid: null,
      });

      const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
      const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
      const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;
      const baseUrl = process.env.BASE_URL;

      if (!twilioAccountSid || !twilioAuthToken || !twilioPhoneNumber || !baseUrl) {
        throw new Error('Missing required Twilio credentials or BASE_URL');
      }

      try {
        const twilioClient: Twilio = twilio(twilioAccountSid, twilioAuthToken);
        
        const secureBaseUrl = baseUrl.replace(/^http:/, 'https:');

        // Use ElevenLabs for the TwiML URL with webhook support
        const twimlUrl = new URL(`${secureBaseUrl}/outbound-call-twiml`);
        twimlUrl.searchParams.append('campaignId', campaignId.toString());
        twimlUrl.searchParams.append('firstName', firstName || 'there');
        twimlUrl.searchParams.append('isTestCall', 'true');
        twimlUrl.searchParams.append('useElevenLabs', 'true'); // New flag for ElevenLabs integration

        console.log("[Twilio] Making test call with ElevenLabs integration, TwiML URL:", twimlUrl.toString());

        const call = await twilioClient.calls.create({
          to: phoneNumber,
          from: twilioPhoneNumber,
          url: twimlUrl.toString(),
          statusCallback: `${secureBaseUrl}/api/twilio/status`,
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
          message: "Test call initiated with ElevenLabs integration" 
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
  app.post("/api/start-campaign", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { campaignId } = req.body;
      if (!campaignId) {
        return res.status(400).json({ error: "Campaign ID is required" });
      }

      const campaign = await storage.getCampaign(campaignId);
      if (!campaign || campaign.userId !== req.user!.id) {
        return res.status(404).json({ error: "Campaign not found" });
      }

      const leads = await storage.getLeadsByCampaign(campaignId);
      if (leads.length === 0) {
        return res.status(400).json({ error: "No leads found for this campaign" });
      }

      // Update campaign status and reset stats
      await storage.updateCampaign(campaignId, { 
        status: "active",
        totalLeads: leads.length
      });

      // Update campaign statistics using centralized function
      await updateCampaignStatistics(campaignId);

      // Start processing calls asynchronously
      processcamp(campaignId);

      // Get updated campaign data after stats calculation
      const updatedCampaign = await storage.getCampaign(campaignId);

      res.json({ 
        success: true, 
        message: `Campaign started with ${leads.length} leads`,
        campaign: updatedCampaign
      });
    } catch (error) {
      console.error('Campaign start error:', error);
      res.status(500).json({ error: "Failed to start campaign" });
    }
  });

  // Twilio Status Callback - Enhanced to update lead statuses and campaign stats
  app.post("/api/twilio/status", async (req: Request, res: Response) => {
    try {
      const { CallSid, CallStatus, CallDuration, CallFrom, CallTo } = req.body;
      
      console.log('Twilio status callback:', { 
        CallSid, 
        CallStatus, 
        CallDuration, 
        CallFrom, 
        CallTo 
      });
      
      if (CallSid) {
        // Update call log with Twilio status and duration
        const updatedCallLog = await storage.updateCallLogByTwilioSid(CallSid, {
          status: CallStatus,
          duration: CallDuration ? parseInt(CallDuration) : null
        });
        
        // If this is a final status (completed, failed, busy, no-answer), update lead status and campaign stats
        const finalStatuses = ['completed', 'failed', 'busy', 'no-answer'];
        if (updatedCallLog && finalStatuses.includes(CallStatus) && updatedCallLog.leadId && updatedCallLog.campaignId) {
          
          // Determine lead status based on call outcome
          let newLeadStatus: string;
          if (CallStatus === 'completed') {
            // For completed calls, check duration to determine success
            const duration = CallDuration ? parseInt(CallDuration) : 0;
            newLeadStatus = duration > 3 ? 'completed' : 'failed';
          } else {
            // For other final statuses, mark as failed
            newLeadStatus = 'failed';
          }
          
          console.log(`[Twilio] Updating lead ${updatedCallLog.leadId} status to: ${newLeadStatus} (call status: ${CallStatus}, duration: ${CallDuration}s)`);
          
          // Update lead status
          await storage.updateLead(updatedCallLog.leadId, { status: newLeadStatus });
          
                     // Update campaign statistics
           const campaignId = updatedCallLog.campaignId;
           await updateCampaignStatistics(campaignId);
        }
      }
      
      res.status(200).send('OK');
    } catch (error) {
      console.error('Twilio status callback error:', error);
      res.status(500).json({ error: "Failed to process status callback" });
    }
  });

  // TwiML endpoint - restored original functionality
  app.all("/outbound-call-twiml", (req, res) => {
    try {
      console.log("[TwiML] Incoming request:", {
        method: req.method,
        url: req.url,
        query: req.query,
        body: req.body,
        headers: req.headers
      });
      
      const baseUrl = process.env.BASE_URL;
      const campaignId = req.query.campaignId;
      const leadId = req.query.leadId;
      const firstName = req.query.firstName;
      const isTestCall = req.query.isTestCall === 'true';
      const useElevenLabs = req.query.useElevenLabs === 'true';
      
      console.log("[TwiML] Extracted params:", { 
        baseUrl,
        campaignId, 
        leadId, 
        firstName, 
        isTestCall,
        useElevenLabs,
        rawQuery: req.query
      });

      if (!baseUrl) {
        console.error("[TwiML] Missing BASE_URL environment variable");
        return res.status(500).send('Missing BASE_URL environment variable');
      }

      if (!campaignId) {
        console.error("[TwiML] Missing campaignId parameter");
        return res.status(400).send('Missing campaignId parameter');
      }

      const secureBaseUrl = baseUrl.replace(/^http:/, 'https:');
      const wsUrl = secureBaseUrl.replace(/^https:/, 'wss:');

      const streamUrl = `${wsUrl}/outbound-media-stream/${campaignId}`;
      
      console.log("[TwiML] URL construction details:", {
        baseUrl,
        secureBaseUrl,
        wsUrl,
        streamUrl
      });

      const params = {
        isTestCall,
        firstName: firstName?.toString() || 'there',
        leadId: leadId?.toString(),
        campaignId: campaignId?.toString(), // Store campaignId in params for backup
        useElevenLabs: useElevenLabs
      };
      
      // ALWAYS use campaignId for the primary key - force string conversion to prevent any type issues
      const primaryKey = `${String(campaignId)}_params`;
      console.log("[TwiML] DEBUG - Creating primary key:", { campaignId, primaryKey });
      
      // Store with primary key (campaignId)
      connectionParams.set(primaryKey, params);
      
      // Also store by CallSid as backup for WebSocket to find
      const callSid = req.body.CallSid;
      if (callSid) {
        const callSidKey = `${callSid}_params`;
        connectionParams.set(callSidKey, params);
        console.log("[TwiML] BACKUP - Also stored parameters with CallSid key:", callSidKey);
      }
      
      // CRITICAL DEBUG - Check what's actually stored
      console.log("[TwiML] FINAL STORAGE DEBUG:", {
        primaryKey,
        primaryKeyType: typeof primaryKey,
        campaignId,
        campaignIdType: typeof campaignId,
        callSid,
        storedWithPrimaryKey: connectionParams.has(primaryKey),
        allStoredKeys: Array.from(connectionParams.keys()),
        allStoredParams: Array.from(connectionParams.entries())
      });

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
    } catch (error) {
      console.error("[TwiML] Error processing request:", error);
      console.error("[TwiML] Error stack:", error instanceof Error ? error.stack : 'No stack trace');
      res.status(500).send('Internal server error');
    }
  });

  // Refresh batch status for a campaign (manually trigger status update)
  app.post("/api/campaigns/:campaignId/refresh-batch", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { campaignId } = req.params;
      const userId = req.user!.id;
      
      const campaign = await storage.getCampaign(parseInt(campaignId));
      if (!campaign || campaign.userId !== userId) {
        return res.status(404).json({ error: "Campaign not found" });
      }
      
      if (!campaign.batchJobId) {
        return res.status(400).json({ error: "No batch ID found for this campaign" });
      }
      
      const elevenLabsApiKey = process.env.ELEVENLABS_API_KEY || process.env.ELEVEN_LABS_API_KEY;
      if (!elevenLabsApiKey) {
        return res.status(400).json({ error: "ElevenLabs API key not configured" });
      }
      
      console.log(`[Batch Refresh] 🔄 Manually refreshing batch status for campaign ${campaignId}`);
      
      // Use ElevenLabs SDK to get fresh batch information
      const client = new ElevenLabsClient({ apiKey: elevenLabsApiKey });
      const rawBatchInfo = await client.conversationalAi.batchCalls.get(campaign.batchJobId);
      
      // Process the updated status
      const batchInfo = rawBatchInfo as BatchStatusResponse;
      await processBatchStatus(parseInt(campaignId), batchInfo);
      
      console.log(`[Batch Refresh] ✅ Refreshed batch status for campaign ${campaignId}`);
      
      res.json({ 
        success: true, 
        message: "Batch status refreshed",
        batchStatus: batchInfo.status,
        lastUpdated: new Date().toISOString()
      });
      
    } catch (error) {
      console.error(`[Batch Refresh] ❌ Error refreshing batch status for campaign ${req.params.campaignId}:`, error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : "Failed to refresh batch status" 
      });
    }
  });

  // Get live batch status for a campaign with real-time ElevenLabs data
  app.get("/api/campaigns/:campaignId/batch-status", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { campaignId } = req.params;
      const userId = req.user!.id;
      
      const campaign = await storage.getCampaign(parseInt(campaignId));
      if (!campaign || campaign.userId !== userId) {
        return res.status(404).json({ error: "Campaign not found" });
      }
      
      if (!campaign.batchJobId) {
        return res.status(400).json({ error: "No batch ID found for this campaign" });
      }
      
      const elevenLabsApiKey = process.env.ELEVENLABS_API_KEY || process.env.ELEVEN_LABS_API_KEY;
      if (!elevenLabsApiKey) {
        return res.status(400).json({ error: "ElevenLabs API key not configured" });
      }
      
      console.log(`[Live Batch Status] 🔍 Fetching live batch status for campaign ${campaignId}, batch ID: ${campaign.batchJobId}`);
      
      // Fetch live data from ElevenLabs API
      const client = new ElevenLabsClient({ apiKey: elevenLabsApiKey });
      const rawBatchInfo = await client.conversationalAi.batchCalls.get(campaign.batchJobId);
      
      const batchInfo = rawBatchInfo as BatchStatusResponse;
      
      // Process recipients with live status mapping
      const processedRecipients = (batchInfo.recipients || []).map(recipient => {
        const phoneNumber = recipient.phone_number || recipient.phoneNumber;
        const status = recipient.status;
        const conversationId = recipient.conversation_id || recipient.conversationId;
        
        // Map ElevenLabs status to UI-friendly status
        let uiStatus: string;
        let statusColor: string;
        let statusIcon: string;
        
        switch (status) {
          case 'pending':
            uiStatus = 'Scheduled';
            statusColor = 'yellow';
            statusIcon = 'clock';
            break;
          case 'in_progress':
            uiStatus = 'In Progress';
            statusColor = 'blue';
            statusIcon = 'phone';
            break;
          case 'completed':
            uiStatus = 'Completed';
            statusColor = 'green';
            statusIcon = 'check-circle';
            break;
          case 'failed':
            uiStatus = 'Failed';
            statusColor = 'red';
            statusIcon = 'x-circle';
            break;
          case 'cancelled':
            uiStatus = 'Cancelled';
            statusColor = 'gray';
            statusIcon = 'minus-circle';
            break;
          default:
            uiStatus = status || 'Unknown';
            statusColor = 'gray';
            statusIcon = 'help-circle';
        }
        
        // Get dynamic variables (lead info)
        const dynamicVars = recipient.conversation_initiation_client_data?.dynamic_variables || {};
        
        return {
          id: recipient.id,
          phoneNumber,
          status: status,
          uiStatus,
          statusColor,
          statusIcon,
          conversationId,
          createdAt: recipient.createdAtUnix,
          updatedAt: recipient.updatedAtUnix,
          leadInfo: {
            leadId: dynamicVars.lead_id,
            firstName: dynamicVars.first_name,
            lastName: dynamicVars.last_name
          }
        };
      });
      
      // Calculate live statistics
      const statusCounts = processedRecipients.reduce((acc, recipient) => {
        acc[recipient.status] = (acc[recipient.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      const liveStats = {
        total: processedRecipients.length,
        pending: statusCounts.pending || 0,
        inProgress: statusCounts.in_progress || 0,
        completed: statusCounts.completed || 0,
        failed: statusCounts.failed || 0,
        cancelled: statusCounts.cancelled || 0,
        successRate: processedRecipients.length > 0 
          ? Math.round(((statusCounts.completed || 0) / processedRecipients.length) * 100)
          : 0
      };
      
      console.log(`[Live Batch Status] 📊 Live Statistics:`, liveStats);
      
      res.json({
        batchId: batchInfo.id || campaign.batchJobId,
        batchStatus: batchInfo.status,
        agentId: batchInfo.agent_id || batchInfo.agentId,
        agentName: batchInfo.agent_name || batchInfo.agentName,
        phoneNumberId: batchInfo.phone_number_id || batchInfo.phoneNumberId,
        phoneProvider: batchInfo.phone_provider || batchInfo.phoneProvider,
        createdAt: batchInfo.created_at_unix || batchInfo.createdAtUnix,
        scheduledTime: batchInfo.scheduled_time_unix || batchInfo.scheduledTimeUnix,
        lastUpdated: batchInfo.last_updated_at_unix || batchInfo.lastUpdatedAtUnix,
        totalCallsDispatched: batchInfo.total_calls_dispatched || batchInfo.totalCallsDispatched || 0,
        totalCallsScheduled: batchInfo.total_calls_scheduled || batchInfo.totalCallsScheduled || 0,
        recipients: processedRecipients,
        liveStats,
        fetchedAt: new Date().toISOString()
      });
      
    } catch (error) {
      console.error(`[Live Batch Status] ❌ Error fetching live batch status for campaign ${req.params.campaignId}:`, error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : "Failed to fetch live batch status" 
      });
    }
  });

  // Get batch call conversation IDs for a campaign
  app.get("/api/campaigns/:campaignId/conversations", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { campaignId } = req.params;
      const userId = req.user!.id;
      
      const campaign = await storage.getCampaign(parseInt(campaignId));
      if (!campaign || campaign.userId !== userId) {
        return res.status(404).json({ error: "Campaign not found" });
      }
      
      // Get call logs with conversation IDs
      const callLogs = await storage.getCallLogsByCampaign(parseInt(campaignId));
      const conversations = callLogs
        .filter(log => log.elevenLabsConversationId)
        .map(log => ({
          callLogId: log.id,
          leadId: log.leadId,
          phoneNumber: log.phoneNumber,
          conversationId: log.elevenLabsConversationId,
          status: log.status,
          duration: log.duration,
          createdAt: log.createdAt
        }));
      
      console.log(`[Conversations API] Found ${conversations.length} conversations for campaign ${campaignId}`);
      
      res.json({ conversations });
      
    } catch (error) {
      console.error(`[Conversations API] Error fetching conversations for campaign ${req.params.campaignId}:`, error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : "Failed to fetch conversations" 
      });
    }
  });

  // Get conversation details (transcription + metadata)
  app.get("/api/conversations/:conversationId/details", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { conversationId } = req.params;
      const userId = req.user!.id;
      
      console.log(`[Conversation Details] Fetching details for conversation: ${conversationId} by user: ${userId}`);
      
      // Verify user has access to this conversation
      const userCampaigns = await storage.getAllCampaigns(userId);
      let userCallLogs: any[] = [];
      for (const campaign of userCampaigns) {
        const campaignCallLogs = await storage.getCallLogsByCampaign(campaign.id);
        userCallLogs.push(...campaignCallLogs);
      }
      
      const callLog = userCallLogs.find(log => log.elevenLabsConversationId === conversationId);
      if (!callLog) {
        console.error(`[Conversation Details] No call log found with conversation ID: ${conversationId}`);
        return res.status(404).json({ error: "Conversation not found" });
      }

      const campaign = await storage.getCampaign(callLog.campaignId);
      if (!campaign || campaign.userId !== userId) {
        console.error(`[Conversation Details] Access denied - campaign ownership mismatch`);
        return res.status(403).json({ error: "Access denied" });
      }
      
      // Find the corresponding lead
      const lead = await storage.getLeadsByCampaign(callLog.campaignId).then(leads => 
        leads.find(l => l.id === callLog.leadId)
      );

      // Parse transcription from webhook data stored in database
      let parsedTranscription = null;
      if (callLog.transcription) {
        try {
          parsedTranscription = JSON.parse(callLog.transcription);
          console.log(`[Conversation Details] Found stored transcription for ${conversationId}`);
          console.log(`[Conversation Details] Transcription data:`, JSON.stringify(parsedTranscription, null, 2));
        } catch (error) {
          console.error(`[Conversation Details] Error parsing stored transcription:`, error);
          console.error(`[Conversation Details] Raw transcription data:`, callLog.transcription);
        }
      } else {
        console.log(`[Conversation Details] No transcription available for ${conversationId}`);
        console.log(`[Conversation Details] Call log data:`, JSON.stringify(callLog, null, 2));
        
        // Try to fetch transcript on-demand from ElevenLabs Conversations API (fallback if webhooks not used)
        try {
          const elevenLabsApiKey = process.env.ELEVENLABS_API_KEY || process.env.ELEVEN_LABS_API_KEY;
          if (elevenLabsApiKey) {
            const resp = await fetch(`https://api.elevenlabs.io/v1/convai/conversations/${conversationId}`, {
              headers: { 'xi-api-key': elevenLabsApiKey }
            });
            if (resp.ok) {
              const data: any = await resp.json();
              let transcriptOut: any = null;
              // Prefer explicit transcript if present
              if (data.transcript) {
                transcriptOut = data.transcript;
              } else if (Array.isArray(data.messages)) {
                transcriptOut = data.messages.map((m: any) => ({
                  speaker: m.role || m.sender || 'unknown',
                  text: m.text || m.content || ''
                }));
              } else if (Array.isArray(data.turns)) {
                transcriptOut = data.turns.map((t: any) => ({
                  speaker: t.speaker || t.participant || 'unknown',
                  text: t.text || t.message || ''
                }));
              }
              // Update duration if present (check metadata fallback)
              const durationSec = data.duration_seconds || data.duration || data?.metadata?.call_duration_secs || null;
              const updates: any = {};
              if (transcriptOut) {
                updates.transcription = JSON.stringify(transcriptOut);
                parsedTranscription = transcriptOut;
                console.log(`[Conversation Details] ✅ Pulled transcript from ElevenLabs for ${conversationId}`);
              }
              if (typeof durationSec === 'number' && durationSec >= 0) {
                updates.duration = durationSec;
              }
              if (Object.keys(updates).length > 0) {
                await storage.updateCallLog(callLog.id, updates);
              }
            } else {
              console.log(`[Conversation Details] ElevenLabs conversation fetch failed: ${resp.status} ${resp.statusText}`);
            }
          }
        } catch (err) {
          console.warn(`[Conversation Details] Error fetching transcript from ElevenLabs:`, err);
        }
      }

      // Structure the response
      const response = {
        conversationId,
        callLog: {
          id: callLog.id,
          status: callLog.status,
          duration: callLog.duration,
          phoneNumber: callLog.phoneNumber,
          createdAt: callLog.createdAt
        },
        lead: lead ? {
          id: lead.id,
          firstName: lead.firstName,
          lastName: lead.lastName,
          contactNo: lead.contactNo,
          status: lead.status
        } : null,
        campaign: {
          id: campaign.id,
          name: campaign.name
        },
        conversation: parsedTranscription ? {
          transcript: parsedTranscription,
          status: callLog.status
        } : null,
        audioUrl: `/api/conversations/${conversationId}/audio`
      };

      console.log(`[Conversation Details] Final response structure:`, JSON.stringify(response, null, 2));
      res.json(response);

    } catch (error) {
      console.error('[Conversation Details] Error:', error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : "Failed to fetch conversation details" 
      });
    }
  });

  // Get conversation audio
  app.get("/api/conversations/:conversationId/audio", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { conversationId } = req.params;
      const userId = req.user!.id;
      
      console.log(`[Conversation Audio] Fetching audio for conversation: ${conversationId} by user: ${userId}`);
      
      const elevenLabsApiKey = process.env.ELEVENLABS_API_KEY || process.env.ELEVEN_LABS_API_KEY;

      if (!elevenLabsApiKey) {
        console.error("[Conversation Audio] ElevenLabs API key not configured");
        return res.status(400).json({ error: "ElevenLabs API key not configured" });
      }

      const userCampaigns = await storage.getAllCampaigns(userId);
      let userCallLogs: any[] = [];
      for (const campaign of userCampaigns) {
        const campaignCallLogs = await storage.getCallLogsByCampaign(campaign.id);
        userCallLogs.push(...campaignCallLogs);
      }
      console.log(`[Conversation Audio] Total call logs for user: ${userCallLogs.length}`);
      
      const callLog = userCallLogs.find(log => log.elevenLabsConversationId === conversationId);
      console.log(`[Conversation Audio] Found call log:`, callLog ? {
        id: callLog.id,
        campaignId: callLog.campaignId,
        leadId: callLog.leadId,
        status: callLog.status,
        conversationId: callLog.elevenLabsConversationId
      } : 'Not found');
      
      if (!callLog) {
        console.error(`[Conversation Audio] No call log found with conversation ID: ${conversationId}`);
        
        const conversationIds = userCallLogs
          .filter((log: any) => log.elevenLabsConversationId)
          .map((log: any) => log.elevenLabsConversationId);
        console.log(`[Conversation Audio] Available conversation IDs for user:`, conversationIds);
        
        return res.status(404).json({ error: "Conversation not found" });
      }

      const campaign = await storage.getCampaign(callLog.campaignId);
      console.log(`[Conversation Audio] Campaign ownership check:`, {
        campaignExists: !!campaign,
        campaignUserId: campaign?.userId,
        requestUserId: userId,
        ownershipValid: campaign?.userId === userId
      });
      
      if (!campaign || campaign.userId !== userId) {
        console.error(`[Conversation Audio] Access denied - campaign ownership mismatch`);
        return res.status(403).json({ error: "Access denied" });
      }

      const audioUrl = `https://api.elevenlabs.io/v1/convai/conversations/${conversationId}/audio`;
      console.log(`[Conversation Audio] Fetching audio from ElevenLabs: ${audioUrl}`);
      
      const audioResponse = await fetch(audioUrl, {
        headers: {
          "xi-api-key": elevenLabsApiKey,
          "Accept": "audio/mpeg"
        }
      });

      console.log(`[Conversation Audio] ElevenLabs response:`, {
        status: audioResponse.status,
        statusText: audioResponse.statusText,
        contentType: audioResponse.headers.get('content-type'),
        contentLength: audioResponse.headers.get('content-length')
      });

      if (!audioResponse.ok) {
        const errorText = await audioResponse.text();
        console.error("[ElevenLabs Audio] API error:", {
          status: audioResponse.status,
          statusText: audioResponse.statusText,
          error: errorText,
          conversationId,
          url: audioUrl
        });
        return res.status(audioResponse.status).json({ 
          error: "Failed to fetch conversation audio" 
        });
      }

      const contentType = audioResponse.headers.get('content-type') || 'audio/mpeg';
      const contentLength = audioResponse.headers.get('content-length');

      res.setHeader('Content-Type', contentType);
      if (contentLength) {
        res.setHeader('Content-Length', contentLength);
      }
      res.setHeader('Cache-Control', 'public, max-age=3600');

      console.log(`[Conversation Audio] Streaming audio to client - Content-Type: ${contentType}, Content-Length: ${contentLength}`);

      if (audioResponse.body) {
        audioResponse.body.pipe(res);
      } else {
        console.error("[Conversation Audio] No audio body received from ElevenLabs");
        res.status(500).json({ error: "No audio data received" });
      }

    } catch (error) {
      console.error('[Conversation Audio] Error:', error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : "Failed to fetch conversation audio" 
      });
    }
  });

  // Validate ElevenLabs webhook signature
  function validateWebhookSignature(payload: string, signature: string, secret: string): boolean {
    try {
      console.log('[Webhook Validation] 🔍 Debug signature validation:');
      console.log('[Webhook Validation] Raw signature header:', signature);
      console.log('[Webhook Validation] Webhook secret (first 10 chars):', secret.substring(0, 10) + '...');
      console.log('[Webhook Validation] Payload length:', payload.length);

      if (!signature || !signature.includes('t=') || !signature.includes('v0=')) {
        console.log('[Webhook Validation] ❌ Invalid signature format');
        return false;
      }

      const parts = signature.split(',');
      let timestamp = '';
      let hash = '';

      for (const part of parts) {
        const [key, value] = part.split('=', 2);
        if (key?.trim() === 't') timestamp = value?.trim() || '';
        if (key?.trim() === 'v0') hash = value?.trim() || '';
      }

      console.log('[Webhook Validation] Extracted timestamp:', timestamp);
      console.log('[Webhook Validation] Extracted hash:', hash);

      if (!timestamp || !hash) {
        console.log('[Webhook Validation] ❌ Missing timestamp or hash');
        return false;
      }

      // Validate timestamp (within 30 minutes)
      const now = Math.floor(Date.now() / 1000);
      const webhookTime = parseInt(timestamp);
      const timeDiff = Math.abs(now - webhookTime);
      
      console.log('[Webhook Validation] Current time:', now);
      console.log('[Webhook Validation] Webhook time:', webhookTime);
      console.log('[Webhook Validation] Time difference:', timeDiff, 'seconds');
      
      if (timeDiff > 1800) { // 30 minutes
        console.log('[Webhook Validation] ❌ Timestamp too old:', timeDiff, 'seconds');
        return false;
      }

      const payloadToSign = `${timestamp}.${payload}`;
      console.log('[Webhook Validation] Payload to sign:', payloadToSign.substring(0, 100) + '...');

      // Try multiple secret formats that ElevenLabs might use
      const secretVariations = [
        secret.startsWith('wsec_') ? secret.substring(5) : secret, // Remove wsec_ prefix
        secret, // Full secret with prefix
        Buffer.from(secret.startsWith('wsec_') ? secret.substring(5) : secret, 'hex'), // Hex decode without prefix
        Buffer.from(secret, 'base64'), // Base64 decode full secret
        Buffer.from(secret.startsWith('wsec_') ? secret.substring(5) : secret, 'base64'), // Base64 decode without prefix
      ];

      for (let i = 0; i < secretVariations.length; i++) {
        try {
          const secretVariation = secretVariations[i];
          console.log(`[Webhook Validation] Trying secret variation ${i + 1}:`, 
            typeof secretVariation === 'string' ? secretVariation.substring(0, 10) + '...' : 'Buffer');
          
          const expectedHash = crypto
            .createHmac('sha256', secretVariation)
            .update(payloadToSign, 'utf8')
            .digest('hex');

          console.log(`[Webhook Validation] Expected hash (variation ${i + 1}):`, expectedHash);

          const isValid = crypto.timingSafeEqual(
            Buffer.from(hash, 'hex'),
            Buffer.from(expectedHash, 'hex')
          );

          if (isValid) {
            console.log(`[Webhook Validation] ✅ Signature valid with variation ${i + 1}!`);
            return true;
          }
        } catch (error) {
          const msg = error instanceof Error ? error.message : String(error);
          console.log(`[Webhook Validation] Variation ${i + 1} failed:`, msg);
        }
      }

      console.log('[Webhook Validation] ❌ All signature variations failed');
      console.log('[Webhook Validation] Received hash:', hash);

      return false;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error('[Webhook Validation] ❌ Validation error:', msg);
      return false;
    }
  }

  // ElevenLabs Post-Call Webhook Endpoint
  app.post("/api/elevenlabs/webhook", express.raw({ type: 'application/json', limit: '10mb' }), async (req: Request, res: Response) => {
    try {
      console.log('');
      console.log('🔗=================[ ElevenLabs Webhook Received ]=================🔗');
      console.log('[ElevenLabs Webhook] Headers:', JSON.stringify(req.headers, null, 2));
      
      // Ensure we get the raw payload as string
      const payload = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : JSON.stringify(req.body);
      console.log('[ElevenLabs Webhook] Raw payload:', payload);
      
      // Validate webhook signature if secret is configured
      const signature = req.headers['elevenlabs-signature'] as string;
      const webhookSecret = process.env.ELEVENLABS_WEBHOOK_SECRET;
      const skipValidation = process.env.ELEVENLABS_WEBHOOK_SKIP_VALIDATION === 'true';
      
      if (skipValidation) {
        console.log('[ElevenLabs Webhook] ⚠️  SKIPPING signature validation (ELEVENLABS_WEBHOOK_SKIP_VALIDATION=true)');
        console.log('[ElevenLabs Webhook] 🔧 This is for debugging purposes only - remove in production!');
      } else if (webhookSecret && signature) {
        console.log('[ElevenLabs Webhook] 🔐 Validating webhook signature...');
        const isValid = validateWebhookSignature(payload, signature, webhookSecret);
        
        if (!isValid) {
          console.error('[ElevenLabs Webhook] ❌ Invalid webhook signature - rejecting request');
          console.log('🔗===============================================================🔗');
          console.log('');
          return res.status(401).json({ error: 'Invalid signature' });
        }
        
        console.log('[ElevenLabs Webhook] ✅ Webhook signature validated successfully');
      } else if (webhookSecret) {
        console.warn('[ElevenLabs Webhook] ⚠️  Webhook secret configured but no signature provided');
      } else {
        console.warn('[ElevenLabs Webhook] ⚠️  No webhook secret configured - skipping signature validation');
      }
      
      const webhookData = JSON.parse(payload);
      
      console.log('[ElevenLabs Webhook] Webhook type:', webhookData.type);
      console.log('[ElevenLabs Webhook] Conversation ID:', webhookData.data?.conversation_id);
      console.log('[ElevenLabs Webhook] Full payload:', JSON.stringify(webhookData, null, 2));

      // Handle transcription webhooks
      if (webhookData.type === 'post_call_transcription') {
        console.log('[ElevenLabs Webhook] Processing transcription webhook...');
        await handleTranscriptionWebhook(webhookData.data);
        console.log('[ElevenLabs Webhook] ✅ Transcription webhook processed successfully');
      } 
      // Handle audio webhooks
      else if (webhookData.type === 'post_call_audio') {
        console.log('[ElevenLabs Webhook] Processing audio webhook...');
        await handleAudioWebhook(webhookData.data);
        console.log('[ElevenLabs Webhook] ✅ Audio webhook processed successfully');
      } else {
        console.log('[ElevenLabs Webhook] ⚠️  Unknown webhook type:', webhookData.type);
      }

      console.log('🔗===============================================================🔗');
      console.log('');
      res.status(200).json({ status: 'received' });

    } catch (error) {
      console.error('[ElevenLabs Webhook] ❌ Error processing webhook:', error);
      console.log('🔗===============================================================🔗');
      console.log('');
      res.status(500).json({ error: 'Webhook processing failed' });
    }
  });

  // Get live conversation updates for a campaign
  app.get("/api/campaigns/:campaignId/live-conversations", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { campaignId } = req.params;
      const userId = req.user!.id;
      
      const campaign = await storage.getCampaign(parseInt(campaignId));
      if (!campaign || campaign.userId !== userId) {
        return res.status(404).json({ error: "Campaign not found" });
      }

      // Get current call logs from database
      const callLogs = await storage.getCallLogsByCampaign(parseInt(campaignId));
      const leads = await storage.getLeadsByCampaign(parseInt(campaignId));
      
      // If campaign has batch ID, get live data from ElevenLabs
      let liveData: BatchStatusResponse | null = null;
      if (campaign.batchJobId) {
        try {
          const elevenLabsApiKey = process.env.ELEVENLABS_API_KEY || process.env.ELEVEN_LABS_API_KEY;
          if (elevenLabsApiKey) {
            const client = new ElevenLabsClient({ apiKey: elevenLabsApiKey });
            const rawBatchInfo = await client.conversationalAi.batchCalls.get(campaign.batchJobId);
            liveData = rawBatchInfo as BatchStatusResponse;
          }
        } catch (error) {
          console.warn(`[Live Conversations] Could not fetch live batch data:`, error);
        }
      }

      // Combine database data with live ElevenLabs data
      const conversationsWithLiveData = callLogs.map(callLog => {
        const lead = leads.find(l => l.id === callLog.leadId);
        let liveRecipientData: any = null;
        
        // Find matching recipient in live data
        if (liveData?.recipients && callLog.phoneNumber) {
          liveRecipientData = liveData.recipients.find((r: any) => 
            (r.phone_number || r.phoneNumber) === callLog.phoneNumber
          );
        }
        
        // Determine the most current status
        const currentStatus = liveRecipientData?.status || callLog.status;
        const currentConversationId = liveRecipientData?.conversation_id || 
                                    liveRecipientData?.conversationId || 
                                    callLog.elevenLabsConversationId;
        
        // Map status to UI-friendly format
        let uiStatus: string;
        let statusColor: string;
        let statusIcon: string;
        
        switch (currentStatus) {
          case 'pending':
            uiStatus = 'Scheduled';
            statusColor = 'yellow';
            statusIcon = 'clock';
            break;
          case 'in_progress':
            uiStatus = 'In Progress';
            statusColor = 'blue';
            statusIcon = 'phone';
            break;
          case 'completed':
            uiStatus = 'Completed';
            statusColor = 'green';
            statusIcon = 'check-circle';
            break;
          case 'failed':
          case 'error':
          case 'busy':
          case 'no-answer':
            uiStatus = 'Failed';
            statusColor = 'red';
            statusIcon = 'x-circle';
            break;
          case 'cancelled':
            uiStatus = 'Cancelled';
            statusColor = 'gray';
            statusIcon = 'minus-circle';
            break;
          case 'answered_briefly':
            uiStatus = 'Brief Call';
            statusColor = 'orange';
            statusIcon = 'phone';
            break;
          default:
            uiStatus = currentStatus || 'Unknown';
            statusColor = 'gray';
            statusIcon = 'help-circle';
        }
        
        return {
          id: callLog.id,
          leadId: callLog.leadId,
          phoneNumber: callLog.phoneNumber,
          status: currentStatus,
          uiStatus,
          statusColor,
          statusIcon,
          duration: callLog.duration !== null ? callLog.duration : null,
          conversationId: currentConversationId,
          twilioCallSid: callLog.twilioCallSid,
          transcription: callLog.transcription,
          createdAt: callLog.createdAt,
          leadInfo: {
            firstName: lead?.firstName,
            lastName: lead?.lastName,
            leadStatus: lead?.status
          },
          liveData: liveRecipientData ? {
            elevenLabsStatus: liveRecipientData.status,
            updatedAt: liveRecipientData.updatedAtUnix || liveRecipientData.updated_at_unix,
            recipientId: liveRecipientData.id
          } : null,
          hasAudio: !!currentConversationId,
          audioUrl: currentConversationId ? `/api/conversations/${currentConversationId}/audio` : null
        };
      });

      // Calculate live statistics
      const statusCounts = conversationsWithLiveData.reduce((acc, conv) => {
        const status = conv.status || 'unknown';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const liveStats = {
        total: conversationsWithLiveData.length,
        pending: statusCounts.pending || 0,
        inProgress: statusCounts.in_progress || 0,
        completed: statusCounts.completed || 0,
        failed: (statusCounts.failed || 0) + (statusCounts.error || 0) + (statusCounts.busy || 0) + (statusCounts['no-answer'] || 0),
        cancelled: statusCounts.cancelled || 0,
        brief: statusCounts.answered_briefly || 0,
        withAudio: conversationsWithLiveData.filter(c => c.hasAudio).length,
        successRate: conversationsWithLiveData.length > 0 
          ? Math.round(((statusCounts.completed || 0) / conversationsWithLiveData.length) * 100)
          : 0
      };

      console.log(`[Live Conversations] 📊 Campaign ${campaignId} live stats:`, liveStats);

      res.json({
        campaignId: parseInt(campaignId),
        batchId: campaign.batchJobId,
        conversations: conversationsWithLiveData,
        liveStats,
        hasLiveData: !!liveData,
        lastFetched: new Date().toISOString()
      });

    } catch (error) {
      console.error(`[Live Conversations] ❌ Error fetching live conversations for campaign ${req.params.campaignId}:`, error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : "Failed to fetch live conversations" 
      });
    }
  });

  // Refresh conversation durations for a campaign
  app.post("/api/campaigns/:campaignId/refresh-durations", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { campaignId } = req.params;
      const userId = req.user!.id;
      
      const campaign = await storage.getCampaign(parseInt(campaignId));
      if (!campaign || campaign.userId !== userId) {
        return res.status(404).json({ error: "Campaign not found" });
      }

      const elevenLabsApiKey = process.env.ELEVENLABS_API_KEY || process.env.ELEVEN_LABS_API_KEY;
      if (!elevenLabsApiKey) {
        return res.status(400).json({ error: "ElevenLabs API key not configured" });
      }

      // Get all call logs with conversation IDs but missing or zero durations
      const callLogs = await storage.getCallLogsByCampaign(parseInt(campaignId));
      const callLogsToUpdate = callLogs.filter(log => 
        log.elevenLabsConversationId && (log.duration === null || log.duration === 0)
      );

      console.log(`[Refresh Durations] Found ${callLogsToUpdate.length} call logs to update durations for campaign ${campaignId}`);

      let updatedCount = 0;
      for (const callLog of callLogsToUpdate) {
        try {
          const conversationResponse = await fetch(`https://api.elevenlabs.io/v1/convai/conversations/${callLog.elevenLabsConversationId}`, {
            headers: { 'xi-api-key': elevenLabsApiKey }
          });
          
          if (conversationResponse.ok) {
            const conversationData: any = await conversationResponse.json();
            const duration = conversationData.duration_seconds || conversationData.duration || 0;
            
            if (duration > 0) {
              await storage.updateCallLog(callLog.id, { duration });
              console.log(`[Refresh Durations] Updated call log ${callLog.id} with duration: ${duration}s`);
              updatedCount++;
            }
          }
        } catch (error) {
          console.warn(`[Refresh Durations] Could not fetch duration for conversation ${callLog.elevenLabsConversationId}:`, error);
        }
      }

      res.json({
        success: true,
        message: `Updated ${updatedCount} call durations`,
        totalChecked: callLogsToUpdate.length,
        updated: updatedCount
      });

    } catch (error) {
      console.error(`[Refresh Durations] Error refreshing durations for campaign ${req.params.campaignId}:`, error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : "Failed to refresh durations" 
      });
    }
  });

  // Get webhook configuration info
  app.get("/api/elevenlabs/webhook-info", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    const baseUrl = process.env.BASE_URL || 'http://localhost:8000';
    const webhookUrl = `${baseUrl}/api/elevenlabs/webhook`;
    const hasWebhookSecret = !!process.env.ELEVENLABS_WEBHOOK_SECRET;
    
    res.json({
      webhookUrl,
      hasWebhookSecret,
      instructions: [
        "1. Go to ElevenLabs Dashboard > Conversational AI > Settings",
        "2. Enable 'Post-call webhooks'",
        "3. Set webhook URL to: " + webhookUrl,
        "4. Enable 'Transcription webhooks'",
        hasWebhookSecret ? "5. ✅ Webhook secret configured - signatures will be validated" : "5. ⚠️  Consider adding webhook secret for security",
        "6. Test with a call to verify webhook reception"
      ]
    });
  });
}

// Handle ElevenLabs transcription webhook
async function handleTranscriptionWebhook(data: any) {
  try {
    console.log('[Transcription Webhook] 📝 Processing transcription for conversation:', data.conversation_id);
    console.log('[Transcription Webhook] Raw data keys:', Object.keys(data));
    
    const conversationId = data.conversation_id;
    const transcript = data.transcript;
    const status = data.status;
    
    if (!conversationId) {
      console.log('[Transcription Webhook] ❌ Missing conversation ID');
      return;
    }

    if (!transcript) {
      console.log('[Transcription Webhook] ⚠️  No transcript in webhook data, keys available:', Object.keys(data));
      console.log('[Transcription Webhook] Full data:', JSON.stringify(data, null, 2));
    }

    // Find the call log with this conversation ID
    const allCallLogs = await storage.getAllCallLogs();
    const callLog = allCallLogs.find(log => 
      log.elevenLabsConversationId === conversationId
    );

    if (!callLog) {
      console.log('[Transcription Webhook] ❌ No call log found for conversation:', conversationId);
      console.log('[Transcription Webhook] Available conversation IDs:', 
        allCallLogs.map(log => log.elevenLabsConversationId).filter(Boolean)
      );
      
      // Check if this is a timing issue - maybe the batch processing hasn't updated the call log yet
      console.log('[Transcription Webhook] 🔍 Checking for call logs without conversation IDs...');
      const callLogsWithoutConvId = allCallLogs.filter(log => !log.elevenLabsConversationId && log.status === 'calling');
      console.log('[Transcription Webhook] Found', callLogsWithoutConvId.length, 'call logs without conversation IDs in calling status');
      
      if (callLogsWithoutConvId.length > 0) {
        console.log('[Transcription Webhook] ⏳ This might be a timing issue - webhook arrived before batch processing completed');
        console.log('[Transcription Webhook] 🔄 Retrying in 5 seconds...');
        
        // Retry after 5 seconds to allow batch processing to complete
        setTimeout(async () => {
          console.log('[Transcription Webhook] 🔄 Retrying transcription webhook for:', conversationId);
          await handleTranscriptionWebhook(data);
        }, 5000);
        
        return;
      }
      
      return;
    }

    console.log('[Transcription Webhook] ✅ Found call log:', callLog.id, 'for conversation:', conversationId);

    // Determine final status
    let finalStatus = (callLog.status || '').toLowerCase();
    const normalized = (status || '').toLowerCase();
    if (['done','completed'].includes(normalized)) {
      finalStatus = 'completed';
    } else if (['failed','error'].includes(normalized)) {
      finalStatus = 'failed';
    } else if (['no-answer','no_answer','noanswer'].includes(normalized)) {
      finalStatus = 'no-answer';
    } else if (['busy'].includes(normalized)) {
      finalStatus = 'busy';
    } else if (['cancelled','canceled'].includes(normalized)) {
      finalStatus = 'cancelled';
    } else if (['answered_briefly','brief','short'].includes(normalized)) {
      finalStatus = 'answered_briefly';
    }

    // Update the call log with transcription data
    const updateData: any = {
      status: finalStatus
    };

    // Try to capture duration from webhook if present
    const durationSec = (data.duration_seconds ?? data.duration ?? data.call_duration_seconds ?? data.total_duration ?? null);
    if (typeof durationSec === 'number' && durationSec >= 0) {
      updateData.duration = durationSec;
    }

    if (transcript) {
      updateData.transcription = JSON.stringify(transcript);
      console.log('[Transcription Webhook] 📝 Storing transcript with', Array.isArray(transcript) ? transcript.length : 'unknown', 'entries');
    }

    await storage.updateCallLog(callLog.id, updateData);

    console.log('[Transcription Webhook] ✅ Updated call log', callLog.id, 'with transcription and status:', finalStatus);

    // If this is from a campaign, update campaign statistics
    if (callLog.campaignId) {
      console.log('[Transcription Webhook] 📊 Updating campaign statistics for campaign:', callLog.campaignId);
      await updateCampaignStatistics(callLog.campaignId);
    }

  } catch (error) {
    console.error('[Transcription Webhook] ❌ Error processing transcription webhook:', error);
  }
}

// Handle ElevenLabs audio webhook  
async function handleAudioWebhook(data: any) {
  try {
    console.log('[Audio Webhook] Processing audio for conversation:', data.conversation_id);
    
    const conversationId = data.conversation_id;
    const audioData = data.full_audio;
    
    if (!conversationId || !audioData) {
      console.log('[Audio Webhook] Missing conversation ID or audio data');
      return;
    }

    // Find the call log with this conversation ID
    const allCallLogs = await storage.getAllCallLogs();
    const callLog = allCallLogs.find(log => 
      log.elevenLabsConversationId === conversationId
    );

    if (!callLog) {
      console.log('[Audio Webhook] No call log found for conversation:', conversationId);
      
      // Check if this is a timing issue - maybe the batch processing hasn't updated the call log yet
      console.log('[Audio Webhook] 🔍 Checking for call logs without conversation IDs...');
      const callLogsWithoutConvId = allCallLogs.filter(log => !log.elevenLabsConversationId && log.status === 'calling');
      console.log('[Audio Webhook] Found', callLogsWithoutConvId.length, 'call logs without conversation IDs in calling status');
      
      if (callLogsWithoutConvId.length > 0) {
        console.log('[Audio Webhook] ⏳ This might be a timing issue - webhook arrived before batch processing completed');
        console.log('[Audio Webhook] 🔄 Retrying in 5 seconds...');
        
        // Retry after 5 seconds to allow batch processing to complete
        setTimeout(async () => {
          console.log('[Audio Webhook] 🔄 Retrying audio webhook for:', conversationId);
          await handleAudioWebhook(data);
        }, 5000);
        
        return;
      }
      
      return;
    }

    // For now, just log that we received audio data
    // You could save the base64 audio data to storage if needed
    console.log('[Audio Webhook] Received audio data for call log:', callLog.id);

  } catch (error) {
    console.error('[Audio Webhook] Error processing audio webhook:', error);
  }
}

// Track running campaigns to prevent duplicates
const runningCampaigns = new Set<number>();

// Helper function to update campaign statistics
async function updateCampaignStatistics(campaignId: number) {
  try {
    const campaign = await storage.getCampaign(campaignId);
    if (!campaign) return;
    
    const allLeads = await storage.getLeadsByCampaign(campaignId);
    const allCallLogs = await storage.getCallLogsByCampaign(campaignId);
    
    // Count based on lead statuses (more accurate for batch calls)
    const completedLeads = allLeads.filter(lead => lead.status === 'completed').length;
    const failedLeads = allLeads.filter(lead => lead.status === 'failed').length;
    const callingLeads = allLeads.filter(lead => lead.status === 'calling').length;
    
    // Also count based on call logs for additional insight
    const completedCalls = allCallLogs.filter(log => 
      log.status === 'completed' || (log.elevenLabsConversationId && log.duration && log.duration > 0)
    ).length;
    
    const failedCalls = allCallLogs.filter(log => 
      ['failed', 'busy', 'no-answer', 'error', 'cancelled'].includes(log.status || '')
    ).length;
    
    // Successful calls are those that completed with meaningful conversation
    const successfulCalls = allCallLogs.filter(log => 
      (log.status === 'completed' || log.status === 'answered_briefly') && 
      log.elevenLabsConversationId && 
      (log.duration || 0) > 0
    ).length;
    
    const totalProcessed = completedLeads + failedLeads;
    
    await storage.updateCampaign(campaignId, {
      completedCalls: totalProcessed,
      failedCalls: failedLeads,
      successfulCalls: completedLeads // Use completed leads as successful calls
    });
    
    console.log(`[Campaign Stats] Updated campaign ${campaignId}:`, {
      totalLeads: allLeads.length,
      completedLeads,
      failedLeads,
      callingLeads,
      totalProcessed,
      successfulCalls: completedLeads,
      callLogsWithConversation: allCallLogs.filter(log => log.elevenLabsConversationId).length
    });
    
    // If no leads are in calling and all leads are processed, mark campaign completed
    if (callingLeads === 0 && totalProcessed === allLeads.length && campaign.status !== 'completed') {
      await storage.updateCampaign(campaignId, { status: 'completed' });
      console.log(`[Campaign Stats] ✅ Marked campaign ${campaignId} as completed`);
    }
  } catch (error) {
    console.error(`[Campaign Stats] Error updating campaign ${campaignId} statistics:`, error);
  }
}

// Helper function to process campaign calls using ElevenLabs Batch Calling
// This replaces the old individual call approach for better efficiency and scalability
async function processcamp(campaignId: number) {
  // Prevent duplicate campaign processing
  if (runningCampaigns.has(campaignId)) {
    console.log(`[Campaign ${campaignId}] Already running, skipping duplicate processing`);
    return;
  }
  
  runningCampaigns.add(campaignId);
  try {
    console.log(`[Campaign ${campaignId}] Starting campaign processing with ElevenLabs Batch Calling`);
    
    const leads = await storage.getLeadsByCampaign(campaignId);
    console.log(`[Campaign ${campaignId}] Found ${leads.length} total leads`);
    
    const pendingLeads = leads.filter(lead => lead.status === 'pending');
    console.log(`[Campaign ${campaignId}] Found ${pendingLeads.length} pending leads`);

    if (pendingLeads.length === 0) {
      console.log(`[Campaign ${campaignId}] No pending leads to process`);
      await storage.updateCampaign(campaignId, { status: 'completed' });
      return;
    }

    // Get campaign details
    const campaign = await storage.getCampaign(campaignId);
    if (!campaign) {
      throw new Error('Campaign not found');
    }

    // Validate required credentials
    const elevenLabsApiKey = process.env.ELEVENLABS_API_KEY || process.env.ELEVEN_LABS_API_KEY;
    const elevenLabsAgentId = process.env.ELEVENLABS_AGENT_ID || process.env.ELEVEN_LABS_AGENT_ID;
    const agentPhoneNumberId = process.env.ELEVENLABS_PHONE_NUMBER_ID;

    if (!elevenLabsApiKey || !elevenLabsAgentId || !agentPhoneNumberId) {
      throw new Error('Missing required ElevenLabs credentials (API_KEY, AGENT_ID, PHONE_NUMBER_ID)');
    }

    // Update agent knowledge base before starting batch
    await updateAgentKnowledgeBase(elevenLabsApiKey, campaignId);

    // Create call logs for all leads
    for (const lead of pendingLeads) {
      await storage.createCallLog({
        campaignId,
        leadId: lead.id,
        phoneNumber: lead.contactNo,
        status: "initiated",
        duration: null,
        twilioCallSid: null,
      });
      
      // Update lead status
      await storage.updateLead(lead.id, { status: 'calling' });
    }

    // Submit batch calling job to ElevenLabs
    const batchId = await submitBatchCall(campaignId, pendingLeads, campaign, elevenLabsApiKey, elevenLabsAgentId, agentPhoneNumberId);
    
    if (batchId) {
      // Store batch ID in campaign for tracking
      console.log(`[Campaign ${campaignId}] Storing batch ID: ${batchId}`);
      
      const updatedCampaign = await storage.updateCampaign(campaignId, { 
        status: 'active',
        batchJobId: batchId 
      });
      
      console.log(`[Campaign ${campaignId}] Campaign after batch ID update:`, {
        id: updatedCampaign?.id,
        status: updatedCampaign?.status,
        batchJobId: updatedCampaign?.batchJobId
      });
      
      if (!updatedCampaign?.batchJobId) {
        console.error(`[Campaign ${campaignId}] ❌ CRITICAL: Batch ID was not stored! Expected: ${batchId}, Got: ${updatedCampaign?.batchJobId}`);
        throw new Error(`Failed to store batch ID in database. This might indicate a missing database column.`);
      }
      
      console.log(`[Campaign ${campaignId}] Batch submitted successfully with ID: ${batchId}`);
      
      // Start polling for batch status
      pollBatchStatus(campaignId, batchId, elevenLabsApiKey);
    } else {
      throw new Error('Failed to submit batch call');
    }

  } catch (error) {
    console.error(`[Campaign ${campaignId}] Campaign processing error:`, error);
    await storage.updateCampaign(campaignId, { status: 'failed' });
    
    // Update all pending leads to failed
    const leads = await storage.getLeadsByCampaign(campaignId);
    for (const lead of leads.filter(l => l.status === 'calling')) {
      await storage.updateLead(lead.id, { status: 'failed' });
    }
  } finally {
    // Note: Don't remove from running campaigns here - let polling handle it
    console.log(`[Campaign ${campaignId}] Batch submission completed`);
  }
}

// Submit batch call to ElevenLabs
async function submitBatchCall(
  campaignId: number, 
  leads: any[], 
  campaign: any, 
  apiKey: string, 
  agentId: string, 
  phoneNumberId: string
): Promise<string | null> {
  try {
    const recipients = leads.map(lead => ({
      phone_number: lead.contactNo,
      conversation_initiation_client_data: {
        dynamic_variables: {
          first_name: lead.firstName || 'there',
          last_name: lead.lastName || '',
          lead_id: lead.id.toString()
        }
      }
    }));

    const batchPayload = {
      call_name: `Campaign_${campaignId}_${Date.now()}`,
      agent_id: agentId,
      agent_phone_number_id: phoneNumberId,
      scheduled_time_unix: Math.floor(Date.now() / 1000), // Start immediately
      recipients: recipients
    };

    console.log(`[Batch Call] 🚀 Submitting batch for campaign ${campaignId}`);
    console.log(`[Batch Call] 📊 Batch Configuration:`, {
      campaignId,
      callName: batchPayload.call_name,
      agentId: batchPayload.agent_id,
      phoneNumberId: batchPayload.agent_phone_number_id,
      totalRecipients: recipients.length,
      scheduledTime: new Date(batchPayload.scheduled_time_unix * 1000).toISOString(),
      apiKeyLength: apiKey.length
    });
    
    // Log sample recipients for verification
    console.log(`[Batch Call] 📱 Sample Recipients (first 3):`, recipients.slice(0, 3).map(r => ({
      phoneNumber: r.phone_number,
      dynamicVariables: r.conversation_initiation_client_data?.dynamic_variables
    })));
    
    const response = await fetch('https://api.elevenlabs.io/v1/convai/batch-calling/submit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': apiKey,
      },
      body: JSON.stringify(batchPayload),
    });

    console.log(`[Batch Call] 📡 ElevenLabs Response Status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Batch Call] ❌ Submission failed:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
        campaignId,
        recipientCount: recipients.length
      });
      throw new Error(`Batch submission failed: ${response.statusText} - ${errorText}`);
    }

    const result = await response.json() as BatchCallResponse;
    
    console.log(`[Batch Call] ✅ Batch submitted successfully!`);
    console.log(`[Batch Call] 📋 Submission Response:`, {
      batchId: result?.batch_id || result?.id || 'Not provided',
      status: result?.status || 'Unknown',
      message: result?.message || 'No message',
      campaignId,
      submittedAt: new Date().toISOString()
    });
    
    const batchId = result?.batch_id || result?.id;
    if (batchId) {
      console.log(`[Batch Call] 🎯 Batch ID assigned: ${batchId}`);
    } else {
      console.warn(`[Batch Call] ⚠️ No batch ID found in response:`, result);
    }
    
    return batchId || null;
  } catch (error) {
    console.error('[Batch Call] ❌ Error submitting batch:', error);
    console.error('[Batch Call] 🔧 Error details:', {
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      errorStack: error instanceof Error ? error.stack : 'No stack trace',
      campaignId,
      recipientCount: leads.length
    });
    return null;
  }
}

// Poll batch status and update leads accordingly
async function pollBatchStatus(campaignId: number, batchId: string, apiKey: string) {
  const pollInterval = 30000; // Poll every 30 seconds
  const maxPollTime = 3600000; // Stop polling after 1 hour
  const startTime = Date.now();
  
  // Create ElevenLabs client for batch operations
  const client = new ElevenLabsClient({ apiKey });
  
  console.log(`[Batch Poll] 🚀 Starting to poll batch ${batchId} for campaign ${campaignId}`);
  console.log(`[Batch Poll] 📊 Poll configuration:`, {
    batchId,
    campaignId,
    pollIntervalSeconds: pollInterval / 1000,
    maxPollTimeMinutes: maxPollTime / 60000,
    apiKeyLength: apiKey.length
  });
  
  const poll = async () => {
    try {
      const elapsedTime = Date.now() - startTime;
      if (elapsedTime > maxPollTime) {
        console.log(`[Batch Poll] ⏰ Max poll time reached for batch ${batchId} (${Math.round(elapsedTime / 60000)} minutes), stopping`);
        runningCampaigns.delete(campaignId);
        return;
      }

      console.log(`[Batch Poll] 🔍 Fetching batch status for ${batchId} (elapsed: ${Math.round(elapsedTime / 1000)}s)`);
      
      // Use ElevenLabs SDK to get batch information
      const rawBatchInfo = await client.conversationalAi.batchCalls.get(batchId);
      
      // Cast to our flexible interface for easier property access
      const batchInfo = rawBatchInfo as BatchStatusResponse;
      
      console.log(`[Batch Poll] 📋 Detailed Batch Information:`, {
        batchId: batchInfo.batchId || batchInfo.batch_id || batchInfo.id || batchId,
        status: batchInfo.status,
        totalCalls: batchInfo.calls?.length || batchInfo.recipients?.length || 0,
        totalCallsDispatched: batchInfo.totalCallsDispatched || 0,
        totalCallsScheduled: batchInfo.totalCallsScheduled || 0,
        createdAt: batchInfo.createdAt || batchInfo.created_at || batchInfo.createdAtUnix,
        scheduledTime: batchInfo.scheduledTimeUnix || batchInfo.scheduled_time_unix,
        agentId: batchInfo.agentId || batchInfo.agent_id,
        phoneNumberId: batchInfo.agent_phone_number_id || batchInfo.phoneNumberId
      });
      
      // Log the complete batch object for debugging
      console.log(`[Batch Poll] 🔍 Full Batch Response Object:`, JSON.stringify(batchInfo, null, 2));
      
      // Log individual call statuses if available
      const callsArray = batchInfo.calls || batchInfo.recipients || [];
      if (callsArray && callsArray.length > 0) {
        console.log(`[Batch Poll] 📞 Individual Call Details:`);
        const callsByStatus = callsArray.reduce((acc: Record<string, number>, call: any) => {
          acc[call.status] = (acc[call.status] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        
        console.log(`[Batch Poll] 📊 Call Status Summary:`, callsByStatus);
        
        // Log first few calls for detailed inspection
        const sampleCalls = callsArray.slice(0, 3);
        sampleCalls.forEach((call: any, index: number) => {
          console.log(`[Batch Poll] 📱 Sample Call ${index + 1}:`, {
            phoneNumber: call.phone_number || call.phoneNumber,
            status: call.status,
            duration: call.duration || 'N/A',
            conversationId: call.conversation_id || call.conversationId || 'N/A',
            errorMessage: call.error_message || call.errorMessage || 'None',
            recipientId: call.id || 'N/A'
          });
        });
      }
      
      console.log(`[Batch Poll] 🎯 Batch ${batchId} current status: ${batchInfo.status}`);
      
      // Update campaign and leads based on batch status
      await processBatchStatus(campaignId, batchInfo);
      
      // Check if there are still calls in progress, regardless of batch status
      const currentCallsArray = batchInfo.calls || batchInfo.recipients || [];
      const activeStatuses = ['initiated', 'in_progress', 'pending'];
      const stillActiveCount = currentCallsArray.filter((call: any) => 
        activeStatuses.includes(call.status)
      ).length;
      
      console.log(`[Batch Poll] 📊 Call Status Check:`, {
        batchStatus: batchInfo.status,
        totalCalls: currentCallsArray.length,
        stillActive: stillActiveCount,
        statusBreakdown: currentCallsArray.reduce((acc: Record<string, number>, call: any) => {
          acc[call.status] = (acc[call.status] || 0) + 1;
          return acc;
        }, {})
      });

      // Continue polling if batch is still in progress OR if there are still active calls
      if (batchInfo.status === 'in_progress' || batchInfo.status === 'pending' || stillActiveCount > 0) {
        const reason = batchInfo.status === 'in_progress' || batchInfo.status === 'pending' 
          ? `batch status is ${batchInfo.status}`
          : `${stillActiveCount} calls still active`;
        console.log(`[Batch Poll] ⏳ Continuing to poll because ${reason}, next check in ${pollInterval / 1000}s`);
        setTimeout(poll, pollInterval);
      } else {
        // All calls are in final states - truly completed
        console.log(`[Batch Poll] ✅ Batch ${batchId} and all calls finished with final status: ${batchInfo.status}`);
        const finalCallsArray = batchInfo.calls || batchInfo.recipients || [];
        console.log(`[Batch Poll] 📈 Final batch statistics:`, {
          totalCallsAttempted: finalCallsArray.length,
          completedCalls: finalCallsArray.filter((call: any) => call.status === 'completed').length,
          failedCalls: finalCallsArray.filter((call: any) => 
            ['failed', 'error', 'no_answer', 'busy'].includes(call.status)
          ).length,
          initiatedCalls: finalCallsArray.filter((call: any) => call.status === 'initiated').length,
          inProgressCalls: finalCallsArray.filter((call: any) => call.status === 'in_progress').length,
          totalDuration: finalCallsArray.reduce((sum: number, call: any) => sum + (call.duration || 0), 0)
        });
        
        runningCampaigns.delete(campaignId);
        
        // Final campaign status update
        await updateCampaignStatistics(campaignId);
        
        // Determine final campaign status based on call results
        const completedCallsCount = finalCallsArray.filter((call: any) => call.status === 'completed').length;
        const finalStatus = completedCallsCount > 0 ? 'completed' : 'failed';
        await storage.updateCampaign(campaignId, { status: finalStatus });
        
        console.log(`[Batch Poll] 🏁 Campaign ${campaignId} marked as ${finalStatus} (${completedCallsCount} successful calls)`);

        // Finalize: auto-backfill durations for any conversations with missing/zero duration
        try {
          const callLogs = await storage.getCallLogsByCampaign(campaignId);
          const toUpdate = callLogs.filter((log: any) => log.elevenLabsConversationId && (!log.duration || log.duration === 0));
          if (toUpdate.length > 0) {
            console.log(`[Batch Poll] ⏱️ Finalizing durations - ${toUpdate.length} conversations to backfill`);
            for (const log of toUpdate) {
              try {
                const resp = await fetch(`https://api.elevenlabs.io/v1/convai/conversations/${log.elevenLabsConversationId}`, {
                  headers: { 'xi-api-key': apiKey }
                });
                if (resp.ok) {
                  const data: any = await resp.json();
                  const tryNumber = (v: any) => (typeof v === 'number' && !isNaN(v) ? v : 0);
                  const unix = (v: any) => (typeof v === 'number' && v > 0 ? v : 0);

                  let best = 0;
                  best = Math.max(best, tryNumber(data.duration_seconds), tryNumber(data.duration));
                  const cStart = unix(data.created_at_unix || data.createdAtUnix);
                  const cEnd = unix(data.last_updated_at_unix || data.lastUpdatedAtUnix || data.updated_at_unix || data.updatedAtUnix);
                  if (cStart && cEnd && cEnd >= cStart) best = Math.max(best, cEnd - cStart);

                  const collectUnix = (arr: any[], fields: string[]): number[] => {
                    const out: number[] = [];
                    for (const m of arr) {
                      for (const f of fields) {
                        if (typeof m[f] === 'number') { out.push(m[f]); break; }
                        if (typeof m[f] === 'string') { const t = Date.parse(m[f]); if (!isNaN(t)) { out.push(Math.floor(t/1000)); break; } }
                      }
                    }
                    return out;
                  };
                  if (Array.isArray(data.messages)) {
                    const ts = collectUnix(data.messages, ['created_at_unix','createdAtUnix','timestamp','created_at']);
                    if (ts.length > 1) best = Math.max(best, Math.max(...ts) - Math.min(...ts));
                  }
                  if (Array.isArray(data.turns)) {
                    const ts = collectUnix(data.turns, ['created_at_unix','createdAtUnix','timestamp','created_at']);
                    if (ts.length > 1) best = Math.max(best, Math.max(...ts) - Math.min(...ts));
                  }

                  if (best > 0) {
                    await storage.updateCallLog(log.id, { duration: best });
                    console.log(`[Batch Poll] ✅ Duration backfilled: callLog ${log.id} = ${best}s`);
                  }
                }
              } catch (e) {
                console.warn(`[Batch Poll] Duration backfill failed for ${log.elevenLabsConversationId}:`, e);
              }
            }
            // Refresh campaign stats after backfill
            await updateCampaignStatistics(campaignId);
          }
        } catch (e) {
          console.warn(`[Batch Poll] Duration finalization step encountered an error:`, e);
        }
      }
    } catch (error) {
      console.error(`[Batch Poll] ❌ Error polling batch ${batchId}:`, error);
      console.error(`[Batch Poll] 🔧 Error details:`, {
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorStack: error instanceof Error ? error.stack : 'No stack trace',
        batchId,
        campaignId
      });
      setTimeout(poll, pollInterval);
    }
  };
  
  // Start polling
  setTimeout(poll, pollInterval);
}

// Process batch status and update individual call results
async function processBatchStatus(campaignId: number, batchStatus: BatchStatusResponse) {
  try {
    console.log(`[Batch Status] Processing batch status for campaign ${campaignId}:`, batchStatus);
    
    // Handle both 'calls' and 'recipients' arrays (different API response formats)
    const callsArray = batchStatus.calls || batchStatus.recipients || [];
    
    if (callsArray && Array.isArray(callsArray)) {
      console.log(`[Batch Status] Processing ${callsArray.length} call results`);
      
      for (const call of callsArray) {
        const phoneNumber = call.phone_number || call.phoneNumber || call.recipient_phone;
        const callStatus = call.status;
        const callDuration = call.duration || 0;
        const conversationId = call.conversation_id || call.conversationId;
        
        console.log(`[Batch Status] Processing call:`, {
          phoneNumber,
          callStatus,
          callDuration,
          conversationId: conversationId || 'None'
        });
        
        if (phoneNumber) {
          // Find the lead by phone number
          const leads = await storage.getLeadsByCampaign(campaignId);
          const lead = leads.find(l => l.contactNo === phoneNumber);
          
          if (lead) {
            // Determine lead status based on call outcome
            let newLeadStatus: string;
            
            // Get actual call duration from ElevenLabs conversation API
            let actualDuration = callDuration;
            if (conversationId && (callStatus === 'completed' || callStatus === 'in_progress')) {
              try {
                const elevenLabsApiKey = process.env.ELEVENLABS_API_KEY || process.env.ELEVEN_LABS_API_KEY;
                const conversationResponse = await fetch(`https://api.elevenlabs.io/v1/convai/conversations/${conversationId}`, {
                  headers: { 'xi-api-key': elevenLabsApiKey! }
                });
                if (conversationResponse.ok) {
                  const conversationData: any = await conversationResponse.json();

                  const tryNumber = (v: any) => (typeof v === 'number' && !isNaN(v) ? v : 0);
                  const unix = (v: any) => (typeof v === 'number' && v > 0 ? v : 0);

                  let best = 0;
                  const cand1 = tryNumber(conversationData.duration_seconds);
                  const cand2 = tryNumber(conversationData.duration);
                  best = Math.max(best, cand1, cand2);

                  // Compute from conversation-level timestamps
                  const cStart = unix(conversationData.created_at_unix || conversationData.createdAtUnix);
                  const cEnd = unix(conversationData.last_updated_at_unix || conversationData.lastUpdatedAtUnix || conversationData.updated_at_unix || conversationData.updatedAtUnix);
                  if (cStart && cEnd && cEnd >= cStart) best = Math.max(best, cEnd - cStart);

                  // Compute from messages/turns arrays if present
                  const collectUnix = (arr: any[], fields: string[]): number[] => {
                    const out: number[] = [];
                    for (const m of arr) {
                      for (const f of fields) {
                        if (typeof m[f] === 'number') { out.push(m[f]); break; }
                        if (typeof m[f] === 'string') {
                          const t = Date.parse(m[f]);
                          if (!isNaN(t)) { out.push(Math.floor(t/1000)); break; }
                        }
                      }
                    }
                    return out;
                  };

                  if (Array.isArray(conversationData.messages)) {
                    const ts = collectUnix(conversationData.messages, ['created_at_unix','createdAtUnix','timestamp','created_at']);
                    if (ts.length > 1) best = Math.max(best, Math.max(...ts) - Math.min(...ts));
                  }
                  if (Array.isArray(conversationData.turns)) {
                    const ts = collectUnix(conversationData.turns, ['created_at_unix','createdAtUnix','timestamp','created_at']);
                    if (ts.length > 1) best = Math.max(best, Math.max(...ts) - Math.min(...ts));
                  }

                  const fetchedDuration = best;
                  if (fetchedDuration > actualDuration || actualDuration === 0) {
                    actualDuration = fetchedDuration;
                  }
                  console.log(`[Batch Status] Retrieved actual duration for ${phoneNumber}: ${actualDuration}s (fetched: ${fetchedDuration}s, original: ${callDuration}s)`);
                }
              } catch (error) {
                console.warn(`[Batch Status] Could not fetch conversation duration for ${conversationId}:`, error);
              }
            }

            // Map ElevenLabs statuses to our lead statuses
            // ElevenLabs statuses: pending, in_progress, completed, failed, cancelled
            switch (callStatus) {
              case 'pending':
                // Call is scheduled but not yet initiated
                newLeadStatus = 'calling';
                break;
              case 'in_progress':
                // Call is actively in progress
                newLeadStatus = 'calling';
                break;
              case 'completed':
                // Call completed successfully - consider successful if has conversation or duration
                newLeadStatus = (actualDuration > 0 || conversationId) ? 'completed' : 'failed';
                break;
              case 'failed':
                // Call explicitly failed
                newLeadStatus = 'failed';
                break;
              case 'cancelled':
                // Call was cancelled
                newLeadStatus = 'failed';
                break;
              // Legacy status handling for backward compatibility
              case 'initiated':
                newLeadStatus = 'calling';
                break;
              case 'error':
              case 'no_answer':
              case 'busy':
                newLeadStatus = 'failed';
                break;
              default:
                console.warn(`[Batch Status] Unknown call status: ${callStatus} for ${phoneNumber}`);
                // For unknown statuses, keep as calling if we have a conversation ID
                newLeadStatus = conversationId ? 'calling' : 'failed';
            }
            
            console.log(`[Batch Status] Updating lead ${lead.id} (${phoneNumber}) from ${lead.status} to ${newLeadStatus}`);
            
            // Update lead status
            await storage.updateLead(lead.id, { status: newLeadStatus });
            
                          // Update call log with results
              const callLogs = await storage.getCallLogsByCampaign(campaignId);
              const callLog = callLogs.find(log => log.leadId === lead.id);
              if (callLog) {
                // Map ElevenLabs status to call log status with more detailed mapping
                let callLogStatus: string;
                
                switch (callStatus) {
                  case 'pending':
                    callLogStatus = 'initiated'; // Call scheduled but not started
                    break;
                  case 'in_progress':
                    callLogStatus = 'in_progress'; // Call actively in progress
                    break;
                  case 'completed':
                    if (actualDuration > 10) {
                      callLogStatus = 'completed'; // Successful conversation (>10 seconds)
                    } else if (actualDuration > 0) {
                      callLogStatus = 'answered_briefly'; // Short conversation
                    } else if (conversationId) {
                      callLogStatus = 'answered_briefly'; // Has conversation but no duration
                    } else {
                      callLogStatus = 'failed'; // Completed but no meaningful interaction
                    }
                    break;
                  case 'failed':
                    callLogStatus = 'failed'; // Call failed
                    break;
                  case 'cancelled':
                    callLogStatus = 'cancelled'; // Call was cancelled
                    break;
                  // Legacy status handling
                  case 'initiated':
                    callLogStatus = conversationId ? 'in_progress' : 'initiated';
                    break;
                  case 'error':
                    callLogStatus = 'error';
                    break;
                  case 'no_answer':
                    callLogStatus = 'no-answer';
                    break;
                  case 'busy':
                    callLogStatus = 'busy';
                    break;
                  default:
                    callLogStatus = callStatus; // Use original status if unknown
                }
                
                await storage.updateCallLog(callLog.id, {
                  status: callLogStatus,
                  duration: actualDuration,
                  elevenLabsConversationId: conversationId
                });
                
                console.log(`[Batch Status] Updated call log ${callLog.id} with status: ${callLogStatus} (EL: ${callStatus}), duration: ${actualDuration}s, conversationId: ${conversationId || 'None'}`);
                console.log(`[Batch Status] Status mapping: ElevenLabs '${callStatus}' → Lead '${newLeadStatus}' → CallLog '${callLogStatus}'`);
              } else {
                console.warn(`[Batch Status] No call log found for lead ${lead.id}`);
              }
          } else {
            console.warn(`[Batch Status] No lead found with phone number: ${phoneNumber}`);
          }
        } else {
          console.warn(`[Batch Status] Call missing phone number:`, call);
        }
      }
    } else {
      console.log(`[Batch Status] No call results to process`);
    }
    
    // Update campaign statistics
    await updateCampaignStatistics(campaignId);
    
  } catch (error) {
    console.error(`[Batch Status] Error processing batch status for campaign ${campaignId}:`, error);
  }
}

export function setupWebSocketServer(httpServer: Server): void {
  const wsRouter = (req: IncomingMessage): boolean => {
    if (!req.url) return false;
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
      
      if (isNaN(campaignId)) {
        console.error("[WebSocket] Invalid campaignId:", pathMatch[1]);
        ws.close();
        return;
      }

      // Use same key format as TwiML endpoint
      const primaryKey = `${String(campaignId)}_params`;
      console.log("[WebSocket] DEBUG - Looking for primary key:", { campaignId, primaryKey });
      
      let params = connectionParams.get(primaryKey);
      let foundKey = primaryKey;
      
      // Fallback: try to find params by any key that contains this campaignId
      if (!params) {
        console.log("[WebSocket] Primary key not found, searching for alternative keys...");
        for (const [storedKey, storedParams] of connectionParams.entries()) {
          if (storedParams.campaignId === campaignId?.toString()) {
            params = storedParams;
            foundKey = storedKey;
            console.log(`[WebSocket] FOUND - Using alternative key: ${storedKey}`);
            break;
          }
        }
      }
      
      // CRITICAL DEBUG - Show exactly what we found
      console.log("[WebSocket] RETRIEVAL DEBUG:", {
        primaryKey,
        primaryKeyType: typeof primaryKey,
        campaignId,
        campaignIdType: typeof campaignId,
        hasParams: !!params,
        foundKey,
        params,
        availableKeys: Array.from(connectionParams.keys()),
        allStoredParams: Array.from(connectionParams.entries())
      });

      if (!params) {
        console.error("[WebSocket] ❌ CRITICAL - No stored parameters found for campaignId:", campaignId);
        console.error("[WebSocket] ❌ Primary key tried:", primaryKey);
        console.error("[WebSocket] ❌ Available parameter keys:", Array.from(connectionParams.keys()));
        console.error("[WebSocket] ❌ Available parameters:", Array.from(connectionParams.entries()));
        ws.close();
        return;
      }

      const { isTestCall, firstName, leadId, useElevenLabs } = params;
      
      console.log("[WebSocket] Processing call with params:", { isTestCall, firstName, leadId, useElevenLabs });
      
      // If this is a test call with ElevenLabs integration, create ElevenLabs conversation
      if (isTestCall && useElevenLabs) {
        console.log("[WebSocket] 🎯 Creating ElevenLabs conversation for test call");
        
        const elevenLabsApiKey = process.env.ELEVENLABS_API_KEY;
        const elevenLabsAgentId = process.env.ELEVENLABS_AGENT_ID;
        
        if (elevenLabsApiKey && elevenLabsAgentId) {
          try {
            // Create ElevenLabs conversation using the JavaScript SDK
            const elevenLabsClient = new ElevenLabsClient({ apiKey: elevenLabsApiKey });
            
            console.log("[WebSocket] 📞 Creating ElevenLabs conversation for agent:", elevenLabsAgentId);
            
            // Note: For now, we'll log that we would create a conversation
            // The actual conversation will be created when Twilio connects to ElevenLabs via WebSocket
            // We'll use the media stream to pipe audio to ElevenLabs WebSocket
            console.log("[WebSocket] ✅ ElevenLabs integration enabled - will create conversation on stream start");
            
          } catch (error) {
            console.error("[WebSocket] ❌ Error setting up ElevenLabs integration:", error);
          }
        } else {
          console.warn("[WebSocket] ⚠️  ElevenLabs credentials missing, falling back to standard WebSocket");
        }
      }
      
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
      else if (leadId) {
        const leads = await storage.getLeadsByCampaign(campaignId);
        const foundLead = leads.find(l => l.id === parseInt(leadId));
        if (foundLead) {
          currentLead = {
            id: foundLead.id,
            campaignId: foundLead.campaignId,
            firstName: foundLead.firstName || 'Unknown',
            lastName: foundLead.lastName || '',
            contactNo: foundLead.contactNo,
            status: foundLead.status || 'pending',
            callDuration: foundLead.callDuration,
            createdAt: foundLead.createdAt || new Date()
          };
        }
      }

      if (!currentLead) {
        console.error("[WebSocket] No lead data found", { isTestCall, leadId, campaignId });
        ws.close();
        return;
      }

      // Clean up both primary and backup parameter keys
      connectionParams.delete(primaryKey);
      
      // Also clean up any CallSid-based keys for this campaign
      for (const [storedKey, storedParams] of connectionParams.entries()) {
        if (storedParams.campaignId === campaignId?.toString()) {
          connectionParams.delete(storedKey);
          console.log(`[WebSocket] Cleaned up alternative parameter key: ${storedKey}`);
        }
      }

      ws.on('message', async (message: RawData) => {
        try {
          const rawMessage = message.toString();
          //console.log("[Twilio] 📨 RAW MESSAGE RECEIVED:", rawMessage);
          
          const msg = JSON.parse(rawMessage) as TwilioMessage;
          // console.log("[Twilio] 📋 PARSED MESSAGE:", {
          //   event: msg.event,
          //   hasStart: !!msg.start,
          //   hasMedia: !!msg.media,
          //   fullMessage: msg
          // });
          
          switch (msg.event) {
            case "start":
              console.log("[Twilio] 🚀 START event received!", {
                hasStartObject: !!msg.start,
                startObject: msg.start,
                currentLead: !!currentLead,
                campaignId
              });
              
              if (msg.start) {
                streamSid = msg.start.streamSid;
                callSid = msg.start.callSid;
                console.log(`[Twilio] ✅ Stream started - StreamSid: ${streamSid}, CallSid: ${callSid}, CampaignId: ${campaignId}, LeadId: ${leadId}, TestCall: ${isTestCall}`);
                
                if (currentLead && streamSid && callSid && campaignId !== null) {
                  console.log("[Twilio] 🎯 All requirements met, setting up ElevenLabs connection...");
                  elevenlabsWs = await setupElevenLabsConnection(currentLead, ws, streamSid, callSid, campaignId);
                  console.log("[Twilio] ✅ ElevenLabs connection setup completed");
                } else {
                  console.error("[Twilio] ❌ Missing required data for call setup", { 
                    hasLead: !!currentLead, 
                    leadData: currentLead,
                    streamSid, 
                    callSid, 
                    campaignId 
                  });
                  ws.close();
                }
              } else {
                console.error("[Twilio] ❌ START event missing start object!");
              }
              break;
            
            case "media":
              console.log("[Twilio] 🎵 MEDIA event received");
              if (elevenlabsWs?.readyState === WebSocket.OPEN && msg.media?.payload) {
                elevenlabsWs.send(JSON.stringify({ 
                  type: "user_audio_chunk",
                  user_audio_chunk: msg.media.payload 
                }));
              } else {
                console.log("[Twilio] ❌ Cannot forward media - ElevenLabs not ready", {
                  elevenLabsState: elevenlabsWs?.readyState,
                  hasPayload: !!msg.media?.payload
                });
              }
              break;
            
            case "stop":
              console.log(`[Twilio] 🛑 STOP event - Stream ${streamSid} ended`);
              if (streamSid) {
                activeConnections.delete(streamSid);
              }
              if (elevenlabsWs?.readyState === WebSocket.OPEN) {
                elevenlabsWs.close();
              }
              break;
            
            default:
              console.log(`[Twilio] ❓ Unhandled event: ${msg.event}`, msg);
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
} 