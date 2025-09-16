import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import csv from 'csv-parser';
import pdf from 'pdf-parse';
import { Campaign, Lead, KnowledgeBase, Voice, User } from '../models/index.js';
import { requireAuth } from '../middleware/auth.js';
import elevenlabsService from '../services/elevenlabsService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

const pdfUpload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF files are allowed.'), false);
    }
  }
});

// Upload PDF for knowledge base
router.post('/pdf', requireAuth, pdfUpload.single('pdf'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { campaignId } = req.body;
    
    if (!campaignId) {
      // Clean up uploaded file
      try {
        if (fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
          console.log('CSV file cleaned up (no campaignId):', req.file.filename);
        }
      } catch (cleanupError) {
        console.warn('Warning: Failed to clean up CSV file:', cleanupError);
      }
      return res.status(400).json({ error: 'Campaign ID is required' });
    }

    // Verify campaign belongs to user
    const campaign = await Campaign.findOne({
      where: {
        id: campaignId,
        userId: req.user.id
      }
    });

    if (!campaign) {
      // Clean up uploaded file
      try {
        if (fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
          console.log('CSV file cleaned up (campaign not found):', req.file.filename);
        }
      } catch (cleanupError) {
        console.warn('Warning: Failed to clean up CSV file:', cleanupError);
      }
      return res.status(404).json({ error: 'Campaign not found' });
    }

    const result = await elevenlabsService.handleKnowledgeBaseUpload(req.file, campaignId);

    if (result.success) {
      res.json({
        success: true,
        message: 'Knowledge base processed successfully',
        knowledgeBase: result.knowledgeBase
      });
    } else {
      res.status(500).json({ error: result.error || 'Failed to process knowledge base file' });
    }
  } catch (error) {
    console.error('PDF upload route error:', error);
    // Ensure file is cleaned up even if unexpected errors occur
    try {
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
        console.log('PDF file cleaned up (error):', req.file.filename);
      }
    } catch (cleanupError) {
      console.warn('Warning: Failed to clean up PDF file on error:', cleanupError);
    }
    res.status(500).json({ error: 'Failed to upload PDF' });
  }
});

// Upload CSV for leads
router.post('/csv', requireAuth, upload.single('csv'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { campaignId } = req.body;
    
    if (!campaignId) {
      return res.status(400).json({ error: 'Campaign ID is required' });
    }

    // Verify campaign belongs to user
    const campaign = await Campaign.findOne({
      where: { 
        id: campaignId,
        userId: req.user.id 
      }
    });

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    const leads = [];
    const errors = [];
    const seenPhones = new Set();

    // Parse CSV file
    await new Promise((resolve, reject) => {
      fs.createReadStream(req.file.path)
        .pipe(csv())
        .on('data', (row) => {
          try {
            // Primary column names (exact matches first)
            const rawPhone = row.contact_no || row.contactNo ||
                           row.phone || row.Phone || row.phone_number || row.mobile || row.mobile_number ||
                           row['Phone Number'] || row['Contact No'] || row['Contact'] || null;
            const rawFirst = row.first_name || row.firstName || row.firstname || null;
            const rawLast = row.last_name || row.lastName || row.lastname || null;
            const rawName = row.name || row.full_name || row.fullname || row.customer_name || null;
            const rawEmail = row.email || row.Email || row.e_mail || null;

            // Normalize phone: keep leading +, strip non-digits, add UAE code if missing
            const normalizePhone = (val) => {
              if (!val || typeof val !== 'string') return null;
              const trimmed = val.trim();
              let digits = trimmed.replace(/[^0-9]/g, '');

              // If no country code and starts with 5 (UAE mobile), add +971
              if (!trimmed.startsWith('+') && digits.length >= 9 && digits.startsWith('5')) {
                digits = '971' + digits;
              }

              if (!digits) return null;
              const normalized = '+' + digits;
              // Basic sanity check: at least 8 digits after country code
              if (digits.length < 8) return null;
              return normalized;
            };

            // Extract names - prioritize first_name column
            let firstName = (rawFirst || '').toString().trim();
            let lastName = (rawLast || '').toString().trim();

            if (!firstName && !lastName && rawName) {
              const nameStr = rawName.toString().trim();
              const parts = nameStr.split(/\s+/);
              firstName = parts[0] || '';
              lastName = parts.slice(1).join(' ') || '';
            }

            const contactNo = normalizePhone(rawPhone);
            const email = rawEmail ? rawEmail.toString().trim() : null;

            // Validate required fields
            if (!firstName) {
              errors.push(`Missing first_name for row: ${JSON.stringify(row)}`);
              return;
            }
            if (!contactNo) {
              errors.push(`Invalid or missing contact_no for row: ${JSON.stringify(row)} (original: ${rawPhone})`);
              return;
            }

            // Deduplicate by phone within this upload
            if (seenPhones.has(contactNo)) return;
            seenPhones.add(contactNo);

            leads.push({
              firstName,
              lastName: lastName || null,
              contactNo,
              email,
              campaignId: campaign.id,
              originalPhone: rawPhone, // Keep original for potential editing
            });
          } catch (e) {
            errors.push(`Row parse error: ${e?.message || e}`);
          }
        })
        .on('end', resolve)
        .on('error', reject);
    });

    if (leads.length === 0) {
      // Clean up file even on validation failure
      try {
        if (fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
          console.log('CSV file cleaned up (no valid leads):', req.file.filename);
        }
      } catch (cleanupError) {
        console.warn('Warning: Failed to clean up CSV file:', cleanupError);
      }

      return res.status(400).json({
        error: 'No valid leads found in CSV',
        errors
      });
    }

    // Bulk insert leads
    const createdLeads = await Lead.bulkCreate(leads, { ignoreDuplicates: true });

    // Update campaign total leads count
    await campaign.update({
      totalLeads: campaign.totalLeads + createdLeads.length
    });

    // Clean up uploaded CSV file after successful processing
    try {
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
        console.log('CSV file cleaned up:', req.file.filename);
      }
    } catch (cleanupError) {
      console.warn('Warning: Failed to clean up CSV file:', cleanupError);
      // Don't fail the request if cleanup fails
    }

    res.json({
      success: true,
      message: 'CSV uploaded successfully',
      leadsCount: createdLeads.length,
      leads: createdLeads,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    console.error('CSV upload error:', error);

    // Clean up file on any error
    try {
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
        console.log('CSV file cleaned up (error):', req.file.filename);
      }
    } catch (cleanupError) {
      console.warn('Warning: Failed to clean up CSV file on error:', cleanupError);
    }

    res.status(500).json({ error: 'Failed to upload CSV' });
  }
});

