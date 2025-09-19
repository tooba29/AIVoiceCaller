import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../.env') });

class TTSService {
  constructor() {
    this.elevenLabsApiKey = process.env.ELEVENLABS_API_KEY;
    this.baseURL = 'https://api.elevenlabs.io/v1';
    this.defaultVoiceId = '21m00Tcm4TlvDq8ikWAM'; // Default voice (Rachel)
  }

  async generateSpeech(text, voiceId = null, options = {}) {
    try {
      if (!this.elevenLabsApiKey) {
        throw new Error('ElevenLabs API key not configured');
      }

      const voice = voiceId || this.defaultVoiceId;
      const {
        stability = 0.5,
        similarityBoost = 0.8,
        style = 0.2,
        useSpeakerBoost = true
      } = options;

      console.log('🎤 Generating speech with ElevenLabs TTS...');
      console.log('📝 Text:', text.substring(0, 100) + (text.length > 100 ? '...' : ''));
      console.log('🎭 Voice ID:', voice);

      const response = await axios.post(
        `${this.baseURL}/text-to-speech/${voice}`,
        {
          text: text,
          model_id: "eleven_multilingual_v2",
          voice_settings: {
            stability: stability,
            similarity_boost: similarityBoost,
            style: style,
            use_speaker_boost: useSpeakerBoost
          }
        },
        {
          headers: {
            'Accept': 'audio/mpeg',
            'Content-Type': 'application/json',
            'xi-api-key': this.elevenLabsApiKey
          },
          responseType: 'arraybuffer',
          timeout: 30000
        }
      );

      console.log('✅ Speech generated successfully');
      console.log('📊 Audio size:', response.data.length, 'bytes');

      return {
        success: true,
        audioData: response.data,
        contentType: 'audio/mpeg',
        size: response.data.length
      };

    } catch (error) {
      console.error('❌ TTS generation error:', error.message);
      
      if (error.response) {
        console.error('📊 Error response status:', error.response.status);
        console.error('📊 Error response data:', error.response.data);
        
        if (error.response.status === 401) {
          throw new Error('Invalid ElevenLabs API key');
        } else if (error.response.status === 429) {
          throw new Error('ElevenLabs API rate limit exceeded');
        }
      }
      
      throw new Error(`TTS generation failed: ${error.message}`);
    }
  }

  async generateSpeechForTwilio(text, voiceId = null, options = {}) {
    try {
      const result = await this.generateSpeech(text, voiceId, options);
      
      // Convert to base64 for Twilio compatibility
      const base64Audio = Buffer.from(result.audioData).toString('base64');
      
      return {
        success: true,
        audioData: result.audioData,
        base64Audio: base64Audio,
        contentType: result.contentType,
        size: result.size
      };
    } catch (error) {
      console.error('❌ Twilio TTS generation error:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async getAvailableVoices() {
    try {
      if (!this.elevenLabsApiKey) {
        throw new Error('ElevenLabs API key not configured');
      }

      const response = await axios.get(`${this.baseURL}/voices`, {
        headers: {
          'xi-api-key': this.elevenLabsApiKey
        }
      });

      return {
        success: true,
        voices: response.data.voices
      };
    } catch (error) {
      console.error('❌ Failed to get voices:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Generate conversational TTS with natural pauses and emphasis
  async generateConversationalSpeech(script, voiceId = null, options = {}) {
    try {
      // Add natural pauses and emphasis to the script
      const enhancedScript = this.enhanceScriptForSpeech(script);
      
      return await this.generateSpeech(enhancedScript, voiceId, {
        ...options,
        stability: 0.4, // More natural variation
        similarityBoost: 0.7, // Less rigid
        style: 0.3 // More expressive
      });
    } catch (error) {
      console.error('❌ Conversational TTS error:', error.message);
      throw error;
    }
  }

  enhanceScriptForSpeech(script) {
    // Add natural pauses and emphasis
    return script
      .replace(/\./g, '. ') // Add space after periods
      .replace(/\?/g, '? ') // Add space after questions
      .replace(/!/g, '! ') // Add space after exclamations
      .replace(/,/g, ', ') // Add space after commas
      .replace(/\s+/g, ' ') // Normalize spaces
      .trim();
  }

  // Create a TwiML-compatible audio URL
  async createAudioUrl(text, voiceId = null, options = {}) {
    try {
      const result = await this.generateSpeechForTwilio(text, voiceId, options);
      
      if (!result.success) {
        throw new Error(result.error);
      }

      // In a real implementation, you would:
      // 1. Save the audio file to a public directory
      // 2. Return the public URL
      // For now, we'll return a placeholder
      const audioUrl = `${process.env.BASE_URL || 'http://localhost:8000'}/api/tts/audio/${Date.now()}.mp3`;
      
      return {
        success: true,
        audioUrl: audioUrl,
        audioData: result.audioData
      };
    } catch (error) {
      console.error('❌ Audio URL creation error:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

export default new TTSService();
