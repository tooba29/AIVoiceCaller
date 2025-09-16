import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileText, Upload, X, Save, Bot, Trash2, Sparkles, Zap } from "lucide-react";
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
    <div className="space-y-8">
      {/* Enhanced Knowledge Base Upload */}
      <Card className="group relative overflow-hidden border-0 bg-gradient-to-br from-blue-50/80 to-cyan-50/80 dark:from-blue-900/20 dark:to-cyan-900/20 backdrop-blur-xl shadow-xl hover:shadow-2xl transition-all duration-500 hover:scale-[1.02]">
        {/* Animated background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
        
        <CardHeader className="relative z-10">
          <CardTitle className="flex items-center space-x-4">
            <div className="relative">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-110">
                <FileText className="h-7 w-7 text-white" />
              </div>
              <Sparkles className="absolute -top-1 -right-1 h-4 w-4 text-yellow-500 animate-pulse" />
            </div>
            <div>
              <h3 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                Knowledge Base
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">
                Upload PDF files to train your AI agent with precision
              </p>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="relative z-10">
          <div
            className={`border-2 border-dashed rounded-3xl p-10 text-center cursor-pointer group/upload ${
              isDragging 
                ? "border-blue-500 bg-blue-50/50 scale-105 shadow-xl" 
                : "border-slate-300/50 hover:border-blue-400/50 hover:bg-blue-50/30 dark:hover:bg-blue-900/10"
            }`}
            onDrop={handleDrop}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onClick={() => document.getElementById('pdf-upload')?.click()}
          >
            <div className="relative">
              <Upload className="h-16 w-16 text-slate-400 mx-auto mb-6 group-hover/upload:text-blue-500 transition-colors duration-300" />
              <Zap className="absolute -top-2 -right-2 h-6 w-6 text-yellow-500 animate-pulse" />
            </div>
            <p className="text-xl font-semibold text-slate-700 dark:text-slate-300 mb-3">Drop your PDF files here</p>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">or click to browse from your computer</p>
            <Button 
              variant="default"
              disabled={pdfUploadMutation.isPending}
              className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
            >
              {pdfUploadMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Uploading...
                </>
              ) : (
                "Choose Files"
              )}
            </Button>
            <input
              id="pdf-upload"
              type="file"
              accept=".pdf"
              className="hidden"
              onChange={handleFileInput}
            />
          </div>

          {/* Enhanced Uploaded Files */}
          {knowledgeBase?.knowledgeBase && knowledgeBase.knowledgeBase.length > 0 && (
            <div className="mt-6 space-y-3">
              <h4 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-4">Uploaded Files</h4>
              {knowledgeBase.knowledgeBase.map((file: any) => (
                <div key={file.id} className="flex items-center justify-between p-4 bg-white/80 dark:bg-slate-800/80 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 shadow-lg hover:shadow-xl transition-all duration-300">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-pink-500 rounded-xl flex items-center justify-center">
                      <FileText className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{file.filename}</span>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {file.fileSize ? `${(file.fileSize / 1024 / 1024).toFixed(1)} MB` : 'PDF File'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className="px-3 py-1 bg-gradient-to-r from-green-500 to-emerald-500 text-white text-xs rounded-full font-semibold shadow-md">
                      Uploaded
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-300"
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

      {/* Enhanced AI Prompt Configuration */}
      <Card className="group relative overflow-hidden border-0 bg-gradient-to-br from-indigo-50/80 to-purple-50/80 dark:from-indigo-900/20 dark:to-purple-900/20 backdrop-blur-xl shadow-xl hover:shadow-2xl transition-all duration-500 hover:scale-[1.02]">
        {/* Animated background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
        
        <CardHeader className="relative z-10">
          <CardTitle className="flex items-center space-x-4">
            <div className="relative">
              <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-2xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-110">
                <Bot className="h-7 w-7 text-white" />
              </div>
              <Sparkles className="absolute -top-1 -right-1 h-4 w-4 text-yellow-500 animate-pulse" />
            </div>
            <div>
              <h3 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                AI Configuration
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">
                Set up your AI agent's personality and behavior patterns
              </p>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="relative z-10 space-y-6">
          {/* Enhanced First Prompt */}
          <div className="space-y-3">
            <Label htmlFor="first-prompt" className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              First Prompt
            </Label>
            <Textarea
              id="first-prompt"
              value={firstPrompt}
              onChange={(e) => setFirstPrompt(e.target.value)}
              placeholder="Hi {{first_name}}, I'm Sarah from Mathify. I hope you're having a great day!"
              className="resize-none border-slate-200/50 dark:border-slate-700/50 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm focus:border-indigo-400 focus:ring-indigo-400/20 transition-all duration-300"
              rows={3}
            />
            <p className="text-xs text-slate-500 dark:text-slate-400">
              This is the first message your AI agent will say when calling leads.
            </p>
          </div>

          {/* Enhanced System Persona */}
          <div className="space-y-3">
            <Label htmlFor="system-persona" className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              System Persona (Pre-configured)
            </Label>
            <Textarea
              id="system-persona"
              value={systemPersona}
              disabled
              className="resize-none bg-slate-50/80 dark:bg-slate-700/80 text-slate-500 dark:text-slate-400 border-slate-200/50 dark:border-slate-600/50"
              rows={4}
            />
            <p className="text-xs text-slate-500 dark:text-slate-400">
              The system persona is pre-configured for optimal performance and cannot be modified.
            </p>
          </div>

          <Button 
            onClick={handleUpdateAgent}
            disabled={updateAgentMutation.isPending}
            className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
          >
            {updateAgentMutation.isPending ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Updating Agent...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Update AI Agent
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
