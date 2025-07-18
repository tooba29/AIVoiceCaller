import type { Express, Request, Response } from "express";
import { requireAuth } from "../auth.js";
import { storage } from "../storage.js";

interface AuthenticatedRequest extends Request {
  user?: any;
}

export function registerAnalyticsRoutes(app: Express): void {
  
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