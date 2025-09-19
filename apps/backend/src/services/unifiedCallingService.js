import elevenlabsService from './elevenlabsService.js';
import twilioService from './twilioService.js';
import ttsService from './ttsService.js';
import { CallLog } from '../models/index.js';

class UnifiedCallingService {
  constructor() {
    this.elevenLabsConfigured = !!(process.env.ELEVENLABS_API_KEY && process.env.ELEVENLABS_AGENT_ID);
    this.twilioConfigured = !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER);
    this.elevenLabsTTSConfigured = !!process.env.ELEVENLABS_API_KEY;
  }

  async makeUnifiedCall(phoneNumber, campaignData, leadData) {
    console.log('🚀 UNIFIED CALLING SERVICE - Using Both ElevenLabs & Twilio Together');
    console.log('🎯 Strategy: ElevenLabs for voice quality + Twilio for call reliability');
    
    const callLog = await this.createCallLog(phoneNumber, campaignData, leadData);
    
    try {
      // Strategy 1: Try ElevenLabs Direct Calling first (best quality)
      if (this.elevenLabsConfigured) {
        console.log('🤖 Attempting ElevenLabs Direct Calling (Primary Method)...');
        
        const directResult = await this.attemptElevenLabsDirect(phoneNumber, campaignData, leadData, callLog);
        if (directResult.success) {
          return directResult;
        }
        
        console.log('⚠️ ElevenLabs Direct failed, falling back to Twilio + TTS...');
      }

      // Strategy 2: Use Twilio + ElevenLabs TTS (reliable fallback)
      if (this.twilioConfigured && this.elevenLabsTTSConfigured) {
        console.log('📞 Using Twilio + ElevenLabs TTS (Reliable Method)...');
        
        const twilioTTSResult = await this.attemptTwilioWithElevenLabsTTS(phoneNumber, campaignData, leadData, callLog);
        if (twilioTTSResult.success) {
          return twilioTTSResult;
        }
        
        console.log('⚠️ Twilio + TTS failed, falling back to Twilio only...');
      }

      // Strategy 3: Use Twilio only (basic fallback)
      if (this.twilioConfigured) {
        console.log('📞 Using Twilio Only (Basic Fallback)...');
        
        const twilioResult = await this.attemptTwilioOnly(phoneNumber, campaignData, leadData, callLog);
        if (twilioResult.success) {
          return twilioResult;
        }
      }

      // Strategy 4: Mock call (development fallback)
      console.log('🎭 Using Mock Call (Development Fallback)...');
      return await this.attemptMockCall(phoneNumber, campaignData, leadData, callLog);

    } catch (error) {
      console.error('❌ Unified calling service error:', error);
      await callLog.update({ status: 'failed', error: error.message });
      
      return {
        success: false,
        error: error.message,
        message: 'All calling methods failed',
        callLogId: callLog.id
      };
    }
  }

  async attemptElevenLabsDirect(phoneNumber, campaignData, leadData, callLog) {
    try {
      const openingMessage = this.generateOpeningMessage(campaignData, leadData);
      
      const result = await elevenlabsService.makeCall(phoneNumber, {
        campaignId: campaignData.id,
        leadId: leadData.id,
        firstPrompt: openingMessage,
        systemPersona: campaignData.systemPersona || "You are a professional sales representative.",
        leadName: leadData.firstName || 'there',
        selectedVoice: campaignData.selectedVoice || '21m00Tcm4TlvDq8ikWAM',
        scriptType: campaignData.scriptType || 'conversational',
        scriptOpening: openingMessage,
        scriptSystem: campaignData.systemPersona || "You are a professional sales representative.",
        knowledgeBase: campaignData.knowledgeBase || '',
        aiConfig: campaignData.aiConfig || {}
      });

      if (result.success) {
        await callLog.update({
          elevenLabsCallId: result.call.call_id,
          status: 'initiated',
          provider: 'elevenlabs-direct',
          method: 'elevenlabs-direct'
        });

        return {
          success: true,
          callId: result.call.call_id,
          callLogId: callLog.id,
          status: 'initiated',
          provider: 'elevenlabs-direct',
          method: 'elevenlabs-direct',
          features: ['neural-voice', 'conversational-ai', 'real-time-interaction', 'direct-calling'],
          message: 'ElevenLabs direct call initiated successfully'
        };
      } else {
        throw new Error(result.error || 'ElevenLabs direct call failed');
      }
    } catch (error) {
      console.error('❌ ElevenLabs direct call error:', error.message);
      throw error;
    }
  }

  async attemptTwilioWithElevenLabsTTS(phoneNumber, campaignData, leadData, callLog) {
    try {
      const twilio = (await import('twilio')).default;
      const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
      
      const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 8000}`;
      const secureBaseUrl = baseUrl.replace(/^http:/, 'https:');

      // Generate ElevenLabs TTS for the opening message
      const openingMessage = this.generateOpeningMessage(campaignData, leadData);
      console.log('🎤 Generating ElevenLabs TTS for opening message...');
      
      const ttsResult = await ttsService.generateSpeechForTwilio(openingMessage, campaignData.selectedVoice);
      
      if (!ttsResult.success) {
        console.log('⚠️ ElevenLabs TTS failed, using Twilio TTS instead');
        // Fall back to Twilio TTS
        return await this.attemptTwilioOnly(phoneNumber, campaignData, leadData, callLog);
      }

      console.log('✅ ElevenLabs TTS generated successfully');

      const twimlUrl = new URL(`${secureBaseUrl}/outbound-call-twiml`);
      twimlUrl.searchParams.append('callLogId', callLog.id.toString());
      twimlUrl.searchParams.append('firstName', leadData.firstName || 'there');
      twimlUrl.searchParams.append('isTestCall', 'true');
      twimlUrl.searchParams.append('useElevenLabs', 'true');
      twimlUrl.searchParams.append('campaignName', campaignData.name || 'AI Voice Caller');
      twimlUrl.searchParams.append('campaignId', campaignData.id.toString());
      twimlUrl.searchParams.append('ttsAudio', ttsResult.base64Audio);

      const call = await twilioClient.calls.create({
        to: phoneNumber,
        from: process.env.TWILIO_PHONE_NUMBER,
        url: twimlUrl.toString(),
        statusCallback: `${secureBaseUrl}/api/twilio/status`,
        statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
        method: 'POST',
        record: true
      });

      await callLog.update({
        twilioCallSid: call.sid,
        status: 'initiated',
        provider: 'twilio-elevenlabs-tts',
        method: 'twilio-elevenlabs-tts'
      });

      return {
        success: true,
        callId: call.sid,
        callLogId: callLog.id,
        status: 'initiated',
        provider: 'twilio-elevenlabs-tts',
        method: 'twilio-elevenlabs-tts',
        features: ['neural-voice', 'speech-recognition', 'conversational-ai', 'dynamic-tts', 'webhook-integration'],
        message: 'Twilio + ElevenLabs TTS call initiated successfully'
      };

    } catch (error) {
      console.error('❌ Twilio + ElevenLabs TTS error:', error.message);
      throw error;
    }
  }

  async attemptTwilioOnly(phoneNumber, campaignData, leadData, callLog) {
    try {
      const twilio = (await import('twilio')).default;
      const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
      
      const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 8000}`;
      const secureBaseUrl = baseUrl.replace(/^http:/, 'https:');

      const twimlUrl = new URL(`${secureBaseUrl}/outbound-call-twiml`);
      twimlUrl.searchParams.append('callLogId', callLog.id.toString());
      twimlUrl.searchParams.append('firstName', leadData.firstName || 'there');
      twimlUrl.searchParams.append('isTestCall', 'true');
      twimlUrl.searchParams.append('useElevenLabs', 'false');
      twimlUrl.searchParams.append('campaignName', campaignData.name || 'AI Voice Caller');
      twimlUrl.searchParams.append('campaignId', campaignData.id.toString());

      const call = await twilioClient.calls.create({
        to: phoneNumber,
        from: process.env.TWILIO_PHONE_NUMBER,
        url: twimlUrl.toString(),
        statusCallback: `${secureBaseUrl}/api/twilio/status`,
        statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
        method: 'POST',
        record: true
      });

      await callLog.update({
        twilioCallSid: call.sid,
        status: 'initiated',
        provider: 'twilio-only',
        method: 'twilio-only'
      });

      return {
        success: true,
        callId: call.sid,
        callLogId: callLog.id,
        status: 'initiated',
        provider: 'twilio-only',
        method: 'twilio-only',
        features: ['speech-recognition', 'conversational-ai', 'webhook-integration'],
        message: 'Twilio call initiated successfully'
      };

    } catch (error) {
      console.error('❌ Twilio only error:', error.message);
      throw error;
    }
  }

  async attemptMockCall(phoneNumber, campaignData, leadData, callLog) {
    console.log('🎭 Creating mock call for development/testing...');
    
    await callLog.update({
      status: 'initiated',
      provider: 'mock',
      method: 'mock'
    });

    return {
      success: true,
      callId: `mock_${Date.now()}`,
      callLogId: callLog.id,
      status: 'initiated',
      provider: 'mock',
      method: 'mock',
      features: ['mock-call', 'development-mode'],
      message: 'Mock call created for development/testing'
    };
  }

  async createCallLog(phoneNumber, campaignData, leadData) {
    return await CallLog.create({
      phoneNumber: phoneNumber,
      campaignId: campaignData.id,
      leadId: leadData.id,
      status: 'initiating',
      provider: 'unified',
      method: 'unified',
      startTime: new Date()
    });
  }

  generateOpeningMessage(campaignData, leadData) {
    const firstName = leadData.firstName || 'there';
    const campaignName = campaignData.name || 'Spark AI';
    
    if (campaignData.scriptOpening) {
      return campaignData.scriptOpening.replace(/{name}/g, firstName);
    }
    
    return `Hi ${firstName}! This is Sarah calling from ${campaignName}. I hope I'm not catching you at a bad time? I wanted to reach out about something that might be really helpful for you. Do you have a quick moment to chat?`;
  }

  getServiceStatus() {
    return {
      elevenLabsDirect: this.elevenLabsConfigured,
      twilioElevenLabsTTS: this.twilioConfigured && this.elevenLabsTTSConfigured,
      twilioOnly: this.twilioConfigured,
      mock: true, // Always available as fallback
      recommendedMethod: this.getRecommendedMethod()
    };
  }

  getRecommendedMethod() {
    if (this.elevenLabsConfigured) return 'elevenlabs-direct';
    if (this.twilioConfigured && this.elevenLabsTTSConfigured) return 'twilio-elevenlabs-tts';
    if (this.twilioConfigured) return 'twilio-only';
    return 'mock';
  }
}

export default new UnifiedCallingService();
