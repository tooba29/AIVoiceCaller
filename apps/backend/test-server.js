import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import session from 'express-session';
import multer from 'multer';
import twilioService from './src/services/twilioService.js';
import intelligentCallService from './src/services/intelligentCallService.js';
import openaiService from './src/services/openaiService.js';
import elevenlabsService from './src/services/elevenlabsService.js';

const app = express();
const PORT = 8000;

// Configure multer for file uploads
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174'],
  credentials: true
}));
app.use(express.json());
app.use(session({
  secret: 'test-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false,
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000
  }
}));

// Mock user data
const mockUser = {
  id: 1,
  email: 'insyncinternationaldiseno@gmail.com',
  firstName: 'Test',
  lastName: 'User'
};

// Mock campaigns data
const mockCampaigns = [
  {
    id: 1,
    name: 'Test Campaign',
    firstPrompt: 'Hello, this is a test campaign message',
    systemPersona: 'You are a helpful assistant',
    status: 'draft',
    userId: 1,
    knowledgeBaseId: 1,
    selectedVoiceId: 'rachel',
    totalLeads: 0,
    completedCalls: 0,
    successfulCalls: 0,
    failedCalls: 0,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 2,
    name: 'Sales Outreach Campaign',
    firstPrompt: 'Hi there! I hope you are doing well. I wanted to reach out about our new product that could really help your business grow.',
    systemPersona: 'You are a professional sales representative with expertise in business solutions.',
    status: 'active',
    userId: 1,
    knowledgeBaseId: 2,
    selectedVoiceId: 'sarah',
    totalLeads: 25,
    completedCalls: 15,
    successfulCalls: 12,
    failedCalls: 3,
    startedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
    lastCallAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(), // 5 minutes ago
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
    updatedAt: new Date()
  },
  {
    id: 3,
    name: 'Customer Follow-up',
    firstPrompt: 'Hello! This is Sarah calling to follow up on our previous conversation about your interest in our services.',
    systemPersona: 'You are a friendly customer service representative following up on previous interactions.',
    status: 'completed',
    userId: 1,
    knowledgeBaseId: 3,
    selectedVoiceId: 'emma',
    totalLeads: 10,
    completedCalls: 10,
    successfulCalls: 8,
    failedCalls: 2,
    startedAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(), // 6 hours ago
    lastCallAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(), // 1 hour ago
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
    updatedAt: new Date()
  },
  {
    id: 4,
    name: 'Product Demo Campaign',
    firstPrompt: 'Hi! I hope you are having a great day. I wanted to invite you to a free product demonstration that could really benefit your team.',
    systemPersona: 'You are an enthusiastic product specialist who loves helping businesses discover new solutions.',
    status: 'paused',
    userId: 1,
    knowledgeBaseId: 4,
    selectedVoiceId: 'david',
    totalLeads: 50,
    completedCalls: 20,
    successfulCalls: 15,
    failedCalls: 5,
    startedAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(), // 12 hours ago
    lastCallAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 minutes ago
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
    updatedAt: new Date()
  }
];

