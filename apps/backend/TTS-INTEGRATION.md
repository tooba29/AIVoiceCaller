# Twilio + ElevenLabs TTS Integration

This document explains how the Twilio + ElevenLabs TTS integration works in the AI Voice Caller application.

## Overview

The integration combines:
- **Twilio**: Reliable call handling, phone number management, and webhook infrastructure
- **ElevenLabs**: High-quality neural voice generation and text-to-speech

## Architecture

```
Frontend → Backend → Twilio → ElevenLabs TTS → TwiML → Call
```

1. **Frontend** initiates a call request
2. **Backend** processes the request and generates TTS using ElevenLabs
3. **Twilio** handles the actual phone call
4. **ElevenLabs TTS** generates high-quality audio
5. **TwiML** plays the generated audio during the call

## Components

### 1. TTS Service (`src/services/ttsService.js`)

Handles all text-to-speech generation using ElevenLabs API:

```javascript
// Generate speech from text
const result = await ttsService.generateSpeech(text, voiceId, options);

// Generate speech for Twilio (returns base64)
const result = await ttsService.generateSpeechForTwilio(text, voiceId, options);

// Generate conversational speech with natural pauses
const result = await ttsService.generateConversationalSpeech(script, voiceId, options);
```

### 2. TTS Routes (`src/routes/tts.js`)

API endpoints for TTS functionality:

- `POST /api/tts/generate` - Generate speech from text
- `POST /api/tts/generate-twilio` - Generate speech for Twilio (base64)
- `POST /api/tts/generate-conversational` - Generate conversational speech
- `GET /api/tts/voices` - Get available voices
- `POST /api/tts/create-audio-url` - Create audio URL for TwiML

### 3. TwiML Integration (`src/server.js`)

The TwiML endpoint (`/outbound-call-twiml`) integrates ElevenLabs TTS:

```xml
<Response>
  <Play>data:audio/mpeg;base64,${base64Audio}</Play>
  <Pause length="2"/>
  <Gather input="speech" timeout="6" speechTimeout="4">
    <Say voice="Polly.Joanna-Neural">Follow-up message</Say>
  </Gather>
</Response>
```

## Configuration

### Environment Variables

```bash
# ElevenLabs Configuration
ELEVENLABS_API_KEY=your_elevenlabs_api_key_here
ELEVENLABS_AGENT_ID=your_elevenlabs_agent_id_here

# Twilio Configuration
TWILIO_ACCOUNT_SID=your_twilio_account_sid_here
TWILIO_AUTH_TOKEN=your_twilio_auth_token_here
TWILIO_PHONE_NUMBER=+1234567890

# Server Configuration
BASE_URL=https://your-ngrok-url.ngrok-free.app
PORT=8000
```

### Voice Configuration

Default voice settings:
- **Voice ID**: `21m00Tcm4TlvDq8ikWAM` (Rachel)
- **Stability**: 0.5 (balanced)
- **Similarity Boost**: 0.8 (high similarity)
- **Style**: 0.2 (subtle style)
- **Speaker Boost**: true

## Usage Examples

### 1. Basic TTS Generation

```javascript
import ttsService from './src/services/ttsService.js';

const result = await ttsService.generateSpeech(
  "Hello! This is a test message.",
  "21m00Tcm4TlvDq8ikWAM", // Voice ID
  {
    stability: 0.5,
    similarityBoost: 0.8,
    style: 0.2
  }
);
```

### 2. Twilio Integration

```javascript
const result = await ttsService.generateSpeechForTwilio(
  "Hi there! This is Sarah calling from Spark AI.",
  "21m00Tcm4TlvDq8ikWAM"
);

// Use in TwiML
const twiml = `<Play>data:audio/mpeg;base64,${result.base64Audio}</Play>`;
```

### 3. Conversational TTS

```javascript
const script = "Hi there! I hope you're having a great day. I wanted to reach out about something that might be really helpful for you. Do you have a quick moment to chat?";

const result = await ttsService.generateConversationalSpeech(script);
```

## Testing

### 1. Run TTS Integration Test

```bash
node test-tts-integration.js
```

This will test:
- Configuration validation
- ElevenLabs TTS generation
- Voice availability
- Conversational TTS
- Twilio integration
- Multiple voice testing

### 2. Test Individual Components

```bash
# Test TTS generation
curl -X POST http://localhost:8000/api/tts/generate \
  -H "Content-Type: application/json" \
  -d '{"text": "Hello, this is a test!"}'

# Test voice availability
curl http://localhost:8000/api/tts/voices
```

### 3. Test Full Integration

1. Start the server: `npm start`
2. Set up ngrok: `ngrok http 8000`
3. Update `BASE_URL` in `.env`
4. Make a test call from the frontend
5. Check server logs for TTS generation

## Error Handling

### Common Issues

1. **"ElevenLabs API key not configured"**
   - Check `ELEVENLABS_API_KEY` in `.env`
   - Verify the API key is correct

2. **"Invalid ElevenLabs API key"**
   - Check API key validity
   - Ensure account has sufficient credits

3. **"Rate limit exceeded"**
   - Wait before making more requests
   - Consider upgrading ElevenLabs plan

4. **"TTS generation failed"**
   - Check internet connection
   - Verify ElevenLabs service status
   - Check text length limits

### Fallback Strategy

The system includes automatic fallback to Twilio TTS if ElevenLabs fails:

```javascript
try {
  const ttsResult = await ttsService.generateSpeechForTwilio(text);
  if (ttsResult.success) {
    // Use ElevenLabs TTS
    twiml = `<Play>data:audio/mpeg;base64,${ttsResult.base64Audio}</Play>`;
  } else {
    // Fallback to Twilio TTS
    twiml = `<Say voice="Polly.Joanna-Neural">${text}</Say>`;
  }
} catch (error) {
  // Fallback to Twilio TTS
  twiml = `<Say voice="Polly.Joanna-Neural">${text}</Say>`;
}
```

## Performance Considerations

### Caching

- TTS audio is cached for 1 hour
- Use `Cache-Control: public, max-age=3600`
- Consider implementing persistent caching for production

### Optimization

- Use appropriate voice settings for your use case
- Consider pre-generating common phrases
- Monitor API usage and costs

### Scaling

- ElevenLabs has rate limits based on your plan
- Consider implementing request queuing
- Use multiple API keys for high-volume applications

## Production Deployment

### 1. Environment Setup

```bash
# Production environment variables
NODE_ENV=production
BASE_URL=https://your-production-domain.com
ELEVENLABS_API_KEY=your_production_api_key
TWILIO_ACCOUNT_SID=your_production_account_sid
TWILIO_AUTH_TOKEN=your_production_auth_token
```

### 2. Webhook Configuration

Update Twilio webhook URLs:
- Voice URL: `https://your-domain.com/outbound-call-twiml`
- Status Callback: `https://your-domain.com/api/twilio/status`

### 3. Monitoring

- Monitor TTS generation success rates
- Track API usage and costs
- Set up alerts for failures
- Monitor call quality and duration

## Support

For issues with the TTS integration:

1. Check the server logs for detailed error messages
2. Run the integration test: `node test-tts-integration.js`
3. Verify all environment variables are set correctly
4. Check ElevenLabs and Twilio service status
5. Review the API documentation:
   - [ElevenLabs API Docs](https://docs.elevenlabs.io)
   - [Twilio TwiML Docs](https://www.twilio.com/docs/voice/twiml)
