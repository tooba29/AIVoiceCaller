import openaiService from './openaiService.js';
import elevenlabsService from './elevenlabsService.js';
import twilioService from './twilioService.js';

class IntelligentCallService {
  constructor() {
    this.activeCalls = new Map(); // Track active calls
  }

  async makeIntelligentCall(phoneNumber, campaignData, leadData = {}) {
    try {
      console.log(`🤖 Making intelligent call to ${phoneNumber} for lead: ${leadData.name || leadData.firstName}`);
      
      // Generate personalized opening message using OpenAI
      const openingMessage = await this.generateOpeningMessage(campaignData, leadData);
      
      // Always try ElevenLabs first for conversational AI
      console.log('🎤 Attempting ElevenLabs conversational AI call...');
      if (elevenlabsService.agentId) {
        const elevenLabsResult = await this.makeElevenLabsCall(phoneNumber, campaignData, leadData, openingMessage);
        if (elevenLabsResult.success) {
          console.log('✅ ElevenLabs conversational call initiated successfully');
          return elevenLabsResult;
        } else {
          console.log('❌ ElevenLabs call failed, falling back to Twilio');
          console.log('ElevenLabs error:', elevenLabsResult.error);
        }
      } else {
        console.log('⚠️ ElevenLabs agent ID not configured, using Twilio');
      }
      
      // Fallback to Twilio
      return await this.makeTwilioCall(phoneNumber, openingMessage, campaignData);
    } catch (error) {
      console.error('Intelligent call error:', error);
      return {
        success: false,
        error: error.message,
        message: 'Failed to make intelligent call'
      };
    }
  }

  async generateOpeningMessage(campaignData, leadData) {
    try {
      const leadName = leadData.name || leadData.firstName || 'there';
      
      // Use script-based opening if available
      if (campaignData.scriptOpening) {
        const opening = campaignData.scriptOpening.replace(/{name}/g, leadName);
        console.log(`🎯 Using script-based opening for ${leadName}: ${opening}`);
        return opening;
      }
      
      // Fallback to AI-generated opening
      const campaignContext = `${campaignData.firstPrompt || 'Hello'} - ${campaignData.systemPersona || 'You are a helpful assistant'}`;
      const result = await openaiService.generateHumanLikeOpening(leadName, campaignContext);
      
      if (result.success) {
        console.log(`🎯 Generated human-like opening for ${leadName}: ${result.opening}`);
        return result.opening;
      } else {
        // Fallback to a natural-sounding default
        return `Hi ${leadName}, this is Sarah calling. I hope I'm not catching you at a bad time? I wanted to reach out about our services. Do you have a quick moment to chat?`;
      }
    } catch (error) {
      console.error('Error generating opening message:', error);
      const leadName = leadData.name || leadData.firstName || 'there';
      return `Hi ${leadName}, this is Sarah calling. I hope I'm not catching you at a bad time? I wanted to reach out about our services. Do you have a quick moment to chat?`;
    }
  }

  async makeElevenLabsCall(phoneNumber, campaignData, leadData, openingMessage) {
    try {
      console.log('🎤 Using ElevenLabs for AI voice call');
      console.log('📞 Phone:', phoneNumber);
      console.log('👤 Lead:', leadData);
      console.log('📋 Campaign:', campaignData);
      
      const callData = {
        campaignId: campaignData.id,
        leadId: leadData.id,
        firstPrompt: openingMessage,
        systemPersona: campaignData.systemPersona,
        leadName: leadData.firstName,
        selectedVoice: campaignData.selectedVoice,
        scriptType: campaignData.scriptType,
        scriptOpening: campaignData.scriptOpening,
        scriptSystem: campaignData.scriptSystem,
        knowledgeBase: campaignData.knowledgeBase,
        aiConfig: campaignData.aiConfig
      };

      console.log('📤 Sending call data to ElevenLabs:', callData);
      const result = await elevenlabsService.makeCall(phoneNumber, callData);
      
      console.log('📥 ElevenLabs result:', result);
      
      if (result.success) {
        // Track the call
        this.activeCalls.set(result.call.call_id, {
          phoneNumber,
          campaignData,
          leadData,
          startTime: new Date(),
          status: 'initiated'
        });

        return {
          success: true,
          callId: result.call.call_id,
          status: 'initiated',
          message: 'AI voice call initiated successfully',
          provider: 'elevenlabs'
        };
      } else {
        console.error('❌ ElevenLabs call failed:', result.error);
        throw new Error(result.error || 'ElevenLabs call failed');
      }
    } catch (error) {
      console.error('❌ ElevenLabs call error:', error);
      console.error('Error details:', error.response?.data);
      // Don't fallback here, let the main function handle it
      return {
        success: false,
        error: error.message,
        message: 'ElevenLabs call failed'
      };
    }
  }

