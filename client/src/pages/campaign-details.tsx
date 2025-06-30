import { useState, useRef, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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
  AlertCircle
} from "lucide-react";
import { api, type CampaignDetailsResponse } from "@/lib/api";
import Sidebar from "@/components/sidebar";
import { useToast } from "@/hooks/use-toast";

export default function CampaignDetails() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const { data: campaignData, isLoading } = useQuery<CampaignDetailsResponse>({
    queryKey: [`/api/campaigns/${id}/details`],
    queryFn: () => {
      console.log(`[Campaign Details UI] Fetching details for campaign ${id}`);
      return api.getCampaignDetails(parseInt(id!));
    },
    enabled: !!id,
  });

  // Log campaign data when it loads
  useEffect(() => {
    if (campaignData) {
      const { campaign, leads, callLogs } = campaignData;
      
      // Separate call types
      const leadIds = new Set(leads.map((lead: any) => lead.id));
      const testCalls = callLogs.filter((log: any) => !log.leadId || !leadIds.has(log.leadId));
      const campaignCalls = callLogs.filter((log: any) => log.leadId && leadIds.has(log.leadId));
      const conversations = callLogs.filter((log: any) => log.elevenLabsConversationId);
      
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
    if (!seconds) return 'N/A';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
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

  if (!campaignData) {
    return (
      <div className="flex h-screen bg-background">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-foreground mb-2">Campaign Not Found</h2>
            <p className="text-muted-foreground mb-4">The requested campaign could not be found.</p>
            <Button onClick={() => setLocation('/campaigns')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Campaigns
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const { campaign, leads, callLogs, stats } = campaignData;
  
  // Get conversations (call logs with conversation IDs)
  const conversations = callLogs.filter((log: any) => log.elevenLabsConversationId);
  
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
                Back to Campaigns
              </Button>
              <div>
                <h1 className="text-3xl font-bold text-foreground">{campaign.name}</h1>
                <p className="text-muted-foreground">Campaign Details & Conversations</p>
              </div>
            </div>
            <Badge className={getStatusColor(campaign.status)}>
              {campaign.status}
            </Badge>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6 space-y-6">
          
          {/* Campaign Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <Users className="h-5 w-5 text-blue-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">Total Leads</p>
                    <p className="text-2xl font-bold text-foreground">{stats.totalLeads}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">Completed</p>
                    <p className="text-2xl font-bold text-foreground">{stats.completed}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <XCircle className="h-5 w-5 text-red-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">Failed</p>
                    <p className="text-2xl font-bold text-foreground">{stats.failed}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <Clock className="h-5 w-5 text-yellow-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">Pending</p>
                    <p className="text-2xl font-bold text-foreground">{stats.pending}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Progress */}
          <Card>
            <CardHeader>
              <CardTitle>Campaign Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Completed Calls</span>
                  <span>{campaign.completedCalls || 0} / {campaign.totalLeads}</span>
                </div>
                <Progress 
                  value={campaign.totalLeads > 0 ? ((campaign.completedCalls || 0) / campaign.totalLeads) * 100 : 0} 
                  className="h-2" 
                />
              </div>
            </CardContent>
          </Card>

          {/* Conversations */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Volume2 className="h-5 w-5" />
                <span>Conversations ({conversations.length})</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {conversations.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Lead</TableHead>
                      <TableHead>Phone Number</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Audio</TableHead>
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
                            <div className="flex items-center space-x-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handlePlayAudio(conversation.elevenLabsConversationId!)}
                                disabled={!conversation.elevenLabsConversationId}
                              >
                                {playingAudio === conversation.elevenLabsConversationId ? (
                                  <Pause className="h-4 w-4" />
                                ) : (
                                  <Play className="h-4 w-4" />
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDownloadAudio(conversation.elevenLabsConversationId!)}
                                disabled={!conversation.elevenLabsConversationId}
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8">
                  <Volume2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">No Conversations Yet</h3>
                  <p className="text-muted-foreground">
                    Conversations will appear here once calls are made for this campaign.
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
                <span>Test Calls ({testCalls.length})</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {testCalls.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Phone Number</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Audio</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {testCalls.map((testCall: any) => (
                      <TableRow key={testCall.id} className="bg-orange-50/50">
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Badge variant="outline" className="text-xs bg-orange-100 text-orange-700 border-orange-300">
                              TEST
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
                  <h3 className="text-lg font-semibold text-foreground mb-2">No Test Calls Yet</h3>
                  <p className="text-muted-foreground">
                    Test calls made for this campaign will appear here with their audio recordings.
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
                <span>Campaign Call Logs ({campaignCalls.length})</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {campaignCalls.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Lead</TableHead>
                      <TableHead>Phone Number</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Has Audio</TableHead>
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
                  <h3 className="text-lg font-semibold text-foreground mb-2">No Calls Yet</h3>
                  <p className="text-muted-foreground">
                    Call logs will appear here once the campaign is started.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
} 