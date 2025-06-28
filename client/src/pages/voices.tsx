import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Search, Play, Upload, MicOff, Trash2, Plus, Pause } from "lucide-react";
import { api, type Voice } from "@/lib/api";
import Sidebar from "@/components/sidebar";

export default function Voices() {
  const [searchTerm, setSearchTerm] = useState("");
  const [showCloneForm, setShowCloneForm] = useState(false);
  const [cloneName, setCloneName] = useState("");
  const [cloneDescription, setCloneDescription] = useState("");
  const [playingVoice, setPlayingVoice] = useState<string | null>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  
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

  const { data: voicesData, isLoading } = useQuery({
    queryKey: ["/api/voices"],
    queryFn: () => api.getVoices(),
    staleTime: 0, // Always refetch
    cacheTime: 0, // Don't cache
  });

  const cloneVoiceMutation = useMutation({
    mutationFn: ({ file, data }: { file: File; data: { name: string; description?: string } }) =>
      api.uploadVoiceSample(file, data.name, data.description),
    onSuccess: () => {
      toast({
        title: "Voice Cloned",
        description: "Voice has been cloned successfully.",
      });
      setCloneName("");
      setCloneDescription("");
      setShowCloneForm(false);
      queryClient.invalidateQueries({ queryKey: ["/api/voices"] });
    },
    onError: (error: any) => {
      toast({
        title: "Clone Failed",
        description: error.message || "Failed to clone voice.",
        variant: "destructive",
      });
    },
  });

  const voices = voicesData?.voices || [];
  const filteredVoices = voices.filter((voice: any) =>
    voice.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    voice.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
      }, 10000);

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

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-card border-b border-border px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold text-foreground bg-gradient-to-r from-primary to-violet-400 bg-clip-text text-transparent">
                Voice Library
              </h2>
              <p className="text-muted-foreground mt-2">Manage and clone voices for your campaigns</p>
            </div>
            <Button 
              onClick={() => setShowCloneForm(true)}
              className="bg-primary hover:bg-primary/90 shadow-lg"
            >
              <Plus className="h-4 w-4 mr-2" />
              Clone Voice
            </Button>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-8 bg-background">
          <div className="max-w-7xl mx-auto space-y-6">
            
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search voices..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Clone Voice Form */}
            {showCloneForm && (
              <Card className="border border-border bg-card/50 backdrop-blur-sm shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-md">
                      <Upload className="h-5 w-5 text-white" />
                    </div>
                    <span>Clone New Voice</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="voice-name">Voice Name</Label>
                      <Input
                        id="voice-name"
                        value={cloneName}
                        onChange={(e) => setCloneName(e.target.value)}
                        placeholder="Enter voice name..."
                      />
                    </div>
                    <div>
                      <Label htmlFor="voice-description">Description (Optional)</Label>
                      <Input
                        id="voice-description"
                        value={cloneDescription}
                        onChange={(e) => setCloneDescription(e.target.value)}
                        placeholder="Describe the voice..."
                      />
                    </div>
                  </div>

                  <div
                    className="border-2 border-dashed border-border/50 rounded-2xl p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
                    onClick={() => document.getElementById('voice-upload')?.click()}
                  >
                    <MicOff className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-sm font-medium text-foreground mb-2">Upload Voice Sample</p>
                    <p className="text-xs text-muted-foreground mb-3">MP3, WAV files (min 30 seconds)</p>
                    <Button
                      variant="default"
                      disabled={cloneVoiceMutation.isPending}
                      className="bg-primary hover:bg-primary/90"
                    >
                      {cloneVoiceMutation.isPending ? "Cloning..." : "Choose Audio File"}
                    </Button>
                    <input
                      id="voice-upload"
                      type="file"
                      accept="audio/*"
                      className="hidden"
                      onChange={handleFileInput}
                    />
                  </div>

                  <div className="flex justify-end space-x-3">
                    <Button variant="outline" onClick={() => setShowCloneForm(false)}>
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Voices Grid */}
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <Card key={i} className="border border-border">
                    <CardContent className="p-6">
                      <div className="animate-pulse space-y-4">
                        <div className="h-4 bg-muted rounded w-3/4"></div>
                        <div className="h-3 bg-muted rounded w-1/2"></div>
                        <div className="h-10 bg-muted rounded"></div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : filteredVoices.length === 0 ? (
              <Card className="border border-border bg-card/50">
                <CardContent className="p-12 text-center">
                  <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                    <MicOff className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-2">
                    {searchTerm ? "No voices found" : "No voices available"}
                  </h3>
                  <p className="text-muted-foreground mb-6">
                    {searchTerm 
                      ? "Try adjusting your search terms" 
                      : "Clone your first voice to get started"
                    }
                  </p>
                  {!searchTerm && (
                    <Button 
                      onClick={() => setShowCloneForm(true)}
                      className="bg-primary hover:bg-primary/90"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Clone Voice
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {filteredVoices.map((voice: any) => (
                  <Card key={voice.id} className="border border-border bg-card/50 backdrop-blur-sm hover:bg-card/80 transition-all duration-300 shadow-lg hover:shadow-xl">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center shadow-md">
                            <MicOff className="h-6 w-6 text-white" />
                          </div>
                          <div>
                            <CardTitle className="text-lg font-semibold text-foreground">
                              {voice.name}
                            </CardTitle>
                            <p className="text-sm text-muted-foreground">{voice.description}</p>
                          </div>
                        </div>
                        {voice.isCloned && (
                          <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300">
                            Cloned
                          </Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <Button
                          variant={playingVoice === voice.id ? "default" : "outline"}
                          size="sm"
                          onClick={() => handleVoicePreview(voice)}
                          className={`flex-1 mr-2 ${
                            playingVoice === voice.id 
                              ? "bg-primary hover:bg-primary/90" 
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          {playingVoice === voice.id ? (
                            isPlaying ? (
                              <>
                                <Pause className="h-4 w-4 mr-2" />
                                Pause
                              </>
                            ) : (
                              <>
                                <Play className="h-4 w-4 mr-2" />
                                Resume
                              </>
                            )
                          ) : (
                            <>
                              <Play className="h-4 w-4 mr-2" />
                              Preview
                            </>
                          )}
                        </Button>
                        
                        {voice.isCloned && (
                          <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}