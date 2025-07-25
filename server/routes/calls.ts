import type { Express, Request, Response } from "express";
import { requireAuth } from "../auth.js";
import { storage } from "../storage.js";
import { testCallSchema } from "../../shared/schema.js";
import twilio, { Twilio } from "twilio";
import { z } from "zod";
import { WebSocketServer, WebSocket, RawData } from 'ws';
import { IncomingMessage } from "http";
import type { Server } from "http";
import fetch from "node-fetch";

interface AuthenticatedRequest extends Request {
  user?: any;
}

interface ElevenLabsMessage {
  type: string;
  // Audio response from agent
  audio?: {
    chunk: string;
  };
  audio_event?: {
    audio_base_64: string;
    event_id?: number;
  };
  // Ping/Pong for keepalive
  ping_event?: {
    event_id: string;
    ping_ms?: number;
  };
  // Agent text responses
  agent_response_event?: {
    agent_response: string;
  };
  // User speech-to-text
  user_transcription_event?: {
    user_transcript: string;
  };
  // Conversation initiation response
  conversation_initiation_metadata?: {
    conversation_id?: string;
    agent_id?: string;
    agent_output_audio_format?: string;
    user_input_audio_format?: string;
    [key: string]: any;
  };
  conversation_initiation_metadata_event?: {
    conversation_id?: string;
    agent_output_audio_format?: string;
    user_input_audio_format?: string;
    [key: string]: any;
  };
  // Interruption handling
  interruption_event?: {
    reason?: string;
  };
  // Internal tentative responses (may not always be present)
  tentative_agent_response_internal_event?: {
    tentative_agent_response: string;
  };
  // Voice Activity Detection
  vad_score_event?: {
    vad_score: number;
  };
  // Conversation ID fallbacks
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

// 🎯 CRITICAL: This function ONLY runs when someone actually picks up the phone!
// The mere fact this function executes means a real conversation is happening
const setupElevenLabsConnection = async (
  lead: Lead,
  ws: WebSocket,
  streamSid: string,
  callSid: string,
  campaignId?: number
) => {
  let elevenlabsWs: WebSocket | null = null;
  
  try {
    console.log("🚀 [ElevenLabs] Starting connection setup for:", lead.firstName);
    console.log("🚀 [ElevenLabs] Parameters:", { streamSid, callSid, campaignId });
    
    const elevenLabsApiKey = process.env.ELEVENLABS_API_KEY || process.env.ELEVEN_LABS_API_KEY;
    const elevenLabsAgentId = process.env.ELEVENLABS_AGENT_ID || process.env.ELEVEN_LABS_AGENT_ID;

    console.log("=== ElevenLabs Credentials Check ===");
    console.log("API Key exists:", !!elevenLabsApiKey);
    console.log("API Key length:", elevenLabsApiKey?.length);
    console.log("API Key prefix:", elevenLabsApiKey?.substring(0, 10) + "...");
    console.log("Agent ID:", elevenLabsAgentId);
    console.log("================================");

    if (!elevenLabsApiKey || !elevenLabsAgentId) {
      const error = new Error('Missing ElevenLabs credentials');
      console.error("❌ [ElevenLabs] CRITICAL ERROR:", error.message);
      throw error;
    }

    console.log("✅ [ElevenLabs] Credentials validated, fetching campaign data...");
    
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

    console.log("📡 [ElevenLabs] API Response status:", response.status);
    console.log("📡 [ElevenLabs] API Response headers:", Object.fromEntries(response.headers.entries()));

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
    console.log("✅ [ElevenLabs] Raw API response:", JSON.stringify(data, null, 2));
    
    if (!data.signed_url) {
      throw new Error('Invalid response from ElevenLabs API - missing signed_url');
    }

    console.log("✅ [ElevenLabs] Successfully got signed URL");

    console.log("🔗 [ElevenLabs] Connecting to WebSocket:", data.signed_url);
    const newWs = new WebSocket(data.signed_url);
    elevenlabsWs = newWs;

    // Set up connection timeout as safeguard
    const connectionTimeout = setTimeout(() => {
      if (newWs.readyState !== WebSocket.OPEN) {
        console.error("⏰ [ElevenLabs] Connection timeout - WebSocket state:", newWs.readyState);
        console.error("⏰ [ElevenLabs] Connection timeout - closing WebSocket");
        newWs.close();
      }
    }, 30000); // 30 second timeout

    newWs.on('open', () => {
      clearTimeout(connectionTimeout);
      console.log("🎉 [ElevenLabs] WebSocket connected successfully, sending configuration");
      
      const payload = {
        type: "conversation_initiation_client_data",
        conversation_config_override: configOverride,
        dynamic_variables: {
          first_name: firstName
        }
      };

      console.log("[ElevenLabs] Sending payload:", JSON.stringify(payload, null, 2));
      console.log("[ElevenLabs] Payload type:", typeof payload.type);
      console.log("[ElevenLabs] Dynamic variables:", payload.dynamic_variables);
      console.log("[ElevenLabs] Config override:", payload.conversation_config_override);

      try {
        newWs.send(JSON.stringify(payload));
        console.log("✅ [ElevenLabs] Configuration payload sent successfully");
      } catch (sendError) {
        console.error("❌ [ElevenLabs] Error sending configuration:", sendError);
      }

      if (streamSid) {
        activeConnections.set(streamSid, {
          twilioWs: ws,
          elevenLabsWs: newWs,
          streamSid,
          callSid,
          campaignId
        });
        console.log("✅ [ElevenLabs] Added connection to activeConnections with streamSid:", streamSid);
      }
    });

    newWs.on('message', (data: RawData) => {
      try {
        const message = JSON.parse(data.toString()) as ElevenLabsMessage;
        
        console.log(`[ElevenLabs] 📥 Received message type: ${message.type}`);
        
        switch (message.type) {
          case "conversation_initiation_metadata":
            console.log("[ElevenLabs] Conversation initiated");
            console.log("[ElevenLabs] 🔍 Initiation metadata:", JSON.stringify(message.conversation_initiation_metadata, null, 2));
            
            let conversationId: string | null = null;
            
            if (message.conversation_initiation_metadata?.conversation_id) {
              conversationId = message.conversation_initiation_metadata.conversation_id;
              console.log(`[ElevenLabs] 🎯 CONVERSATION STARTED! ID: ${conversationId} - This proves someone picked up and is talking`);
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
            console.log(`[ElevenLabs] Interruption detected: ${message.interruption_event?.reason || 'unknown reason'}`);
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

          case "internal_tentative_agent_response":
            // Optional: Handle tentative responses (may be useful for debugging)
            console.log(`[ElevenLabs] Tentative response: ${message.tentative_agent_response_internal_event?.tentative_agent_response}`);
            break;

          case "vad_score":
            // Optional: Handle Voice Activity Detection scores
            if (message.vad_score_event) {
              console.log(`[ElevenLabs] VAD Score: ${message.vad_score_event.vad_score}`);
            }
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
                    // If we're here in the conversation_ended event, it means a real conversation happened
                    // (WebSocket was established, ElevenLabs connected, and conversation ID was generated)
                    const newLeadStatus = 'completed';
                    const newCallStatus = 'completed';
                    
                    console.log(`[ElevenLabs] ✅ Conversation ended properly - real interaction occurred - marking as completed`);
                    
                    // Update lead status
                    await storage.updateLead(callLog.leadId, { status: newLeadStatus });
                    
                    // Update call log status
                    await storage.updateCallLog(callLog.id, { status: newCallStatus });
                    
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
            
            // Check if conversation ID exists in unhandled message types
            let foundConversationId: string | null = null;
            if (message.conversation_id) {
              foundConversationId = message.conversation_id;
            } else if (message.metadata?.conversation_id) {
              foundConversationId = message.metadata.conversation_id;
            } else if (message.data?.conversation_id) {
              foundConversationId = message.data.conversation_id;
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
      console.error("❌ [ElevenLabs] WebSocket error occurred:", error);
      console.error("❌ [ElevenLabs] Error details:", {
        message: error.message,
        code: (error as any).code,
        type: (error as any).type,
        target: (error as any).target,
        stack: error.stack
      });
      console.error("❌ [ElevenLabs] WebSocket readyState at error:", newWs.readyState);
      
      // Close Twilio connection on ElevenLabs error
      if (ws.readyState === WebSocket.OPEN) {
        console.log("🔌 [ElevenLabs] Closing Twilio WebSocket due to ElevenLabs error");
        ws.close();
      }
    });

    newWs.on('close', (code, reason) => {
      console.log(`[ElevenLabs] WebSocket closed - Code: ${code}, Reason: ${reason?.toString() || 'No reason'}`);
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
                  console.log(`[ElevenLabs] WebSocket closed, checking if conversation occurred`);
                  
                  // Check if conversation ID was stored (means real conversation happened)
                  const hasConversationId = !!callLog.elevenLabsConversationId;
                  const newLeadStatus = hasConversationId ? 'completed' : 'failed';
                  
                  console.log(`[ElevenLabs] Lead ${callLog.leadId}: ${hasConversationId ? '✅ Had conversation' : '❌ No conversation'} - marking as ${newLeadStatus}`);
                  
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
    console.error("💥 [ElevenLabs] SETUP ERROR - Connection failed:", error);
    console.error("💥 [ElevenLabs] Error details:", {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : typeof error
    });
    console.error("💥 [ElevenLabs] Closing Twilio WebSocket due to setup failure");
    
    if (ws.readyState === WebSocket.OPEN) {
      ws.close();
    }
  }

  return elevenlabsWs;
};

export function registerCallRoutes(app: Express): void {
  
  // Make Test Call with ElevenLabs Conversational AI
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

        const twimlUrl = new URL(`${secureBaseUrl}/outbound-call-twiml`);
        twimlUrl.searchParams.append('campaignId', campaignId.toString());
        twimlUrl.searchParams.append('firstName', firstName || 'there');
        twimlUrl.searchParams.append('isTestCall', 'true');

        console.log("[Twilio] Making call with TwiML URL:", twimlUrl.toString());

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

      // Reset campaign stats based on actual data before starting
      const completedLeads = leads.filter(l => l.status === 'completed');
      const failedLeads = leads.filter(l => l.status === 'failed');
      
      await storage.updateCampaign(campaignId, { 
        status: "active",
        totalLeads: leads.length,
        completedCalls: completedLeads.length + failedLeads.length,
        successfulCalls: completedLeads.length,
        failedCalls: failedLeads.length,
        resumedAt: new Date().toISOString()
      });

      // Start processing calls asynchronously
      processcamp(campaignId);

      console.log(`🚀 [Campaign Start] Campaign ${campaignId} started with status "active" - ${leads.length} leads`);

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

  // Resume Campaign
  app.post("/api/resume-campaign", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { campaignId } = req.body;
      if (!campaignId) {
        return res.status(400).json({ error: "Campaign ID is required" });
      }

      const campaign = await storage.getCampaign(campaignId);
      if (!campaign || campaign.userId !== req.user!.id) {
        return res.status(404).json({ error: "Campaign not found" });
      }

      if (campaign.status !== 'paused') {
        return res.status(400).json({ error: "Campaign is not paused" });
      }

      const leads = await storage.getLeadsByCampaign(campaignId);
      const pendingLeads = leads.filter(l => l.status === 'pending');
      
      if (pendingLeads.length === 0) {
        return res.status(400).json({ error: "No pending leads to resume" });
      }

      // Update campaign status and resume timestamp
      await storage.updateCampaign(campaignId, { 
        status: "active",
        resumedAt: new Date().toISOString()
      });

      // Resume processing calls asynchronously
      processcamp(campaignId);

      res.json({ 
        success: true, 
        message: `Campaign resumed with ${pendingLeads.length} pending leads`,
        campaign: { 
          ...campaign, 
          status: "active"
        }
      });
    } catch (error) {
      console.error('Campaign resume error:', error);
      res.status(500).json({ error: "Failed to resume campaign" });
    }
  });

  // Twilio Status Callback - Uses conversation ID to determine real success
  // ✅ LOGIC: If ElevenLabs conversation ID exists = someone picked up = success
  // ❌ LOGIC: If no conversation ID = no pickup (TwiML never called) = failed
  app.post("/api/twilio/status", async (req: Request, res: Response) => {
    try {
      const { CallSid, CallStatus, CallDuration, CallFrom, CallTo } = req.body;
      
      console.log('🔄 [Twilio Status Callback]:', { 
        CallSid, 
        CallStatus, 
        CallDuration: `${CallDuration}s`, 
        CallFrom, 
        CallTo,
        timestamp: new Date().toISOString()
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
          
          // Determine lead status based on whether someone actually picked up and had a conversation
          let newLeadStatus: string;
          
          // The presence of an ElevenLabs conversation ID means someone answered and conversation started
          const hasConversationId = !!updatedCallLog.elevenLabsConversationId;
          
          if (hasConversationId) {
            // Real conversation happened - someone picked up and WebSocket/ElevenLabs connected
            newLeadStatus = 'completed';
            console.log(`[Twilio] ✅ Call had conversation (ID: ${updatedCallLog.elevenLabsConversationId}) - marking as completed`);
          } else {
            // No conversation ID = no pickup or immediate hangup (TwiML never called)
            newLeadStatus = 'failed';
            console.log(`[Twilio] ❌ No conversation ID found - call was not picked up - marking as failed`);
          }
          
          console.log(`[Twilio] Updating lead ${updatedCallLog.leadId} status to: ${newLeadStatus} (conversation ID: ${hasConversationId ? 'EXISTS' : 'MISSING'})`);
          
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

  // TwiML endpoint - ONLY called when someone actually picks up the phone
  // If no pickup, Twilio never calls this endpoint = no WebSocket = no ElevenLabs = no conversation ID
  app.all("/outbound-call-twiml", (req, res) => {
    try {
      console.log("🎯 [TwiML] CALL PICKED UP - Someone answered! Incoming request:", {
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
      
      console.log("[TwiML] Extracted params:", { 
        baseUrl,
        campaignId, 
        leadId, 
        firstName, 
        isTestCall,
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
        leadId: leadId?.toString()
      };
      
      const key = `${campaignId}_params`;
      connectionParams.set(key, params);
      
      console.log("[TwiML] Stored connection parameters:", {
        key,
        params,
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
}

// Track running campaigns to prevent duplicates
const runningCampaigns = new Set<number>();

// Helper function to update campaign statistics
async function updateCampaignStatistics(campaignId: number) {
  try {
    const campaign = await storage.getCampaign(campaignId);
    if (!campaign) return;
    
    const allCallLogs = await storage.getCallLogsByCampaign(campaignId);
    
    const completedCalls = allCallLogs.filter(log => log.status === 'completed').length;
    const failedCalls = allCallLogs.filter(log => 
      log.status === 'failed' || log.status === 'busy' || log.status === 'no-answer'
    ).length;
    const successfulCalls = allCallLogs.filter(log => 
      log.status === 'completed' && !!log.elevenLabsConversationId
    ).length;
    
    await storage.updateCampaign(campaignId, {
      completedCalls,
      failedCalls,
      successfulCalls
    });
    
    console.log(`[Campaign Stats] Updated campaign ${campaignId}:`, {
      completedCalls,
      failedCalls,
      successfulCalls
    });
    
    // Check if campaign is complete
    const allLeads = await storage.getLeadsByCampaign(campaignId);
    const pendingCount = allLeads.filter(l => l.status === 'pending' || l.status === 'calling').length;
    
    if (pendingCount === 0) {
      console.log(`[Campaign Stats] All leads processed for campaign ${campaignId}, marking as completed`);
      await storage.updateCampaign(campaignId, { status: 'completed' });
    }
  } catch (error) {
    console.error(`[Campaign Stats] Error updating campaign ${campaignId} statistics:`, error);
  }
}

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
    const baseUrl = process.env.BASE_URL;

    if (!twilioAccountSid || !twilioAuthToken || !twilioPhoneNumber || !elevenLabsApiKey || !elevenLabsAgentId || !baseUrl) {
      throw new Error('Missing required credentials for voice calls');
    }

    // Initialize Twilio client
    const twilioClient: Twilio = twilio(twilioAccountSid, twilioAuthToken);

    // Process each lead with efficient status checking
    for (let i = 0; i < pendingLeads.length; i++) {
      const lead = pendingLeads[i];
      
      // Check campaign status every 5 leads or at the beginning to avoid excessive DB calls
      if (i % 5 === 0 || i === 0) {
        const currentCampaign = await storage.getCampaign(campaignId);
        if (!currentCampaign) {
          console.log(`[Campaign ${campaignId}] Campaign not found, stopping processing`);
          break;
        }
        
        if (currentCampaign.status === 'paused') {
          console.log(`[Campaign ${campaignId}] Campaign paused, stopping processing at lead ${lead.id}`);
          await storage.updateCampaign(campaignId, { 
            pausedAt: new Date().toISOString(),
            lastProcessedLeadId: lead.id
          });
          break;
        }
        
        if (currentCampaign.status !== 'active') {
          console.log(`[Campaign ${campaignId}] Campaign status is ${currentCampaign.status}, stopping processing`);
          break;
        }
      }

      let callLog: any = null;
      try {
        console.log(`[Campaign ${campaignId}] Processing lead ${lead.id} (${lead.firstName} - ${lead.contactNo})`);
        
        // Check if this lead already has a call log to prevent duplicates
        const campaignCallLogs = await storage.getCallLogsByCampaign(campaignId);
        const existingCallLog = campaignCallLogs.find(log => 
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

        // Ensure baseUrl uses https
        const secureBaseUrl = baseUrl.replace(/^http:/, 'https:');

        // Create TwiML URL for the call with campaignId as query parameter
        const twimlUrl = `${secureBaseUrl}/outbound-call-twiml?campaignId=${campaignId}&leadId=${lead.id}&firstName=${encodeURIComponent(lead.firstName || 'there')}`;

        // Make the call using Twilio
        const call = await twilioClient.calls.create({
          to: lead.contactNo,
          from: twilioPhoneNumber,
          url: twimlUrl,
          statusCallback: `${secureBaseUrl}/api/twilio/status`,
          statusCallbackMethod: 'POST',
          statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed']
        });

        // Update call log with Twilio SID
        if (callLog) {
          await storage.updateCallLog(callLog.id, {
            twilioCallSid: call.sid,
          });
        }

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

      const key = `${campaignId}_params`;
      const params = connectionParams.get(key);
      
      console.log("[WebSocket] Retrieved connection params:", {
        key,
        hasParams: !!params,
        params,
        allStoredKeys: Array.from(connectionParams.keys())
      });

      if (!params) {
        console.error("❌ [WebSocket] No stored parameters found for campaignId:", campaignId);
        console.error("❌ [WebSocket] Available parameter keys:", Array.from(connectionParams.keys()));
        console.error("❌ [WebSocket] Looking for key:", key);
        ws.close();
        return;
      }

      const { isTestCall, firstName, leadId } = params;
      
      console.log("🔍 [WebSocket] Lead setup - params analysis:", { 
        isTestCall, 
        firstName, 
        leadId, 
        leadIdType: typeof leadId,
        campaignId 
      });
      
      if (isTestCall) {
        console.log("✅ [WebSocket] Setting up TEST CALL lead");
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
        console.log("✅ [WebSocket] Test lead created:", currentLead);
      } 
      else if (leadId) {
        console.log("🔍 [WebSocket] Setting up CAMPAIGN CALL lead - searching for leadId:", leadId);
        
        const leads = await storage.getLeadsByCampaign(campaignId);
        console.log("🔍 [WebSocket] Found leads for campaign:", {
          campaignId,
          totalLeads: leads.length,
          leadIds: leads.map(l => ({ id: l.id, firstName: l.firstName }))
        });
        
        const leadIdNum = parseInt(leadId);
        console.log("🔍 [WebSocket] Looking for lead with ID:", leadIdNum, "from string:", leadId);
        
        const foundLead = leads.find(l => l.id === leadIdNum);
        console.log("🔍 [WebSocket] Lead search result:", foundLead ? "FOUND" : "NOT FOUND");
        
        if (foundLead) {
          console.log("✅ [WebSocket] Found lead:", {
            id: foundLead.id,
            firstName: foundLead.firstName,
            contactNo: foundLead.contactNo,
            status: foundLead.status
          });
          
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
          console.log("✅ [WebSocket] Campaign lead created:", currentLead);
        } else {
          console.error("❌ [WebSocket] Lead NOT FOUND - leadId:", leadId, "parsed as:", leadIdNum);
          console.error("❌ [WebSocket] Available lead IDs:", leads.map(l => l.id));
        }
      } else {
        console.error("❌ [WebSocket] No leadId provided for campaign call");
      }

      if (!currentLead) {
        console.error("❌ [WebSocket] No lead data found", { isTestCall, leadId, campaignId });
        
        // CRITICAL FIX: If lead lookup failed but we have basic info, create a fallback lead
        // This ensures campaign calls work the same way as test calls
        if (!isTestCall && leadId && firstName) {
          console.log("🔄 [WebSocket] FALLBACK: Creating temporary lead for campaign call");
          currentLead = {
            id: parseInt(leadId),
            campaignId,
            firstName: firstName || 'Unknown',
            lastName: '',
            contactNo: '',
            status: 'calling',
            callDuration: null,
            createdAt: new Date()
          };
          console.log("✅ [WebSocket] Fallback lead created:", currentLead);
        } else {
          console.error("❌ [WebSocket] Cannot create fallback lead - missing required data");
          ws.close();
          return;
        }
      }

      // Don't delete connection params yet - wait until after successful ElevenLabs setup
      // connectionParams.delete(key);

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
                  console.log("🔄 [Twilio] Initiating ElevenLabs connection setup...");
                  console.log("🔄 [Twilio] Setup params:", { 
                    leadName: currentLead.firstName,
                    leadId: currentLead.id,
                    streamSid, 
                    callSid, 
                    campaignId 
                  });
                  
                  try {
                    elevenlabsWs = await setupElevenLabsConnection(currentLead, ws, streamSid, callSid, campaignId);
                    
                    if (elevenlabsWs) {
                      console.log("✅ [Twilio] ElevenLabs connection setup completed successfully");
                      // Now it's safe to delete connection params since we're fully connected
                      const key = `${campaignId}_params`;
                      connectionParams.delete(key);
                      console.log("🧹 [Twilio] Cleaned up connection params for key:", key);
                    } else {
                      console.error("❌ [Twilio] ElevenLabs connection setup returned null");
                    }
                  } catch (setupError) {
                    console.error("💥 [Twilio] Error during ElevenLabs setup:", setupError);
                    ws.close();
                  }
                } else {
                  console.error("❌ [Twilio] Missing required data for call setup", { 
                    hasLead: !!currentLead, 
                    leadData: currentLead ? { id: currentLead.id, firstName: currentLead.firstName } : null,
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
} 