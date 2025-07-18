import type { Express, Request, Response } from "express";
import { requireAuth } from "../auth.js";
import { storage } from "../storage.js";
import fetch from "node-fetch";

interface AuthenticatedRequest extends Request {
  user?: any;
}

export function registerAgentRoutes(app: Express): void {
  
  // Update Agent Configuration
  app.post("/api/update-agent", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { firstPrompt, systemPersona, campaignId, voiceId, knowledgeBaseId, payload } = req.body;

      if (!firstPrompt) {
        return res.status(400).json({ error: "First prompt is required" });
      }

      // Update ElevenLabs agent if API key is available
      const elevenLabsApiKey = process.env.ELEVENLABS_API_KEY;
      const agentId = process.env.ELEVENLABS_AGENT_ID;
      
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
            const contentType = response.headers.get("content-type");
            let errorData;
            let errorMessage = "Unknown error occurred";

            if (contentType && contentType.includes("application/json")) {
              errorData = await response.json();
              console.error(
                "ElevenLabs API error details (JSON):",
                JSON.stringify(errorData, null, 2)
              );
              const typedError = errorData as {
                detail?: unknown;
                message?: string;
              };
              if (typedError.detail) {
                errorMessage =
                  typeof typedError.detail === "string"
                    ? typedError.detail
                    : JSON.stringify(typedError.detail);
              } else if (typedError.message) {
                errorMessage = typedError.message;
              }
            } else {
              errorData = await response.text();
              console.error("ElevenLabs API error details (HTML/text):", errorData);
              errorMessage = `Received non-JSON response from ElevenLabs.`;
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

      // Update campaign (campaignId is now required)
      let campaign: any = null;
      if (campaignId) {
        // Verify ownership before updating
        const existingCampaign = await storage.getCampaign(parseInt(campaignId));
        if (!existingCampaign || existingCampaign.userId !== req.user!.id) {
          return res.status(404).json({ error: "Campaign not found or access denied" });
        }
        
        campaign = await storage.updateCampaign(parseInt(campaignId), {
          firstPrompt,
          systemPersona,
          selectedVoiceId: voiceId
        });
      } else {
        return res.status(400).json({ 
          error: "Campaign ID is required. Please create a campaign first using the campaign selector." 
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
} 