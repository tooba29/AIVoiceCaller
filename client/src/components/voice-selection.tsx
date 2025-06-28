import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MicOff, Play, Pause, Upload, Users, RefreshCw } from "lucide-react";
import { api, type Voice } from "@/lib/api";
import { Badge } from "@/components/ui/badge";

interface VoiceSelectionProps {
  selectedVoiceId: string;
  onVoiceSelect: (voiceId: string) => void;
}

export default function VoiceSelection({ selectedVoiceId, onVoiceSelect }: VoiceSelectionProps) {
  const [activeTab, setActiveTab] = useState<"library" | "clone">("library");
  const [cloneName, setCloneName] = useState("");
  const [cloneDescription, setCloneDescription] = useState("");
  const [playingVoice, setPlayingVoice] = useState<string | null>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Helper function to cleanup audio
  const cleanupAudio = (audioToClean: HTMLAudioElement) => {
    audioToClean.pause();
    audioToClean.currentTime = 0;
    audioToClean.src = '';
    audioToClean.load();
    setPlayingVoice(null);
    setAudioElement(null);
    setIsPlaying(false);
  };

  // Get voices
  const { data: voicesData, isLoading, refetch } = useQuery({
    queryKey: ["/api/voices"],
    queryFn: () => api.getVoices(),
    staleTime: 0, // Always refetch
    cacheTime: 0, // Don't cache
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  // Clone voice mutation
  const cloneVoiceMutation = useMutation({
    mutationFn: ({ file, data }: { file: File; data: { name: string; description?: string } }) =>
      api.uploadVoiceSample(file, data.name, data.description),
    onSuccess: (data) => {
      toast({
        title: "Voice Cloned",
        description: "Voice has been cloned successfully.",
      });
      setCloneName("");
      setCloneDescription("");
      setActiveTab("library");
      queryClient.invalidateQueries({ queryKey: ["/api/voices"] });
      if (data.voice) {
        onVoiceSelect(data.voice.id);
      }
    },
    onError: (error: any) => {
      toast({
        title: "Clone Failed",
        description: error.message || "Failed to clone voice.",
        variant: "destructive",
      });
    },
  });

  const handleVoicePreview = async (voice: Voice) => {
    try {
      // If clicking the same voice that's currently playing
      if (playingVoice === voice.id && audioElement) {
        if (isPlaying) {
          audioElement.pause();
          setIsPlaying(false);
        } else {
          try {
            await audioElement.play();
            setIsPlaying(true);
          } catch (error) {
            console.error('Error resuming playback:', error);
            cleanupAudio(audioElement);
            toast({
              title: "Playback Failed",
              description: "Failed to resume playback. Please try again.",
              variant: "destructive",
            });
          }
        }
        return;
      }

      // Stop current playback if any
      if (audioElement) {
        cleanupAudio(audioElement);
      }

      if (!voice.sampleUrl) {
        toast({
          title: "Preview Unavailable",
          description: "No preview available for this voice.",
          variant: "destructive",
        });
        return;
      }

      // Create and set up new audio element
      const audio = new Audio();
      
      // Add loading state
      const loadingToast = toast({
        title: "Loading Preview",
        description: "Preparing voice sample...",
      });

      let isLoading = true;
      let hasError = false;

      const cleanup = () => {
        isLoading = false;
        loadingToast.dismiss();
        if (audio) {
          cleanupAudio(audio);
        }
      };

      // Set up audio event handlers before setting the source
      audio.addEventListener('canplaythrough', () => {
        if (hasError || !isLoading) return;
        isLoading = false;
        loadingToast.dismiss();
        setAudioElement(audio);
        setPlayingVoice(voice.id);
        setIsPlaying(true);
        audio.play().catch((error) => {
          if (hasError) return;
          hasError = true;
          console.error('Error playing audio:', error);
          cleanupAudio(audio);
          toast({
            title: "Preview Failed",
            description: "Failed to play voice sample. Please try again.",
            variant: "destructive",
          });
        });
      }, { once: true });
      
      audio.addEventListener('ended', () => {
        cleanupAudio(audio);
      }, { once: true });

      audio.addEventListener('pause', () => {
        setIsPlaying(false);
      });

      audio.addEventListener('play', () => {
        setIsPlaying(true);
      });

      audio.addEventListener('error', (e) => {
        if (hasError) return;
        hasError = true;
        
        // Only log error if it's not due to cleanup
        if (isLoading) {
          console.error('Audio error:', e);
        }
        
        cleanup();
        
        if (isLoading) {
          let errorMessage = "Failed to load voice sample.";
          if (audio.error) {
            switch (audio.error.code) {
              case MediaError.MEDIA_ERR_ABORTED:
                errorMessage = "Audio playback was aborted.";
                break;
              case MediaError.MEDIA_ERR_NETWORK:
                errorMessage = "Network error occurred while loading the audio.";
                break;
              case MediaError.MEDIA_ERR_DECODE:
                errorMessage = "Audio decoding error occurred.";
                break;
              case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
                errorMessage = "Audio format is not supported.";
                break;
            }
          }
          
          toast({
            title: "Preview Failed",
            description: errorMessage + " Please try again.",
            variant: "destructive",
          });
        }
      }, { once: true });

      // Set CORS mode
      audio.crossOrigin = "anonymous";
      
      // Set the source and load the audio
      const proxyUrl = `/api/voice-preview/${voice.id}`;
      
      // Set up timeout to prevent hanging
      const timeoutId = setTimeout(() => {
        if (isLoading && !hasError) {
          hasError = true;
          cleanup();
          toast({
            title: "Preview Failed",
            description: "Loading took too long. Please try again.",
            variant: "destructive",
          });
        }
      }, 10000); // 10 second timeout

      try {
        // Preload the audio to check if the URL is valid
        const response = await fetch(proxyUrl, { method: 'HEAD' });
        if (!response.ok) {
          throw new Error('Failed to load audio preview');
        }

        audio.src = proxyUrl;
        await audio.load();
      } catch (error) {
        if (hasError) return;
        hasError = true;
        console.error('Error loading audio:', error);
        cleanup();
        toast({
          title: "Preview Failed",
          description: "Failed to load voice sample. Please try again.",
          variant: "destructive",
        });
      } finally {
        clearTimeout(timeoutId);
      }

    } catch (error) {
      console.error('Error setting up audio:', error);
      setPlayingVoice(null);
      setAudioElement(null);
      setIsPlaying(false);
      toast({
        title: "Preview Failed",
        description: "Failed to set up voice preview. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleVoiceClone = (file: File) => {
    if (!cloneName.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter a voice name.",
        variant: "destructive",
      });
      return;
    }

    if (!file.type.startsWith('audio/')) {
      toast({
        title: "Invalid File",
        description: "Please upload an audio file (MP3, WAV).",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 50 * 1024 * 1024) { // 50MB
      toast({
        title: "File Too Large",
        description: "Audio file must be smaller than 50MB.",
        variant: "destructive",
      });
      return;
    }

    cloneVoiceMutation.mutate({
      file,
      data: {
        name: cloneName.trim(),
        description: cloneDescription.trim() || undefined,
      },
    });
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleVoiceClone(file);
    }
  };

  if (isLoading) {
    return (
      <Card className="border border-slate-200">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-slate-200 rounded w-1/2"></div>
            <div className="h-12 bg-slate-200 rounded"></div>
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-16 bg-slate-200 rounded"></div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const voices = voicesData?.voices || [];
  
  // Debug: Check if voices are loaded
  if (voices.length > 0) {
    console.log('Voice selection: Found', voices.length, 'voices');
  } else {
    console.log('Voice selection: No voices found, isLoading:', isLoading, 'voicesData:', voicesData);
  }

  return (
    <Card className="border border-border bg-card/50 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl flex items-center justify-center shadow-md">
              <MicOff className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-foreground">Voice Selection</h3>
              <p className="text-sm text-muted-foreground font-medium">Choose or clone a voice for your campaigns</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="border-slate-300 text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Voice Options Tabs */}
        <div className="flex space-x-1 p-1 bg-accent/50 rounded-xl mb-6">
          <button
            onClick={() => setActiveTab("library")}
            className={`flex-1 py-3 px-4 font-medium rounded-lg transition-all duration-200 ${
              activeTab === "library"
                ? "bg-primary text-primary-foreground shadow-md"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
            }`}
          >
            <Users className="h-4 w-4 inline mr-2" />
            Voice Library
          </button>
          <button
            onClick={() => setActiveTab("clone")}
            className={`flex-1 py-3 px-4 font-medium rounded-lg transition-all duration-200 ${
              activeTab === "clone"
                ? "bg-primary text-primary-foreground shadow-md"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
            }`}
          >
            <Upload className="h-4 w-4 inline mr-2" />
            Clone Voice
          </button>
        </div>

        {/* Voice Library */}
        {activeTab === "library" && (
          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
            {voices.map((voice: any) => (
              <div
                key={voice.id}
                className={`p-4 border rounded-lg transition-all duration-200 ${
                  selectedVoiceId === voice.id
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex-1 cursor-pointer" onClick={() => onVoiceSelect(voice.id)}>
                    <h4 className="font-medium text-foreground">{voice.name}</h4>
                    <p className="text-sm text-muted-foreground">{voice.description}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge
                      variant="secondary"
                      className={
                        voice.category === "premade"
                          ? "bg-blue-100 text-blue-700"
                          : voice.category === "cloned"
                          ? "bg-purple-100 text-purple-700"
                          : "bg-green-100 text-green-700"
                      }
                    >
                      {voice.category}
                    </Badge>
                    {voice.sampleUrl && (
                      <Button
                        size="sm"
                        variant={playingVoice === voice.id ? "default" : "ghost"}
                        className={`w-8 h-8 p-0 ${
                          playingVoice === voice.id 
                            ? "bg-primary hover:bg-primary/90" 
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleVoicePreview(voice);
                        }}
                      >
                        {playingVoice === voice.id ? (
                          isPlaying ? (
                            <Pause className="h-4 w-4" />
                          ) : (
                            <Play className="h-4 w-4" />
                          )
                        ) : (
                          <Play className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                  </div>
                </div>
                {selectedVoiceId === voice.id && (
                  <div className="mt-2 pt-2 border-t border-border/50">
                    <p className="text-xs text-muted-foreground">Selected for campaign</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Clone Voice Form */}
        {activeTab === "clone" && (
          <div className="space-y-4">
            <div>
              <Label htmlFor="voice-name">Voice Name</Label>
              <Input
                id="voice-name"
                value={cloneName}
                onChange={(e) => setCloneName(e.target.value)}
                placeholder="e.g., Sales Agent Voice"
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="voice-description">Description (Optional)</Label>
              <Input
                id="voice-description"
                value={cloneDescription}
                onChange={(e) => setCloneDescription(e.target.value)}
                placeholder="e.g., Professional and friendly sales voice"
                className="mt-1.5"
              />
            </div>
            <div
              className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => document.getElementById('voice-upload')?.click()}
            >
              <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-4" />
              <p className="text-sm font-medium text-foreground mb-2">Upload Voice Sample</p>
              <p className="text-xs text-muted-foreground mb-4">MP3 or WAV file, max 50MB</p>
              <Button
                variant="secondary"
                disabled={cloneVoiceMutation.isPending}
              >
                {cloneVoiceMutation.isPending ? "Uploading..." : "Choose File"}
              </Button>
              <input
                id="voice-upload"
                type="file"
                accept="audio/*"
                className="hidden"
                onChange={handleFileInput}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