// Auth routes
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  
  if (email === 'insyncinternationaldiseno@gmail.com' && password === 'Tooba12345$') {
    req.session.userId = mockUser.id;
    res.json({
      message: 'Login successful',
      user: mockUser
    });
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

app.get('/api/auth/status', (req, res) => {
  if (req.session.userId) {
    res.json({ authenticated: true, user: mockUser });
  } else {
    res.json({ authenticated: false });
  }
});

app.post('/api/auth/logout', (req, res) => {
  req.session.destroy();
  res.json({ message: 'Logged out successfully' });
});

// Campaign routes (no auth for testing)
app.get('/api/campaigns', (req, res) => {
  res.json({ campaigns: mockCampaigns });
});

app.post('/api/campaigns', (req, res) => {
  const newCampaign = {
    id: mockCampaigns.length + 1,
    ...req.body,
    userId: 1,
    status: 'draft',
    createdAt: new Date(),
    updatedAt: new Date()
  };
  
  mockCampaigns.push(newCampaign);
  res.json(newCampaign);
});

app.post('/api/start-campaign', async (req, res) => {
  try {
    const { 
      campaignId, 
      name, 
      firstPrompt, 
      systemPersona, 
      selectedVoice, 
      scriptType, 
      scriptOpening, 
      scriptSystem, 
      knowledgeBase, 
      leads, 
      aiConfig 
    } = req.body;
    
    const campaign = mockCampaigns.find(c => c.id === campaignId);
    
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }
    
    // Update campaign with all the provided data
    campaign.name = name || campaign.name;
    campaign.firstPrompt = firstPrompt || campaign.firstPrompt;
    campaign.systemPersona = systemPersona || campaign.systemPersona;
    campaign.selectedVoice = selectedVoice || campaign.selectedVoice;
    campaign.selectedVoiceId = selectedVoice || campaign.selectedVoiceId;
    campaign.scriptType = scriptType;
    campaign.scriptOpening = scriptOpening;
    campaign.scriptSystem = scriptSystem;
    campaign.knowledgeBase = knowledgeBase || campaign.knowledgeBase;
    campaign.leads = leads || campaign.leads;
    campaign.aiConfig = aiConfig || campaign.aiConfig;
    
    // Update campaign status
    campaign.status = 'active';
    campaign.startedAt = new Date().toISOString();
    
    console.log(`🚀 Starting campaign: ${campaign.name}`);
    console.log(`🎤 Selected Voice: ${campaign.selectedVoice}`);
    console.log(`📝 Script Type: ${campaign.scriptType}`);
    console.log(`💬 Opening Message: ${campaign.scriptOpening}`);
    console.log(`📞 Making actual calls to leads...`);
    
    // Get leads from the campaign's uploaded CSV data
    let campaignLeads = [];
    
    // Check if campaign has leads data from CSV upload
    if (campaign.leads && campaign.leads.length > 0) {
      // Use the leads from the uploaded CSV
      campaignLeads = campaign.leads.map(lead => ({
        name: lead.name || 'Customer',
        phone: lead.phone || lead.phoneNumber
      }));
      console.log(`📋 Using ${campaignLeads.length} leads from uploaded CSV`);
    } else {
      // No leads found - campaign cannot start
      console.log(`❌ No leads found in CSV - campaign cannot start`);
      return res.status(400).json({ 
        error: 'No leads found. Please upload a CSV file with phone numbers before starting the campaign.' 
      });
    }
    
    campaign.totalLeads = campaignLeads.length;
    campaign.completedCalls = 0;
    campaign.successfulCalls = 0;
    campaign.failedCalls = 0;
    campaign.callHistory = [];
    
    // Start making actual calls
    const callPromises = campaignLeads.map(async (lead, index) => {
      try {
        // Add delay between calls to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, index * 2000));
        
           console.log(`📞 Calling ${lead.name} at ${lead.phone}...`);
           
           // Make the actual call using intelligent call service
           const campaignData = {
             id: campaign.id,
             name: campaign.name,
             firstPrompt: campaign.firstPrompt || 'Hello, this is an AI assistant calling you.',
             systemPersona: campaign.systemPersona || 'You are a helpful AI assistant.',
             selectedVoice: campaign.selectedVoice || campaign.selectedVoiceId,
             scriptType: campaign.scriptType || 'friendly',
             scriptOpening: campaign.scriptOpening || null,
             scriptSystem: campaign.scriptSystem || null,
             knowledgeBase: campaign.knowledgeBase || [],
             aiConfig: campaign.aiConfig || {}
           };
           
           const callResult = await intelligentCallService.makeIntelligentCall(
             lead.phone,
             campaignData,
             { name: lead.name, firstName: lead.name }
           );
           
           if (callResult.success) {
             console.log(`✅ Call to ${lead.name} initiated successfully: ${callResult.callId}`);
             console.log(`📱 Call Status: ${callResult.status}`);
           } else {
             console.log(`❌ Call to ${lead.name} failed: ${callResult.error}`);
           }
        
           // Update campaign progress
           campaign.completedCalls++;
           campaign.successfulCalls++;
           campaign.lastCallAt = new Date().toISOString();
           
           // Add to call history
           campaign.callHistory.push({
             leadName: lead.name,
             phone: lead.phone,
             callId: callResult.callId,
             status: callResult.status,
             timestamp: new Date().toISOString(),
             success: true,
             provider: callResult.provider || 'twilio',
             message: callResult.message || 'Call initiated successfully'
           });
           
           return { success: true, lead: lead.name, callSid: callResult.callId };
      } catch (error) {
        console.error(`❌ Failed to call ${lead.name}:`, error.message);
        campaign.completedCalls++;
        campaign.failedCalls++;
        
        // Add failed call to history
        campaign.callHistory.push({
          leadName: lead.name,
          phone: lead.phone,
          callId: null,
          status: 'failed',
          timestamp: new Date().toISOString(),
          success: false,
          error: error.message
        });
        
        return { success: false, lead: lead.name, error: error.message };
      }
    });
    
    // Start the calls in the background
    Promise.all(callPromises).then(results => {
      console.log(`🎯 Campaign ${campaign.name} completed!`);
      console.log(`📊 Results: ${campaign.successfulCalls} successful, ${campaign.failedCalls} failed`);
      campaign.status = 'completed';
    });
    
    res.json({ 
      message: 'Campaign started successfully and calls are being made!',
      campaign: {
        id: campaign.id,
        name: campaign.name,
        status: campaign.status,
        startedAt: campaign.startedAt,
        totalLeads: campaign.totalLeads,
        completedCalls: campaign.completedCalls,
        successfulCalls: campaign.successfulCalls,
        failedCalls: campaign.failedCalls
      }
    });
  } catch (error) {
    console.error('Error starting campaign:', error);
    res.status(500).json({ error: 'Failed to start campaign' });
  }
});

