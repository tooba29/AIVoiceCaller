import express from 'express';
import { body, validationResult } from 'express-validator';
import { Campaign, Lead, KnowledgeBase, CallLog, User } from '../models/index.js';
import { requireAuth } from '../middleware/auth.js';
import twilioService from '../services/twilioService.js';
import elevenlabsService from '../services/elevenlabsService.js';

const router = express.Router();

// Get all campaigns for a user
router.get('/', requireAuth, async (req, res) => {
  try {
    const campaigns = await Campaign.findAll({
      where: { userId: req.user.id },
      include: [
        { model: KnowledgeBase, as: 'knowledgeBase' },
        { model: Lead, as: 'leads' },
        { model: CallLog, as: 'callLogs' }
      ],
      order: [['created_at', 'DESC']]
    });

    const campaignsWithRealStats = campaigns.map(campaign => {
      const leads = campaign.leads || [];
      const callLogs = campaign.callLogs || [];
      
      // Calculate real stats from actual data
      const totalLeads = leads.length;
      const completedLeads = leads.filter(l => l.status === 'completed');
      const failedLeads = leads.filter(l => l.status === 'failed');

      const completedCalls = completedLeads.length + failedLeads.length;
      const successfulCalls = completedLeads.length;
      const failedCalls = failedLeads.length;

      // Calculate average duration from call logs
      const completedCallLogs = callLogs.filter(log => log.status === 'completed' && log.duration);
      const totalDuration = completedCallLogs.reduce((sum, log) => sum + (log.duration || 0), 0);
      const averageDuration = completedCallLogs.length > 0
        ? Math.round(totalDuration / completedCallLogs.length)
        : 0;
      
      return {
        ...campaign.toJSON(),
        knowledgeBase: campaign.knowledgeBase,
        totalLeads,
        completedCalls,
        successfulCalls,
        failedCalls,
        averageDuration
      };
    });

    res.json(campaignsWithRealStats);
  } catch (error) {
    console.error('Get campaigns error:', error);
    res.status(500).json({ error: 'Failed to fetch campaigns' });
  }
});

// Get single campaign
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const campaign = await Campaign.findOne({
      where: { 
        id: req.params.id,
        userId: req.user.id 
      },
      include: [
        { model: Lead, as: 'leads' },
        { model: KnowledgeBase, as: 'knowledgeBase' }
      ]
    });

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    res.json(campaign);
  } catch (error) {
    console.error('Get campaign error:', error);
    res.status(500).json({ error: 'Failed to fetch campaign' });
  }
});

