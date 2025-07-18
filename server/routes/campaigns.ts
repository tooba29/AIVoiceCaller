import type { Express, Request, Response } from "express";
import { requireAuth } from "../auth.js";
import { storage } from "../storage.js";
import { insertCampaignSchema } from "../../shared/schema.js";
import { z } from "zod";

interface AuthenticatedRequest extends Request {
  user?: any;
}

export function registerCampaignRoutes(app: Express): void {
  
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
      const elevenLabsApiKey = process.env.ELEVENLABS_API_KEY;
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
          const agentId = process.env.ELEVENLABS_AGENT_ID;
          
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
      
      // First, delete all call logs for this campaign
      console.log(`[Delete Campaign] Deleting call logs for campaign ${campaignId}`);
      const callLogs = await storage.getCallLogsByCampaign(campaignId);
      console.log(`[Delete Campaign] Found ${callLogs.length} call logs to delete`);
      
      for (const callLog of callLogs) {
        try {
          await storage.deleteCallLog(callLog.id);
        } catch (callLogError) {
          console.error(`[Delete Campaign] Failed to delete call log ${callLog.id}:`, callLogError);
        }
      }
      
      // Then, delete all leads for this campaign
      console.log(`[Delete Campaign] Deleting leads for campaign ${campaignId}`);
      const leads = await storage.getLeadsByCampaign(campaignId);
      console.log(`[Delete Campaign] Found ${leads.length} leads to delete`);
      
      for (const lead of leads) {
        try {
          await storage.deleteLead(lead.id);
        } catch (leadError) {
          console.error(`[Delete Campaign] Failed to delete lead ${lead.id}:`, leadError);
        }
      }
      
      // Delete knowledge base files for this campaign
      console.log(`[Delete Campaign] Deleting knowledge base files for campaign ${campaignId}`);
      await storage.deleteKnowledgeBaseByCampaign(campaignId);
      
      // Finally, delete the campaign itself
      console.log(`[Delete Campaign] Deleting campaign ${campaignId}`);
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

  // Get campaign details
  app.get("/api/campaigns/:id/details", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const campaignId = parseInt(req.params.id);
      
      // Check campaign ownership
      const campaign = await storage.getCampaign(campaignId);
      if (!campaign || campaign.userId !== req.user!.id) {
        return res.status(404).json({ error: "Campaign not found" });
      }
      
      // Get leads and call logs
      const leads = await storage.getLeadsByCampaign(campaignId);
      const callLogs = await storage.getCallLogsByCampaign(campaignId);
      
      // Calculate stats
      const totalLeads = leads.length;
      const completedLeads = leads.filter(l => l.status === 'completed').length;
      const failedLeads = leads.filter(l => l.status === 'failed').length;
      const pendingLeads = leads.filter(l => l.status === 'pending').length;
      
      // Include stats in the response
      res.json({
        campaign,
        leads,
        callLogs,
        stats: {
          totalLeads,
          completed: completedLeads,
          failed: failedLeads,
          pending: pendingLeads
        }
      });
    } catch (error) {
      console.error('Get campaign details error:', error);
      res.status(500).json({ error: "Failed to fetch campaign details" });
    }
  });

  // Initialize campaign
  app.post("/api/campaigns/initialize", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const { name, type } = req.body;
      
      if (!name || !type) {
        return res.status(400).json({ error: "Name and type are required" });
      }
      
      if (type === 'new') {
        const campaign = await storage.createCampaign({
          name,
          userId: req.user!.id,
          firstPrompt: '',
          systemPersona: '',
          status: 'draft',
          totalLeads: 0,
          completedCalls: 0,
          successfulCalls: 0,
          failedCalls: 0
        });
        
        res.json({ campaign });
      } else {
        const campaigns = await storage.getAllCampaigns(req.user!.id);
        res.json({ campaigns });
      }
    } catch (error) {
      console.error('Initialize campaign error:', error);
      res.status(500).json({ error: "Failed to initialize campaign" });
    }
  });

  // Select campaign
  app.post("/api/campaigns/select", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const { campaignId } = req.body;
      
      if (!campaignId) {
        return res.status(400).json({ error: "Campaign ID is required" });
      }
      
      const campaign = await storage.getCampaign(parseInt(campaignId));
      
      if (!campaign || campaign.userId !== req.user!.id) {
        return res.status(404).json({ error: "Campaign not found" });
      }
      
      res.json({ campaign });
    } catch (error) {
      console.error('Select campaign error:', error);
      res.status(500).json({ error: "Failed to select campaign" });
    }
  });

  // Reset Campaign Stats
  app.post("/api/campaigns/:id/reset-stats", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const campaignId = parseInt(req.params.id);
      
      const campaign = await storage.getCampaign(campaignId);
      if (!campaign || campaign.userId !== req.user!.id) {
        return res.status(404).json({ error: "Campaign not found" });
      }

      // Get all leads and call logs for accurate calculation
      const leads = await storage.getLeadsByCampaign(campaignId);
      const callLogs = await storage.getCallLogsByCampaign(campaignId);
      
      // Calculate stats based on ACTUAL call logs, not lead status
      const completedCallLogs = callLogs.filter(log => log.status === 'completed');
      const failedCallLogs = callLogs.filter(log => 
        log.status === 'failed' || 
        log.status === 'busy' || 
        log.status === 'no-answer'
      );
      
      // Calculate successful calls (completed calls > 3 seconds)
      const successfulCallLogs = completedCallLogs.filter(log => 
        (log.duration || 0) > 3
      );
      
      console.log(`[Reset Stats] Campaign ${campaignId}:`, {
        totalLeads: leads.length,
        totalCallLogs: callLogs.length,
        completedCalls: completedCallLogs.length,
        successfulCalls: successfulCallLogs.length,
        failedCalls: failedCallLogs.length
      });
      
      // Reset campaign stats with correct calculations
      await storage.updateCampaign(campaignId, {
        totalLeads: leads.length,
        completedCalls: completedCallLogs.length,
        successfulCalls: successfulCallLogs.length,
        failedCalls: failedCallLogs.length
      });

      const updatedCampaign = await storage.getCampaign(campaignId);
      
      res.json({ 
        success: true, 
        message: `Campaign stats recalculated: ${completedCallLogs.length} completed, ${successfulCallLogs.length} successful, ${failedCallLogs.length} failed`,
        campaign: updatedCampaign
      });
    } catch (error) {
      console.error('Reset stats error:', error);
      res.status(500).json({ error: "Failed to reset campaign stats" });
    }
  });

  // Bulk Reset All Campaign Stats
  app.post("/api/campaigns/reset-all-stats", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      
      const userCampaigns = await storage.getAllCampaigns(userId);
      
      const results: any[] = [];
      let totalFixed = 0;
      
      for (const campaign of userCampaigns) {
        try {
          const leads = await storage.getLeadsByCampaign(campaign.id);
          const callLogs = await storage.getCallLogsByCampaign(campaign.id);
          
          const completedCallLogs = callLogs.filter(log => log.status === 'completed');
          const failedCallLogs = callLogs.filter(log => 
            log.status === 'failed' || 
            log.status === 'busy' || 
            log.status === 'no-answer'
          );
          
          const successfulCallLogs = completedCallLogs.filter(log => 
            (log.duration || 0) > 3
          );
          
          const oldStats = {
            completedCalls: campaign.completedCalls || 0,
            successfulCalls: campaign.successfulCalls || 0,
            failedCalls: campaign.failedCalls || 0
          };
          
          const newStats = {
            completedCalls: completedCallLogs.length,
            successfulCalls: successfulCallLogs.length,
            failedCalls: failedCallLogs.length
          };
          
          const hasChanges = (
            oldStats.completedCalls !== newStats.completedCalls ||
            oldStats.successfulCalls !== newStats.successfulCalls ||
            oldStats.failedCalls !== newStats.failedCalls
          );
          
          if (hasChanges) {
            await storage.updateCampaign(campaign.id, {
              totalLeads: leads.length,
              completedCalls: newStats.completedCalls,
              successfulCalls: newStats.successfulCalls,
              failedCalls: newStats.failedCalls
            });
            totalFixed++;
          }
          
          results.push({
            campaignId: campaign.id,
            campaignName: campaign.name,
            oldStats,
            newStats,
            hasChanges
          });
        } catch (error) {
          console.error(`Error fixing campaign ${campaign.id}:`, error);
          results.push({
            campaignId: campaign.id,
            campaignName: campaign.name,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }
      
      res.json({
        success: true,
        message: `Fixed ${totalFixed} campaigns out of ${userCampaigns.length} total campaigns`,
        totalCampaigns: userCampaigns.length,
        fixedCampaigns: totalFixed,
        results
      });
    } catch (error) {
      console.error('Bulk reset stats error:', error);
      res.status(500).json({ error: "Failed to reset all campaign stats" });
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
      console.log(`[Delete Leads] Starting deletion for campaign ${campaignId} by user ${req.user?.id}`);
      
      // Check campaign ownership
      const campaign = await storage.getCampaign(campaignId);
      if (!campaign || campaign.userId !== req.user!.id) {
        console.log(`[Delete Leads] Campaign ${campaignId} not found or access denied`);
        return res.status(404).json({ error: "Campaign not found" });
      }
      
      console.log(`[Delete Leads] Campaign found: ${campaign.name}`);
      
      // Get all leads for the campaign
      const leads = await storage.getLeadsByCampaign(campaignId);
      console.log(`[Delete Leads] Found ${leads.length} leads to delete`);
      
      if (leads.length === 0) {
        console.log(`[Delete Leads] No leads to delete for campaign ${campaignId}`);
        return res.json({ 
          success: true, 
          message: "No leads to delete",
          deletedCount: 0 
        });
      }
      
      // First, delete all call logs associated with these leads
      console.log(`[Delete Leads] Deleting call logs for campaign ${campaignId}`);
      const callLogs = await storage.getCallLogsByCampaign(campaignId);
      console.log(`[Delete Leads] Found ${callLogs.length} call logs to delete`);
      
      let deletedCallLogsCount = 0;
      for (const callLog of callLogs) {
        try {
          console.log(`[Delete Leads] Deleting call log ${callLog.id}`);
          await storage.deleteCallLog(callLog.id);
          deletedCallLogsCount++;
        } catch (callLogError) {
          console.error(`[Delete Leads] Failed to delete call log ${callLog.id}:`, callLogError);
          // Continue with other call logs instead of failing completely
        }
      }
      
      console.log(`[Delete Leads] Successfully deleted ${deletedCallLogsCount} call logs`);
      
      // Now delete all leads
      let deletedLeadsCount = 0;
      for (const lead of leads) {
        try {
          console.log(`[Delete Leads] Deleting lead ${lead.id} (${lead.firstName} ${lead.lastName})`);
          await storage.deleteLead(lead.id);
          deletedLeadsCount++;
        } catch (leadError) {
          console.error(`[Delete Leads] Failed to delete lead ${lead.id}:`, leadError);
          throw leadError; // Re-throw to trigger the outer catch
        }
      }
      
      console.log(`[Delete Leads] Successfully deleted ${deletedLeadsCount} leads`);
      
      // Update campaign lead count
      console.log(`[Delete Leads] Updating campaign stats for campaign ${campaignId}`);
      await storage.updateCampaign(campaignId, {
        totalLeads: 0,
        completedCalls: 0,
        successfulCalls: 0,
        failedCalls: 0
      });
      
      console.log(`[Delete Leads] Campaign ${campaignId} updated successfully`);
      
      res.json({ 
        success: true, 
        message: `Deleted ${deletedLeadsCount} leads and ${deletedCallLogsCount} call logs`,
        deletedLeadsCount: deletedLeadsCount,
        deletedCallLogsCount: deletedCallLogsCount
      });
    } catch (error) {
      console.error('Delete leads error:', {
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined,
        campaignId: req.params.id,
        userId: req.user?.id,
        timestamp: new Date().toISOString()
      });
      res.status(500).json({ 
        error: "Failed to delete leads",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Get campaign knowledge base
  app.get("/api/campaigns/:id/knowledge-base", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const campaignId = parseInt(req.params.id);
      
      // Check campaign ownership
      const campaign = await storage.getCampaign(campaignId);
      if (!campaign || campaign.userId !== req.user!.id) {
        return res.status(404).json({ error: "Campaign not found" });
      }
      
      // Get knowledge base files
      const knowledgeBase = await storage.getKnowledgeBaseByCampaign(campaignId);
      
      res.json({ knowledgeBase });
    } catch (error) {
      console.error('Get knowledge base error:', error);
      res.status(500).json({ error: "Failed to fetch knowledge base" });
    }
  });

  // Delete knowledge base file
  app.delete("/api/campaigns/:id/knowledge-base/:fileId", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const campaignId = parseInt(req.params.id);
      const fileId = parseInt(req.params.fileId);
      
      // Check campaign ownership
      const campaign = await storage.getCampaign(campaignId);
      if (!campaign || campaign.userId !== req.user!.id) {
        return res.status(404).json({ error: "Campaign not found" });
      }
      
      // Get all knowledge base files and find the specific one
      const knowledgeBaseFiles = await storage.getKnowledgeBaseByCampaign(campaignId);
      const knowledgeBaseFile = knowledgeBaseFiles.find(file => file.id === fileId);
      if (!knowledgeBaseFile) {
        return res.status(404).json({ error: "Knowledge base file not found" });
      }

      // Delete from ElevenLabs if applicable
      const elevenLabsApiKey = process.env.ELEVENLABS_API_KEY;
      if (elevenLabsApiKey && knowledgeBaseFile.elevenlabsDocId) {
        try {
          const deleteResponse = await fetch(`https://api.elevenlabs.io/v1/convai/knowledge-base/${knowledgeBaseFile.elevenlabsDocId}`, {
            method: 'DELETE',
            headers: {
              'xi-api-key': elevenLabsApiKey,
            },
          });

          if (!deleteResponse.ok && deleteResponse.status !== 404) {
            console.error('Failed to delete from ElevenLabs:', await deleteResponse.text());
          }
        } catch (error) {
          console.error('Error deleting from ElevenLabs:', error);
          // Continue with local deletion even if ElevenLabs fails
        }
      }

      // Delete the file from storage
      await storage.deleteKnowledgeBase(fileId);

      // Update the agent with empty knowledge base
      if (elevenLabsApiKey) {
        try {
          const agentId = process.env.ELEVENLABS_AGENT_ID;
          if (agentId) {
            await fetch(`https://api.elevenlabs.io/v1/convai/agents/${agentId}`, {
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
          }
        } catch (error) {
          console.error('Error updating agent:', error);
          // Continue since the file is already deleted
        }
      }

      res.json({ success: true, message: "Knowledge base file deleted successfully" });
    } catch (error) {
      console.error('Delete knowledge base file error:', error);
      res.status(500).json({ error: "Failed to delete knowledge base file" });
    }
  });
} 