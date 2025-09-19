import express from 'express';
import { CallLog } from '../models/index.js';

const router = express.Router();

// Twilio status callback webhook
router.post('/status', async (req, res) => {
  try {
    const {
      CallSid,
      CallStatus,
      From,
      To,
      Direction,
      CallDuration,
      RecordingUrl,
      RecordingDuration
    } = req.body;

    console.log('📊 Twilio Status Callback:', {
      CallSid,
      CallStatus,
      From,
      To,
      Direction,
      CallDuration,
      RecordingUrl
    });

    // Update call log in database
    if (CallSid) {
      try {
        const callLog = await CallLog.findOne({
          where: { twilioCallSid: CallSid }
        });

        if (callLog) {
          await callLog.update({
            status: CallStatus,
            duration: CallDuration ? parseInt(CallDuration) : null,
            recordingUrl: RecordingUrl || null,
            recordingDuration: RecordingDuration ? parseInt(RecordingDuration) : null,
            updatedAt: new Date()
          });

          console.log('✅ Call log updated:', {
            id: callLog.id,
            status: CallStatus,
            duration: CallDuration
          });
        } else {
          console.log('⚠️  Call log not found for CallSid:', CallSid);
        }
      } catch (dbError) {
        console.error('❌ Database error updating call log:', dbError);
      }
    }

    // Handle different call statuses
    switch (CallStatus) {
      case 'initiated':
        console.log('📞 Call initiated:', CallSid);
        break;
      case 'ringing':
        console.log('🔔 Call ringing:', CallSid);
        break;
      case 'answered':
        console.log('✅ Call answered:', CallSid);
        break;
      case 'completed':
        console.log('✅ Call completed:', CallSid, 'Duration:', CallDuration);
        break;
      case 'busy':
        console.log('📵 Call busy:', CallSid);
        break;
      case 'no-answer':
        console.log('📵 No answer:', CallSid);
        break;
      case 'failed':
        console.log('❌ Call failed:', CallSid);
        break;
      case 'canceled':
        console.log('❌ Call canceled:', CallSid);
        break;
      default:
        console.log('📊 Unknown call status:', CallStatus, 'for CallSid:', CallSid);
    }

    res.status(200).send('OK');
  } catch (error) {
    console.error('❌ Twilio status callback error:', error);
    res.status(500).send('Error processing status callback');
  }
});

// Twilio voice webhook
router.post('/voice', async (req, res) => {
  try {
    const {
      CallSid,
      From,
      To,
      CallStatus,
      Direction
    } = req.body;

    console.log('📞 Twilio Voice Webhook:', {
      CallSid,
      From,
      To,
      CallStatus,
      Direction
    });

    // Generate TwiML response
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna-Neural">Hello! This is an AI voice call from Spark AI. Thank you for answering!</Say>
  <Pause length="2"/>
  <Say voice="Polly.Joanna-Neural">This is a test call to verify our AI calling system is working properly.</Say>
  <Pause length="1"/>
  <Say voice="Polly.Joanna-Neural">The integration between Twilio and ElevenLabs is functioning correctly. Thank you for your time!</Say>
</Response>`;

    res.type('text/xml').send(twiml);
  } catch (error) {
    console.error('❌ Twilio voice webhook error:', error);
    res.status(500).send('Error processing voice webhook');
  }
});

export default router;
