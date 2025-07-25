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

      console.log("[ElevenLabs] Sending payload:", JSON.stringify(payload, null, 2));
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
                    // Determine if call was successful based on duration
                    const callDuration = callLog.duration || 0;
                    const isSuccessful = callDuration > 3; // Consider calls > 3 seconds as successful
                    
                    const newLeadStatus = isSuccessful ? 'completed' : 'failed';
                    const newCallStatus = isSuccessful ? 'completed' : 'failed';
                    
                    console.log(`[ElevenLabs] Updating lead ${callLog.leadId} status to: ${newLeadStatus} (duration: ${callDuration}s)`);
                    
                    // Update lead status
                    await storage.updateLead(callLog.leadId, { status: newLeadStatus });
                    
                    // Update call log status if not already updated
                    if (callLog.status !== newCallStatus) {
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
        failedCalls: failedLeads.length
      });

      // Start processing calls asynchronously
      processcamp(campaignId);

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
        leadId: leadId?.toString(),
        campaignId: campaignId?.toString() // Store campaignId in params for backup
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
      log.status === 'completed' && (log.duration || 0) > 3
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

    // Process each lead
    for (const lead of pendingLeads) {
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

      const { isTestCall, firstName, leadId } = params;
      
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
} 