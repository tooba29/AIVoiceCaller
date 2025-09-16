import express from 'express';
import { body, validationResult } from 'express-validator';
import { Voice } from '../models/index.js';
import { requireAuth } from '../middleware/auth.js';
import elevenlabsService from '../services/elevenlabsService.js';
import axios from 'axios';

const router = express.Router();

// Get all voices (merge ElevenLabs voices with locally cloned voices)
router.get('/', requireAuth, async (req, res) => {
  try {
    const result = await elevenlabsService.getVoices();

    // Normalize ElevenLabs voices
    const remoteVoices = Array.isArray(result?.voices)
      ? result.voices.map((v) => ({
          id: v.voice_id || v.id,
          name: v.name,
          description: v.description || '',
          isCloned: false,
          category: v.category || 'premade',
          sampleUrl: v.preview_url || v.sample_url || undefined,
        }))
      : [];

    // Load locally cloned voices (no user filter; model/table has no userId column)
    const localVoices = await Voice.findAll();
    const localNormalized = localVoices.map((v) => ({
      id: v.id,
      name: v.name,
      description: v.description || '',
      isCloned: true,
      category: v.category || 'cloned',
      sampleUrl: v.sampleUrl || undefined,
    }));

    // Merge and de-duplicate by id (prefer local if conflict)
    const byId = new Map();
    for (const rv of remoteVoices) byId.set(rv.id, rv);
    for (const lv of localNormalized) byId.set(lv.id, lv);
    const merged = Array.from(byId.values());

    res.json(merged);
  } catch (error) {
    console.error('Get voices error:', error);
    res.status(500).json({ error: 'Failed to fetch voices' });
  }
});

// Get single voice
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const voice = await Voice.findOne({
      where: { 
        id: req.params.id
      }
    });

    if (!voice) {
      return res.status(404).json({ error: 'Voice not found' });
    }

    res.json(voice);
  } catch (error) {
    console.error('Get voice error:', error);
    res.status(500).json({ error: 'Failed to fetch voice' });
  }
});

// Create new voice (clone voice)
router.post('/clone', requireAuth, [
  body('name').notEmpty().trim(),
  body('description').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed',
        errors: errors.array()
      });
    }

    const { name, description } = req.body;

    // TODO: Implement actual voice cloning with ElevenLabs API
    // For now, create a placeholder voice
    const voice = await Voice.create({
      id: `voice_${Date.now()}`,
      name,
      description,
      isCloned: true,
      category: 'cloned',
      userId: req.user.id
    });

    res.status(201).json(voice);
  } catch (error) {
    console.error('Clone voice error:', error);
    res.status(500).json({ error: 'Failed to clone voice' });
  }
});

// Update voice
router.put('/:id', requireAuth, [
  body('name').optional().notEmpty().trim(),
  body('description').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed',
        errors: errors.array()
      });
    }

    const voice = await Voice.findOne({
      where: { 
        id: req.params.id
      }
    });

    if (!voice) {
      return res.status(404).json({ error: 'Voice not found' });
    }

    const { name, description, settings } = req.body;
    const updateData = {};

    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (settings !== undefined) updateData.settings = settings;

    await voice.update(updateData);

    res.json(voice);
  } catch (error) {
    console.error('Update voice error:', error);
    res.status(500).json({ error: 'Failed to update voice' });
  }
});

// Delete voice
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const voice = await Voice.findOne({
      where: { 
        id: req.params.id
      }
    });

    if (!voice) {
      return res.status(404).json({ error: 'Voice not found' });
    }

    await voice.destroy();

    res.json({ message: 'Voice deleted successfully' });
  } catch (error) {
    console.error('Delete voice error:', error);
    res.status(500).json({ error: 'Failed to delete voice' });
  }
});

// Clone voice endpoint (for frontend compatibility)
router.post('/clone-voice', requireAuth, async (req, res) => {
  try {
    // This endpoint is handled by the upload route for voice samples
    // Redirect to the proper upload endpoint
    res.status(400).json({ 
      error: 'Please use the file upload endpoint for voice cloning',
      endpoint: '/api/upload/voice'
    });
  } catch (error) {
    console.error('Clone voice error:', error);
    res.status(500).json({ error: 'Failed to clone voice' });
  }
});

export default router;

// Voice preview proxy to avoid CORS and protect API key
router.get('/preview/:voiceId', requireAuth, async (req, res) => {
  try {
    const { voiceId } = req.params;
    // Fetch voices from ElevenLabs and find the preview URL
    const result = await elevenlabsService.getVoices();
    const voices = Array.isArray(result?.voices) ? result.voices : [];
    const v = voices.find((x) => (x.voice_id || x.id) === voiceId);
    const previewUrl = v?.preview_url || v?.sample_url;
    if (!previewUrl) {
      return res.status(404).json({ error: 'Preview not available' });
    }
    const resp = await axios.get(previewUrl, { responseType: 'stream' });
    res.setHeader('Content-Type', resp.headers['content-type'] || 'audio/mpeg');
    if (resp.headers['content-length']) {
      res.setHeader('Content-Length', resp.headers['content-length']);
    }
    resp.data.pipe(res);
  } catch (error) {
    console.error('Voice preview proxy error:', error?.message || error);
    res.status(500).json({ error: 'Failed to proxy voice preview' });
  }
});