// Upload voice sample for cloning
router.post('/voice', requireAuth, upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file uploaded' });
    }

    const { name, description } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Voice name is required' });
    }

    // TODO: Implement actual voice cloning with ElevenLabs API
    // For now, create a placeholder voice
    const voice = await Voice.create({
      id: `voice_${Date.now()}`,
      name,
      description,
      isCloned: true,
      category: 'cloned',
      sampleUrl: `/uploads/${req.file.filename}`,
      userId: req.user.id
    });

    res.json({
      success: true,
      message: 'Voice sample uploaded successfully',
      voice
    });
  } catch (error) {
    console.error('Voice upload error:', error);

    // Clean up voice file on error
    try {
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
        console.log('Voice file cleaned up (error):', req.file.filename);
      }
    } catch (cleanupError) {
      console.warn('Warning: Failed to clean up voice file on error:', cleanupError);
    }

    res.status(500).json({ error: 'Failed to upload voice sample' });
  }
});

// Get knowledge base files
router.get('/knowledge-base', requireAuth, async (req, res) => {
  try {
    const { campaignId } = req.query;
    
    if (!campaignId) {
      return res.status(400).json({ error: 'Campaign ID is required' });
    }

    // First, verify the user owns the campaign
    const campaign = await Campaign.findOne({ 
      where: { id: campaignId, userId: req.user.id } 
    });

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found or access denied' });
    }

    const knowledgeBase = await KnowledgeBase.findAll({
      where: { 
        campaignId,
      },
      order: [['uploadedAt', 'DESC']]
    });

    res.json(knowledgeBase);
  } catch (error) {
    console.error('Get knowledge base error:', error);
    res.status(500).json({ error: 'Failed to fetch knowledge base' });
  }
});

// Delete knowledge base file
router.delete('/knowledge-base/:id', requireAuth, async (req, res) => {
  try {
    const kb = await KnowledgeBase.findByPk(req.params.id);

    if (!kb) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Verify ownership
    const campaign = await Campaign.findOne({ where: { id: kb.campaignId, userId: req.user.id } });
    if (!campaign) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Delete on ElevenLabs if present
    if (kb.elevenlabsDocId) {
      try { await elevenlabsService.deleteKnowledgeBase(kb.elevenlabsDocId); } catch (err) { console.error('Failed to delete KB on ElevenLabs:', err); }
    }

    // Delete local file
    if (kb.fileUrl && fs.existsSync(kb.fileUrl)) {
      try { fs.unlinkSync(kb.fileUrl); } catch (e) { console.warn('Failed to unlink file:', e); }
    }

    const campaignId = kb.campaignId;
    await kb.destroy();

    // Update agent KB
    try {
      const remaining = await KnowledgeBase.findAll({ where: { campaignId } });
      const remainingDocIds = remaining.map(r => r.elevenlabsDocId).filter(Boolean);
      if (process.env.ELEVENLABS_AGENT_ID) {
        await elevenlabsService.updateAgentKnowledgeBase(process.env.ELEVENLABS_AGENT_ID, remainingDocIds);
      }
    } catch (e) {
      console.error('Failed to update agent KB after delete:', e);
    }

    res.json({ message: 'File deleted successfully' });
  } catch (error) {
    console.error('Delete knowledge base error:', error);
    res.status(500).json({ error: 'Failed to delete file' });
  }
});

export default router;