app.post('/api/make-outbound-call', async (req, res) => {
  try {
    const { phoneNumber, campaignId, firstName } = req.body;
    
    if (!phoneNumber) {
      return res.status(400).json({ error: 'Phone number is required' });
    }

    // Get campaign data
    const campaign = mockCampaigns.find(c => c.id === campaignId);
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    // Prepare lead data
    const leadData = {
      firstName: firstName || 'Customer',
      phoneNumber: phoneNumber
    };

    // Make intelligent call using AI
    const result = await intelligentCallService.makeIntelligentCall(
      phoneNumber,
      campaign,
      leadData
    );
    
    if (result.success) {
      res.json({
        message: result.message,
        callId: result.callId,
        status: result.status,
        provider: result.provider
      });
    } else {
      res.status(500).json({
        error: result.error || 'Failed to initiate call',
        message: result.message
      });
    }
  } catch (error) {
    console.error('Call error:', error);
    res.status(500).json({ error: 'Failed to make call' });
  }
});

app.post('/api/update-agent', (req, res) => {
  res.json({ message: 'Agent updated successfully' });
});

// AI Services endpoints
app.get('/api/voices', async (req, res) => {
  try {
    const result = await elevenlabsService.getVoices();
    if (result.success) {
      res.json(result.voices);
    } else {
      res.status(500).json({ error: result.error });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch voices' });
  }
});

app.post('/api/generate-message', async (req, res) => {
  try {
    const { campaignData, leadData } = req.body;
    const message = await intelligentCallService.generateOpeningMessage(campaignData, leadData);
    res.json({ message });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate message' });
  }
});

app.get('/api/calls/active', (req, res) => {
  const activeCalls = intelligentCallService.getActiveCalls();
  res.json(activeCalls);
});

app.get('/api/calls/:callId/status', (req, res) => {
  const callStatus = intelligentCallService.getCallStatus(req.params.callId);
  if (callStatus) {
    res.json(callStatus);
  } else {
    res.status(404).json({ error: 'Call not found' });
  }
});

app.post('/api/calls/:callId/end', async (req, res) => {
  try {
    const { reason } = req.body;
    const result = await intelligentCallService.endCall(req.params.callId, reason);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to end call' });
  }
});

// Twilio webhooks
app.post('/api/webhooks/voice', (req, res) => {
  const { From, To, CallSid } = req.body;
  console.log(`📞 Incoming call from ${From} to ${To}, Call ID: ${CallSid}`);
  
  // Generate TwiML response
  const twiml = twilioService.generateTwiML(
    'Hello! This is an AI assistant calling you. Thank you for your time.',
    'alice'
  );
  
  res.type('text/xml');
  res.send(twiml);
});

app.post('/api/webhooks/call-status', (req, res) => {
  const { CallSid, CallStatus, CallDuration } = req.body;
  console.log(`📊 Call ${CallSid} status: ${CallStatus}, Duration: ${CallDuration}s`);
  
  res.status(200).send('OK');
});

// ElevenLabs webhooks
app.post('/api/webhooks/elevenlabs', (req, res) => {
  elevenlabsService.handleWebhook(req, res);
});

// Analytics endpoint
app.get('/api/analytics/dashboard', (req, res) => {
  res.json({
    totalCalls: 0,
    successfulCalls: 0,
    failedCalls: 0,
    totalLeads: 0,
    activeCampaigns: 0,
    conversionRate: 0
  });
});

// File upload endpoints
app.post('/api/upload-pdf', upload.single('pdf'), async (req, res) => {
  try {
    const campaignId = req.body.campaignId;
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No PDF file uploaded'
      });
    }
    
    console.log(`📄 PDF uploaded: ${req.file.originalname}`);
    
    // Upload to ElevenLabs if configured
    let elevenlabsResult = null;
    if (process.env.ELEVENLABS_API_KEY && process.env.ELEVENLABS_AGENT_ID) {
      try {
        elevenlabsResult = await elevenlabsService.uploadKnowledgeBase(
          req.file.buffer,
          req.file.originalname,
          campaignId
        );
        
        if (elevenlabsResult.success) {
          console.log(`✅ PDF uploaded to ElevenLabs: ${elevenlabsResult.knowledgeBaseId}`);
        } else {
          console.log(`⚠️ ElevenLabs upload failed: ${elevenlabsResult.error}`);
        }
      } catch (error) {
        console.error('ElevenLabs upload error:', error);
      }
    }
    
    // Mock file upload response
    const mockFile = {
      id: Date.now(),
      name: req.file.originalname,
      type: 'pdf',
      size: req.file.size,
      uploadedAt: new Date().toISOString(),
      campaignId: campaignId,
      elevenlabsId: elevenlabsResult?.knowledgeBaseId || null
    };
    
    res.json({
      success: true,
      message: 'PDF uploaded successfully',
      file: mockFile,
      elevenlabs: elevenlabsResult
    });
  } catch (error) {
    console.error('PDF upload error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to upload PDF'
    });
  }
});

