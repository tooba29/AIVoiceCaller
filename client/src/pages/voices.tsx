import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Search, Play, Upload, MicOff, Trash2, Plus } from "lucide-react";
import { api, type Voice } from "@/lib/api";
import Sidebar from "@/components/sidebar";

export default function Voices() {
  const [searchTerm, setSearchTerm] = useState("");
  const [showCloneForm, setShowCloneForm] = useState(false);
  const [cloneName, setCloneName] = useState("");
  const [cloneDescription, setCloneDescription] = useState("");
  const [playingVoice, setPlayingVoice] = useState<string | null>(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: voicesData, isLoading } = useQuery({
    queryKey: ["/api/voices"],
    queryFn: () => api.getVoices(),
  });

  const cloneVoiceMutation = useMutation({
    mutationFn: ({ file, data }: { file: File; data: { name: string; description?: string } }) =>
      api.cloneVoice(file, data),
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
  const filteredVoices = voices.filter(voice =>
    voice.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    voice.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleVoicePreview = async (voice: Voice) => {
    if (playingVoice === voice.id) {
      setPlayingVoice(null);
      return;
    }

    if (!voice.sampleUrl) {
      toast({
        title: "Preview Unavailable",
        description: "No preview available for this voice.",
        variant: "destructive",
      });
      return;
    }

    setPlayingVoice(voice.id);
    
    try {
      const audio = new Audio(voice.sampleUrl);
      await audio.play();
      
      audio.onended = () => {
        setPlayingVoice(null);
      };
    } catch (error) {
      console.error('Error playing voice sample:', error);
      toast({
        title: "Preview Failed",
        description: "Failed to play voice sample.",
        variant: "destructive",
      });
      setPlayingVoice(null);
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
                {filteredVoices.map((voice) => (
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
                          variant="outline"
                          size="sm"
                          onClick={() => handleVoicePreview(voice)}
                          disabled={playingVoice !== null}
                          className="flex-1 mr-2"
                        >
                          {playingVoice === voice.id ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2"></div>
                          ) : (
                            <Play className="h-4 w-4 mr-2" />
                          )}
                          {playingVoice === voice.id ? "Playing..." : "Preview"}
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