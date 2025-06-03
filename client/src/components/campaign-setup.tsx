import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileText, Upload, X, Save, Bot } from "lucide-react";
import { api } from "@/lib/api";

interface CampaignSetupProps {
  campaign: any;
  onCampaignUpdate: (campaign: any) => void;
}

export default function CampaignSetup({ campaign, onCampaignUpdate }: CampaignSetupProps) {
  const [firstPrompt, setFirstPrompt] = useState(
    campaign?.firstPrompt || "Hi, I'm Sarah from Mathify. I hope you're having a great day!"
  );
  const [systemPersona, setSystemPersona] = useState(
    campaign?.systemPersona || "You are Sarah, a friendly and professional sales representative from Mathify. You help students and parents discover our math tutoring services. Always be helpful, enthusiastic, and respectful of the caller's time."
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
    mutationFn: (data: { firstPrompt: string; systemPersona: string; campaignId?: number }) =>
      api.updateAgent(data),
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
    mutationFn: (file: File) => api.uploadPDF(file),
    onSuccess: () => {
      toast({
        title: "PDF Uploaded",
        description: "Knowledge base has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/knowledge-base"] });
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
    if (!firstPrompt.trim() || !systemPersona.trim()) {
      toast({
        title: "Validation Error",
        description: "Please fill in both first prompt and system persona.",
        variant: "destructive",
      });
      return;
    }

    updateAgentMutation.mutate({
      firstPrompt: firstPrompt.trim(),
      systemPersona: systemPersona.trim(),
      campaignId: campaign?.id,
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
      <Card className="border border-slate-200">
        <CardHeader>
          <CardTitle className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <FileText className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-800">Knowledge Base</h3>
              <p className="text-sm text-slate-600 font-normal">Upload PDF files to train your AI agent</p>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
              isDragging 
                ? "border-primary bg-primary/5" 
                : "border-slate-300 hover:border-primary/50"
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
                    <span className="text-sm font-medium text-slate-700">{file.fileName}</span>
                    <span className="text-xs text-slate-500">
                      {(file.fileSize / 1024 / 1024).toFixed(1)} MB
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                      Uploaded
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* AI Prompt Configuration */}
      <Card className="border border-slate-200">
        <CardHeader>
          <CardTitle className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Bot className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-800">AI Configuration</h3>
              <p className="text-sm text-slate-600 font-normal">Set up your AI agent's personality and behavior</p>
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
              placeholder="Hi, I'm Sarah from Mathify. I hope you're having a great day!"
              className="mt-2 resize-none"
              rows={3}
            />
          </div>

          {/* System Persona */}
          <div>
            <Label htmlFor="system-persona" className="text-sm font-medium text-slate-700">
              System Persona
            </Label>
            <Textarea
              id="system-persona"
              value={systemPersona}
              onChange={(e) => setSystemPersona(e.target.value)}
              placeholder="You are Sarah, a friendly and professional sales representative..."
              className="mt-2 resize-none"
              rows={4}
            />
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