// Get Campaign Details with Full Data
router.get('/:id/details', requireAuth, async (req, res) => {
  try {
    const campaignId = parseInt(req.params.id, 10);
    console.log(`🔍 [Campaign Details] Fetching details for campaign ${campaignId} by user ${req.user.id}`);

    const campaign = await Campaign.findOne({
      where: { 
        id: campaignId,
        userId: req.user.id 
      },
      include: [
        { model: KnowledgeBase, as: 'knowledgeBase' }
      ]
    });

    if (!campaign) {
      console.log(`❌ [Campaign Details] Campaign ${campaignId} not found for user ${req.user.id}`);
      return res.status(404).json({ error: 'Campaign not found' });
    }
    
    console.log(`✅ [Campaign Details] Campaign found: ${campaign.name}`);

    console.log(`🔍 [Campaign Details] Fetching leads for campaign ${campaignId}`);
    const leads = await Lead.findAll({ where: { campaignId } });
    console.log(`✅ [Campaign Details] Found ${leads.length} leads`);
    
    console.log(`🔍 [Campaign Details] Fetching call logs for campaign ${campaignId}`);
    const callLogs = await CallLog.findAll({ 
      where: { campaignId },
      order: [['created_at', 'DESC']]
    });
    console.log(`✅ [Campaign Details] Found ${callLogs.length} call logs`);
    
    // Debug: Log ElevenLabs conversation IDs for call logs (with error handling)
    try {
      console.log(`🔍 [Campaign Details] Call logs for campaign ${campaignId}:`);
      callLogs.forEach((log, index) => {
        console.log(`  ${index + 1}. ID: ${log.id}, Status: ${log.status}, ElevenLabs ID: ${log.elevenlabsConversationId || 'NULL'}`);
      });
    } catch (debugError) {
      console.error('Debug logging error:', debugError);
    }

    // Calculate real stats from actual data
    const totalLeads = leads.length;
    const completedLeads = leads.filter(l => l.status === 'completed');
    const failedLeads = leads.filter(l => l.status === 'failed');
    const pendingLeads = leads.filter(l => l.status === 'pending');
    const callingLeads = leads.filter(l => l.status === 'calling');

    const completedCalls = completedLeads.length + failedLeads.length;
    const successfulCalls = completedLeads.length;
    const failedCalls = failedLeads.length;

    // Calculate average duration from call logs
    const completedCallLogs = callLogs.filter(log => log.status === 'completed' && log.duration);
    const totalDuration = completedCallLogs.reduce((sum, log) => sum + (log.duration || 0), 0);
    const averageDuration = completedCallLogs.length > 0
      ? Math.round(totalDuration / completedCallLogs.length)
      : 0;
      
    const callLogsWithConversations = callLogs.filter(log => log.transcription);

    res.json({
      campaign: {
        ...campaign.toJSON(),
        totalLeads,
        completedCalls,
        successfulCalls,
        failedCalls
      },
      leads,
      callLogs,
      stats: {
        totalLeads,
        completed: completedLeads.length,
        failed: failedLeads.length,
        pending: pendingLeads.length,
        calling: callingLeads.length,
        averageDuration,
        conversationsWithAudio: callLogsWithConversations.length
      }
    });

  } catch (error) {
    console.error('Get campaign details error:', error);
    res.status(500).json({ error: 'Failed to fetch campaign details' });
  }
});

// Create new campaign
router.post('/', requireAuth, [
  body('name').notEmpty().trim(),
  body('firstPrompt').notEmpty().trim(),
  body('systemPersona').notEmpty().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed',
        errors: errors.array()
      });
    }

    const { name, firstPrompt, systemPersona, selectedVoiceId } = req.body;

    const campaign = await Campaign.create({
      name,
      firstPrompt,
      systemPersona,
      selectedVoiceId,
      userId: req.user.id
    });

    res.status(201).json(campaign);
  } catch (error) {
    console.error('Create campaign error:', error);
    res.status(500).json({ error: 'Failed to create campaign' });
  }
});

// Update campaign
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const campaign = await Campaign.findOne({
      where: { 
        id: req.params.id,
        userId: req.user.id 
      }
    });

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    // Check if campaign can be edited (must be draft with no completed calls)
    const canEdit = campaign.status === 'draft' && campaign.completedCalls === 0;
    
    if (!canEdit) {
      return res.status(400).json({ 
        error: 'Campaign cannot be edited',
        message: campaign.status !== 'draft' 
          ? 'Only draft campaigns can be edited' 
          : 'Cannot edit campaigns with completed calls'
      });
    }

    const { name, firstPrompt, systemPersona, selectedVoiceId, status } = req.body;
    const updateData = {};

    if (name !== undefined) updateData.name = name;
    if (firstPrompt !== undefined) updateData.firstPrompt = firstPrompt;
    if (systemPersona !== undefined) updateData.systemPersona = systemPersona;
    if (selectedVoiceId !== undefined) updateData.selectedVoiceId = selectedVoiceId;
    if (status !== undefined) updateData.status = status;

    await campaign.update(updateData);

    res.json(campaign);
  } catch (error) {
    console.error('Update campaign error:', error);
    res.status(500).json({ error: 'Failed to update campaign' });
  }
});