// Delete knowledge base file endpoint
app.delete('/api/knowledge-base/:fileId', async (req, res) => {
  try {
    const { fileId } = req.params;
    const { elevenlabsId } = req.body;
    
    console.log(`🗑️ Deleting knowledge base file: ${fileId}`);
    
    // Delete from ElevenLabs if configured
    if (elevenlabsId && process.env.ELEVENLABS_API_KEY) {
      try {
        const deleteResult = await elevenlabsService.deleteKnowledgeBase(elevenlabsId);
        
        if (deleteResult.success) {
          console.log(`✅ File deleted from ElevenLabs: ${elevenlabsId}`);
        } else {
          console.log(`⚠️ ElevenLabs delete failed: ${deleteResult.error}`);
        }
      } catch (error) {
        console.error('ElevenLabs delete error:', error);
      }
    }
    
    res.json({
      success: true,
      message: 'Knowledge base file deleted successfully',
      fileId: fileId
    });
  } catch (error) {
    console.error('Delete knowledge base error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete knowledge base file'
    });
  }
});

app.post('/api/upload-csv', upload.single('csv'), (req, res) => {
  try {
    const leads = [];
    const campaignId = req.body.campaignId;
    
    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No CSV file uploaded'
      });
    }
    
    // Parse CSV content
    const csvContent = req.file.buffer.toString('utf-8');
    console.log('📄 CSV Content:', csvContent);
    
    const lines = csvContent.split('\n');
    lines.forEach((line, index) => {
      if (line.trim()) {
        const columns = line.split(',').map(col => col.trim().replace(/"/g, ''));
        
        if (columns.length >= 2) {
          // Format: name,phone
          const name = columns[0];
          const phone = columns[1];
          if (phone && phone.match(/^\+?[\d\s\-\(\)]+$/)) {
            leads.push({ name, phone });
          }
        } else if (columns.length === 1) {
          // Format: just phone number
          const phone = columns[0];
          if (phone && phone.match(/^\+?[\d\s\-\(\)]+$/)) {
            leads.push({ name: `Lead ${index + 1}`, phone });
          }
        }
      }
    });
    
    // Store leads data in the campaign
    if (campaignId) {
      const campaign = mockCampaigns.find(c => c.id === parseInt(campaignId));
      if (campaign) {
        campaign.leads = leads;
        console.log(`📋 CSV uploaded for campaign: ${campaign.name}`);
        console.log(`📞 Found ${leads.length} leads:`, leads.map(lead => `${lead.name} (${lead.phone})`).join(', '));
      }
    }
    
    res.json({
      success: true,
      message: `CSV uploaded successfully with ${leads.length} leads`,
      file: { 
        id: Date.now(), 
        name: req.file.originalname || 'uploaded.csv', 
        type: 'csv',
        leads: leads
      }
    });
  } catch (error) {
    console.error('CSV upload error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process CSV file'
    });
  }
});

