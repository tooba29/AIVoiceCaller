// Twilio Configuration
// Add your Twilio credentials here

export const twilioConfig = {
  // Get these from your Twilio Console: https://console.twilio.com/
  accountSid: process.env.TWILIO_ACCOUNT_SID || 'your_account_sid_here',
  authToken: process.env.TWILIO_AUTH_TOKEN || 'your_auth_token_here',
  phoneNumber: process.env.TWILIO_PHONE_NUMBER || '+1234567890', // Your Twilio phone number
  
  // Webhook URLs (update these for production)
  voiceUrl: process.env.BASE_URL ? `${process.env.BASE_URL}/api/webhooks/voice` : 'http://localhost:8000/api/webhooks/voice',
  statusCallbackUrl: process.env.BASE_URL ? `${process.env.BASE_URL}/api/webhooks/call-status` : 'http://localhost:8000/api/webhooks/call-status'
};

// Instructions:
// 1. Go to https://console.twilio.com/
// 2. Get your Account SID and Auth Token
// 3. Buy a phone number or use a trial number
// 4. Set environment variables:
//    TWILIO_ACCOUNT_SID=your_account_sid
//    TWILIO_AUTH_TOKEN=your_auth_token  
//    TWILIO_PHONE_NUMBER=+1234567890
// 5. For production, update the webhook URLs to your deployed server
