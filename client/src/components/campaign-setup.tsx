import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileText, Upload, X, Save, Bot, Trash2 } from "lucide-react";
import { api } from "@/lib/api";

interface CampaignSetupProps {
  campaign: any;
  onCampaignUpdate: (campaign: any) => void;
}

export default function CampaignSetup({ campaign, onCampaignUpdate }: CampaignSetupProps) {
  const [firstPrompt, setFirstPrompt] = useState(
    campaign?.firstPrompt || "Hi {{first_name}}, I'm Sarah from Mathify. I hope you're having a great day!"
  );
  const [systemPersona, setSystemPersona] = useState(
    campaign?.systemPersona || 
    "You are a friendly, professional sales assistant talking to {{first_name}}. You help potential customers by clearly explaining services, answering questions, and guiding them toward the right solution. Always be helpful, confident, and respectful of their time."
  );  
  const [isDragging, setIsDragging] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get knowledge base
  const { data: knowledgeBase } = useQuery({
    queryKey: ["/api/knowledge-base"],
    queryFn: () => api.getKnowledgeBase(),
  });

  // Update agent mutation
  const updateAgentMutation = useMutation({
    mutationFn: (data: { 
      firstPrompt: string; 
      systemPersona?: string; 
      campaignId?: number;
      voiceId?: string;
      knowledgeBaseId?: string;
    }) => api.updateAgent(data),
    onSuccess: (data) => {
      toast({
        title: "Agent Updated",
        description: "AI agent configuration has been updated successfully.",
      });
      onCampaignUpdate(data.campaign);
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update agent configuration.",
        variant: "destructive",
      });
    },
  });

  // PDF upload mutation
  const pdfUploadMutation = useMutation({
    mutationFn: (file: File) => api.uploadPDF(file, campaign.id.toString()),
    onSuccess: (data) => {
      toast({
        title: "PDF Uploaded",
        description: "Knowledge base has been updated successfully.",
      });
      // Update campaign with new knowledge base ID
      if (data.knowledgeBase?.id) {
        onCampaignUpdate({
          ...campaign,
          knowledgeBaseId: data.knowledgeBase.id.toString()
        });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/knowledge-base"] });
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
    },
    onError: (error: any) => {
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload PDF.",
        variant: "destructive",
      });
    },
  });

  const handleUpdateAgent = () => {
    if (!firstPrompt.trim()) {
      toast({
        title: "Validation Error",
        description: "Please provide a first prompt message.",
        variant: "destructive",
      });
      return;
    }

    // Get the latest uploaded knowledge base file ID
    const latestKnowledgeBase = knowledgeBase?.knowledgeBase?.[0];

    // Create or update campaign
    updateAgentMutation.mutate({
      firstPrompt: firstPrompt.trim(),
      systemPersona: systemPersona.trim(),
      campaignId: campaign?.id || undefined, // If no ID, it will create a new campaign
      voiceId: campaign?.selectedVoiceId,
      knowledgeBaseId: latestKnowledgeBase?.id
    }, {
      onSuccess: (data) => {
        // Ensure the campaign object is properly updated with the new ID
        onCampaignUpdate(data.campaign);
        toast({
          title: "Campaign Updated",
          description: "Campaign settings have been saved successfully.",
        });
        queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
      }
    });
  };

  const handlePDFUpload = (file: File) => {
    if (file.type !== 'application/pdf') {
      toast({
        title: "Invalid File",
        description: "Please upload a PDF file.",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB
      toast({
        title: "File Too Large",
        description: "PDF file must be smaller than 10MB.",
        variant: "destructive",
      });
      return;
    }

    pdfUploadMutation.mutate(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    const pdfFile = files.find(file => file.type === 'application/pdf');
    
    if (pdfFile) {
      handlePDFUpload(pdfFile);
    } else {
      toast({
        title: "Invalid File",
        description: "Please upload a PDF file.",
        variant: "destructive",
      });
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handlePDFUpload(file);
    }
  };

  return (
    <div className="space-y-6">
      {/* Knowledge Base Upload */}
      <Card className="border border-border bg-card/50 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300">
        <CardHeader>
          <CardTitle className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center shadow-md">
              <FileText className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-foreground">Knowledge Base</h3>
              <p className="text-sm text-muted-foreground font-medium">Upload PDF files to train your AI agent</p>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div
            className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-300 cursor-pointer ${
              isDragging 
                ? "border-primary bg-primary/10 scale-105" 
                : "border-border/50 hover:border-primary/50 hover:bg-accent/20"
            }`}
            onDrop={handleDrop}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onClick={() => document.getElementById('pdf-upload')?.click()}
          >
            <Upload className="h-12 w-12 text-slate-400 mx-auto mb-4" />
            <p className="text-lg font-medium text-slate-600 mb-2">Drop your PDF files here</p>
            <p className="text-sm text-slate-500 mb-4">or click to browse</p>
            <Button 
              variant="default"
              disabled={pdfUploadMutation.isPending}
              className="bg-primary hover:bg-primary/90"
            >
              {pdfUploadMutation.isPending ? "Uploading..." : "Choose Files"}
            </Button>
            <input
              id="pdf-upload"
              type="file"
              accept=".pdf"
              className="hidden"
              onChange={handleFileInput}
            />
          </div>

          {/* Uploaded Files */}
          {knowledgeBase?.knowledgeBase && knowledgeBase.knowledgeBase.length > 0 && (
            <div className="mt-4 space-y-2">
              {knowledgeBase.knowledgeBase.map((file: any) => (
                <div key={file.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <FileText className="h-4 w-4 text-red-500" />
                    <span className="text-sm font-medium text-slate-700">{file.filename}</span>
                    <span className="text-xs text-slate-500">
                      {file.fileSize ? `${(file.fileSize / 1024 / 1024).toFixed(1)} MB` : 'PDF File'}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                      Uploaded
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => {
                        if (campaign?.id) {
                          const confirmDelete = window.confirm(
                            "Are you sure you want to delete this file? This will remove it from the AI agent's knowledge base."
                          );
                          if (confirmDelete) {
                            api.deleteKnowledgeBase(file.id, campaign.id)
                              .then(() => {
                                toast({
                                  title: "File Deleted",
                                  description: "Knowledge base file has been removed successfully.",
                                });
                                queryClient.invalidateQueries({ queryKey: ["/api/knowledge-base"] });
                              })
                              .catch((error) => {
                                toast({
                                  title: "Delete Failed",
                                  description: error.message || "Failed to delete file",
                                  variant: "destructive",
                                });
                              });
                          }
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* AI Prompt Configuration */}
      <Card className="border border-border bg-card/50 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300">
        <CardHeader>
          <CardTitle className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-md">
              <Bot className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-foreground">AI Configuration</h3>
              <p className="text-sm text-muted-foreground font-medium">Set up your AI agent's personality and behavior</p>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* First Prompt */}
          <div>
            <Label htmlFor="first-prompt" className="text-sm font-medium text-slate-700">
              First Prompt
            </Label>
            <Textarea
              id="first-prompt"
              value={firstPrompt}
              onChange={(e) => setFirstPrompt(e.target.value)}
              placeholder="Hi {{first_name}}, I'm Sarah from Mathify. I hope you're having a great day!"
              className="mt-2 resize-none"
              rows={3}
            />
          </div>

          {/* System Persona - Disabled */}
          <div>
            <Label htmlFor="system-persona" className="text-sm font-medium text-slate-700">
              System Persona (Fixed)
            </Label>
            <Textarea
              id="system-persona"
              value={systemPersona}
              disabled
              className="mt-2 resize-none bg-slate-50 text-slate-500"
              rows={4}
            />
            <p className="mt-1 text-xs text-slate-500">
              The system persona is pre-configured for optimal performance.
            </p>
          </div>

          <Button 
            onClick={handleUpdateAgent}
            disabled={updateAgentMutation.isPending}
            className="w-full bg-primary hover:bg-primary/90"
          >
            {updateAgentMutation.isPending ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Updating...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Update Agent
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