// Clone voice endpoint
app.post('/api/clone-voice', (req, res) => {
  res.json({
    success: true,
    message: 'Voice cloned successfully',
    voice: {
      id: Date.now().toString(),
      name: 'Cloned Voice',
      voice_id: 'cloned_' + Date.now(),
      description: 'A cloned voice'
    }
  });
});

// Get campaign status and progress
app.get('/api/campaigns/:id/status', (req, res) => {
  const { id } = req.params;
  const campaign = mockCampaigns.find(c => c.id === parseInt(id));
  
  if (!campaign) {
    return res.status(404).json({ error: 'Campaign not found' });
  }
  
  // Get real-time campaign progress
  const progress = {
    id: campaign.id,
    name: campaign.name,
    status: campaign.status,
    totalLeads: campaign.totalLeads || 0,
    completedCalls: campaign.completedCalls || 0,
    successfulCalls: campaign.successfulCalls || 0,
    failedCalls: campaign.failedCalls || 0,
    pendingCalls: (campaign.totalLeads || 0) - (campaign.completedCalls || 0),
    progressPercentage: campaign.totalLeads > 0 ? 
      Math.round(((campaign.completedCalls || 0) / campaign.totalLeads) * 100) : 0,
    startedAt: campaign.startedAt,
    lastCallAt: campaign.lastCallAt,
    estimatedCompletion: campaign.estimatedCompletion,
    leads: campaign.leads || [],
    callHistory: campaign.callHistory || []
  };
  
  console.log(`📊 Campaign ${campaign.name} Status: ${progress.completedCalls}/${progress.totalLeads} calls completed (${progress.progressPercentage}%)`);
  
  res.json(progress);
});

