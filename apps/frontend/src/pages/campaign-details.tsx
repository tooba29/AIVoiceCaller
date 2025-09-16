import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { ArrowLeft, RefreshCw, Users, CheckCircle, XCircle, Phone, Clock, Play, Pause, Download, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import Sidebar from "@/components/sidebar";
import { useLocation } from "wouter";
import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useMemo } from "react";

interface CampaignDetailsProps {
  id: string;
}

export default function CampaignDetails({ id }: CampaignDetailsProps) {
  const [, setLocation] = useLocation();
  const [selectedLog, setSelectedLog] = useState<any>(null);
  const [playingCallSid, setPlayingCallSid] = useState<string | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["/api/campaigns", id],
    queryFn: () => api.getCampaignDetails(id),
  });

  useEffect(() => {
    // Cleanup audio player on component unmount
    return () => {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
      }
    };
  }, []);

  const handlePlayAudio = async (conversationId: string) => {
    try {
      if (!conversationId || conversationId === 'null' || conversationId === 'undefined') {
        return;
      }
      if (playingCallSid === conversationId && audioPlayerRef.current) {
        audioPlayerRef.current.pause();
        setPlayingCallSid(null);
        return;
      }

      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
      }

      const audioUrl = `${api.getBaseUrl()}/api/conversations/${conversationId}/audio`;
      const response = await fetch(audioUrl, { credentials: 'include' });
      if (!response.ok) {
        console.error('Failed to fetch audio:', response.status, response.statusText);
        setPlayingCallSid(null);
        return;
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);

      const newAudioPlayer = new Audio();
      newAudioPlayer.src = objectUrl;
      audioPlayerRef.current = newAudioPlayer;
      setPlayingCallSid(conversationId);
      newAudioPlayer.play().catch((e) => {
        console.error('Audio play error:', e);
        setPlayingCallSid(null);
        URL.revokeObjectURL(objectUrl);
      });
      newAudioPlayer.onended = () => {
        setPlayingCallSid(null);
        URL.revokeObjectURL(objectUrl);
      };
    } catch (e) {
      console.error('Audio playback error:', e);
      setPlayingCallSid(null);
    }
  };

  if (isLoading) return <div className="flex h-screen items-center justify-center"><p>Loading campaign...</p></div>;
  if (error) return <div className="flex h-screen items-center justify-center"><p>Error loading campaign details.</p></div>;

  const { campaign, leads, callLogs, stats } = data;
  const completedCallsProgress = campaign.totalLeads > 0 ? (campaign.completedCalls / campaign.totalLeads) * 100 : 0;

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => setLocation("/campaigns")}>
                <ArrowLeft className="text-gray-500 dark:text-gray-400" />
              </Button>
              <div>
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white">{campaign.name}</h2>
                <p className="text-gray-500 dark:text-gray-400 mt-2">Campaign Details & Conversations</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => refetch()}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh Status
              </Button>
              <Badge>{campaign.status}</Badge>
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-auto p-8 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            <StatCard icon={<Users className="text-blue-500" />} title="Total Leads" value={stats.totalLeads} />
            <StatCard icon={<CheckCircle className="text-green-500" />} title="Completed" value={stats.completed} />
            <StatCard icon={<Phone className="text-purple-500" />} title="Calling" value={stats.calling} />
            <StatCard icon={<XCircle className="text-red-500" />} title="Failed" value={stats.failed} />
            <StatCard icon={<Clock className="text-yellow-500" />} title="Pending" value={stats.pending} />
          </div>

          <Card className="bg-white dark:bg-gray-800 shadow-sm">
            <CardHeader>
              <CardTitle>Campaign Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center text-sm text-gray-600 dark:text-gray-400">
                <p>Completed Calls</p>
                <p>{campaign.completedCalls} / {campaign.totalLeads}</p>
              </div>
              <Progress value={completedCallsProgress} className="mt-2" />
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-gray-800 shadow-sm">
            <CardHeader>
              <CardTitle>Conversations ({callLogs.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Lead</TableHead>
                    <TableHead>Phone Number</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Call Date</TableHead>
                    <TableHead className="text-center">Audio</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {callLogs.map((log: any) => (
                    <TableRow key={log.id}>
                      <TableCell>{leads.find((l: any) => l.id === log.leadId)?.firstName || "Unknown"}</TableCell>
                      <TableCell>{log.phoneNumber}</TableCell>
                      <TableCell>
                        <Badge variant={log.status === 'completed' ? 'default' : 'secondary'}>{log.status}</Badge>
                      </TableCell>
                      <TableCell>{log.duration}s</TableCell>
                      <TableCell>{new Date(log.created_at).toLocaleString()}</TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handlePlayAudio(log.elevenlabsConversationId)}
                          disabled={!log.elevenlabsConversationId || log.elevenlabsConversationId === 'null' || log.elevenlabsConversationId === 'undefined'}
                          title={!log.elevenlabsConversationId || log.elevenlabsConversationId === 'null' || log.elevenlabsConversationId === 'undefined' ? 'Audio not available yet' : 'Play audio'}
                        >
                          {playingCallSid === log.elevenlabsConversationId ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                        </Button>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedLog(log)}
                          disabled={!log.elevenlabsConversationId || log.elevenlabsConversationId === 'null' || log.elevenlabsConversationId === 'undefined'}
                          title={!log.elevenlabsConversationId || log.elevenlabsConversationId === 'null' || log.elevenlabsConversationId === 'undefined' ? 'Conversation details unavailable' : 'View details'}
                        >
                          <MessageSquare className="h-4 w-4 mr-2" />
                          Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </main>
      </div>
      <TranscriptionDialog log={selectedLog} open={!!selectedLog} onOpenChange={() => setSelectedLog(null)} />
    </div>
  );
}

function StatCard({ icon, title, value }: { icon: React.ReactNode; title: string; value: number }) {
  return (
    <Card className="bg-white dark:bg-gray-800 shadow-sm">
      <CardContent className="flex items-center gap-4 p-6">
        {icon}
        <div>
          <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">{title}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function TranscriptionDialog({ log, open, onOpenChange }: { log: any, open: boolean, onOpenChange: (open: boolean) => void }) {
  const validConversationId = log?.elevenlabsConversationId && log.elevenlabsConversationId !== 'null' && log.elevenlabsConversationId !== 'undefined' ? log.elevenlabsConversationId : null;
  const { data: conversationDetails, isLoading, error } = useQuery({
    queryKey: ['/api/conversations', validConversationId],
    queryFn: () => api.getConversationDetails(validConversationId as string),
    enabled: !!validConversationId, // Only fetch when a valid id exists
  });

  if (!log) return null;

  const normalizeTranscription = (raw: any): Array<{ speaker: string; text: string }> => {
    if (!raw) return [];
    const pick = (obj: any, keys: string[]) => keys.find((k) => obj && obj[k] !== undefined) ? obj[keys.find((k) => obj[k] !== undefined)!] : undefined;

    if (typeof raw === 'string') {
      return [{ speaker: 'system', text: raw }];
    }

    if (Array.isArray(raw)) {
      return raw.map((entry: any) => {
        const speaker = pick(entry, ['speaker', 'role', 'sender', 'participant', 'from']) || 'unknown';
        const text = pick(entry, ['text', 'content', 'message', 'value']) || '';
        return { speaker, text };
      }).filter((e: any) => (e.text || '').trim() !== '');
    }

    if (Array.isArray(raw.messages)) {
      return raw.messages.map((m: any) => ({
        speaker: pick(m, ['role', 'speaker', 'sender', 'participant']) || 'unknown',
        text: pick(m, ['content', 'text', 'message']) || ''
      })).filter((e: any) => (e.text || '').trim() !== '');
    }

    if (Array.isArray(raw.turns)) {
      return raw.turns.map((t: any) => ({
        speaker: pick(t, ['speaker', 'participant', 'role']) || 'unknown',
        text: pick(t, ['text', 'message', 'content']) || ''
      })).filter((e: any) => (e.text || '').trim() !== '');
    }

    return [];
  };

  const items = normalizeTranscription(conversationDetails?.parsedTranscription);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Call Transcription</DialogTitle>
          <DialogDescription>Conversation with {log.phoneNumber} on {new Date(log.created_at).toLocaleString()}</DialogDescription>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto p-4 space-y-4">
          {isLoading && <p>Loading transcription...</p>}
          {error && <p className="text-red-500">Failed to load transcription.</p>}

          {!isLoading && !error && items.length === 0 && (
            <p className="text-gray-500">No transcription available for this call.</p>
          )}

          {items.map((entry, index) => (
            <div key={index} className={`flex ${entry.speaker?.toLowerCase() === 'agent' || entry.speaker?.toLowerCase() === 'assistant' ? 'justify-start' : 'justify-end'}`}>
              <div className={`p-3 rounded-lg max-w-md ${entry.speaker?.toLowerCase() === 'agent' || entry.speaker?.toLowerCase() === 'assistant' ? 'bg-gray-100 dark:bg-gray-700' : 'bg-blue-500 text-white'}`}>
                <p className="font-bold capitalize">{entry.speaker}</p>
                <p>{entry.text}</p>
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
