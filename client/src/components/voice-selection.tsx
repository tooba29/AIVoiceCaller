import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MicOff, Play, Pause, Upload, Users, RefreshCw, Mic2, User, Bot } from "lucide-react";
import { api, type Voice } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface VoiceSelectionProps {
  selectedVoiceId: string;
  onVoiceSelect: (voiceId: string) => void;
}

export default function VoiceSelection({ selectedVoiceId, onVoiceSelect }: VoiceSelectionProps) {
  const [activeTab, setActiveTab] = useState<"library" | "clone">("library");
  const [currentlyPlaying, setCurrentlyPlaying] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showCloneDialog, setShowCloneDialog] = useState(false);
  const [voiceName, setVoiceName] = useState("");
  const [voiceDescription, setVoiceDescription] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Get voices
  const { data: voicesData, isLoading } = useQuery({
    queryKey: ["/api/voices"],
    queryFn: () => api.getVoices(),
    gcTime: 5 * 60 * 1000,
  });

  const cleanupAudio = (audioToClean: HTMLAudioElement) => {
    try {
      if (audioToClean) {
        audioToClean.pause();
        audioToClean.removeAttribute("src");
        audioToClean.load();
        
        // Remove all event listeners
        audioToClean.onended = null;
        audioToClean.onerror = null;
        audioToClean.onloadstart = null;
        audioToClean.oncanplay = null;
        audioToClean.onpause = null;
        audioToClean.onplay = null;
      }
    } catch (error) {
      console.error("Error cleaning up audio:", error);
    }
  };

  const refreshMutation = useMutation({
    mutationFn: () => api.getVoices(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/voices"] });
      toast({
        title: "Voices Refreshed",
        description: "Voice library has been updated",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Refresh Failed",
        description: error.message || "Failed to refresh voices",
        variant: "destructive",
      });
    },
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshMutation.mutateAsync();
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleVoicePreview = async (voice: Voice) => {
    if (!voice.sampleUrl) {
      toast({
        title: "No Preview Available",
        description: "This voice doesn't have a preview available.",
        variant: "destructive",
      });
      return;
    }

    try {
      if (currentlyPlaying === voice.id) {
        // Stop current audio
        if (audioRef.current) {
          cleanupAudio(audioRef.current);
        }
        setCurrentlyPlaying(null);
        setIsPlaying(false);
        return;
      }

      // Stop any currently playing audio
      if (audioRef.current) {
        cleanupAudio(audioRef.current);
      }

      // Create new audio element
      const audio = new Audio();
      audio.preload = 'metadata';
      
      const cleanup = () => {
        if (audioRef.current === audio) {
          setCurrentlyPlaying(null);
          setIsPlaying(false);
          audioRef.current = null;
        }
      };

      audio.onloadstart = () => {
        console.log(`[Voice Selection] Loading audio for voice: ${voice.name}`);
        setCurrentlyPlaying(voice.id);
        setIsPlaying(true);
      };

      audio.oncanplay = () => {
        console.log(`[Voice Selection] Audio ready for voice: ${voice.name}`);
      };

      audio.onended = () => {
        console.log(`[Voice Selection] Audio ended for voice: ${voice.name}`);
        cleanup();
      };

      audio.onerror = (error) => {
        console.error(`[Voice Selection] Audio error for voice ${voice.name}:`, error);
        cleanup();
        toast({
          title: "Playback Error",
          description: `Failed to play preview for ${voice.name}`,
          variant: "destructive",
        });
      };

      audio.onpause = () => {
        console.log(`[Voice Selection] Audio paused for voice: ${voice.name}`);
        setIsPlaying(false);
      };

      audio.onplay = () => {
        console.log(`[Voice Selection] Audio playing for voice: ${voice.name}`);
        setIsPlaying(true);
      };

      audioRef.current = audio;
      
      // Use the sample URL from the voice object
      const audioUrl = voice.sampleUrl;
      console.log(`[Voice Selection] Loading audio from: ${audioUrl}`);
      
      audio.src = audioUrl;
      await audio.play();
      
    } catch (error) {
      console.error(`[Voice Selection] Error playing voice preview:`, error);
      setCurrentlyPlaying(null);
      setIsPlaying(false);
      toast({
        title: "Playback Error",
        description: "Failed to play voice preview",
        variant: "destructive",
      });
    }
  };

  // Voice cloning mutation
  const cloneMutation = useMutation({
    mutationFn: ({ file, data }: { file: File, data: { name: string, description?: string } }) =>
      api.uploadVoiceSample(file, data.name, data.description),
    onSuccess: (data) => {
      toast({
        title: "Voice Cloned Successfully",
        description: `${data.voice?.name} has been added to your voice library.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/voices"] });
      setShowCloneDialog(false);
      setVoiceName("");
      setVoiceDescription("");
    },
    onError: (error: any) => {
      toast({
        title: "Voice Clone Failed",
        description: error.message || "Failed to clone voice",
        variant: "destructive",
      });
    },
  });

  const handleVoiceClone = (file: File) => {
    if (!file.type.startsWith('audio/')) {
      toast({
        title: "Invalid File",
        description: "Please upload an audio file (MP3, WAV, M4A).",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB
      toast({
        title: "File Too Large",
        description: "Audio file must be smaller than 10MB.",
        variant: "destructive",
      });
      return;
    }

    // Set the file name as the voice name and show dialog
    setVoiceName(file.name.replace(/\.[^/.]+$/, ""));
    setShowCloneDialog(true);
    
    // Store the file for later use
    (window as any).tempAudioFile = file;
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleVoiceClone(file);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      handleVoiceClone(file);
    }
  };

  const handleConfirmClone = () => {
    if (!voiceName.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter a voice name.",
        variant: "destructive",
      });
      return;
    }

    const file = (window as any).tempAudioFile;
    if (!file) {
      toast({
        title: "Error",
        description: "No audio file found. Please try uploading again.",
        variant: "destructive",
      });
      return;
    }

    cloneMutation.mutate({
      file,
      data: {
        name: voiceName.trim(),
        description: voiceDescription.trim() || undefined,
      },
    });
  };

  return (
    <Card className="glass-card border-gradient shadow-xl hover:shadow-2xl transition-all duration-300">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center shadow-lg">
              <Mic2 className="h-5 w-5 text-white" />
            </div>
            <div>
              <span className="text-xl font-bold text-gradient">AI Voice Selection</span>
              <p className="text-sm text-muted-foreground/80">Choose from premium or custom voices</p>
            </div>
          </div>
          <Button
            onClick={handleRefresh}
            disabled={isLoading || refreshMutation.isPending}
            variant="outline"
            size="sm"
            className="glass-card border-gradient hover-lift"
          >
            <RefreshCw className={`h-4 w-4 ${(isLoading || refreshMutation.isPending) ? 'animate-spin' : ''}`} />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "library" | "clone")} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="library" className="flex items-center space-x-2">
              <Bot className="h-4 w-4" />
              <span>Voice Library</span>
            </TabsTrigger>
            <TabsTrigger value="clone" className="flex items-center space-x-2">
              <Upload className="h-4 w-4" />
              <span>Clone Voice</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="library" className="space-y-6">
            {/* Voice List */}
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="glass-card border-gradient p-4">
                    <div className="animate-pulse">
                      <div className="h-4 bg-gradient-to-r from-blue-300 to-purple-300 rounded w-3/4 mb-2 shimmer"></div>
                      <div className="h-3 bg-gradient-to-r from-indigo-300 to-pink-300 rounded w-1/2 shimmer"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto custom-scrollbar">
                {voicesData?.voices?.map((voice: any) => (
                  <div
                    key={voice.id}
                    className={`p-4 rounded-xl border transition-all duration-300 cursor-pointer group relative overflow-hidden ${
                      selectedVoiceId === voice.id
                        ? 'glass-card border-gradient bg-gradient-to-r from-blue-50/50 to-purple-50/30 shadow-lg'
                        : 'glass-card border-border/30 hover:border-primary/50 hover:bg-gradient-to-r hover:from-blue-50/20 hover:to-purple-50/10'
                    }`}
                    onClick={() => onVoiceSelect(voice.id)}
                  >
                    {/* Background gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-100/10 via-purple-100/10 to-indigo-100/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    
                    <div className="relative z-10 flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-md transition-all duration-300 ${
                          voice.isCloned 
                            ? 'bg-gradient-to-br from-purple-500 to-pink-500' 
                            : 'bg-gradient-to-br from-blue-500 to-indigo-600'
                        } group-hover:scale-110`}>
                          {voice.isCloned ? (
                            <User className="h-5 w-5 text-white" />
                          ) : (
                            <Bot className="h-5 w-5 text-white" />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <h4 className="font-medium text-foreground">{voice.name}</h4>
                            {voice.isCloned && (
                              <span className="px-2 py-1 bg-gradient-to-r from-purple-100 to-pink-100 text-purple-700 text-xs rounded-full font-medium border border-purple-200">
                                Custom
                              </span>
                            )}
                            {selectedVoiceId === voice.id && (
                              <div className="w-2 h-2 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full animate-pulse"></div>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground/70">{voice.description}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        {voice.sampleUrl && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleVoicePreview(voice);
                            }}
                            disabled={!voice.sampleUrl}
                            className="h-8 w-8 p-0 hover:bg-blue-100/50"
                          >
                            {currentlyPlaying === voice.id ? (
                              <Pause className="h-4 w-4 text-blue-600" />
                            ) : (
                              <Play className="h-4 w-4 text-blue-600" />
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {(!voicesData?.voices || voicesData.voices.length === 0) && (
                  <div className="glass-card border-gradient p-8 text-center">
                    <Mic2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gradient mb-2">No Voices Available</h3>
                    <p className="text-sm text-muted-foreground">
                      Upload a voice sample to create your first custom voice.
                    </p>
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="clone" className="space-y-6">
            {/* Voice Clone Upload */}
            <div className="p-6 bg-gradient-to-br from-purple-50/50 to-pink-50/30 border border-purple-200/50 rounded-xl">
              <h4 className="font-medium text-gradient-secondary mb-4 flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                  <Upload className="h-4 w-4 text-white" />
                </div>
                <span>Create Custom Voice</span>
              </h4>
              <div
                className={`border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300 cursor-pointer relative overflow-hidden ${
                  isDragging 
                    ? "border-primary bg-gradient-to-br from-blue-50 to-purple-50 scale-105" 
                    : "border-border/50 hover:border-primary/50 hover:bg-gradient-to-br hover:from-purple-50/30 hover:to-pink-50/20"
                }`}
                onDrop={handleDrop}
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onClick={() => document.getElementById('voice-upload')?.click()}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-purple-100/20 via-pink-100/20 to-indigo-100/20 opacity-0 hover:opacity-100 transition-opacity duration-500" />
                
                <div className="relative z-10">
                  <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg hover:scale-110 transition-transform duration-300">
                    <Upload className="h-8 w-8 text-white" />
                  </div>
                  <h4 className="text-lg font-semibold text-gradient mb-2">Upload Voice Sample</h4>
                  <p className="text-sm font-medium text-slate-600 mb-1">Drag and drop your audio file here, or click to browse</p>
                  <p className="text-xs text-slate-500">Supports MP3, WAV, M4A files • High-quality audio for best results</p>
                </div>
                <input
                  id="voice-upload"
                  type="file"
                  accept=".mp3,.wav,.m4a"
                  className="hidden"
                  onChange={handleFileInput}
                />
              </div>
              
              <div className="mt-4 p-4 bg-blue-50/50 border border-blue-200/50 rounded-lg">
                <h5 className="font-medium text-blue-900 mb-2 flex items-center space-x-2">
                  <Mic2 className="h-4 w-4" />
                  <span>Voice Cloning Tips</span>
                </h5>
                <ul className="text-xs text-blue-700 space-y-1">
                  <li>• Use clear, high-quality audio (at least 1 minute)</li>
                  <li>• Avoid background noise and music</li>
                  <li>• Include various emotions and tones</li>
                  <li>• Speak naturally with proper pronunciation</li>
                </ul>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Voice Clone Dialog */}
        <Dialog open={showCloneDialog} onOpenChange={setShowCloneDialog}>
          <DialogContent className="glass-card border-gradient">
            <DialogHeader>
              <DialogTitle className="text-gradient">Create Custom Voice</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="voice-name">Voice Name</Label>
                <Input
                  id="voice-name"
                  value={voiceName}
                  onChange={(e) => setVoiceName(e.target.value)}
                  placeholder="Enter a name for this voice"
                  className="input-gradient"
                />
              </div>
              <div>
                <Label htmlFor="voice-description">Description (optional)</Label>
                <Input
                  id="voice-description"
                  value={voiceDescription}
                  onChange={(e) => setVoiceDescription(e.target.value)}
                  placeholder="Describe this voice"
                  className="input-gradient"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCloneDialog(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleConfirmClone}
                disabled={cloneMutation.isPending || !voiceName.trim()}
                className="btn-gradient"
              >
                {cloneMutation.isPending ? "Creating..." : "Create Voice"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