// Delete campaign
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const campaignId = parseInt(req.params.id, 10);

    // 1. Authentication & Ownership Check
    const campaign = await Campaign.findOne({
      where: { 
        id: campaignId,
        userId: req.user.id 
      }
    });

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    // 2. ElevenLabs Knowledge Base Cleanup
    const knowledgeBaseFiles = await KnowledgeBase.findAll({ where: { campaignId } });
    for (const kbFile of knowledgeBaseFiles) {
      if (kbFile.elevenlabsDocId) {
        await elevenlabsService.deleteKnowledgeBase(kbFile.elevenlabsDocId);
      }
    }
    // Clear agent's knowledge base as a final cleanup step
    if (elevenlabsService.agentId) {
      await elevenlabsService.updateAgentKnowledgeBase(elevenlabsService.agentId, []);
    }
    
    // 3. Database Deletion (in specific order)
    await CallLog.destroy({ where: { campaignId } });
    await Lead.destroy({ where: { campaignId } });
    await KnowledgeBase.destroy({ where: { campaignId } });

    // Finally, delete the campaign itself
    await campaign.destroy();

    // 4. Deletion Verification
    const verifyDeleted = await Campaign.findByPk(campaignId);
    if (verifyDeleted) {
      console.error(`[Delete Campaign] Deletion failed - campaign ${campaignId} still exists.`);
      return res.status(500).json({ error: "Failed to delete campaign" });
    }

    res.json({ message: 'Campaign and all associated data deleted successfully' });
  } catch (error) {
    console.error('Delete campaign error:', error);
    res.status(500).json({ error: 'Failed to delete campaign' });
  }
});

// Start campaign
router.post('/:id/start', requireAuth, async (req, res) => {
  try {
    const campaign = await Campaign.findOne({
      where: { 
        id: req.params.id,
        userId: req.user.id 
      }
    });

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    await campaign.update({ status: 'active' });

    // TODO: Implement actual campaign starting logic
    // This would involve starting the calling process with ElevenLabs

    res.json({ message: 'Campaign started successfully' });
  } catch (error) {
    console.error('Start campaign error:', error);
    res.status(500).json({ error: 'Failed to start campaign' });
  }
});

