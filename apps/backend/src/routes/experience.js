import express from 'express';
import { body, validationResult } from 'express-validator';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// Make experience call
router.post('/', [
  body('name').notEmpty().trim(),
  body('email').isEmail().normalizeEmail(),
  body('phone').notEmpty().trim(),
  body('countryCode').notEmpty().trim(),
  body('sector').notEmpty().trim(),
  body('agent').notEmpty().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed',
        errors: errors.array()
      });
    }

    const { name, email, phone, countryCode, sector, agent } = req.body;

    // TODO: Implement actual experience call with ElevenLabs API
    // This would involve:
    // 1. Creating a temporary campaign
    // 2. Making the call through ElevenLabs
    // 3. Returning the call result

    // For now, return a mock response
    const mockResponse = {
      success: true,
      message: 'Experience call initiated successfully',
      callId: `call_${Date.now()}`,
      estimatedWaitTime: '2-3 minutes'
    };

    res.json(mockResponse);
  } catch (error) {
    console.error('Experience call error:', error);
    res.status(500).json({ error: 'Failed to initiate experience call' });
  }
});

export default router;
