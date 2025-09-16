import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MicOff, Play, Pause, Upload, Users, RefreshCw, Sparkles, Zap } from "lucide-react";
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
  const { data: voicesData, isLoading, refetch } = useQuery<any>({
    queryKey: ["/api/voices"],
    queryFn: () => api.getVoices(),
    staleTime: 0, // Always refetch
    gcTime: 0, // Don't cache
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
      const base = api.getBaseUrl();
      const proxyUrl = `${base}/api/voices/preview/${voice.id}`;
      
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
      <Card className="border-0 bg-gradient-to-br from-blue-50/80 to-indigo-50/80 dark:from-blue-900/20 dark:to-indigo-900/20 backdrop-blur-xl shadow-xl">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/2"></div>
            <div className="h-12 bg-slate-200 dark:bg-slate-700 rounded"></div>
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-16 bg-slate-200 dark:bg-slate-700 rounded"></div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const voices: any[] = Array.isArray(voicesData) ? voicesData : (voicesData?.voices || []);
  
  // Debug: Check if voices are loaded
  if (voices.length > 0) {
    console.log('Voice selection: Found', voices.length, 'voices');
  } else {
    console.log('Voice selection: No voices found, isLoading:', isLoading, 'voicesData:', voicesData);
  }

  return (
    <Card className="group relative overflow-hidden border-0 bg-gradient-to-br from-blue-50/80 to-indigo-50/80 dark:from-blue-900/20 dark:to-indigo-900/20 backdrop-blur-xl shadow-xl hover:shadow-2xl transition-all duration-500 hover:scale-[1.02]">
      {/* Animated background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
      
      <CardHeader className="relative z-10">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-2xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-110">
                <MicOff className="h-7 w-7 text-white" />
              </div>
              <Sparkles className="absolute -top-1 -right-1 h-4 w-4 text-yellow-500 animate-pulse" />
            </div>
            <div>
              <h3 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Voice Selection
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">
                Choose or clone a voice for your campaigns
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="border-slate-300/50 text-slate-700 dark:text-slate-300 hover:bg-slate-100/50 dark:hover:bg-slate-800/50 transition-all duration-300"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="relative z-10">
        {/* Enhanced Voice Options Tabs */}
        <div className="flex space-x-2 p-2 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm rounded-2xl mb-6 border border-slate-200/50 dark:border-slate-700/50">
          <button
            onClick={() => setActiveTab("library")}
            className={`flex-1 py-3 px-4 font-semibold rounded-xl transition-all duration-300 ${
              activeTab === "library"
                ? "bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-lg"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100/50 dark:hover:bg-slate-700/50"
            }`}
          >
            <Users className="h-4 w-4 inline mr-2" />
            Voice Library
          </button>
          <button
            onClick={() => setActiveTab("clone")}
            className={`flex-1 py-3 px-4 font-semibold rounded-xl transition-all duration-300 ${
              activeTab === "clone"
                ? "bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-lg"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100/50 dark:hover:bg-slate-700/50"
            }`}
          >
            <Upload className="h-4 w-4 inline mr-2" />
            Clone Voice
          </button>
        </div>

        {/* Enhanced Voice Library */}
        {activeTab === "library" && (
          <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
            {voices.map((voice: any) => (
              <div
                key={voice.id}
                className={`group/voice p-4 border-2 rounded-2xl transition-all duration-300 cursor-pointer ${
                  selectedVoiceId === voice.id
                    ? "border-blue-500 bg-gradient-to-r from-blue-50/80 to-indigo-50/80 dark:from-blue-900/20 dark:to-indigo-900/20 shadow-lg"
                    : "border-slate-200/50 dark:border-slate-700/50 hover:border-blue-400/50 hover:bg-white/50 dark:hover:bg-slate-800/50"
                }`}
                onClick={() => onVoiceSelect(voice.id)}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex-1">
                    <h4 className="font-semibold text-slate-800 dark:text-slate-200 group-hover/voice:text-blue-600 dark:group-hover/voice:text-blue-400 transition-colors duration-300">
                      {voice.name}
                    </h4>
                    <p className="text-sm text-slate-600 dark:text-slate-400">{voice.description}</p>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Badge
                      variant="secondary"
                      className={
                        voice.category === "premade"
                          ? "bg-gradient-to-r from-blue-500 to-cyan-500 text-white"
                          : voice.category === "cloned"
                          ? "bg-gradient-to-r from-indigo-500 to-purple-500 text-white"
                          : "bg-gradient-to-r from-purple-500 to-pink-500 text-white"
                      }
                    >
                      {voice.category}
                    </Badge>
                    {voice.sampleUrl && (
                      <Button
                        size="sm"
                        variant={playingVoice === voice.id ? "default" : "ghost"}
                        className={`w-10 h-10 p-0 rounded-xl transition-all duration-300 ${
                          playingVoice === voice.id 
                            ? "bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 shadow-lg" 
                            : "text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-900/20"
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
                  <div className="mt-3 pt-3 border-t border-blue-200/50 dark:border-blue-700/50">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full animate-pulse"></div>
                      <p className="text-xs text-blue-600 dark:text-blue-400 font-semibold">Selected for campaign</p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Enhanced Clone Voice Form */}
        {activeTab === "clone" && (
          <div className="space-y-6">
            <div className="space-y-3">
              <Label htmlFor="voice-name" className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Voice Name
              </Label>
              <Input
                id="voice-name"
                value={cloneName}
                onChange={(e) => setCloneName(e.target.value)}
                placeholder="e.g., Sales Agent Voice"
                className="border-slate-200/50 dark:border-slate-700/50 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm focus:border-blue-400 focus:ring-blue-400/20 transition-all duration-300"
              />
            </div>
            <div className="space-y-3">
              <Label htmlFor="voice-description" className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Description (Optional)
              </Label>
              <Input
                id="voice-description"
                value={cloneDescription}
                onChange={(e) => setCloneDescription(e.target.value)}
                placeholder="e.g., Professional and friendly sales voice"
                className="border-slate-200/50 dark:border-slate-700/50 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm focus:border-blue-400 focus:ring-blue-400/20 transition-all duration-300"
              />
            </div>
            <div
              className="border-2 border-dashed border-slate-300/50 dark:border-slate-600/50 rounded-3xl p-8 text-center cursor-pointer hover:border-blue-400/50 hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition-all duration-300 group/upload"
              onClick={() => document.getElementById('voice-upload')?.click()}
            >
              <div className="relative">
                <Upload className="h-12 w-12 text-slate-400 mx-auto mb-4 group-hover/upload:text-blue-500 transition-colors duration-300" />
                <Zap className="absolute -top-2 -right-2 h-5 w-5 text-yellow-500 animate-pulse" />
              </div>
              <p className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-2">Upload Voice Sample</p>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">MP3 or WAV file, max 50MB</p>
              <Button
                variant="secondary"
                disabled={cloneVoiceMutation.isPending}
                className="bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
              >
                {cloneVoiceMutation.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Uploading...
                  </>
                ) : (
                  "Choose File"
                )}
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
