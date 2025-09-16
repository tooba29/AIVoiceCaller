import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

class OpenAIService {
  async generateResponse(prompt, systemPrompt, userInput, conversationHistory = []) {
    try {
      const messages = [
        {
          role: "system",
          content: systemPrompt + "\n\nYou are having a natural, human-like conversation. Be conversational, friendly, and engaging. Use natural speech patterns, pauses, and responses. Keep responses concise but warm."
        }
      ];

      // Add conversation history for context
      conversationHistory.forEach(msg => {
        messages.push(msg);
      });

      messages.push({
        role: "user",
        content: `${prompt}\n\nUser input: ${userInput}`
      });

      const completion = await openai.chat.completions.create({
        model: "gpt-4",
        messages: messages,
        max_tokens: 300,
        temperature: 0.8,
        presence_penalty: 0.6,
        frequency_penalty: 0.3
      });

      return {
        success: true,
        response: completion.choices[0].message.content
      };
    } catch (error) {
      console.error('OpenAI error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async generateHumanLikeOpening(leadName, campaignContext) {
    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: `You are a friendly, professional sales representative making a cold call. Create a natural, human-like opening that:
            - Sounds conversational and warm
            - Introduces yourself naturally
            - Explains the purpose briefly
            - Asks for permission to continue
            - Is under 30 seconds when spoken
            - Uses natural speech patterns with pauses
            
            Avoid being pushy or robotic. Be genuine and respectful.`
          },
          {
            role: "user",
            content: `Create an opening for calling ${leadName}. Campaign context: ${campaignContext}`
          }
        ],
        max_tokens: 200,
        temperature: 0.9
      });

      return {
        success: true,
        opening: completion.choices[0].message.content
      };
    } catch (error) {
      console.error('OpenAI opening generation error:', error);
      return {
        success: false,
        error: error.message,
        opening: `Hi ${leadName}, this is Sarah calling about our services. I hope I'm not catching you at a bad time?`
      };
    }
  }

  async generateCampaignPrompt(campaignData) {
    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "You are an expert sales copywriter. Generate compelling sales prompts and personas for AI calling campaigns."
          },
          {
            role: "user",
            content: `Create a sales campaign for: ${JSON.stringify(campaignData)}`
          }
        ],
        max_tokens: 1000,
        temperature: 0.8
      });

      return {
        success: true,
        prompt: completion.choices[0].message.content
      };
    } catch (error) {
      console.error('OpenAI campaign generation error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async analyzeCallTranscript(transcript) {
    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "You are an expert sales analyst. Analyze call transcripts and provide insights on lead quality, objections, and next steps."
          },
          {
            role: "user",
            content: `Analyze this call transcript: ${transcript}`
          }
        ],
        max_tokens: 800,
        temperature: 0.3
      });

      return {
        success: true,
        analysis: completion.choices[0].message.content
      };
    } catch (error) {
      console.error('OpenAI transcript analysis error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async analyzeForAppointmentIntent(conversationText) {
    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: `You are an AI assistant that analyzes sales conversations to detect appointment scheduling intent. 

Analyze the conversation and determine if:
1. The customer expressed interest in scheduling a meeting, appointment, consultation, demo, or call
2. The customer mentioned specific timing preferences
3. The customer requested more information that would require a follow-up meeting
4. The customer showed buying intent that warrants a scheduled follow-up

Return a JSON response with:
{
  "hasAppointmentIntent": boolean,
  "intent": "string describing the specific appointment intent",
  "suggestedTime": "string with any time preferences mentioned or null",
  "appointmentType": "meeting|call|demo|consultation|follow_up",
  "urgency": "high|medium|low",
  "customerInterest": "very_interested|somewhat_interested|needs_nurturing",
  "keyQuotes": ["array of relevant customer quotes about scheduling"],
  "nextSteps": "recommended next steps for scheduling"
}

Only detect appointment intent if there's clear indication the customer wants to schedule something. Don't force false positives.`
          },
          {
            role: "user",
            content: `Analyze this conversation for appointment scheduling intent:\n\n${conversationText}`
          }
        ],
        max_tokens: 600,
        temperature: 0.3,
        response_format: { type: "json_object" }
      });

      const response = completion.choices[0].message.content;
      const appointmentAnalysis = JSON.parse(response);

      console.log('[OpenAI] Appointment analysis:', appointmentAnalysis);

      return appointmentAnalysis;
    } catch (error) {
      console.error('OpenAI appointment analysis error:', error);
      // Return safe default
      return {
        hasAppointmentIntent: false,
        intent: "Analysis failed",
        suggestedTime: null,
        appointmentType: "unknown",
        urgency: "low",
        customerInterest: "unknown",
        keyQuotes: [],
        nextSteps: "Manual review required due to analysis error",
        error: error.message
      };
    }
  }
}

export default new OpenAIService();
