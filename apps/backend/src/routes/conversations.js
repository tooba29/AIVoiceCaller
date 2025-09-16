import express from 'express';
import { CallLog, Lead, Campaign, User } from '../models/index.js';
import { requireAuth } from '../middleware/auth.js';
import elevenlabsService from '../services/elevenlabsService.js';

const router = express.Router();

// Fetch conversation details including transcription
router.get('/:conversationId/details', requireAuth, async (req, res) => {
  try {
    const { conversationId } = req.params;
    
    console.log(`[Conversation Details] Fetching details for ${conversationId}`);

    // Find the call log using the ElevenLabs conversation ID
    const callLog = await CallLog.findOne({
      where: { elevenlabsConversationId: conversationId },
      include: [
        {
          model: Lead,
          as: 'lead',
          required: false
        },
        {
          model: Campaign,
          as: 'campaign',
          required: true,
          include: [
            {
              model: User,
              as: 'user',
              required: true
            }
          ]
        }
      ]
    });

    if (!callLog) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    // Verify the user owns the campaign
    if (callLog.campaign.userId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Parse transcription from webhook data stored in database
    let parsedTranscription = null;
    let appointmentAnalysis = null;
    
    if (callLog.transcription) {
      try {
        const transcriptionData = JSON.parse(callLog.transcription);
        parsedTranscription = transcriptionData;
        
        // Extract appointment analysis if available
        if (transcriptionData.appointmentAnalysis) {
          appointmentAnalysis = transcriptionData.appointmentAnalysis;
        }
        
        console.log(`[Conversation Details] Found stored transcription for ${conversationId}`);
      } catch (error) {
        console.error('Error parsing transcription:', error);
        // If transcription exists but can't be parsed, treat as plain text
        parsedTranscription = { text: callLog.transcription };
      }
    }

    // As a fallback, if the transcription is missing, attempt to fetch it from ElevenLabs
    if (!parsedTranscription) {
      console.log(`[Conversation Details] No stored transcription, attempting to fetch from ElevenLabs API`);
      try {
        const transcriptionResult = await elevenlabsService.getConversationTranscription(conversationId);
        if (transcriptionResult.success) {
          parsedTranscription = transcriptionResult.transcription;
          
          // Store the fetched transcription for future use
          await callLog.update({
            transcription: JSON.stringify(parsedTranscription)
          });
          
          console.log(`[Conversation Details] Retrieved and stored transcription from ElevenLabs for ${conversationId}`);
        }
      } catch (error) {
        console.error('Error fetching transcription from ElevenLabs:', error);
      }
    }

    // Bundle the response data
    const responseData = {
      callLog: {
        id: callLog.id,
        campaignId: callLog.campaignId,
        leadId: callLog.leadId,
        phoneNumber: callLog.phoneNumber,
        status: callLog.status,
        duration: callLog.duration,
        elevenlabsConversationId: callLog.elevenlabsConversationId,
        created_at: callLog.created_at
      },
      lead: callLog.lead ? {
        id: callLog.lead.id,
        first_name: callLog.lead.first_name,
        last_name: callLog.lead.last_name,
        contact_no: callLog.lead.contact_no,
        email: callLog.lead.email,
        status: callLog.lead.status
      } : null,
      campaign: {
        id: callLog.campaign.id,
        name: callLog.campaign.name,
        first_prompt: callLog.campaign.firstPrompt,
        system_persona: callLog.campaign.systemPersona
      },
      parsedTranscription,
      appointmentAnalysis,
      hasAppointmentIntent: !!appointmentAnalysis?.hasAppointmentIntent
    };

    console.log(`[Conversation Details] Successfully retrieved details for ${conversationId}`);
    res.json(responseData);

  } catch (error) {
    console.error('Error fetching conversation details:', error);
    res.status(500).json({ error: 'Failed to fetch conversation details' });
  }
});

// Serve audio file as a secure proxy
router.get('/:conversationId/audio', requireAuth, async (req, res) => {
  try {
    const { conversationId } = req.params;
    
    console.log(`[Conversation Audio] Fetching audio for ${conversationId}`);
    
    if (conversationId === 'null' || conversationId === 'undefined' || !conversationId) {
      console.log('❌ [Conversation Audio] Invalid conversation ID received:', conversationId);
      return res.status(400).json({ error: 'Invalid conversation ID' });
    }

    // Find the call log and verify ownership
    const callLog = await CallLog.findOne({
      where: { elevenlabsConversationId: conversationId },
      include: [
        {
          model: Campaign,
          as: 'campaign',
          required: true,
          include: [
            {
              model: User,
              as: 'user',
              required: true
            }
          ]
        }
      ]
    });

    if (!callLog) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    // Verify the user owns the campaign
    if (callLog.campaign.userId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Construct the ElevenLabs audio URL
    const elevenLabsApiKey = process.env.ELEVENLABS_API_KEY;
    const audioUrl = `https://api.elevenlabs.io/v1/convai/conversations/${conversationId}/audio`;

    console.log(`[Conversation Audio] Proxying audio request to ElevenLabs for ${conversationId}`);

    // Act as a secure proxy: fetch the audio stream from ElevenLabs and pipe it directly to the user
    const response = await fetch(audioUrl, {
      headers: {
        'xi-api-key': elevenLabsApiKey,
        'Accept': 'audio/mpeg'
      }
    });

    if (!response.ok) {
      console.error(`ElevenLabs audio fetch failed: ${response.status} ${response.statusText}`);
      return res.status(response.status).json({ error: 'Failed to fetch audio from ElevenLabs' });
    }

    // Set appropriate headers for audio streaming
    res.set({
      'Content-Type': 'audio/mpeg',
      'Content-Disposition': `inline; filename="conversation_${conversationId}.mp3"`,
      'Cache-Control': 'public, max-age=3600' // Cache for 1 hour
    });

    // Stream the audio response directly to the client
    if (response.body) {
      const reader = response.body.getReader();
      
      const pump = async () => {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            res.write(Buffer.from(value));
          }
          res.end();
          console.log(`[Conversation Audio] Successfully streamed audio for ${conversationId}`);
        } catch (streamError) {
          console.error('Error streaming audio:', streamError);
          res.end();
        }
      };
      
      pump();
    } else {
      throw new Error('No audio stream received from ElevenLabs');
    }

  } catch (error) {
    console.error('Error serving conversation audio:', error);
    res.status(500).json({ error: 'Failed to fetch conversation audio' });
  }
});