// Update campaign progress (simulate calls being made)
app.post('/api/campaigns/:id/progress', (req, res) => {
  const { id } = req.params;
  const { completedCalls, successfulCalls, failedCalls } = req.body;
  
  const campaign = mockCampaigns.find(c => c.id === parseInt(id));
  
  if (!campaign) {
    return res.status(404).json({ error: 'Campaign not found' });
  }
  
  // Update campaign progress
  campaign.completedCalls = completedCalls || campaign.completedCalls || 0;
  campaign.successfulCalls = successfulCalls || campaign.successfulCalls || 0;
  campaign.failedCalls = failedCalls || campaign.failedCalls || 0;
  campaign.lastCallAt = new Date().toISOString();
  
  // Calculate estimated completion
  if (campaign.completedCalls > 0 && campaign.totalLeads > 0) {
    const remainingCalls = campaign.totalLeads - campaign.completedCalls;
    const avgTimePerCall = 2; // minutes
    const estimatedMinutes = remainingCalls * avgTimePerCall;
    campaign.estimatedCompletion = new Date(Date.now() + estimatedMinutes * 60000).toISOString();
  }
  
  res.json({
    message: 'Campaign progress updated',
    campaign: {
      id: campaign.id,
      name: campaign.name,
      status: campaign.status,
      completedCalls: campaign.completedCalls,
      successfulCalls: campaign.successfulCalls,
      failedCalls: campaign.failedCalls,
      progressPercentage: campaign.totalLeads > 0 ? 
        Math.round((campaign.completedCalls / campaign.totalLeads) * 100) : 0
    }
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Call status and history endpoints
app.get('/api/calls/active', (req, res) => {
  try {
    const activeCalls = intelligentCallService.getActiveCalls();
    res.json({ 
      success: true, 
      activeCalls: Array.from(activeCalls.entries()).map(([callId, callData]) => ({
        callId,
        phoneNumber: callData.phoneNumber,
        status: callData.status,
        startTime: callData.startTime,
        campaignId: callData.campaignData?.id,
        leadName: callData.leadData?.name || callData.leadData?.firstName
      }))
    });
  } catch (error) {
    console.error('Error getting active calls:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/calls/:callId/status', async (req, res) => {
  try {
    const { callId } = req.params;
    const status = await intelligentCallService.getCallStatus(callId);
    res.json({ success: true, status });
  } catch (error) {
    console.error('Error getting call status:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/calls/history', (req, res) => {
  try {
    // Get call history from campaigns
    const allCallHistory = [];
    mockCampaigns.forEach(campaign => {
      if (campaign.callHistory && campaign.callHistory.length > 0) {
        campaign.callHistory.forEach(call => {
          allCallHistory.push({
            ...call,
            campaignId: campaign.id,
            campaignName: campaign.name
          });
        });
      }
    });
    
    // Sort by timestamp (newest first)
    allCallHistory.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    res.json({ 
      success: true, 
      callHistory: allCallHistory,
      total: allCallHistory.length
    });
  } catch (error) {
    console.error('Error getting call history:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ElevenLabs webhook endpoint
app.post('/api/webhooks/elevenlabs', (req, res) => {
  try {
    const webhookData = req.body;
    console.log('📞 ElevenLabs webhook received:', webhookData);
    
    // Handle different webhook events
    if (webhookData.event === 'call_started') {
      console.log('✅ Call started:', webhookData.call_id);
      // Update call status in intelligent call service
      intelligentCallService.updateCallStatus(webhookData.call_id, 'in-progress');
    } else if (webhookData.event === 'call_ended') {
      console.log('📞 Call ended:', webhookData.call_id);
      intelligentCallService.updateCallStatus(webhookData.call_id, 'completed');
    } else if (webhookData.event === 'call_failed') {
      console.log('❌ Call failed:', webhookData.call_id);
      intelligentCallService.updateCallStatus(webhookData.call_id, 'failed');
    } else if (webhookData.event === 'call_declined') {
      console.log('📵 Call declined:', webhookData.call_id);
      intelligentCallService.updateCallStatus(webhookData.call_id, 'declined');
    } else if (webhookData.event === 'conversation_turn') {
      console.log('💬 Conversation turn:', webhookData.call_id);
      // Handle conversation turns for real-time updates
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('ElevenLabs webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Test server running on port ${PORT}`);
  console.log(`📱 Frontend URL: http://localhost:5173`);
  console.log(`🔗 API Base URL: http://localhost:${PORT}`);
});
