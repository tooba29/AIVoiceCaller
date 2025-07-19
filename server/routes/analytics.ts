import type { Express, Request, Response } from "express";
import { requireAuth } from "../auth.js";
import { storage } from "../storage.js";

interface AuthenticatedRequest extends Request {
  user?: any;
}

export function registerAnalyticsRoutes(app: Express): void {
  
  // Get Call Volume Chart Data
  app.get("/api/analytics/call-volume", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      const timeRange = req.query.timeRange as string || "7d";
      
      // Get user's campaigns
      const campaigns = await storage.getAllCampaigns(userId);
      
      // Get call logs for all user campaigns
      let userCallLogs: any[] = [];
      for (const campaign of campaigns) {
        const campaignCallLogs = await storage.getCallLogsByCampaign(campaign.id);
        userCallLogs.push(...campaignCallLogs);
      }

      // Calculate date range
      const endDate = new Date();
      let startDate = new Date();
      let dateFormat = '';
      
      switch (timeRange) {
        case '24h':
          startDate.setHours(startDate.getHours() - 24);
          dateFormat = 'hour';
          break;
        case '7d':
          startDate.setDate(startDate.getDate() - 7);
          dateFormat = 'day';
          break;
        case '30d':
          startDate.setDate(startDate.getDate() - 30);
          dateFormat = 'day';
          break;
        case '90d':
          startDate.setDate(startDate.getDate() - 90);
          dateFormat = 'week';
          break;
        default:
          startDate.setDate(startDate.getDate() - 7);
          dateFormat = 'day';
      }

      // Filter call logs within time range
      const filteredCallLogs = userCallLogs.filter(log => {
        if (!log.createdAt) return false;
        const callDate = new Date(log.createdAt);
        return callDate >= startDate && callDate <= endDate;
      });

      // Group by time period
      const callVolumeData: any[] = [];
      
      if (dateFormat === 'hour') {
        // Group by hours for 24h view
        for (let i = 23; i >= 0; i--) {
          const hour = new Date();
          hour.setHours(hour.getHours() - i, 0, 0, 0);
          
          const hourCalls = filteredCallLogs.filter(log => {
            const callDate = new Date(log.createdAt);
            return callDate.getHours() === hour.getHours() && 
                   callDate.toDateString() === hour.toDateString();
          });

          callVolumeData.push({
            date: hour.toISOString(),
            period: hour.toLocaleTimeString('en-US', { hour: '2-digit', hour12: true }),
            calls: hourCalls.length,
            successful: hourCalls.filter(log => log.status === 'completed' && log.elevenLabsConversationId).length,
            failed: hourCalls.filter(log => log.status === 'failed' || log.status === 'busy' || log.status === 'no-answer').length
          });
        }
      } else if (dateFormat === 'day') {
        // Group by days
        const days = timeRange === '7d' ? 7 : 30;
        for (let i = days - 1; i >= 0; i--) {
          const day = new Date();
          day.setDate(day.getDate() - i);
          day.setHours(0, 0, 0, 0);
          
          const dayCalls = filteredCallLogs.filter(log => {
            const callDate = new Date(log.createdAt);
            callDate.setHours(0, 0, 0, 0);
            return callDate.getTime() === day.getTime();
          });

          callVolumeData.push({
            date: day.toISOString(),
            period: day.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            calls: dayCalls.length,
            successful: dayCalls.filter(log => log.status === 'completed' && log.elevenLabsConversationId).length,
            failed: dayCalls.filter(log => log.status === 'failed' || log.status === 'busy' || log.status === 'no-answer').length
          });
        }
      } else if (dateFormat === 'week') {
        // Group by weeks for 90d view
        for (let i = 12; i >= 0; i--) {
          const weekStart = new Date();
          weekStart.setDate(weekStart.getDate() - (i * 7));
          weekStart.setHours(0, 0, 0, 0);
          
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekEnd.getDate() + 6);
          weekEnd.setHours(23, 59, 59, 999);
          
          const weekCalls = filteredCallLogs.filter(log => {
            const callDate = new Date(log.createdAt);
            return callDate >= weekStart && callDate <= weekEnd;
          });

          callVolumeData.push({
            date: weekStart.toISOString(),
            period: `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
            calls: weekCalls.length,
            successful: weekCalls.filter(log => log.status === 'completed' && log.elevenLabsConversationId).length,
            failed: weekCalls.filter(log => log.status === 'failed' || log.status === 'busy' || log.status === 'no-answer').length
          });
        }
      }

      res.json({ data: callVolumeData });
    } catch (error) {
      console.error('Call volume analytics error:', error);
      res.status(500).json({ error: "Failed to fetch call volume data" });
    }
  });

  // Get Success Rate Trend Data
  app.get("/api/analytics/success-rate", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      const timeRange = req.query.timeRange as string || "7d";
      
      // Get user's campaigns
      const campaigns = await storage.getAllCampaigns(userId);
      
      // Get call logs for all user campaigns
      let userCallLogs: any[] = [];
      for (const campaign of campaigns) {
        const campaignCallLogs = await storage.getCallLogsByCampaign(campaign.id);
        userCallLogs.push(...campaignCallLogs);
      }

      // Calculate date range
      const endDate = new Date();
      let startDate = new Date();
      let dateFormat = '';
      
      switch (timeRange) {
        case '24h':
          startDate.setHours(startDate.getHours() - 24);
          dateFormat = 'hour';
          break;
        case '7d':
          startDate.setDate(startDate.getDate() - 7);
          dateFormat = 'day';
          break;
        case '30d':
          startDate.setDate(startDate.getDate() - 30);
          dateFormat = 'day';
          break;
        case '90d':
          startDate.setDate(startDate.getDate() - 90);
          dateFormat = 'week';
          break;
        default:
          startDate.setDate(startDate.getDate() - 7);
          dateFormat = 'day';
      }

      // Filter call logs within time range
      const filteredCallLogs = userCallLogs.filter(log => {
        if (!log.createdAt) return false;
        const callDate = new Date(log.createdAt);
        return callDate >= startDate && callDate <= endDate;
      });

      // Group by time period and calculate success rates
      const successRateData: any[] = [];
      
      if (dateFormat === 'day') {
        const days = timeRange === '7d' ? 7 : 30;
        for (let i = days - 1; i >= 0; i--) {
          const day = new Date();
          day.setDate(day.getDate() - i);
          day.setHours(0, 0, 0, 0);
          
          const dayCalls = filteredCallLogs.filter(log => {
            const callDate = new Date(log.createdAt);
            callDate.setHours(0, 0, 0, 0);
            return callDate.getTime() === day.getTime();
          });

          const successful = dayCalls.filter(log => log.status === 'completed' && log.elevenLabsConversationId).length;
          const total = dayCalls.length;
          const successRate = total > 0 ? Math.round((successful / total) * 100) : 0;

          successRateData.push({
            date: day.toISOString(),
            period: day.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            successRate,
            successful,
            total
          });
        }
      }

      res.json({ data: successRateData });
    } catch (error) {
      console.error('Success rate analytics error:', error);
      res.status(500).json({ error: "Failed to fetch success rate data" });
    }
  });
  
  // Get Dashboard Analytics
  app.get("/api/analytics/dashboard", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ error: "User not authenticated" });
      }
      
      // Calculate analytics from local data - SECURE: only user's campaigns
      const campaigns = await storage.getAllCampaigns(userId);
      
      // SECURITY FIX: Get call logs only for user's campaigns
      let userCallLogs: any[] = [];
      for (const campaign of campaigns) {
        const campaignCallLogs = await storage.getCallLogsByCampaign(campaign.id);
        userCallLogs.push(...campaignCallLogs);
      }
      
      // Calculate today's calls
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayCallLogs = userCallLogs.filter(log => {
        if (!log.createdAt) return false;
        const callDate = new Date(log.createdAt);
        return callDate >= today;
      });
      
      // Calculate metrics
      const activeCampaigns = campaigns.filter(c => c.status === 'active').length;
      const callsToday = todayCallLogs.length;
      const successfulCalls = userCallLogs.filter(log => log.status === 'completed').length;
      const totalCalls = userCallLogs.length;
      const successRate = totalCalls > 0 ? (successfulCalls / totalCalls) : 0;
      const totalMinutes = userCallLogs.reduce((sum, log) => sum + (log.duration || 0), 0);

      const analyticsData = {
        charts: [
          { name: "calls_today", type: "call_success", data: callsToday },
          { name: "active_campaigns", type: "active_campaigns", data: activeCampaigns },
          { name: "success_rate", type: "success_rate", data: successRate },
          { name: "total_minutes", type: "total_minutes", data: Math.round(totalMinutes / 60) }
        ]
      };

      res.json(analyticsData);
    } catch (error) {
      console.error('Analytics fetch error:', error);
      
      // Return default analytics if there's an error
      const defaultAnalytics = {
        charts: [
          { name: "calls_today", type: "call_success", data: 0 },
          { name: "active_campaigns", type: "active_campaigns", data: 0 },
          { name: "success_rate", type: "success_rate", data: 0 },
          { name: "total_minutes", type: "total_minutes", data: 0 }
        ]
      };
      
      res.json(defaultAnalytics);
    }
  });

  // Update Dashboard Settings
  app.patch("/api/analytics/dashboard/settings", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { charts } = req.body;
      
      if (!Array.isArray(charts)) {
        return res.status(400).json({
          error: "Invalid request format. 'charts' must be an array."
        });
      }

      // For now, we'll just return success since the frontend handles settings locally
      // In the future, this could save user preferences to the database
      res.json({ 
        success: true, 
        message: "Dashboard settings updated successfully",
        charts 
      });
    } catch (error) {
      console.error('Dashboard settings update error:', error);
      res.status(500).json({ 
        error: "Failed to update dashboard settings" 
      });
    }
  });
} 