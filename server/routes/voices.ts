import type { Express, Request, Response } from "express";
import { requireAuth } from "../auth.js";
import { storage } from "../storage.js";
import { voiceCloneSchema } from "../../shared/schema.js";
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import ffmpeg from 'fluent-ffmpeg';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import multer from "multer";
import fs from "fs";
import fetch from "node-fetch";

// Extend the Express Request type with Multer's file property
interface MulterRequest extends Request {
  file?: Express.Multer.File;
}

interface ElevenLabsVoice {
  voice_id: string;
  name: string;
  category: string;
  labels?: {
    accent?: string;
    description?: string;
  };
  preview_url: string;
  settings: {
    stability: number;
    similarity_boost: number;
    style: number;
    use_speaker_boost: boolean;
  };
}

interface ElevenLabsVoicesResponse {
  voices: ElevenLabsVoice[];
}

// Configure multer for file uploads
const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
});

// Configure ffmpeg path
ffmpeg.setFfmpegPath(ffmpegInstaller.path);

// Audio conversion helper
async function convertToMp3(inputPath: string): Promise<string> {
  const outputPath = inputPath.replace(/\.[^/.]+$/, "") + ".mp3";
  
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .toFormat('mp3')
      .on('error', (err: Error) => {
        console.error('Audio conversion error:', err);
        reject(err);
      })
      .on('end', () => {
        console.log('Audio conversion completed');
        resolve(outputPath);
      })
      .save(outputPath);
  });
}