  async makeTwilioCall(phoneNumber, message, campaignData) {
    try {
      console.log('📞 Using Twilio for voice call');
      
      const result = await twilioService.makeCall(phoneNumber, message, null, campaignData);
      
      if (result.success) {
        // Track the call
        this.activeCalls.set(result.callId, {
          phoneNumber,
          startTime: new Date(),
          status: 'initiated',
          message
        });

        return {
          success: true,
          callId: result.callId,
          status: result.status,
          message: 'Voice call initiated successfully',
          provider: 'twilio'
        };
      } else {
        throw new Error(result.error || 'Twilio call failed');
      }
    } catch (error) {
      console.error('Twilio call error:', error);
      throw error;
    }
  }

  async handleCallResponse(callId, userResponse) {
    try {
      const call = this.activeCalls.get(callId);
      if (!call) {
        throw new Error('Call not found');
      }

      // Generate AI response using OpenAI
      const aiResponse = await this.generateAIResponse(
        userResponse,
        call.campaignData,
        call.leadData
      );

      return {
        success: true,
        response: aiResponse,
        callId
      };
    } catch (error) {
      console.error('Error handling call response:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async generateAIResponse(userInput, campaignData, leadData) {
    try {
      const systemPrompt = `You are a professional AI sales assistant having a phone conversation. 

      Campaign Context:
      - System Persona: ${campaignData.systemPersona || 'You are a helpful assistant'}
      - Goal: ${campaignData.goal || 'Have a helpful conversation'}
      
      Lead Information:
      - Name: ${leadData.firstName || 'Customer'}
      - Context: ${leadData.context || 'General inquiry'}
      
      Guidelines:
      1. Be conversational and natural
      2. Listen to their needs and respond appropriately
      3. Ask relevant follow-up questions
      4. Be helpful and professional
      5. Keep responses concise (under 20 seconds when spoken)
      6. If they seem uninterested, politely end the call
      7. If they're interested, guide them toward next steps
      
      Respond naturally to what they said.`;

      const result = await openaiService.generateResponse(
        'Respond to the customer in a natural, conversational way',
        systemPrompt,
        userInput
      );

      if (result.success) {
        return result.response;
      } else {
        return 'I understand. Thank you for your time. Have a great day!';
      }
    } catch (error) {
      console.error('Error generating AI response:', error);
      return 'I apologize, I didn\'t catch that. Could you please repeat?';
    }
  }

  async endCall(callId, reason = 'completed') {
    try {
      const call = this.activeCalls.get(callId);
      if (call) {
        call.status = 'ended';
        call.endTime = new Date();
        call.reason = reason;
        
        console.log(`📞 Call ${callId} ended: ${reason}`);
        
        // Generate call summary using OpenAI
        const summary = await this.generateCallSummary(call);
        call.summary = summary;
        
        return {
          success: true,
          callId,
          summary,
          duration: call.endTime - call.startTime
        };
      }
      
      return { success: false, error: 'Call not found' };
    } catch (error) {
      console.error('Error ending call:', error);
      return { success: false, error: error.message };
    }
  }

  async generateCallSummary(call) {
    try {
      const systemPrompt = `You are an expert sales analyst. Generate a brief summary of a phone call for follow-up purposes.

      Call Details:
      - Duration: ${Math.round((call.endTime - call.startTime) / 1000)} seconds
      - Lead: ${call.leadData?.firstName || 'Unknown'}
      - Status: ${call.reason}
      
      Provide a concise summary including:
      1. Lead interest level (high/medium/low)
      2. Key points discussed
      3. Next steps if any
      4. Follow-up recommendations`;

      const result = await openaiService.generateResponse(
        'Generate a call summary',
        systemPrompt,
        'Summarize this sales call'
      );

      return result.success ? result.response : 'Call completed successfully.';
    } catch (error) {
      console.error('Error generating call summary:', error);
      return 'Call completed successfully.';
    }
  }

  getActiveCalls() {
    return Array.from(this.activeCalls.entries()).map(([id, call]) => ({
      callId: id,
      ...call
    }));
  }

  getCallStatus(callId) {
    return this.activeCalls.get(callId) || null;
  }

  updateCallStatus(callId, status) {
    const callData = this.activeCalls.get(callId);
    if (callData) {
      callData.status = status;
      callData.lastUpdated = new Date();
      console.log(`📞 Call ${callId} status updated to: ${status}`);
    }
  }
}

export default new IntelligentCallService();
