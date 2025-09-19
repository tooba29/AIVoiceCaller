import express from 'express';
import { campaignsRouter } from './src/routes/campaigns.js';

const app = express();
app.use(express.json());

// Mock authentication middleware for testing
app.use('/api/campaigns', (req, res, next) => {
  req.user = { id: 1, email: 'test@example.com' };
  next();
}, campaignsRouter);

const PORT = 8001;
app.listen(PORT, () => {
  console.log(`🧪 Test server running on port ${PORT}`);
  console.log('📞 Testing make-outbound-call endpoint...');
  
  // Test the endpoint
  const testData = {
    phoneNumber: '+1234567890',
    campaignId: null,
    firstName: 'Test User'
  };
  
  const request = {
    method: 'POST',
    url: '/api/campaigns/make-outbound-call',
    body: testData,
    user: { id: 1, email: 'test@example.com' }
  };
  
  const response = {
    json: (data) => {
      console.log('✅ Endpoint Response:', JSON.stringify(data, null, 2));
      process.exit(0);
    },
    status: (code) => ({
      json: (data) => {
        console.log(`❌ Endpoint Error (${code}):`, JSON.stringify(data, null, 2));
        process.exit(1);
      }
    })
  };
  
  // Simulate the request
  setTimeout(() => {
    console.log('🚀 Simulating make-outbound-call request...');
    campaignsRouter.handle(request, response, () => {});
  }, 1000);
});
