import { useState, useRef, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  ArrowLeft, 
  Play, 
  Pause, 
  Volume2, 
  Download,
  Phone,
  Clock,
  Users,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
  Eye,
  MessageSquare
} from "lucide-react";
import { api, type CampaignDetailsResponse } from "@/lib/api";
import Sidebar from "@/components/sidebar";
import { useToast } from "@/hooks/use-toast";
import LiveBatchStats from "@/components/live-batch-stats";

export default function CampaignDetails() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [conversationDetails, setConversationDetails] = useState<any>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const { data: campaignData, isLoading } = useQuery<CampaignDetailsResponse>({
    queryKey: [`/api/campaigns/${id}/details`],
    queryFn: () => {
      console.log(`[Campaign Details UI] Fetching details for campaign ${id}`);
      return api.getCampaignDetails(parseInt(id!));
    },
    enabled: !!id,
    refetchInterval: 5000, // Refetch every 5 seconds to keep data fresh
    refetchOnWindowFocus: true // Refetch when window regains focus
  });

  // Log campaign data when it loads
  useEffect(() => {
    if (campaignData) {
      const { campaign, leads = [], callLogs = [] } = campaignData;
      
      // Separate call types
      const leadIds = new Set(leads.map((lead: any) => lead.id));
      const testCalls = callLogs.filter((log: any) => !log.leadId || !leadIds.has(log.leadId));
      const campaignCalls = callLogs.filter((log: any) => log.leadId && leadIds.has(log.leadId));
      const baseConversations = callLogs.filter((log: any) => log.elevenLabsConversationId);
      const conversations = baseConversations.map((c: any) => {
        const live = liveConversations?.find((lc: any) => lc.conversationId === c.elevenLabsConversationId || lc.phoneNumber === c.phoneNumber);
        if (!live) return c;
        return {
          ...c,
          status: live.status || c.status,
          duration: typeof live.duration === 'number' ? live.duration : c.duration,
        };
      });
      
      console.log(`[Campaign Details UI] ✅ Received campaign data:`, {
        campaignName: campaign?.name,
        totalLeads: leads?.length,
        totalCallLogs: callLogs?.length,
        testCalls: testCalls?.length,
        campaignCalls: campaignCalls?.length,
        conversationsWithAudio: conversations?.length
      });
      
      // Log test calls
      if (testCalls && testCalls.length > 0) {
        console.log(`[Campaign Details UI] ✅ Found test calls:`, 
          testCalls.map((call: any) => ({
            id: call.id,
            phoneNumber: call.phoneNumber,
            status: call.status,
            hasAudio: !!call.elevenLabsConversationId,
            conversationId: call.elevenLabsConversationId,
            duration: call.duration
          }))
        );
      }
      
      // Log conversation details
      if (conversations && conversations.length > 0) {
        console.log(`[Campaign Details UI] ✅ Found conversations with audio:`, 
          conversations.map((conv: any) => ({
            id: conv.id,
            leadId: conv.leadId,
            phoneNumber: conv.phoneNumber,
            isTestCall: !conv.leadId || !leadIds.has(conv.leadId),
            status: conv.status,
            conversationId: conv.elevenLabsConversationId,
            duration: conv.duration
          }))
        );
      } else {
        console.log(`[Campaign Details UI] ❌ No conversations with audio found`);
      }
    }
  }, [campaignData]);

  if (!id) {
    return <div>Invalid campaign ID</div>;
  }

  const handlePlayAudio = async (conversationId: string) => {
    console.log(`[Campaign Details UI] 🎵 Attempting to play audio for conversation: ${conversationId}`);
    
    try {
      if (playingAudio === conversationId) {
        // Pause current audio
        console.log(`[Campaign Details UI] ⏸️ Pausing currently playing audio`);
        if (audioRef.current) {
          audioRef.current.pause();
        }
        setPlayingAudio(null);
        return;
      }

      // Stop any currently playing audio
      if (audioRef.current) {
        console.log(`[Campaign Details UI] ⏹️ Stopping previously playing audio`);
        audioRef.current.pause();
      }

      // Create new audio element
      const audioUrl = api.getConversationAudioUrl(conversationId);
      console.log(`[Campaign Details UI] 🔊 Creating audio element with URL: ${audioUrl}`);
      
      const audio = new Audio();
      audio.src = audioUrl;
      audio.preload = 'metadata';

      // Set up event listeners
      audio.onloadstart = () => {
        console.log(`[Campaign Details UI] ✅ Audio loading started for conversation: ${conversationId}`);
        setPlayingAudio(conversationId);
      };

      audio.oncanplay = () => {
        console.log(`[Campaign Details UI] ✅ Audio can start playing for conversation: ${conversationId}`);
      };

      audio.onended = () => {
        console.log(`[Campaign Details UI] ✅ Audio playback ended for conversation: ${conversationId}`);
        setPlayingAudio(null);
      };

      audio.onerror = () => {
        console.error(`[Campaign Details UI] ❌ Audio error for conversation ${conversationId}`);
        console.error(`[Campaign Details UI] Audio error details:`, {
          error: audio.error,
          networkState: audio.networkState,
          readyState: audio.readyState,
          src: audio.src
        });
        setPlayingAudio(null);
        toast({
          title: "Audio Error",
          description: "Failed to load conversation audio",
          variant: "destructive",
        });
      };

      audioRef.current = audio;
      
      console.log(`[Campaign Details UI] ▶️ Starting audio playback for conversation: ${conversationId}`);
      await audio.play();
      console.log(`[Campaign Details UI] ✅ Audio play() promise resolved for conversation: ${conversationId}`);

    } catch (error) {
      console.error(`[Campaign Details UI] ❌ Error in handlePlayAudio for conversation ${conversationId}:`, error);
      setPlayingAudio(null);
      toast({
        title: "Playback Error",
        description: "Failed to play conversation audio",
        variant: "destructive",
      });
    }
  };

  const handleDownloadAudio = (conversationId: string) => {
    const link = document.createElement('a');
    link.href = api.getConversationAudioUrl(conversationId);
    link.download = `conversation-${conversationId}.mp3`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'calling':
        return <Phone className="h-4 w-4 text-blue-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'calling':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  const formatDuration = (seconds: number | null) => {
    if (seconds === null || seconds === undefined) return 'N/A';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  // Fetch live batch status from ElevenLabs API
  const fetchLiveBatchStatus = async () => {
    if (!id) return null;
    
    try {
      const response = await fetch(`/api/campaigns/${id}/batch-status`, {
        method: 'GET',
        credentials: 'include',
      });
      
      if (response.ok) {
        return await response.json();
      } else {
        console.warn('Could not fetch live batch status:', response.statusText);
        return null;
      }
    } catch (error) {
      console.warn('Error fetching live batch status:', error);
      return null;
    }
  };

  // Fetch live conversation data
  const fetchLiveConversations = async () => {
    if (!id) return null;
    
    try {
      const response = await fetch(`/api/campaigns/${id}/live-conversations`, {
        method: 'GET',
        credentials: 'include',
      });
      
      if (response.ok) {
        return await response.json();
      } else {
        console.warn('Could not fetch live conversations:', response.statusText);
        return null;
      }
    } catch (error) {
      console.warn('Error fetching live conversations:', error);
      return null;
    }
  };

  // Live overlay for conversations in table
  const [liveConversations, setLiveConversations] = useState<any[] | null>(null);
  const [livePolling, setLivePolling] = useState<boolean>(true);

  useEffect(() => {
    let interval: any;
    const load = async () => {
      const data = await fetchLiveConversations();
      if (data?.conversations) setLiveConversations(data.conversations);
    };
    load();
    if (livePolling) {
      interval = setInterval(load, 10000);
    }
    return () => interval && clearInterval(interval);
  }, [id, livePolling]);

  const refreshBatchStatus = async () => {
    if (!id) return;
    
    setIsRefreshing(true);
    try {
      // First try to get live data from ElevenLabs
      const liveData = await fetchLiveBatchStatus();
      
      if (liveData) {
        toast({
          title: "Live status updated",
          description: `Campaign data refreshed with live ElevenLabs data. ${liveData.liveStats?.total || 0} calls tracked.`,
        });
        console.log('[Campaign Details] Live batch data:', liveData);
      } else {
        // Fallback to refresh-batch endpoint
        const response = await fetch(`/api/campaigns/${id}/refresh-batch`, {
          method: 'POST',
          credentials: 'include',
        });
        
        if (response.ok) {
          toast({
            title: "Batch status refreshed",
            description: "Campaign data has been updated with the latest information.",
          });
        } else {
          throw new Error('Failed to refresh batch status');
        }
      }
      
      // The query will automatically refetch due to the refetchInterval
    } catch (error) {
      toast({
        title: "Refresh failed",
        description: error instanceof Error ? error.message : "Failed to refresh batch status",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  // Refresh conversation durations
  const refreshDurations = async () => {
    if (!id) return;
    
    setIsRefreshing(true);
    try {
      const response = await fetch(`/api/campaigns/${id}/refresh-durations`, {
        method: 'POST',
        credentials: 'include',
      });
      
      if (response.ok) {
        const result = await response.json();
        toast({
          title: "Durations updated",
          description: `${result.message}. Checked ${result.totalChecked} conversations.`,
        });
        // The query will automatically refetch due to the refetchInterval
      } else {
        throw new Error('Failed to refresh durations');
      }
    } catch (error) {
      toast({
        title: "Duration refresh failed",
        description: error instanceof Error ? error.message : "Failed to refresh conversation durations",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const openConversationDetails = async (conversationId: string) => {
    setSelectedConversationId(conversationId);
    setLoadingDetails(true);
    try {
      const details = await api.getConversationDetails(conversationId);
      setConversationDetails(details);

    } catch (error) {
      console.error('[Conversation Details] Error:', error);
      toast({
        title: "Error loading conversation",
        description: error instanceof Error ? error.message : "Failed to load conversation details",
        variant: "destructive",
      });
    } finally {
      setLoadingDetails(false);
    }
  };

  const closeConversationDetails = () => {
    setSelectedConversationId(null);
    setConversationDetails(null);
    // Stop any playing audio
    if (audioRef.current) {
      audioRef.current.pause();
      setPlayingAudio(null);
    }
  };

  const formatTranscription = (conversation: any) => {
    if (!conversation?.transcript) {
      return "Transcription not available for this call";
    }
    
    // Handle different transcript formats
    if (Array.isArray(conversation.transcript)) {
      return conversation.transcript.map((item: any, index: number) => (
        <div key={index} className="mb-2">
          <span className="font-medium text-sm text-muted-foreground">
            {item.speaker || item.role || 'Speaker'}: 
          </span>
          <span className="ml-2">{item.text || item.content || item.message}</span>
        </div>
      ));
    } else if (typeof conversation.transcript === 'string') {
      return conversation.transcript;
    } else {
      return "Transcription format not supported";
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-screen bg-background">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (!campaignData || !campaignData.campaign) {
    return (
      <div className="flex h-screen bg-background">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-foreground mb-2">{t('errors.notFound')}</h2>
            <p className="text-muted-foreground mb-4">{t('errors.campaignNotFound')}</p>
            <Button onClick={() => setLocation('/campaigns')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t('common.back')}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const { campaign, leads = [], callLogs = [], stats = { totalLeads: 0, completed: 0, failed: 0, pending: 0, calling: 0 } } = campaignData;
  
  // Get conversations (call logs with conversation IDs)
  const baseConversations = callLogs.filter((log: any) => log.elevenLabsConversationId);
  const conversations = baseConversations.map((c: any) => {
    const live = liveConversations?.find((lc: any) => lc.conversationId === c.elevenLabsConversationId || lc.phoneNumber === c.phoneNumber);
    if (!live) return c;
    return {
      ...c,
      status: live.status || c.status,
      duration: typeof live.duration === 'number' ? live.duration : c.duration,
    };
  });
  
  // Debug: Log duration data
  console.log('[Campaign Details] Conversations with durations:', conversations.map(c => ({
    id: c.id,
    phoneNumber: c.phoneNumber,
    duration: c.duration,
    durationType: typeof c.duration
  })));
  
  // Get test calls (calls that don't have corresponding leads or have null leadId)
  const leadIds = new Set(leads.map((lead: any) => lead.id));
  const testCalls = callLogs.filter((log: any) => 
    !log.leadId || !leadIds.has(log.leadId)
  );
  
  // Get regular campaign calls (calls with valid lead IDs)
  const campaignCalls = callLogs.filter((log: any) => 
    log.leadId && leadIds.has(log.leadId)
  );

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="border-b border-border bg-card/50 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
                              <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setLocation('/campaigns')}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  {t('campaignDetails.backToCampaigns')}
                </Button>
                <div>
                  <h1 className="text-3xl font-bold text-foreground">{campaign.name}</h1>
                  <p className="text-muted-foreground">{t('campaignDetails.title')}</p>
                </div>
            </div>
            <div className="flex items-center space-x-3">
              <Button
                variant="outline"
                size="sm"
                onClick={refreshBatchStatus}
                disabled={isRefreshing}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                {isRefreshing ? 'Refreshing...' : 'Refresh Status'}
              </Button>
              <Badge className={getStatusColor(campaign.status)}>
                {campaign.status}
              </Badge>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6 space-y-6">
          
          {/* Campaign Overview */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <Users className="h-5 w-5 text-blue-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">{t('campaigns.totalLeads')}</p>
                    <p className="text-2xl font-bold text-foreground">{stats?.totalLeads || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">{t('campaigns.completed')}</p>
                    <p className="text-2xl font-bold text-foreground">{stats?.completed || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <Phone className="h-5 w-5 text-blue-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">{t('campaigns.calling')}</p>
                    <p className="text-2xl font-bold text-foreground">{stats?.calling || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <XCircle className="h-5 w-5 text-red-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">{t('campaigns.failed')}</p>
                    <p className="text-2xl font-bold text-foreground">{stats?.failed || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <Clock className="h-5 w-5 text-yellow-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">{t('campaigns.pending')}</p>
                    <p className="text-2xl font-bold text-foreground">{stats?.pending || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Progress */}
          <Card>
            <CardHeader>
              <CardTitle>{t('campaignDetails.campaignOverview')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>{t('campaigns.completedCalls')}</span>
                  <span>{campaign.completedCalls || 0} / {campaign.totalLeads}</span>
                </div>
                <Progress 
                  value={campaign.totalLeads > 0 ? ((campaign.completedCalls || 0) / campaign.totalLeads) * 100 : 0} 
                  className="h-2" 
                />
              </div>
            </CardContent>
          </Card>

          {/* Live Batch Statistics */}
          {campaign?.batchJobId && (
            <div className="space-y-4">
              <LiveBatchStats campaignId={id!} />
            </div>
          )}

          {/* Conversations */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Volume2 className="h-5 w-5" />
                <span>{t('campaignDetails.conversations')} ({conversations.length})</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {conversations.length > 0 ? (
                                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('campaignDetails.lead')}</TableHead>
                        <TableHead>{t('campaignDetails.phoneNumber')}</TableHead>
                        <TableHead>{t('campaignDetails.status')}</TableHead>
                        <TableHead>{t('campaignDetails.duration')}</TableHead>
                        <TableHead>{t('campaignDetails.callDate')}</TableHead>
                        <TableHead>{t('campaignDetails.audio')}</TableHead>
                        <TableHead>{t('campaignDetails.actions')}</TableHead>
                      </TableRow>
                    </TableHeader>
                  <TableBody>
                    {conversations.map((conversation: any) => {
                      const lead = leads.find((l: any) => l.id === conversation.leadId);
                      return (
                        <TableRow key={conversation.id}>
                          <TableCell>
                            {lead ? `${lead.firstName} ${lead.lastName}` : 'Unknown'}
                          </TableCell>
                          <TableCell>{conversation.phoneNumber}</TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              {getStatusIcon(conversation.status)}
                              <Badge className={getStatusColor(conversation.status)}>
                                {conversation.status}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell>{formatDuration(conversation.duration)}</TableCell>
                          <TableCell>{formatDate(conversation.createdAt)}</TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDownloadAudio(conversation.elevenLabsConversationId!)}
                              disabled={!conversation.elevenLabsConversationId}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openConversationDetails(conversation.elevenLabsConversationId!)}
                              disabled={!conversation.elevenLabsConversationId}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              Details
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8">
                  <Volume2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">{t('campaignDetails.noConversations')}</h3>
                  <p className="text-muted-foreground">
                    {t('campaignDetails.noConversationsMessage')}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Test Calls */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Phone className="h-5 w-5 text-orange-500" />
                <span>{t('campaignDetails.testCalls')} ({testCalls.length})</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {testCalls.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('campaignDetails.phoneNumber')}</TableHead>
                      <TableHead>{t('campaignDetails.status')}</TableHead>
                      <TableHead>{t('campaignDetails.duration')}</TableHead>
                      <TableHead>{t('campaignDetails.callDate')}</TableHead>
                      <TableHead>{t('campaignDetails.audio')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {testCalls.map((testCall: any) => (
                      <TableRow key={testCall.id} className="bg-orange-50/50">
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Badge variant="outline" className="text-xs bg-orange-100 text-orange-700 border-orange-300">
                              {t('campaignDetails.testBadge')}
                            </Badge>
                            <span>{testCall.phoneNumber}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            {getStatusIcon(testCall.status)}
                            <Badge className={getStatusColor(testCall.status)}>
                              {testCall.status}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>{formatDuration(testCall.duration)}</TableCell>
                        <TableCell>{formatDate(testCall.createdAt)}</TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            {testCall.elevenLabsConversationId ? (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handlePlayAudio(testCall.elevenLabsConversationId!)}
                                >
                                  {playingAudio === testCall.elevenLabsConversationId ? (
                                    <Pause className="h-4 w-4" />
                                  ) : (
                                    <Play className="h-4 w-4" />
                                  )}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDownloadAudio(testCall.elevenLabsConversationId!)}
                                >
                                  <Download className="h-4 w-4" />
                                </Button>
                              </>
                            ) : (
                              <XCircle className="h-4 w-4 text-red-500" />
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8">
                  <Phone className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">{t('campaignDetails.noTestCalls')}</h3>
                  <p className="text-muted-foreground">
                    {t('campaignDetails.noTestCallsMessage')}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Campaign Call Logs (Regular campaign calls) */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Phone className="h-5 w-5" />
                <span>{t('campaignDetails.campaignCallLogs')} ({campaignCalls.length})</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {campaignCalls.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('campaignDetails.lead')}</TableHead>
                      <TableHead>{t('campaignDetails.phoneNumber')}</TableHead>
                      <TableHead>{t('campaignDetails.status')}</TableHead>
                      <TableHead>{t('campaignDetails.duration')}</TableHead>
                      <TableHead>{t('campaignDetails.callDate')}</TableHead>
                      <TableHead>{t('campaignDetails.audio')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {campaignCalls.map((callLog: any) => {
                      const lead = leads.find((l: any) => l.id === callLog.leadId);
                      return (
                        <TableRow key={callLog.id}>
                          <TableCell>
                            {lead ? `${lead.firstName} ${lead.lastName}` : 'Unknown'}
                          </TableCell>
                          <TableCell>{callLog.phoneNumber}</TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              {getStatusIcon(callLog.status)}
                              <Badge className={getStatusColor(callLog.status)}>
                                {callLog.status}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell>{formatDuration(callLog.duration)}</TableCell>
                          <TableCell>{formatDate(callLog.createdAt)}</TableCell>
                          <TableCell>
                            {callLog.elevenLabsConversationId ? (
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            ) : (
                              <XCircle className="h-4 w-4 text-red-500" />
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8">
                  <Phone className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">{t('campaignDetails.noCallsYet')}</h3>
                  <p className="text-muted-foreground">
                    {t('campaignDetails.noCallsMessage')}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Conversation Details Drawer */}
      <Sheet open={!!selectedConversationId} onOpenChange={(open) => {
        if (!open) closeConversationDetails();
      }}>
        <SheetContent className="w-[600px] sm:w-[800px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center space-x-2">
              <MessageSquare className="h-5 w-5" />
              <span>Conversation Details</span>
            </SheetTitle>
            <SheetDescription>
              {conversationDetails?.lead ? 
                `${conversationDetails.lead.firstName} ${conversationDetails.lead.lastName} - ${conversationDetails.lead.contactNo}` :
                'Loading conversation details...'
              }
            </SheetDescription>
          </SheetHeader>

          {loadingDetails ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : conversationDetails ? (
            <div className="mt-6 space-y-6">
              {/* Call Information */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Call Information</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-muted-foreground">Status:</span>
                    <div className="flex items-center space-x-2 mt-1">
                      {getStatusIcon(conversationDetails.callLog.status)}
                      <Badge className={getStatusColor(conversationDetails.callLog.status)}>
                        {conversationDetails.callLog.status}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <span className="font-medium text-muted-foreground">Duration:</span>
                    <p className="mt-1">{formatDuration(conversationDetails.callLog.duration)}</p>
                  </div>
                  <div>
                    <span className="font-medium text-muted-foreground">Phone Number:</span>
                    <p className="mt-1">{conversationDetails.callLog.phoneNumber}</p>
                  </div>
                  <div>
                    <span className="font-medium text-muted-foreground">Call Date:</span>
                    <p className="mt-1">{formatDate(conversationDetails.callLog.createdAt)}</p>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Audio Player */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Audio Recording</h3>
                <div className="flex items-center space-x-4">
                  <Button
                    variant="outline"
                    onClick={() => handlePlayAudio(conversationDetails.conversationId)}
                  >
                    {playingAudio === conversationDetails.conversationId ? (
                      <>
                        <Pause className="h-4 w-4 mr-2" />
                        Pause
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4 mr-2" />
                        Play Audio
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleDownloadAudio(conversationDetails.conversationId)}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                </div>
              </div>

              <Separator />

              {/* Transcription */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Conversation Transcription</h3>
                <div className="bg-muted/50 rounded-lg p-4 min-h-[200px] max-h-[400px] overflow-y-auto">
                  {conversationDetails.conversation ? (
                    <div className="space-y-2 text-sm">
                      {formatTranscription(conversationDetails.conversation)}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-32 text-muted-foreground">
                      <div className="text-center">
                        <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p>No transcription available for this call</p>
                                                 <div className="text-xs mt-3 space-y-2">
                           <div className="text-green-600 bg-green-50 p-2 rounded">
                             <p className="font-medium">🎉 Transcription System Ready!</p>
                             <p><strong>Test calls:</strong> Now use ElevenLabs + automatic transcriptions</p>
                             <p><strong>Campaigns:</strong> Use ElevenLabs batch calling + transcriptions</p>
                           </div>
                           <div className="text-blue-600 bg-blue-50 p-2 rounded">
                             <p className="font-medium">💡 How it works:</p>
                             <p>1. Make a new test call or run a campaign</p>
                             <p>2. ElevenLabs processes the conversation</p>
                             <p>3. Transcriptions appear here automatically via webhooks</p>
                           </div>
                         </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>


            </div>
          ) : (
            <div className="flex items-center justify-center py-12">
              <div className="text-center text-muted-foreground">
                <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Failed to load conversation details</p>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
} 