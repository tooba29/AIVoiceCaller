import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MicOff, Play, Upload, Users } from "lucide-react";
import { api, type Voice } from "@/lib/api";

interface VoiceSelectionProps {
  selectedVoiceId: string;
  onVoiceSelect: (voiceId: string) => void;
}

export default function VoiceSelection({ selectedVoiceId, onVoiceSelect }: VoiceSelectionProps) {
  const [activeTab, setActiveTab] = useState<"library" | "clone">("library");
  const [cloneName, setCloneName] = useState("");
  const [cloneDescription, setCloneDescription] = useState("");
  const [playingVoice, setPlayingVoice] = useState<string | null>(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get voices
  const { data: voicesData, isLoading } = useQuery({
    queryKey: ["/api/voices"],
    queryFn: () => api.getVoices(),
  });

  // Clone voice mutation
  const cloneVoiceMutation = useMutation({
    mutationFn: ({ file, data }: { file: File; data: { name: string; description?: string } }) =>
      api.cloneVoice(file, data),
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

  const handleVoicePreview = (voice: Voice) => {
    if (playingVoice === voice.id) {
      setPlayingVoice(null);
      return;
    }

    setPlayingVoice(voice.id);
    
    // Simulate playing audio
    setTimeout(() => {
      setPlayingVoice(null);
    }, 3000);

    toast({
      title: "Playing Voice Sample",
      description: `Playing preview for ${voice.name}`,
    });
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

  return (
    <Card className="border border-border bg-card/50 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300">
      <CardHeader>
        <CardTitle className="flex items-center space-x-4">
          <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl flex items-center justify-center shadow-md">
            <MicOff className="h-6 w-6 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-foreground">Voice Selection</h3>
            <p className="text-sm text-muted-foreground font-medium">Choose or clone a voice for your campaigns</p>
          </div>
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
          <div className="space-y-3">
            {voices.map((voice) => (
              <div
                key={voice.id}
                className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                  selectedVoiceId === voice.id
                    ? "border-primary bg-primary/5"
                    : "border-slate-200 hover:border-primary/30"
                }`}
                onClick={() => onVoiceSelect(voice.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center">
                      <MicOff className="h-4 w-4 text-slate-500" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-800">{voice.name}</p>
                      <p className="text-sm text-slate-500">{voice.description}</p>
                    </div>
                    {voice.isCloned && (
                      <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full">
                        Cloned
                      </span>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleVoicePreview(voice);
                      }}
                      disabled={playingVoice !== null}
                    >
                      {playingVoice === voice.id ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                      ) : (
                        <Play className="h-4 w-4" />
                      )}
                    </Button>
                    <input
                      type="radio"
                      name="selectedVoice"
                      checked={selectedVoiceId === voice.id}
                      onChange={() => onVoiceSelect(voice.id)}
                      className="text-primary"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Voice Cloning */}
        {activeTab === "clone" && (
          <div className="space-y-4">
            <div className="space-y-4">
              <div>
                <Label htmlFor="voice-name">Voice Name</Label>
                <Input
                  id="voice-name"
                  value={cloneName}
                  onChange={(e) => setCloneName(e.target.value)}
                  placeholder="Enter voice name..."
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="voice-description">Description (Optional)</Label>
                <Input
                  id="voice-description"
                  value={cloneDescription}
                  onChange={(e) => setCloneDescription(e.target.value)}
                  placeholder="Describe the voice..."
                  className="mt-1"
                />
              </div>
            </div>

            <div
              className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => document.getElementById('voice-upload')?.click()}
            >
              <MicOff className="h-8 w-8 text-slate-400 mx-auto mb-3" />
              <p className="text-sm font-medium text-slate-600 mb-2">Upload Voice Sample</p>
              <p className="text-xs text-slate-500 mb-3">MP3, WAV files (min 30 seconds)</p>
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
          </div>
        )}
      </CardContent>
    </Card>
  );
}
