# AI Voice Caller - Setup Guide

This guide will help you set up the AI Voice Caller application with proper integration between ElevenLabs, Twilio, and ngrok webhooks.

## Prerequisites

1. **Node.js** (v18 or higher)
2. **npm** or **yarn**
3. **ngrok** (for webhook testing)
4. **PostgreSQL** (optional, for production)

## Environment Configuration

Create a `.env` file in the `apps/backend` directory with the following variables:

```bash
# Database Configuration
DATABASE_URL=postgresql://username:password@localhost:5432/aivoicecaller
NODE_ENV=development

# Server Configuration
PORT=8000
FRONTEND_URL=http://localhost:5173
BASE_URL=http://localhost:8000

# Twilio Configuration
TWILIO_ACCOUNT_SID=your_twilio_account_sid_here
TWILIO_AUTH_TOKEN=your_twilio_auth_token_here
TWILIO_PHONE_NUMBER=+1234567890

# ElevenLabs Configuration
ELEVENLABS_API_KEY=your_elevenlabs_api_key_here
ELEVENLABS_AGENT_ID=your_elevenlabs_agent_id_here
ELEVENLABS_PHONE_NUMBER_ID=your_elevenlabs_phone_number_id_here
ELEVENLABS_WEBHOOK_SECRET=your_webhook_secret_here
ELEVENLABS_WEBHOOK_SKIP_VALIDATION=true

# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here

# ngrok Configuration (for webhook testing)
NGROK_AUTH_TOKEN=your_ngrok_auth_token_here
NGROK_SUBDOMAIN=your_custom_subdomain_here

# Session Configuration
SESSION_SECRET=your_session_secret_here

# CORS Configuration
CORS_ORIGIN=http://localhost:5173
```

## Service Setup

### 1. Twilio Setup (Required for Twilio + TTS method)

1. **Create a Twilio Account**: Go to [twilio.com](https://twilio.com) and sign up
2. **Get Credentials**: 
   - Account SID: Found in your Twilio Console dashboard
   - Auth Token: Found in your Twilio Console dashboard
   - Phone Number: Purchase a phone number from Twilio Console
3. **Configure Webhooks** (for production):
   - Voice URL: `https://your-domain.com/outbound-call-twiml`
   - Status Callback URL: `https://your-domain.com/api/twilio/status`

### 2. ElevenLabs Setup (Required for both methods)

1. **Create an ElevenLabs Account**: Go to [elevenlabs.io](https://elevenlabs.io) and sign up
2. **Get API Key**: 
   - Go to your profile settings
   - Copy your API key
3. **For Direct Calling**:
   - Create an Agent: Go to the Conversational AI section
   - Copy the Agent ID
   - Purchase a phone number from ElevenLabs
   - Copy the Phone Number ID
4. **For TTS Integration**:
   - API Key is sufficient for TTS generation
   - No phone number required (uses Twilio for calling)

### 3. ngrok Setup (for webhook testing)

1. **Install ngrok**:
   ```bash
   npm install -g ngrok
   ```

2. **Get Auth Token** (optional, for custom subdomain):
   - Sign up at [ngrok.com](https://ngrok.com)
   - Get your auth token from the dashboard

3. **Start ngrok tunnel**:
   ```bash
   ngrok http 8000
   ```

4. **Update BASE_URL**:
   - Copy the HTTPS URL from ngrok (e.g., `https://abc123.ngrok-free.app`)
   - Update `BASE_URL` in your `.env` file

## Installation

1. **Install Dependencies**:
   ```bash
   cd apps/backend
   npm install
   ```

2. **Test Configuration**:
   ```bash
   node test-integration.js
   ```

3. **Start the Server**:
   ```bash
   npm start
   ```

## Testing the Integration

### 1. Configuration Test
Run the integration test to verify all services are configured correctly:
```bash
node test-integration.js
```

### 2. Test Both Calling Methods
Run the comprehensive test for both calling methods:
```bash
node test-both-methods.js
```

### 3. Demo Both Methods
Run the demo to see both methods working:
```bash
node demo-both-methods.js
```

### 4. Test Individual Components
```bash
# Test TTS integration only
node test-tts-integration.js

# Test ElevenLabs direct calling
node test-integration.js
```

### 5. Test Call
1. Start the server
2. Open the frontend application
3. Navigate to the test call section
4. Choose your calling method (Direct ElevenLabs or Twilio + TTS)
5. Enter a phone number
6. Click "Make Test Call"

### 6. Webhook Testing
1. Start ngrok: `ngrok http 8000`
2. Update your `.env` file with the ngrok URL
3. Restart the server
4. Make a test call to verify webhooks are working

## Troubleshooting

### Common Issues

1. **"ElevenLabs API key not configured"**
   - Check that `ELEVENLABS_API_KEY` is set in your `.env` file
   - Verify the API key is correct

2. **"Twilio credentials not found"**
   - Check that `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, and `TWILIO_PHONE_NUMBER` are set
   - Verify the credentials are correct

3. **"Webhook not receiving calls"**
   - Ensure ngrok is running and accessible
   - Check that `BASE_URL` is set to the ngrok URL
   - Verify webhook URLs in Twilio Console

4. **"Call failed with 401 error"**
   - Check API keys and credentials
   - Ensure the services are properly configured

### Debug Mode

Enable debug logging by setting:
```bash
DEBUG=true
```

### Logs

Check the server logs for detailed error information:
```bash
npm start
```

## Production Deployment

1. **Set up a production database** (PostgreSQL recommended)
2. **Use a production webhook URL** (not ngrok)
3. **Set `NODE_ENV=production`**
4. **Configure proper CORS settings**
5. **Set up SSL certificates**
6. **Configure proper logging and monitoring**

## Support

If you encounter issues:
1. Check the server logs for error messages
2. Run the integration test: `node test-integration.js`
3. Verify all environment variables are set correctly
4. Check the service documentation:
   - [Twilio Documentation](https://www.twilio.com/docs)
   - [ElevenLabs Documentation](https://docs.elevenlabs.io)
   - [ngrok Documentation](https://ngrok.com/docs)
