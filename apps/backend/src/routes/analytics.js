import express from 'express';
import { Campaign, Lead } from '../models/index.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// Get dashboard analytics
router.get('/dashboard', requireAuth, async (req, res) => {
  try {
    const campaigns = await Campaign.findAll({
      where: { userId: req.user.id },
      include: [
        {
          model: Lead,
          as: 'leads',
          attributes: ['id', 'status', 'callDuration', 'createdAt']
        }
      ]
    });

    // Calculate analytics
    const activeCampaigns = campaigns.filter(c => c.status === 'active').length;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const callsToday = campaigns.reduce((total, campaign) => {
      return total + campaign.leads.filter(lead => {
        const leadDate = new Date(lead.createdAt);
        leadDate.setHours(0, 0, 0, 0);
        return leadDate.getTime() === today.getTime() && lead.status !== 'pending';
      }).length;
    }, 0);

    const totalCalls = campaigns.reduce((total, campaign) => {
      return total + campaign.leads.filter(lead => lead.status !== 'pending').length;
    }, 0);

    const successfulCalls = campaigns.reduce((total, campaign) => {
      return total + campaign.leads.filter(lead => lead.status === 'completed').length;
    }, 0);

    const successRate = totalCalls > 0 ? successfulCalls / totalCalls : 0;

    const totalMinutes = campaigns.reduce((total, campaign) => {
      return total + campaign.leads.reduce((campaignTotal, lead) => {
        return campaignTotal + (lead.callDuration || 0);
      }, 0);
    }, 0);

    const analytics = {
      charts: [
        {
          name: 'active_campaigns',
          type: 'number',
          data: activeCampaigns
        },
        {
          name: 'calls_today',
          type: 'number',
          data: callsToday
        },
        {
          name: 'success_rate',
          type: 'percentage',
          data: successRate
        },
        {
          name: 'total_minutes',
          type: 'number',
          data: Math.round(totalMinutes / 60) // Convert to minutes
        }
      ]
    };

    res.json(analytics);
  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

// Update dashboard settings
router.patch('/dashboard/settings', requireAuth, async (req, res) => {
  try {
    const { charts } = req.body;

    // TODO: Save dashboard settings to user preferences
    // For now, just return success

    res.json({ 
      message: 'Dashboard settings updated successfully',
      charts 
    });
  } catch (error) {
    console.error('Update dashboard settings error:', error);
    res.status(500).json({ error: 'Failed to update dashboard settings' });
  }
});

export default router;
