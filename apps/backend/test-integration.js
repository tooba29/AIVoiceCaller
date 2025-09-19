#!/usr/bin/env node

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { checkConfiguration, getWebhookUrls } from './src/config/checkConfig.js';
import elevenlabsService from './src/services/elevenlabsService.js';
import twilioService from './src/services/twilioService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

async function testIntegration() {
  console.log('🧪 Testing AI Voice Caller Integration...\n');

  // 1. Configuration Check
  console.log('1️⃣ Configuration Check:');
  const config = checkConfiguration();
  
  if (!config.twilio.configured && !config.elevenlabs.configured) {
    console.log('❌ No services configured. Please set up at least one service.');
    return;
  }

  // 2. Test ElevenLabs Connection
  if (config.elevenlabs.configured) {
    console.log('\n2️⃣ Testing ElevenLabs Connection:');
    try {
      const voices = await elevenlabsService.getVoices();
      if (voices.success) {
        console.log('✅ ElevenLabs connection successful');
        console.log(`📊 Available voices: ${voices.voices?.length || 0}`);
      } else {
        console.log('❌ ElevenLabs connection failed:', voices.error);
      }
    } catch (error) {
      console.log('❌ ElevenLabs test error:', error.message);
    }
  } else {
    console.log('\n2️⃣ ElevenLabs: ⚠️ Not configured');
  }

  // 3. Test Twilio Connection
  if (config.twilio.configured) {
    console.log('\n3️⃣ Testing Twilio Connection:');
    try {
      // Test Twilio client initialization
      if (twilioService.client) {
        console.log('✅ Twilio client initialized successfully');
        console.log(`📞 Phone number: ${twilioService.phoneNumber}`);
      } else {
        console.log('❌ Twilio client not initialized');
      }
    } catch (error) {
      console.log('❌ Twilio test error:', error.message);
    }
  } else {
    console.log('\n3️⃣ Twilio: ⚠️ Not configured');
  }

  // 4. Webhook URLs
  console.log('\n4️⃣ Webhook URLs:');
  const webhookUrls = getWebhookUrls();
  console.log('🔗 Base URL:', webhookUrls.baseUrl);
  console.log('📞 TwiML URL:', webhookUrls.twimlUrl);
  console.log('📊 Status Callback:', webhookUrls.statusCallbackUrl);
  console.log('🎤 ElevenLabs Webhook:', webhookUrls.elevenlabsWebhookUrl);

  // 5. Integration Test
  console.log('\n5️⃣ Integration Test:');
  if (config.twilio.configured && config.elevenlabs.configured) {
    console.log('✅ Both Twilio and ElevenLabs are configured');
    console.log('🎯 Integration should work with Twilio + ElevenLabs TTS');
  } else if (config.twilio.configured) {
    console.log('✅ Twilio configured - will use Twilio TTS');
  } else if (config.elevenlabs.configured) {
    console.log('✅ ElevenLabs configured - will use ElevenLabs direct calling');
  }

  // 6. Recommendations
  console.log('\n6️⃣ Recommendations:');
  if (!config.twilio.configured) {
    console.log('📝 To enable Twilio integration:');
    console.log('   - Set TWILIO_ACCOUNT_SID');
    console.log('   - Set TWILIO_AUTH_TOKEN');
    console.log('   - Set TWILIO_PHONE_NUMBER');
  }
  
  if (!config.elevenlabs.configured) {
    console.log('📝 To enable ElevenLabs integration:');
    console.log('   - Set ELEVENLABS_API_KEY');
    console.log('   - Set ELEVENLABS_AGENT_ID');
    console.log('   - Set ELEVENLABS_PHONE_NUMBER_ID (optional)');
  }

  console.log('\n📝 For webhook testing with ngrok:');
  console.log('   - Install ngrok: npm install -g ngrok');
  console.log('   - Set NGROK_AUTH_TOKEN (optional, for custom subdomain)');
  console.log('   - Run: ngrok http 8000');
  console.log('   - Update BASE_URL with ngrok URL');

  console.log('\n🎉 Integration test completed!');
}

// Run the test
testIntegration().catch(console.error);
