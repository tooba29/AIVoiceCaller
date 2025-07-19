import type { Express, Request, Response } from "express";
import { requireAuth } from "../auth.js";
import { storage } from "../storage.js";
import { insertLeadSchema, type InsertLead } from "../../shared/schema.js";
import multer from "multer";
import fs from "fs";
import csv from "csv-parser";
import FormData from "form-data";
import fetch from "node-fetch";

interface MulterRequest extends Request {
  file?: Express.Multer.File;
}

interface AuthenticatedRequest extends Request {
  user?: any;
}

// Configure multer for file uploads
const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
});

// Helper function to update ElevenLabs agent with current knowledge base
async function updateAgentKnowledgeBase(elevenLabsApiKey: string, campaignId: number) {
  const agentId = process.env.ELEVENLABS_AGENT_ID;
  
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

export function registerUploadRoutes(app: Express): void {
  
  // PDF Knowledge Base Upload (requires authentication)
  app.post("/api/upload-pdf", requireAuth, upload.single('pdf'), async (req: any, res) => {
    let uploadedFilePath: string | null = null;
    
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No PDF file uploaded" });
      }

      uploadedFilePath = req.file.path;

      if (req.file.mimetype !== 'application/pdf') {
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
      const agentId = process.env.ELEVENLABS_AGENT_ID;

      let elevenlabsDocId: string | null = null;

      if (elevenLabsApiKey) {
        try {
                      // Force delete existing files from ElevenLabs knowledge base 
            // Using force=true automatically removes documents from all dependent agents
          for (const file of existingFiles) {
            if (file.elevenlabsDocId) {
              try {
                console.log(`[Upload PDF] 🔥 Force deleting existing ElevenLabs document: ${file.elevenlabsDocId} (${file.filename})`);
                const deleteResponse = await fetch(`https://api.elevenlabs.io/v1/convai/knowledge-base/${file.elevenlabsDocId}?force=true`, {
                  method: 'DELETE',
                  headers: {
                    'xi-api-key': elevenLabsApiKey,
                  },
                });

                if (deleteResponse.ok || deleteResponse.status === 404) {
                  console.log(`[Upload PDF] ✅ Successfully force deleted existing document: ${file.filename}`);
                } else {
                  const errorText = await deleteResponse.text();
                  console.error(`[Upload PDF] ❌ Failed to force delete existing file from ElevenLabs:`, errorText);
                }
              } catch (deleteError) {
                console.error(`[Upload PDF] ❌ Error deleting existing knowledge base file:`, deleteError);
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
            throw new Error(`ElevenLabs upload failed: ${errorText}`);
          }

          const uploadResult = await uploadResponse.json() as { id?: string; name?: string };
          elevenlabsDocId = uploadResult.id ?? null;
          console.log('Successfully uploaded to ElevenLabs:', {
            id: uploadResult.id,
            name: uploadResult.name
          });

        } catch (elevenLabsError) {
          console.error('ElevenLabs integration error:', elevenLabsError);
          // Don't throw here, continue with local storage
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
          // Don't throw here, the file is already saved
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
      
      // Clean up uploaded file if it exists
      if (uploadedFilePath && fs.existsSync(uploadedFilePath)) {
        try {
          fs.unlinkSync(uploadedFilePath);
        } catch (cleanupError) {
          console.error('Error cleaning up uploaded file:', cleanupError);
        }
      }
      
      // Ensure we always return a JSON response
      res.status(500).json({ 
        error: error instanceof Error ? error.message : "Failed to upload PDF",
        details: error instanceof Error ? error.stack : undefined
      });
    }
  });

  // Upload CSV Leads
  app.post("/api/upload-csv", requireAuth, upload.single('csv'), async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No CSV file uploaded" });
      }

      const { campaignId } = req.body;
      if (!campaignId) {
        fs.unlinkSync(req.file.path);
        return res.status(400).json({ error: "Campaign ID is required" });
      }

      // Check campaign ownership
      const campaign = await storage.getCampaign(parseInt(campaignId));
      if (!campaign || campaign.userId !== req.user!.id) {
        fs.unlinkSync(req.file.path);
        return res.status(404).json({ error: "Campaign not found or access denied" });
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
                status: 'pending' // Explicitly set status
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

      // Get existing leads count
      const existingLeads = await storage.getLeadsByCampaign(parseInt(campaignId));
      
      // Save new leads to storage
      const createdLeads = await storage.createLeadsBatch(leads);

      // Update campaign with total leads count (existing + new)
      const totalLeads = existingLeads.length + createdLeads.length;
      await storage.updateCampaign(parseInt(campaignId), {
        totalLeads,
        status: campaign.status === 'draft' ? 'draft' : campaign.status // Preserve draft status
      });

      // Clean up uploaded file
      fs.unlinkSync(req.file.path);

      res.json({ 
        success: true, 
        leadsCount: createdLeads.length,
        totalLeads,
        leads: createdLeads 
      });
    } catch (error) {
      console.error('CSV upload error:', error);
      if (req.file?.path) {
        fs.unlinkSync(req.file.path);
      }
      res.status(500).json({ 
        error: error instanceof Error ? error.message : "Failed to upload CSV" 
      });
    }
  });
} 