// Get conversations with appointment intents for a user
router.get('/appointments', requireAuth, async (req, res) => {
  try {
    console.log(`[Conversation Appointments] Fetching appointments for user ${req.user.id}`);

    // Find all call logs with transcriptions for user's campaigns
    const callLogs = await CallLog.findAll({
      include: [
        {
          model: Campaign,
          as: 'campaign',
          required: true,
          where: { userId: req.user.id },
          attributes: ['id', 'name']
        },
        {
          model: Lead,
          as: 'lead',
          required: false,
          attributes: ['id', 'first_name', 'last_name', 'contact_no', 'email']
        }
      ],
      where: {
        transcription: {
          [require('sequelize').Op.ne]: null
        }
      },
      order: [['created_at', 'DESC']]
    });

    // Filter for conversations that have appointment intent
    const appointmentConversations = [];
    
    for (const callLog of callLogs) {
      if (callLog.transcription) {
        try {
          const transcriptionData = JSON.parse(callLog.transcription);
          if (transcriptionData.appointmentAnalysis?.hasAppointmentIntent) {
            appointmentConversations.push({
              conversationId: callLog.elevenlabsConversationId,
              callLog: {
                id: callLog.id,
                status: callLog.status,
                duration: callLog.duration,
                created_at: callLog.created_at
              },
              campaign: callLog.campaign,
              lead: callLog.lead,
              appointmentAnalysis: transcriptionData.appointmentAnalysis,
              appointmentDetectedAt: transcriptionData.appointmentDetectedAt
            });
          }
        } catch (error) {
          console.error('Error parsing transcription for appointment detection:', error);
        }
      }
    }

    console.log(`[Conversation Appointments] Found ${appointmentConversations.length} conversations with appointment intent`);
    res.json({ conversations: appointmentConversations });

  } catch (error) {
    console.error('Error fetching appointment conversations:', error);
    res.status(500).json({ error: 'Failed to fetch appointment conversations' });
  }
});

// Get all conversations (call history) for a user
router.get('/history', requireAuth, async (req, res) => {
  try {
    console.log(`[Call History] Fetching call history for user ${req.user.id}`);

    const callLogs = await CallLog.findAll({
      include: [
        {
          model: Campaign,
          as: 'campaign',
          required: true,
          where: { userId: req.user.id },
          attributes: ['id', 'name']
        },
        {
          model: Lead,
          as: 'lead',
          required: false,
          attributes: ['id', 'first_name', 'last_name', 'contact_no', 'email']
        }
      ],
      order: [['created_at', 'DESC']]
    });

    res.json(callLogs);
  } catch (error) {
    console.error('Error fetching call history:', error);
    res.status(500).json({ error: 'Failed to fetch call history' });
  }
});


export default router;
