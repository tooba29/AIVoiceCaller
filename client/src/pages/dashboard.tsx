import { useState, useEffect } from "react";
import Sidebar from "@/components/sidebar";
import StatsOverview from "@/components/stats-overview";
import CampaignSetup from "@/components/campaign-setup";
import VoiceSelection from "@/components/voice-selection";
import LeadsUpload from "@/components/leads-upload";
import CampaignActions from "@/components/campaign-actions";
import CampaignSelector from "@/components/campaign-selector";
import DashboardSettings from "@/components/dashboard-settings";
import { Button } from "@/components/ui/button";
import { 
  Bell, 
  Settings2, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Trash2,
  Target,
  Bot,
  Mic2,
  Users,
  Rocket
} from "lucide-react";
import { api } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

// Notification types
interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  timestamp: Date;
  read: boolean;
  campaignId?: number;
  campaignName?: string;
}

export default function Dashboard() {
  const [currentCampaign, setCurrentCampaign] = useState<any>(null);
  const [selectedVoiceId, setSelectedVoiceId] = useState<string>("");
  const [uploadedLeads, setUploadedLeads] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [lastCampaignCheck, setLastCampaignCheck] = useState<any>(null);

  // Get real campaigns data for notifications
  const { data: campaignsData } = useQuery({
    queryKey: ["/api/campaigns"],
    queryFn: () => api.getCampaigns(),
    refetchInterval: 10000, // Check every 10 seconds for updates
  });

  // Generate real notifications based on campaign data changes
  useEffect(() => {
    if (!campaignsData?.campaigns || !lastCampaignCheck) {
      if (campaignsData?.campaigns) {
        setLastCampaignCheck(campaignsData.campaigns);
      }
      return;
    }

    const currentCampaigns = campaignsData.campaigns;
    const previousCampaigns = lastCampaignCheck;

    // Compare campaigns and generate notifications for real changes
    currentCampaigns.forEach((current: any) => {
      const previous = previousCampaigns.find((p: any) => p.id === current.id);
      
      if (!previous) {
        // New campaign created
        addNotification({
          title: 'New Campaign Created',
          message: `Campaign "${current.name}" has been created`,
          type: 'info',
          campaignId: current.id,
          campaignName: current.name
        });
        return;
      }

      // Check for status changes
      if (previous.status !== current.status) {
        let title = '';
        let message = '';
        let type: 'success' | 'error' | 'warning' | 'info' = 'info';

        switch (current.status) {
          case 'active':
          case 'running':
            title = 'Campaign Started';
            message = `Campaign "${current.name}" is now active and making calls`;
            type = 'success';
            break;
          case 'completed':
            title = 'Campaign Completed';
            message = `Campaign "${current.name}" has finished all calls`;
            type = 'success';
            break;
          case 'paused':
            title = 'Campaign Paused';
            message = `Campaign "${current.name}" has been paused`;
            type = 'warning';
            break;
          case 'failed':
            title = 'Campaign Failed';
            message = `Campaign "${current.name}" encountered an error`;
            type = 'error';
            break;
        }

        if (title) {
          addNotification({
            title,
            message,
            type,
            campaignId: current.id,
            campaignName: current.name
          });
        }
      }

      // Check for call completions
      if ((current.completedCalls || 0) > (previous.completedCalls || 0)) {
        const newCalls = (current.completedCalls || 0) - (previous.completedCalls || 0);
        addNotification({
          title: 'Calls Completed',
          message: `${newCalls} new call${newCalls > 1 ? 's' : ''} completed for "${current.name}"`,
          type: 'info',
          campaignId: current.id,
          campaignName: current.name
        });
      }

      // Check for successful calls
      if ((current.successfulCalls || 0) > (previous.successfulCalls || 0)) {
        const newSuccesses = (current.successfulCalls || 0) - (previous.successfulCalls || 0);
        if (newSuccesses > 0) {
          addNotification({
            title: 'Successful Calls',
            message: `${newSuccesses} successful call${newSuccesses > 1 ? 's' : ''} for "${current.name}"`,
            type: 'success',
            campaignId: current.id,
            campaignName: current.name
          });
        }
      }

      // Check for failed calls (only if significant)
      if ((current.failedCalls || 0) > (previous.failedCalls || 0) + 2) {
        const newFailures = (current.failedCalls || 0) - (previous.failedCalls || 0);
        addNotification({
          title: 'Call Failures',
          message: `${newFailures} calls failed for "${current.name}" - please review`,
          type: 'error',
          campaignId: current.id,
          campaignName: current.name
        });
      }
    });

    setLastCampaignCheck(currentCampaigns);
  }, [campaignsData]);

  // Initialize with some default notifications if none exist
  useEffect(() => {
    if (notifications.length === 0 && campaignsData?.campaigns?.length > 0) {
      const recentCampaigns = campaignsData.campaigns
        .filter((c: any) => c.completedCalls > 0)
        .slice(0, 3);

      const initialNotifications: Notification[] = recentCampaigns.map((campaign: any, index: number) => ({
        id: `init-${campaign.id}`,
        title: campaign.status === 'completed' ? 'Campaign Complete' : 'Campaign Update',
        message: campaign.status === 'completed' 
          ? `Campaign "${campaign.name}" completed with ${campaign.successfulCalls}/${campaign.completedCalls} successful calls`
          : `Campaign "${campaign.name}" has made ${campaign.completedCalls} calls so far`,
        type: campaign.status === 'completed' ? 'success' : 'info',
        timestamp: new Date(Date.now() - (index + 1) * 1000 * 60 * 30), // Stagger timestamps
        read: index > 0, // First one unread
        campaignId: campaign.id,
        campaignName: campaign.name
      }));

      if (initialNotifications.length > 0) {
        setNotifications(initialNotifications);
      }
    }
  }, [campaignsData, notifications.length]);

  // Count unread notifications
  const unreadCount = notifications.filter(n => !n.read).length;

  const handleCampaignUpdate = (campaign: any) => {
    setCurrentCampaign(campaign);
    // Reset leads when switching campaigns
    setUploadedLeads([]);
    
    // Add notification for campaign selection
    addNotification({
      title: 'Campaign Selected',
      message: `Now working on "${campaign.name}"`,
      type: 'info',
      campaignId: campaign.id,
      campaignName: campaign.name
    });
  };

  const handleVoiceSelect = (voiceId: string) => {
    setSelectedVoiceId(voiceId);
  };

  const handleLeadsUpload = (leads: any[]) => {
    setUploadedLeads(leads);
    
    // Add notification for leads upload
    addNotification({
      title: 'Leads Uploaded',
      message: `Successfully uploaded ${leads.length} leads to ${currentCampaign?.name}`,
      type: 'success',
      campaignId: currentCampaign?.id,
      campaignName: currentCampaign?.name
    });
  };

  // Function to add new notifications
  const addNotification = (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    const newNotification: Notification = {
      ...notification,
      id: Date.now().toString(),
      timestamp: new Date(),
      read: false
    };
    
    setNotifications(prev => [newNotification, ...prev].slice(0, 50)); // Keep max 50 notifications
  };

  // Mark notification as read
  const markAsRead = (notificationId: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
    );
  };

  // Mark all as read
  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  // Delete notification
  const deleteNotification = (notificationId: string) => {
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
  };

  // Clear all notifications
  const clearAllNotifications = () => {
    setNotifications([]);
  };

  // Get notification icon
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'warning': return <Clock className="h-4 w-4 text-yellow-500" />;
      default: return <Bell className="h-4 w-4 text-blue-500" />;
    }
  };

  // Format timestamp
  const formatTimestamp = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  // Load leads when campaign changes
  useEffect(() => {
    if (currentCampaign?.id) {
      // Fetch existing leads for the selected campaign
      fetch(`/api/campaigns/${currentCampaign.id}/leads`, {
        credentials: 'include'
      })
      .then(response => response.json())
      .then(leads => {
        if (Array.isArray(leads)) {
          setUploadedLeads(leads);
        }
      })
      .catch(error => {
        console.error('Failed to fetch leads:', error);
        setUploadedLeads([]);
      });
    } else {
      setUploadedLeads([]);
    }
  }, [currentCampaign?.id]);

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-gradient-to-r from-white/90 via-blue-50/80 to-purple-50/60 backdrop-blur-xl border-b border-white/20 px-8 py-6 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-4xl font-bold text-gradient mb-2">
                Dashboard
              </h2>
              <p className="text-muted-foreground/80 text-lg">Welcome back! Manage your AI voice campaigns</p>
            </div>
            <div className="flex items-center space-x-4">
              {/* Notifications */}
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" size="icon" className="relative glass-card border-gradient hover-lift">
                    <Bell className="h-5 w-5" />
                    {notifications.filter(n => !n.read).length > 0 && (
                      <span className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-r from-red-500 to-pink-500 rounded-full text-xs text-white flex items-center justify-center font-bold shadow-lg">
                        {notifications.filter(n => !n.read).length}
                      </span>
                    )}
                  </Button>
                </SheetTrigger>
                <SheetContent className="glass-card border-gradient">
                  <SheetHeader>
                    <SheetTitle className="text-gradient">Notifications</SheetTitle>
                  </SheetHeader>
                  <div className="mt-6">
                    {notifications.length === 0 ? (
                      <div className="p-4 text-center text-muted-foreground">
                        <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p>No notifications</p>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {notifications.map((notification) => (
                          <Card 
                            key={notification.id} 
                            className={`m-2 cursor-pointer transition-all hover:shadow-md ${
                              !notification.read ? 'border-primary/50 bg-primary/5' : 'border-border'
                            }`}
                            onClick={() => !notification.read && markAsRead(notification.id)}
                          >
                            <CardContent className="p-3">
                              <div className="flex items-start space-x-3">
                                <div className="mt-0.5">
                                  {getNotificationIcon(notification.type)}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between">
                                    <h4 className={`text-sm font-medium truncate ${
                                      !notification.read ? 'text-foreground' : 'text-muted-foreground'
                                    }`}>
                                      {notification.title}
                                    </h4>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        deleteNotification(notification.id);
                                      }}
                                      className="h-6 w-6 p-0 hover:bg-red-100 hover:text-red-600"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </div>
                                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                    {notification.message}
                                  </p>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {formatTimestamp(notification.timestamp)}
                                  </p>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                    
                    {notifications.length > 0 && (
                      <div className="flex items-center justify-between p-4 border-t">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={markAllAsRead}
                          className="text-xs"
                        >
                          Mark all read
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={clearAllNotifications}
                          className="text-xs text-red-500 hover:text-red-700"
                        >
                          Clear all
                        </Button>
                      </div>
                    )}
                  </div>
                </SheetContent>
              </Sheet>

              {/* Dashboard Settings */}
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" size="icon" className="glass-card border-gradient hover-lift">
                    <Settings2 className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent className="glass-card border-gradient">
                  <SheetHeader>
                    <SheetTitle className="text-gradient">Dashboard Settings</SheetTitle>
                  </SheetHeader>
                  <DashboardSettings />
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-8 bg-gradient-to-br from-slate-50/50 via-blue-50/30 to-indigo-50/20">
          <div className="max-w-7xl mx-auto space-y-8">
            
            {/* Stats Overview */}
            <div className="bg-gradient-to-br from-white/80 via-blue-50/40 to-purple-50/30 backdrop-blur-sm border border-white/60 rounded-3xl p-8 shadow-xl hover:shadow-2xl transition-all duration-500">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-gradient">Campaign Statistics</h3>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full animate-pulse"></div>
                  <span className="text-sm text-muted-foreground font-medium">Live Data</span>
                </div>
              </div>
              <StatsOverview />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
              
              {/* Campaign Management */}
              <div className="xl:col-span-2 space-y-8">
                
                {!currentCampaign ? (
                  /* Campaign Selector - Show only when no campaign is selected */
                  <div className="card-gradient rounded-3xl p-8 hover-lift border-gradient">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-2xl font-bold text-gradient flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg">
                          <Target className="h-5 w-5 text-white" />
                        </div>
                        <span>Campaign Management</span>
                      </h3>
                    </div>
                    <CampaignSelector onCampaignSelect={handleCampaignUpdate} />
                  </div>
                ) : (
                  /* Campaign Settings - Show when campaign is selected */
                  <>
                    <div className="card-gradient rounded-3xl p-8 hover-lift border-gradient">
                      <div className="flex items-center justify-between mb-6">
                        <h3 className="text-2xl font-bold text-gradient flex items-center space-x-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center shadow-lg">
                            <Bot className="h-5 w-5 text-white" />
                          </div>
                          <span>Campaign: {currentCampaign.name}</span>
                        </h3>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentCampaign(null)}
                          className="glass-card border-gradient hover-lift"
                        >
                          <Target className="h-4 w-4 mr-2" />
                          Change Campaign
                        </Button>
                      </div>
                      <CampaignSetup 
                        campaign={currentCampaign} 
                        onCampaignUpdate={handleCampaignUpdate}
                      />
                    </div>
                  </>
                )}
              </div>

              {/* Side Panel */}
              <div className="space-y-8">
                
                {/* Voice Selection */}
                {currentCampaign && (
                  <div className="card-gradient rounded-3xl p-6 hover-lift border-gradient">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-xl font-bold text-gradient flex items-center space-x-2">
                        <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-500 rounded-lg flex items-center justify-center shadow-md">
                          <Mic2 className="h-4 w-4 text-white" />
                        </div>
                        <span>Voice Selection</span>
                      </h3>
                    </div>
                    <VoiceSelection 
                      selectedVoiceId={selectedVoiceId}
                      onVoiceSelect={handleVoiceSelect}
                    />
                  </div>
                )}

                {/* Leads Upload */}
                {currentCampaign && (
                  <div className="card-gradient rounded-3xl p-6 hover-lift border-gradient">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-xl font-bold text-gradient flex items-center space-x-2">
                        <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-red-500 rounded-lg flex items-center justify-center shadow-md">
                          <Users className="h-4 w-4 text-white" />
                        </div>
                        <span>Leads Management</span>
                      </h3>
                    </div>
                    <LeadsUpload 
                      campaignId={currentCampaign?.id}
                      onLeadsUpload={handleLeadsUpload}
                      uploadedLeads={uploadedLeads}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Test & Launch */}
            {currentCampaign && (
              <div className="card-gradient rounded-3xl p-8 hover-lift border-gradient">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-2xl font-bold text-gradient flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center shadow-lg">
                      <Rocket className="h-5 w-5 text-white" />
                    </div>
                    <span>Campaign Launch</span>
                  </h3>
                </div>
                <CampaignActions 
                  campaign={currentCampaign}
                  selectedVoiceId={selectedVoiceId}
                  uploadedLeads={uploadedLeads}
                />
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
