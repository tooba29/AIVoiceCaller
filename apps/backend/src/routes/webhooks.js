import express from 'express';
import elevenlabsService from '../services/elevenlabsService.js';

const router = express.Router();

// ElevenLabs webhook endpoint
router.post('/elevenlabs', (req, res) => {
  elevenlabsService.handleWebhook(req, res);
});

export default router;