// Make an outbound call (test call)
router.post('/make-outbound-call', requireAuth, async (req, res) => {
  console.log('🚀 MAKE OUTBOUND CALL ENDPOINT HIT');
  try {
    console.log('🔥 TEST CALL REQUEST RECEIVED AT ENDPOINT');
    console.log('🔥 REQUEST BODY:', JSON.stringify(req.body, null, 2));
    console.log('🔥 REQUEST HEADERS:', JSON.stringify(req.headers, null, 2));
    console.log('🔥 USER AUTH:', req.user ? 'AUTHENTICATED' : 'NOT AUTHENTICATED');

    const { phoneNumber, campaignId, firstName } = req.body;
    console.log('📞 REQUEST DATA:', { phoneNumber, campaignId, firstName });

    if (!phoneNumber) {
      console.log('❌ No phone number provided');
      return res.status(400).json({ error: 'Phone number is required' });
    }

    // Validate and format phone number
    let cleanPhone = phoneNumber.replace(/[^+\d]/g, '');
    console.log('Original phone:', phoneNumber, 'Cleaned phone:', cleanPhone, 'Length:', cleanPhone.length);

    // If phone number doesn't start with +, assume it's missing country code
    if (!cleanPhone.startsWith('+')) {
      // Try to add +1 for US numbers or ask for proper format
      if (cleanPhone.length === 10) {
        // Assume US number
        cleanPhone = '+1' + cleanPhone;
        console.log('Added +1 prefix, new phone:', cleanPhone);
      } else if (cleanPhone.length === 11 && cleanPhone.startsWith('1')) {
        // US number with country code but no +
        cleanPhone = '+' + cleanPhone;
        console.log('Added + prefix, new phone:', cleanPhone);
      } else {
        console.log('Phone number format invalid - missing country code');
        return res.status(400).json({
          error: 'Invalid phone number format. Please include country code (e.g., +1 for US, +971 for UAE, +44 for UK)'
        });
      }
    }

    // Final validation for international format
    if (!cleanPhone.match(/^\+[\d]{10,15}$/)) {
      console.log('Final phone validation failed:', cleanPhone);
      return res.status(400).json({
        error: 'Invalid phone number format. Use international format like +971xxxxxxxx or +15551234567'
      });
    }

    // Fetch campaign if provided
    let campaign = null;
    if (campaignId && campaignId !== 'undefined' && campaignId !== 'null') {
      const campaignIdNum = parseInt(campaignId);
      console.log('Looking for campaign:', campaignId, 'type:', typeof campaignId, 'parsed:', campaignIdNum, 'for user:', req.user.id);

      if (isNaN(campaignIdNum)) {
        console.log('❌ Invalid campaignId format:', campaignId);
        return res.status(400).json({ error: 'Invalid campaign ID format' });
      }

      campaign = await Campaign.findOne({
        where: { id: campaignIdNum, userId: req.user.id }
      });
      if (!campaign) {
        console.log('❌ Campaign not found:', campaignIdNum);
        return res.status(404).json({ error: 'Campaign not found' });
      }
      console.log('✅ Campaign found:', campaign.name);
    } else {
      console.log('⚠️ No valid campaignId provided - this is a test call without campaign');
    }

    // Create call log entry
    const callLog = await CallLog.create({
      campaignId: campaignId ? parseInt(campaignId) : null,
      leadId: null, // Test call, no specific lead
      status: 'initiated',
      twilioCallSid: null,
      elevenlabsConversationId: null,
      duration: null,
      transcription: null,
      userId: req.user.id
    });

    // Initialize Twilio client
    const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
    const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
    const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

    console.log('Twilio config check:', {
      hasAccountSid: !!twilioAccountSid,
      hasAuthToken: !!twilioAuthToken,
      hasPhoneNumber: !!twilioPhoneNumber
    });

    if (!twilioAccountSid || !twilioAuthToken || !twilioPhoneNumber) {
      console.log('Twilio not configured');
      return res.status(500).json({ error: 'Twilio not configured on server' });
    }

    const twilio = (await import('twilio')).default;
    const twilioClient = twilio(twilioAccountSid, twilioAuthToken);

    // Build TwiML URL for the call
    const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 8000}`;
    const secureBaseUrl = baseUrl.replace(/^http:/, 'https:');

    const twimlUrl = new URL(`${secureBaseUrl}/outbound-call-twiml`);
    twimlUrl.searchParams.append('callLogId', callLog.id.toString());
    twimlUrl.searchParams.append('firstName', firstName || 'there');
    twimlUrl.searchParams.append('isTestCall', 'true');
    twimlUrl.searchParams.append('useElevenLabs', 'true');
    if (campaignId) {
      twimlUrl.searchParams.append('campaignId', parseInt(campaignId).toString());
    }

    console.log('Base URL:', baseUrl);
    console.log('Secure base URL:', secureBaseUrl);
    console.log('Initiating test call to:', cleanPhone);
    console.log('TwiML URL:', twimlUrl.toString());

    // Place the call
    console.log('Creating Twilio call with params:', {
      to: cleanPhone,
      from: twilioPhoneNumber,
      url: twimlUrl.toString(),
      statusCallback: `${secureBaseUrl}/api/twilio/status`
    });

    let call;
    try {
      call = await twilioClient.calls.create({
        to: cleanPhone,
        from: twilioPhoneNumber,
        url: twimlUrl.toString(),
        statusCallback: `${secureBaseUrl}/api/twilio/status`,
        statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
        method: 'POST',
        record: true
      });

      console.log('Twilio call created:', call.sid);

      // Update call log with Twilio SID
      await callLog.update({
        twilioCallSid: call.sid,
        status: 'ringing'
      });

      console.log('Call initiated successfully:', call.sid);
    } catch (twilioError) {
      console.error('Twilio call creation failed:', twilioError);
      return res.status(500).json({ error: `Twilio error: ${twilioError.message}` });
    }

    res.json({
      success: true,
      message: 'Test call initiated successfully',
      callSid: call.sid,
      callLogId: callLog.id,
      status: 'initiated'
    });

  } catch (error) {
    console.error('Make outbound call error:', error);
    res.status(500).json({ error: error.message || 'Failed to make outbound call' });
  }
});

// Debug endpoint to check call logs
router.get('/debug/call-logs', requireAuth, async (req, res) => {
  try {
    const callLogs = await CallLog.findAll({
      where: { userId: req.user.id },
      order: [['created_at', 'DESC']],
      limit: 10,
      attributes: ['id', 'campaignId', 'status', 'twilioCallSid', 'elevenlabsConversationId', 'created_at']
    });
    
    console.log('🔍 Recent call logs for user:', req.user.id);
    callLogs.forEach(log => {
      console.log(`  ID: ${log.id}, ElevenLabs ID: ${log.elevenlabsConversationId}, Status: ${log.status}`);
    });
    
    res.json({
      total: callLogs.length,
      callLogs: callLogs.map(log => ({
        id: log.id,
        campaignId: log.campaignId,
        status: log.status,
        twilioCallSid: log.twilioCallSid,
        elevenlabsConversationId: log.elevenlabsConversationId,
        hasElevenLabsId: !!log.elevenlabsConversationId,
        createdAt: log.created_at
      }))
    });
  } catch (error) {
    console.error('Debug call logs error:', error);
    res.status(500).json({ error: 'Failed to fetch call logs' });
  }
});

// Update agent configuration
router.put('/:id/update-agent', requireAuth, async (req, res) => {
  try {
    const { systemPersona, firstPrompt, selectedVoiceId, knowledgeBaseIds } = req.body;

    const campaign = await Campaign.findOne({
      where: {
        id: req.params.id,
        userId: req.user.id
      }
    });

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    const updateData = {};
    if (firstPrompt) updateData.firstPrompt = firstPrompt;
    if (systemPersona) updateData.systemPersona = systemPersona;
    if (selectedVoiceId) updateData.selectedVoiceId = selectedVoiceId;

    await campaign.update(updateData);

    // Propagate to ElevenLabs agent if configured
    try {
      const agentId = process.env.ELEVENLABS_AGENT_ID || elevenlabsService.agentId;
      if (agentId) {
        // Update knowledge base on agent if IDs provided
        if (Array.isArray(knowledgeBaseIds)) {
          await elevenlabsService.updateAgentKnowledgeBase(agentId, knowledgeBaseIds);
        }
        // Optionally you can extend elevenlabsService to update persona/voice
        // For now, knowledge base updates are handled and persona/voice flow is used at call time
      }
    } catch (err) {
      console.warn('Warning: Failed to update ElevenLabs agent config:', err?.message || err);
    }

    res.json({ message: 'Agent updated successfully', campaign });
  } catch (error) {
    console.error('Update agent error:', error);
    res.status(500).json({ error: 'Failed to update agent' });
  }
});

// Delete leads for campaign
router.delete('/:id/leads', requireAuth, async (req, res) => {
  try {
    const campaign = await Campaign.findOne({
      where: { 
        id: req.params.id,
        userId: req.user.id 
      }
    });

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    await Lead.destroy({
      where: { campaignId: campaign.id }
    });

    // Reset campaign stats
    await campaign.update({
      totalLeads: 0,
      completedCalls: 0,
      successfulCalls: 0,
      failedCalls: 0
    });

    res.json({ message: 'Leads deleted successfully' });
  } catch (error) {
    console.error('Delete leads error:', error);
    res.status(500).json({ error: 'Failed to delete leads' });
  }
});

export default router;
