#!/usr/bin/env node

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';
import ttsService from './src/services/ttsService.js';
import elevenlabsService from './src/services/elevenlabsService.js';
import twilioService from './src/services/twilioService.js';
import { checkConfiguration } from './src/config/checkConfig.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const BASE_URL = process.env.BASE_URL || 'http://localhost:8000';

async function testBothCallingMethods() {
  console.log('🧪 Testing Both Calling Methods: ElevenLabs Direct + Twilio + TTS\n');

  // 1. Configuration Check
  console.log('1️⃣ Configuration Check:');
  const config = checkConfiguration();
  
  const elevenLabsConfigured = config.elevenlabs.configured;
  const twilioConfigured = config.twilio.configured;

  console.log('📊 ElevenLabs Direct Calling:', elevenLabsConfigured ? '✅ Configured' : '❌ Not configured');
  console.log('📊 Twilio + ElevenLabs TTS:', twilioConfigured ? '✅ Configured' : '❌ Not configured');

  if (!elevenLabsConfigured && !twilioConfigured) {
    console.log('❌ No calling methods configured. Please set up at least one service.');
    return;
  }

  // 2. Test ElevenLabs Direct Calling
  if (elevenLabsConfigured) {
    console.log('\n2️⃣ Testing ElevenLabs Direct Calling:');
    try {
      // Test ElevenLabs API connection
      const voicesResult = await elevenlabsService.getVoices();
      if (voicesResult.success) {
        console.log('✅ ElevenLabs API connection successful');
        console.log('📊 Available voices:', voicesResult.voices?.length || 0);
      } else {
        console.log('❌ ElevenLabs API connection failed:', voicesResult.error);
      }

      // Test direct call capability (without actually making a call)
      console.log('🎤 Testing direct call configuration...');
      if (process.env.ELEVENLABS_AGENT_ID && process.env.ELEVENLABS_PHONE_NUMBER_ID) {
        console.log('✅ Direct calling configuration complete');
        console.log('📋 Agent ID:', process.env.ELEVENLABS_AGENT_ID.substring(0, 8) + '...');
        console.log('📞 Phone Number ID:', process.env.ELEVENLABS_PHONE_NUMBER_ID ? 'configured' : 'missing');
      } else {
        console.log('⚠️ Direct calling not fully configured (missing Agent ID or Phone Number ID)');
      }
    } catch (error) {
      console.log('❌ ElevenLabs direct calling test error:', error.message);
    }
  } else {
    console.log('\n2️⃣ ElevenLabs Direct Calling: ⚠️ Not configured');
  }

  // 3. Test Twilio + ElevenLabs TTS
  if (twilioConfigured) {
    console.log('\n3️⃣ Testing Twilio + ElevenLabs TTS:');
    try {
      // Test Twilio connection
      if (twilioService.client) {
        console.log('✅ Twilio client initialized successfully');
        console.log('📞 Phone number:', twilioService.phoneNumber);
      } else {
        console.log('❌ Twilio client not initialized');
      }

      // Test ElevenLabs TTS
      if (elevenLabsConfigured) {
        const testText = "Hello! This is a test of the ElevenLabs TTS integration with Twilio.";
        console.log('🎤 Testing TTS generation...');
        
        const ttsResult = await ttsService.generateSpeechForTwilio(testText);
        
        if (ttsResult.success) {
          console.log('✅ ElevenLabs TTS generation successful');
          console.log('📊 Audio size:', ttsResult.size, 'bytes');
          console.log('🎵 Content type:', ttsResult.contentType);
        } else {
          console.log('❌ ElevenLabs TTS generation failed:', ttsResult.error);
        }
      } else {
        console.log('⚠️ ElevenLabs TTS not available (ElevenLabs not configured)');
      }
    } catch (error) {
      console.log('❌ Twilio + TTS test error:', error.message);
    }
  } else {
    console.log('\n3️⃣ Twilio + ElevenLabs TTS: ⚠️ Not configured');
  }

  // 4. Test API Endpoints
  console.log('\n4️⃣ Testing API Endpoints:');
  try {
    // Test TTS endpoint
    if (elevenLabsConfigured) {
      console.log('🎤 Testing TTS API endpoint...');
      const ttsResponse = await axios.post(`${BASE_URL}/api/tts/generate-twilio`, {
        text: "This is a test of the TTS API endpoint.",
        voiceId: "21m00Tcm4TlvDq8ikWAM"
      });
      
      if (ttsResponse.data.success) {
        console.log('✅ TTS API endpoint working');
        console.log('📊 Response size:', ttsResponse.data.size, 'bytes');
      } else {
        console.log('❌ TTS API endpoint failed:', ttsResponse.data.error);
      }
    }

    // Test voices endpoint
    if (elevenLabsConfigured) {
      console.log('🎭 Testing voices API endpoint...');
      const voicesResponse = await axios.get(`${BASE_URL}/api/tts/voices`);
      
      if (voicesResponse.data.success) {
        console.log('✅ Voices API endpoint working');
        console.log('📊 Available voices:', voicesResponse.data.voices.length);
      } else {
        console.log('❌ Voices API endpoint failed:', voicesResponse.data.error);
      }
    }
  } catch (error) {
    console.log('❌ API endpoint test error:', error.message);
    console.log('💡 Make sure the server is running: npm start');
  }

  // 5. Test Call Method Selection
  console.log('\n5️⃣ Testing Call Method Selection:');
  
  const testPhoneNumber = '+1234567890'; // Test number
  
  if (elevenLabsConfigured) {
    console.log('🤖 Testing direct ElevenLabs call method...');
    try {
      const directCallResponse = await axios.post(`${BASE_URL}/api/campaigns/make-outbound-call`, {
        phoneNumber: testPhoneNumber,
        firstName: 'Test',
        campaignId: 1,
        useDirectElevenLabs: true
      });
      
      if (directCallResponse.data.success) {
        console.log('✅ Direct ElevenLabs call method working');
        console.log('📊 Provider:', directCallResponse.data.provider);
        console.log('📊 Features:', directCallResponse.data.features.join(', '));
      } else {
        console.log('❌ Direct ElevenLabs call method failed:', directCallResponse.data.error);
      }
    } catch (error) {
      console.log('❌ Direct ElevenLabs call test error:', error.message);
    }
  }

  if (twilioConfigured) {
    console.log('📞 Testing Twilio + TTS call method...');
    try {
      const twilioCallResponse = await axios.post(`${BASE_URL}/api/campaigns/make-outbound-call`, {
        phoneNumber: testPhoneNumber,
        firstName: 'Test',
        campaignId: 1,
        useDirectElevenLabs: false
      });
      
      if (twilioCallResponse.data.success) {
        console.log('✅ Twilio + TTS call method working');
        console.log('📊 Provider:', twilioCallResponse.data.provider);
        console.log('📊 Features:', twilioCallResponse.data.features.join(', '));
        console.log('📊 Available methods:', twilioCallResponse.data.availableMethods);
      } else {
        console.log('❌ Twilio + TTS call method failed:', twilioCallResponse.data.error);
      }
    } catch (error) {
      console.log('❌ Twilio + TTS call test error:', error.message);
    }
  }

  // 6. Summary and Recommendations
  console.log('\n6️⃣ Summary and Recommendations:');
  
  console.log('🎯 Available Calling Methods:');
  if (elevenLabsConfigured) {
    console.log('   ✅ ElevenLabs Direct Calling - Full conversational AI');
  } else {
    console.log('   ❌ ElevenLabs Direct Calling - Not configured');
  }
  
  if (twilioConfigured) {
    console.log('   ✅ Twilio + ElevenLabs TTS - Reliable with neural voices');
  } else {
    console.log('   ❌ Twilio + ElevenLabs TTS - Not configured');
  }

  console.log('\n📝 Configuration Recommendations:');
  
  if (!elevenLabsConfigured) {
    console.log('🔧 To enable ElevenLabs Direct Calling:');
    console.log('   - Set ELEVENLABS_API_KEY');
    console.log('   - Set ELEVENLABS_AGENT_ID');
    console.log('   - Set ELEVENLABS_PHONE_NUMBER_ID (optional)');
  }
  
  if (!twilioConfigured) {
    console.log('🔧 To enable Twilio + ElevenLabs TTS:');
    console.log('   - Set TWILIO_ACCOUNT_SID');
    console.log('   - Set TWILIO_AUTH_TOKEN');
    console.log('   - Set TWILIO_PHONE_NUMBER');
    console.log('   - Set ELEVENLABS_API_KEY (for TTS)');
  }

  console.log('\n🚀 Usage Instructions:');
  console.log('   1. Start the server: npm start');
  console.log('   2. Set up ngrok: ngrok http 8000');
  console.log('   3. Update BASE_URL in .env with ngrok URL');
  console.log('   4. Make test calls from the frontend');
  console.log('   5. Use useDirectElevenLabs: true for direct calling');
  console.log('   6. Use useDirectElevenLabs: false for Twilio + TTS');

  console.log('\n🎉 Both calling methods test completed!');
}

// Run the test
testBothCallingMethods().catch(console.error);
