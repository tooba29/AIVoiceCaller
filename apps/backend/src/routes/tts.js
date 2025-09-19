import express from 'express';
import ttsService from '../services/ttsService.js';

const router = express.Router();

// Generate speech from text
router.post('/generate', async (req, res) => {
  try {
    const { text, voiceId, options = {} } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    console.log('🎤 TTS generation request:', { text: text.substring(0, 100), voiceId });

    const result = await ttsService.generateSpeech(text, voiceId, options);

    if (result.success) {
      res.set({
        'Content-Type': result.contentType,
        'Content-Length': result.size,
        'Cache-Control': 'public, max-age=3600' // Cache for 1 hour
      });
      res.send(result.audioData);
    } else {
      res.status(500).json({ error: result.error });
    }
  } catch (error) {
    console.error('❌ TTS generation error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Generate speech for Twilio (returns base64)
router.post('/generate-twilio', async (req, res) => {
  try {
    const { text, voiceId, options = {} } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    console.log('🎤 Twilio TTS generation request:', { text: text.substring(0, 100), voiceId });

    const result = await ttsService.generateSpeechForTwilio(text, voiceId, options);

    if (result.success) {
      res.json({
        success: true,
        base64Audio: result.base64Audio,
        contentType: result.contentType,
        size: result.size
      });
    } else {
      res.status(500).json({ error: result.error });
    }
  } catch (error) {
    console.error('❌ Twilio TTS generation error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Generate conversational speech
router.post('/generate-conversational', async (req, res) => {
  try {
    const { script, voiceId, options = {} } = req.body;

    if (!script) {
      return res.status(400).json({ error: 'Script is required' });
    }

    console.log('🎤 Conversational TTS generation request:', { script: script.substring(0, 100), voiceId });

    const result = await ttsService.generateConversationalSpeech(script, voiceId, options);

    if (result.success) {
      res.set({
        'Content-Type': result.contentType,
        'Content-Length': result.size,
        'Cache-Control': 'public, max-age=3600'
      });
      res.send(result.audioData);
    } else {
      res.status(500).json({ error: result.error });
    }
  } catch (error) {
    console.error('❌ Conversational TTS error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get available voices
router.get('/voices', async (req, res) => {
  try {
    console.log('🎭 Getting available voices...');
    
    const result = await ttsService.getAvailableVoices();

    if (result.success) {
      res.json({
        success: true,
        voices: result.voices
      });
    } else {
      res.status(500).json({ error: result.error });
    }
  } catch (error) {
    console.error('❌ Get voices error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create audio URL for TwiML
router.post('/create-audio-url', async (req, res) => {
  try {
    const { text, voiceId, options = {} } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    console.log('🔗 Creating audio URL for TwiML:', { text: text.substring(0, 100), voiceId });

    const result = await ttsService.createAudioUrl(text, voiceId, options);

    if (result.success) {
      res.json({
        success: true,
        audioUrl: result.audioUrl
      });
    } else {
      res.status(500).json({ error: result.error });
    }
  } catch (error) {
    console.error('❌ Audio URL creation error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Serve generated audio files
router.get('/audio/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    
    // In a real implementation, you would serve the actual audio file
    // For now, we'll return a 404 since we're not storing files
    res.status(404).json({ error: 'Audio file not found' });
  } catch (error) {
    console.error('❌ Audio serving error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