export function registerVoiceRoutes(app: Express): void {
  
  // Get all voices (fetch from ElevenLabs + local cloned voices)
  app.get("/api/voices", async (_req: Request, res: Response) => {
    try {
      const elevenLabsApiKey = process.env.ELEVENLABS_API_KEY?.trim();
      let allVoices: any[] = [];

      // Fetch voices from ElevenLabs API
      if (elevenLabsApiKey) {
        try {
          const response = await fetch("https://api.elevenlabs.io/v1/voices", {
            headers: {
              "xi-api-key": elevenLabsApiKey,
              "Accept": "application/json"
            }
          });

          if (response.ok) {
            const data = await response.json() as ElevenLabsVoicesResponse;
            const elevenLabsVoices = data.voices.map((voice: ElevenLabsVoice) => ({
              id: voice.voice_id,
              name: voice.name,
              description: voice.labels?.description || voice.labels?.accent || `${voice.category} voice`,
              isCloned: voice.category === "cloned",
              category: voice.category as "premade" | "cloned" | "generated",
              sampleUrl: voice.preview_url,
              settings: voice.settings
            }));
            allVoices.push(...elevenLabsVoices);
          } else {
            console.error('ElevenLabs API error:', response.status, response.statusText);
            // Fall back to default voices if API fails
            const localVoices = await storage.getAllVoices();
            allVoices.push(...localVoices);
          }
        } catch (error) {
          console.error('Error fetching ElevenLabs voices:', error);
          // Fall back to default voices if API fails
          const localVoices = await storage.getAllVoices();
          allVoices.push(...localVoices);
        }
      } else {
        console.warn('No ElevenLabs API key found, using default voices only');
        // Use default voices if no API key
        const localVoices = await storage.getAllVoices();
        allVoices.push(...localVoices);
      }

      // Also get any additional locally cloned voices
      const localVoices = await storage.getAllVoices();
      const localClonedVoices = localVoices.filter(voice => 
        voice.isCloned && !allVoices.find(v => v.id === voice.id)
      );
      allVoices.push(...localClonedVoices);

      res.json({ voices: allVoices });
    } catch (error) {
      console.error('Get voices error:', error);
      res.status(500).json({ error: "Failed to fetch voices" });
    }
  });

  // Proxy voice preview requests
  app.get("/api/voice-preview/:voiceId", async (req: Request, res: Response) => {
    try {
      const elevenLabsApiKey = process.env.ELEVENLABS_API_KEY?.trim() || process.env.ELEVEN_LABS_API_KEY?.trim();
      
      if (!elevenLabsApiKey) {
        return res.status(400).json({ 
          error: "ElevenLabs API key is required." 
        });
      }

      const voiceId = req.params.voiceId;
      
      // Get voice details to get the preview URL
      const voiceResponse = await fetch(`https://api.elevenlabs.io/v1/voices/${voiceId}`, {
        headers: {
          "xi-api-key": elevenLabsApiKey,
          "Accept": "application/json"
        }
      });

      if (!voiceResponse.ok) {
        return res.status(voiceResponse.status).json({
          error: `Failed to get voice details: ${voiceResponse.statusText}`
        });
      }

      const voiceData = await voiceResponse.json() as ElevenLabsVoice;
      
      if (!voiceData.preview_url) {
        return res.status(404).json({
          error: "No preview available for this voice"
        });
      }

      // Fetch the audio file with proper headers
      const audioResponse = await fetch(voiceData.preview_url, {
        headers: {
          "Accept": "audio/mpeg",
          "Range": req.headers.range || "bytes=0-"
        }
      });
      
      if (!audioResponse.ok) {
        return res.status(audioResponse.status).json({
          error: `Failed to fetch audio: ${audioResponse.statusText}`
        });
      }

      // Get content info
      const contentType = audioResponse.headers.get('content-type');
      const contentLength = audioResponse.headers.get('content-length');

      // Set response headers
      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('Content-Type', contentType || 'audio/mpeg');
      if (contentLength) {
        res.setHeader('Content-Length', contentLength);
      }
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.setHeader('Access-Control-Allow-Origin', '*');

      // Stream the audio data
      if (!audioResponse.body) {
        throw new Error('No audio data received');
      }

      audioResponse.body.pipe(res);

    } catch (error) {
      console.error('Voice preview error:', error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : "Failed to get voice preview" 
      });
    }
  });

  // Clone Voice
  app.post("/api/clone-voice", upload.single('audio'), async (req: Request, res: Response) => {
    try {
      console.log('Debug - Starting voice clone process');
      if (!req.file) {
        return res.status(400).json({ error: "No audio file uploaded" });
      }
      console.log('Debug - File received:', {
        filename: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size
      });

      // Convert audio to MP3 if needed
      let audioFilePath = req.file.path;
      if (req.file.mimetype !== 'audio/mp3' && req.file.mimetype !== 'audio/mpeg') {
        try {
          console.log('Debug - Converting audio to MP3');
          audioFilePath = await convertToMp3(req.file.path);
          console.log('Debug - Audio converted successfully:', audioFilePath);
        } catch (conversionError) {
          console.error('Debug - Audio conversion failed:', conversionError);
          fs.unlinkSync(req.file.path);
          return res.status(400).json({ error: "Failed to convert audio file to MP3" });
        }
      }

      // Validate file size (50MB max)
      const maxSize = 50 * 1024 * 1024; // 50MB
      if (req.file.size > maxSize) {
        fs.unlinkSync(req.file.path);
        if (audioFilePath !== req.file.path) {
          fs.unlinkSync(audioFilePath);
        }
        return res.status(400).json({ error: "Audio file must be smaller than 50MB" });
      }

      const validation = voiceCloneSchema.safeParse(req.body);
      if (!validation.success) {
        fs.unlinkSync(req.file.path);
        if (audioFilePath !== req.file.path) {
          fs.unlinkSync(audioFilePath);
        }
        return res.status(400).json({ error: validation.error.errors });
      }

      const { name, description } = validation.data;
      console.log('Debug - Validated request data:', { name, description });

      // Clone voice with ElevenLabs
      const elevenLabsApiKey = process.env.ELEVENLABS_API_KEY || process.env.ELEVEN_LABS_API_KEY;
      if (!elevenLabsApiKey) {
        fs.unlinkSync(req.file.path);
        if (audioFilePath !== req.file.path) {
          fs.unlinkSync(audioFilePath);
        }
        return res.status(400).json({ error: "ElevenLabs API key is required for voice cloning" });
      }
      console.log('Debug - ElevenLabs API key found');

      try {
        console.log('Debug - Initializing ElevenLabs client');
        const elevenlabs = new ElevenLabsClient({
          apiKey: elevenLabsApiKey,
          baseUrl: "https://api.elevenlabs.io"
        });

        // Test the API key first
        console.log('Debug - Testing API connection');
        try {
          const voices = await elevenlabs.voices.getAll();
          console.log('Debug - API connection successful, found voices:', voices.voices?.length || 0);
        } catch (testError: any) {
          console.error('Debug - API test failed:', {
            error: testError,
            message: testError.message,
            response: testError.response?.data
          });
          throw new Error(`ElevenLabs API connection failed: ${testError.message}`);
        }

        // Create voice clone using the SDK
        console.log('Debug - Starting voice clone with ElevenLabs');
        let clonedVoice;
        try {
          const fileStream = fs.createReadStream(audioFilePath);
          console.log('Debug - Created file stream');
          
          clonedVoice = await elevenlabs.voices.ivc.create({
            name,
            description,
            files: [fileStream]
          });
          console.log('Debug - Voice clone response:', clonedVoice);
        } catch (apiError: any) {
          console.error('Debug - ElevenLabs API error:', {
            status: apiError.response?.status,
            message: apiError.message,
            data: apiError.response?.data,
            stack: apiError.stack
          });

          if (apiError.response?.status === 429) {
            throw new Error("Voice cloning rate limit exceeded. Please try again later.");
          }
          if (apiError.response?.status === 400) {
            throw new Error("Invalid audio file. Please ensure the file is a clear voice recording.");
          }
          if (apiError.response?.status === 401) {
            throw new Error("Invalid API key. Please check your ElevenLabs API key.");
          }

          throw new Error(`Voice cloning failed: ${apiError.message}`);
        }

        if (!clonedVoice || !clonedVoice.voiceId) {
          console.error('Debug - No voice ID in response:', clonedVoice);
          throw new Error('Failed to create voice clone - no voice ID returned');
        }

        // Fetch the newly created voice details
        console.log('Debug - Fetching voice details for:', clonedVoice.voiceId);
        const voiceDetails = await elevenlabs.voices.get(clonedVoice.voiceId).catch((error) => {
          console.error('Debug - Failed to fetch voice details:', error);
          throw new Error('Voice was cloned but failed to fetch details. Please refresh the voice list.');
        });
        
        console.log('Debug - Voice details fetched:', {
          id: voiceDetails.voiceId,
          name: voiceDetails.name,
          previewUrl: voiceDetails.previewUrl
        });

        // Store voice in local storage
        const voice = await storage.createVoice({
          id: clonedVoice.voiceId,
          name,
          description: description || 'Cloned Voice',
          isCloned: true,
          sampleUrl: voiceDetails.previewUrl,
          settings: voiceDetails.settings,
          category: 'cloned'
        });

        // Clean up files at the end
        fs.unlinkSync(req.file.path);
        if (audioFilePath !== req.file.path) {
          fs.unlinkSync(audioFilePath);
        }

        res.json({ success: true, voice });
      } catch (error: any) {
        console.error('Debug - Voice clone error details:', {
          message: error.message,
          stack: error.stack,
          response: error.response?.data
        });
        fs.unlinkSync(req.file.path);
        if (audioFilePath !== req.file.path) {
          fs.unlinkSync(audioFilePath);
        }
        res.status(error.response?.status || 500).json({ 
          error: error instanceof Error ? error.message : "Failed to clone voice" 
        });
      }
    } catch (error: any) {
      console.error('Debug - Unexpected error:', {
        message: error.message,
        stack: error.stack
      });
      if (req.file?.path) {
        fs.unlinkSync(req.file.path);
      }
      res.status(500).json({ 
        error: error instanceof Error ? error.message : "Failed to clone voice" 
      });
    }
  });
} 