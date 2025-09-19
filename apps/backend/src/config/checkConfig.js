import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../.env') });

export function checkConfiguration() {
  const config = {
    database: {
      configured: !!process.env.DATABASE_URL,
      url: process.env.DATABASE_URL ? 'configured' : 'missing'
    },
    twilio: {
      configured: !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER),
      accountSid: process.env.TWILIO_ACCOUNT_SID ? 'configured' : 'missing',
      authToken: process.env.TWILIO_AUTH_TOKEN ? 'configured' : 'missing',
      phoneNumber: process.env.TWILIO_PHONE_NUMBER || 'missing'
    },
    elevenlabs: {
      configured: !!(process.env.ELEVENLABS_API_KEY && process.env.ELEVENLABS_AGENT_ID),
      apiKey: process.env.ELEVENLABS_API_KEY ? 'configured' : 'missing',
      agentId: process.env.ELEVENLABS_AGENT_ID ? 'configured' : 'missing',
      phoneNumberId: process.env.ELEVENLABS_PHONE_NUMBER_ID || 'missing',
      webhookSecret: process.env.ELEVENLABS_WEBHOOK_SECRET ? 'configured' : 'missing'
    },
    openai: {
      configured: !!process.env.OPENAI_API_KEY,
      apiKey: process.env.OPENAI_API_KEY ? 'configured' : 'missing'
    },
    server: {
      port: process.env.PORT || 8000,
      baseUrl: process.env.BASE_URL || `http://localhost:${process.env.PORT || 8000}`,
      frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173'
    }
  };

  console.log('🔧 Configuration Check:');
  console.log('📊 Database:', config.database.configured ? '✅ Configured' : '❌ Missing');
  console.log('📞 Twilio:', config.twilio.configured ? '✅ Configured' : '❌ Missing');
  console.log('🎤 ElevenLabs:', config.elevenlabs.configured ? '✅ Configured' : '❌ Missing');
  console.log('🤖 OpenAI:', config.openai.configured ? '✅ Configured' : '❌ Missing');
  console.log('🌐 Server URL:', config.server.baseUrl);
  console.log('📱 Frontend URL:', config.server.frontendUrl);

  return config;
}

export function getWebhookUrls() {
  const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 8000}`;
  
  return {
    baseUrl,
    twimlUrl: `${baseUrl}/outbound-call-twiml`,
    statusCallbackUrl: `${baseUrl}/api/twilio/status`,
    elevenlabsWebhookUrl: `${baseUrl}/api/webhooks/elevenlabs`,
    voiceWebhookUrl: `${baseUrl}/api/webhooks/voice`
  };
}
