import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileText, Upload, Save, Bot, Trash2, XCircle } from "lucide-react";
import { api } from "@/lib/api";
import { useTranslation } from "react-i18next";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import PromptEditor from "./prompt-editor";

interface CampaignSetupProps {
  campaign: any;
  onCampaignUpdate: (campaign: any) => void;
}

export default function CampaignSetup({ campaign, onCampaignUpdate }: CampaignSetupProps) {
  const { t } = useTranslation();
  const [firstPrompt, setFirstPrompt] = useState(
    campaign?.firstPrompt || "Hi {{first_name}}, I'm Sarah from Mathify. I hope you're having a great day!"
  );
  const [systemPersona] = useState(
    campaign?.systemPersona || 
    "You are a friendly, professional sales assistant talking to {{first_name}}. You help potential customers by clearly explaining services, answering questions, and guiding them toward the right solution. Always be helpful, confident, and respectful of their time."
  );  
  const [isDragging, setIsDragging] = useState(false);
  const [forceHideError, setForceHideError] = useState(false);
  const [recentlyUploadedFile, setRecentlyUploadedFile] = useState<any>(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get knowledge base for the specific campaign
  const { data: knowledgeBase, isLoading: knowledgeBaseLoading, error: knowledgeBaseError, refetch: refetchKnowledgeBase } = useQuery({
    queryKey: [`/api/campaigns/${campaign?.id}/knowledge-base`],
    queryFn: async () => {
      if (!campaign?.id) {
        console.log("[Campaign Setup] No campaign selected, returning empty knowledge base");
        return Promise.resolve({ knowledgeBase: [] });
      }
      
      // Additional validation to ensure campaign is properly initialized
      if (!campaign.name || typeof campaign.id !== 'number') {
        console.log("[Campaign Setup] Campaign not fully initialized, waiting...");
        return Promise.resolve({ knowledgeBase: [] });
      }
      
      console.log(`[Campaign Setup] 📚 Fetching knowledge base for campaign ${campaign.id} (${campaign.name})`);
      try {
        const result = await api.getCampaignKnowledgeBase(campaign.id);
        console.log(`[Campaign Setup] ✅ Knowledge base fetch successful:`, result);
        return result;
      } catch (error) {
        console.error(`[Campaign Setup] ❌ Knowledge base fetch failed:`, error);
        // For new campaigns, if the fetch fails, return empty instead of throwing
        if (error instanceof Error && error.message.includes('Campaign not found')) {
          console.log("[Campaign Setup] Campaign might be new, returning empty knowledge base");
          return { knowledgeBase: [] };
        }
        throw error; // Re-throw other errors
      }
    },
    enabled: !!campaign?.id && !!campaign?.name && typeof campaign?.id === 'number',
    staleTime: 0, // Always fetch fresh data
    gcTime: 0,
    retry: 1, // Only retry once to prevent infinite loops
    retryDelay: 1000 // Wait 1 second before retrying
  });

  // Clear stale error states when campaign changes
  useEffect(() => {
    if (campaign?.id) {
      // Reset all local state when campaign changes
      setForceHideError(false);
      setRecentlyUploadedFile(null);
      // Invalidate and refetch when campaign changes to clear any stale error states
      queryClient.removeQueries({ queryKey: [`/api/campaigns/${campaign.id}/knowledge-base`] });
    }
  }, [campaign?.id, queryClient]);

  // Log knowledge base fetch results and debug error state
  useEffect(() => {
    console.log(`[Campaign Setup] 📊 Query State Debug:`, {
      hasData: !!knowledgeBase,
      isLoading: knowledgeBaseLoading,
      hasError: !!knowledgeBaseError,
      errorMessage: knowledgeBaseError?.message,
      campaignId: campaign?.id,
      campaignName: campaign?.name,
      dataLength: knowledgeBase?.knowledgeBase?.length,
      forceHideError,
      actualData: knowledgeBase,
      recentlyUploadedFile,
      showUploadedFiles: !knowledgeBaseLoading && ((knowledgeBase?.knowledgeBase && knowledgeBase.knowledgeBase.length > 0) || recentlyUploadedFile),
      showEmptyState: !knowledgeBaseLoading && campaign?.id && (!knowledgeBase?.knowledgeBase || knowledgeBase.knowledgeBase.length === 0) && !recentlyUploadedFile
    });
    
    if (knowledgeBase) {
      console.log(`[Campaign Setup] ✅ Knowledge base fetched:`, knowledgeBase);
      // Force hide any error messages when we have successful data
      setForceHideError(true);
      
      // Update campaign with knowledge base ID if we have files
      if (knowledgeBase.knowledgeBase?.length > 0 && campaign?.id) {
        const latestKnowledgeBase = knowledgeBase.knowledgeBase[0];
        onCampaignUpdate({
          ...campaign,
          knowledgeBaseId: latestKnowledgeBase.id.toString()
        });
      }
      
      // If we have successful data, clear any persistent error states
      if (knowledgeBaseError) {
        console.log(`[Campaign Setup] 🔄 Clearing stale error state after successful data fetch`);
        queryClient.removeQueries({ queryKey: [`/api/campaigns/${campaign?.id}/knowledge-base`] });
        setTimeout(() => {
          refetchKnowledgeBase();
        }, 100);
      }
    }
    
    if (knowledgeBaseError) {
      console.error(`[Campaign Setup] ❌ Error state persisting:`, knowledgeBaseError);
    }
  }, [knowledgeBase, knowledgeBaseLoading, knowledgeBaseError, campaign?.id, queryClient, refetchKnowledgeBase]);

  // Update agent mutation
  const updateAgentMutation = useMutation({
    mutationFn: (data: { 
      firstPrompt: string; 
      systemPersona?: string; 
      campaignId?: number;
      voiceId?: string;
      knowledgeBaseId?: string;
    }) => {
      console.log(`[Campaign Setup] 📡 Sending agent update request:`, data);
      return api.updateAgent(data);
    },
    onSuccess: (data) => {
      console.log(`[Campaign Setup] ✅ Agent update response:`, data);
      // Don't update campaign here - let individual handlers manage their own state
    },
    onError: (error: any) => {
      console.error(`[Campaign Setup] ❌ Agent update failed:`, error);
      toast({
        title: t('campaignSetup.updateFailed'),
        description: error.message || t('campaignSetup.updateFailedMessage'),
        variant: "destructive",
      });
    },
  });

  // PDF upload mutation
  const pdfUploadMutation = useMutation({
    mutationFn: (file: File) => {
      if (!campaign?.id) {
        throw new Error("No campaign selected. Please select or create a campaign first.");
      }
      console.log(`[Campaign Setup] Uploading PDF for campaign ${campaign.id}: ${file.name}`);
      return api.uploadPDF(file, campaign.id.toString());
    },
    onSuccess: (data) => {
      console.log(`[Campaign Setup] ✅ PDF upload successful:`, data);
      
      // Immediately hide any error messages and show the uploaded file
      setForceHideError(true);
      setRecentlyUploadedFile(data.knowledgeBase);
      
      toast({
        title: t('campaignSetup.pdfUploaded'),
        description: `${data.knowledgeBase?.filename || 'File'} ${t('campaignSetup.uploadedSuccessfully')}`,
      });
      
      // Clear cache and force immediate refetch
      const campaignKnowledgeBaseKey = [`/api/campaigns/${campaign?.id}/knowledge-base`];
      
      console.log(`[Campaign Setup] 🔄 Starting post-upload refresh for campaign ${campaign?.id}`);
      
      // Step 1: Clear all cached data
      queryClient.removeQueries({ queryKey: campaignKnowledgeBaseKey });
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
      
      // Step 2: Force immediate refetch with delay to ensure cache is cleared
      setTimeout(() => {
        refetchKnowledgeBase()
          .then((result) => {
            console.log(`[Campaign Setup] ✅ Post-upload refetch result:`, result);
            // Clear the temporary file once we have fresh data
            setRecentlyUploadedFile(null);
          })
          .catch((error) => {
            console.error(`[Campaign Setup] ❌ Post-upload refetch failed:`, error);
            // If refetch fails, keep the recently uploaded file visible
            toast({
              title: t('campaignSetup.refreshFailed'),
              description: t('campaignSetup.refreshFailedMessage'),
              variant: "destructive",
            });
          });
      }, 1000);
      
      console.log(`[Campaign Setup] 🔄 Cleared cache and initiated fresh fetch for campaign ${campaign?.id}`);
    },
    onError: (error: any) => {
      console.error(`[Campaign Setup] ❌ PDF upload failed:`, error);
      toast({
        title: t('campaignSetup.uploadFailed'),
        description: error.message || t('campaignSetup.uploadFailedMessage'),
        variant: "destructive",
      });
    },
  });

  const handleUpdateAgent = () => {
    if (!firstPrompt.trim()) {
      toast({
        title: t('campaignSetup.validationError'),
        description: t('campaignSetup.provideFirstPrompt'),
        variant: "destructive",
      });
      return;
    }

    if (!campaign?.id) {
      toast({
        title: t('campaignSetup.noCampaignSelectedToast'),
        description: t('campaignSetup.selectCampaignToast'),
        variant: "destructive",
      });
      return;
    }

    console.log(`[Campaign Setup] 🤖 Updating agent for campaign ${campaign.id}`);

    // Get the latest uploaded knowledge base file ID
    const latestKnowledgeBase = knowledgeBase?.knowledgeBase?.[0];

    // Update campaign (campaignId is now required)
    updateAgentMutation.mutate({
      firstPrompt: firstPrompt.trim(),
      systemPersona: systemPersona.trim(),
      campaignId: campaign.id, // Campaign ID is now required
      voiceId: campaign.selectedVoiceId,
      knowledgeBaseId: latestKnowledgeBase?.id
    }, {
      onSuccess: (data) => {
        console.log(`[Campaign Setup] ✅ Agent updated successfully:`, data);
        
        // Preserve existing campaign data while updating with new data
        const updatedCampaign = {
          ...campaign, // Keep existing campaign data (including leads, etc.)
          ...data.campaign, // Apply updates from the server
          id: campaign.id // Ensure ID stays the same
        };
        
        onCampaignUpdate(updatedCampaign);
        
        toast({
          title: t('campaignSetup.agentUpdated'),
          description: t('campaignSetup.agentUpdatedSuccess'),
        });
        
        // Only invalidate campaigns list, not the knowledge base
        queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
        
        console.log(`[Campaign Setup] 🔄 Campaign state updated successfully`);
      }
    });
  };

  const handlePDFUpload = (file: File) => {
    if (file.type !== 'application/pdf') {
      toast({
        title: t('campaignSetup.invalidFile'),
        description: t('campaignSetup.uploadPdfOnly'),
        variant: "destructive",
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB
      toast({
        title: t('campaignSetup.fileTooLarge'),
        description: t('campaignSetup.pdfSizeLimit'),
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
        title: t('campaignSetup.invalidFile'),
        description: t('campaignSetup.uploadPdfOnly'),
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

  // Show message if no campaign is selected
  if (!campaign?.id) {
    return (
      <Card className="glass-card border-gradient shadow-xl">
        <CardContent className="p-8 text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
            <Bot className="h-8 w-8 text-white" />
          </div>
          <h3 className="text-lg font-semibold text-gradient mb-2">{t('campaignSetup.noCampaignSelected')}</h3>
          <p className="text-muted-foreground">
            {t('campaignSetup.noCampaignSelectedMessage')}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Knowledge Base Upload */}
      <Card className="glass-card border-gradient shadow-xl hover:shadow-2xl transition-all duration-300 group">
        <CardHeader>
          <CardTitle className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
              <FileText className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gradient">{t('campaignSetup.knowledgeBaseTitle')}</h3>
              <p className="text-sm text-muted-foreground/80 font-medium">{t('campaignSetup.knowledgeBaseSubtitle')}</p>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div
            className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-300 cursor-pointer relative overflow-hidden ${
              isDragging 
                ? "border-primary bg-gradient-to-br from-blue-50 to-purple-50 scale-105 shadow-lg" 
                : "border-border/50 hover:border-primary/50 hover:bg-gradient-to-br hover:from-blue-50/30 hover:to-purple-50/20"
            }`}
            onDrop={handleDrop}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onClick={() => document.getElementById('pdf-upload')?.click()}
          >
            {/* Background animation */}
            <div className="absolute inset-0 bg-gradient-to-r from-blue-100/20 via-purple-100/20 to-indigo-100/20 opacity-0 hover:opacity-100 transition-opacity duration-500" />
            
            <div className="relative z-10">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg hover:scale-110 transition-transform duration-300">
                <Upload className="h-8 w-8 text-white" />
              </div>
              <p className="text-lg font-medium text-gradient mb-2">{t('campaignSetup.dropFilesHere')}</p>
              <p className="text-sm text-muted-foreground/70 mb-4">{t('campaignSetup.clickToBrowse')}</p>
              <Button 
                variant="default"
                disabled={pdfUploadMutation.isPending}
                className="btn-gradient"
              >
                {pdfUploadMutation.isPending ? t('campaignSetup.uploading') : t('campaignSetup.chooseFiles')}
              </Button>
            </div>
            <input
              id="pdf-upload"
              type="file"
              accept=".pdf"
              className="hidden"
              onChange={handleFileInput}
            />
          </div>

          {/* Loading State */}
          {knowledgeBaseLoading && (
            <div className="mt-4 p-4 bg-slate-50 rounded-lg">
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                <span className="text-sm text-slate-600">{t('campaignSetup.loadingKnowledgeBase')}</span>
              </div>
            </div>
          )}

          {/* Error State - NEVER show if we have successful data or if manually hidden */}
          {false && knowledgeBaseError && 
           !knowledgeBaseLoading && 
           !forceHideError &&
           campaign?.id && 
           !knowledgeBase && 
           !knowledgeBase?.knowledgeBase && // Double check - never show if we have any data
           !(knowledgeBaseError?.message?.includes('Campaign not found')) && (
            <div className="mt-4 p-4 bg-red-50 rounded-lg">
              <div className="flex items-center space-x-2">
                <XCircle className="h-4 w-4 text-red-500" />
                <span className="text-sm text-red-600">{t('campaignSetup.loadKnowledgeBaseFailed')}</span>
              </div>
            </div>
          )}

          {/* Uploaded Files - Show if we have data OR recently uploaded file */}
          {!knowledgeBaseLoading && ((knowledgeBase?.knowledgeBase && knowledgeBase.knowledgeBase.length > 0) || recentlyUploadedFile) && (
            <div className="mt-4 space-y-2">
              <div className="flex items-center space-x-2 mb-2">
                <FileText className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium text-slate-700">
                  {(knowledgeBase?.knowledgeBase?.length || 0) + (recentlyUploadedFile ? 1 : 0)} {t('campaignSetup.filesUploaded')}
                </span>
              </div>
              
              {/* Show recently uploaded file first */}
              {recentlyUploadedFile && (
                <div className="flex items-center justify-between p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200/60 shadow-sm">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center shadow-sm">
                      <FileText className="h-4 w-4 text-white" />
                    </div>
                    <span className="text-sm font-medium text-slate-700">{recentlyUploadedFile.filename}</span>
                    <span className="text-xs text-slate-500">
                      {recentlyUploadedFile.fileSize ? `${(recentlyUploadedFile.fileSize / 1024 / 1024).toFixed(1)} MB` : 'PDF File'}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="px-2 py-1 bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 text-xs rounded-full animate-pulse font-medium shadow-sm">
                      {t('campaignSetup.justUploaded')}
                    </span>
                  </div>
                </div>
              )}
              
              {/* Show fetched files */}
              {knowledgeBase?.knowledgeBase?.map((file: any) => (
                <div key={file.id} className="flex items-center justify-between p-3 bg-gradient-to-r from-slate-50 to-blue-50/30 rounded-lg border border-slate-200/60 shadow-sm hover:shadow-md transition-shadow duration-200">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-sm">
                      <FileText className="h-4 w-4 text-white" />
                    </div>
                    <span className="text-sm font-medium text-slate-700">{file.filename}</span>
                    <span className="text-xs text-slate-500">
                      {file.fileSize ? `${(file.fileSize / 1024 / 1024).toFixed(1)} MB` : 'PDF File'}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="px-2 py-1 bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 text-xs rounded-full font-medium">
                      ✓
                    </span>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Knowledge Base File</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete this file? This will remove it from the AI agent's knowledge base.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => {
                              if (campaign?.id) {
                                console.log(`[Campaign Setup] 🗑️ Deleting file ${file.filename} (ID: ${file.id}) from campaign ${campaign.id}`);
                                api.deleteKnowledgeBase(file.id, campaign.id)
                                  .then((result) => {
                                    console.log(`[Campaign Setup] ✅ File deleted successfully:`, result);
                                    
                                    // Immediately hide any error messages
                                    setForceHideError(true);
                                    
                                    toast({
                                      title: t('campaignSetup.fileDeleted'),
                                      description: `${file.filename} ${t('campaignSetup.fileDeletedSuccess')}`,
                                    });
                                    
                                    // Clear cache and refetch knowledge base
                                    const campaignKnowledgeBaseKey = [`/api/campaigns/${campaign?.id}/knowledge-base`];
                                    queryClient.removeQueries({ queryKey: campaignKnowledgeBaseKey });
                                    queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
                                    
                                    // Force clean refetch
                                    setTimeout(() => {
                                      queryClient.invalidateQueries({ queryKey: campaignKnowledgeBaseKey });
                                      refetchKnowledgeBase();
                                    }, 200);
                                    
                                    console.log(`[Campaign Setup] 🔄 Invalidated queries after file deletion`);
                                  })
                                  .catch((error) => {
                                    console.error(`[Campaign Setup] ❌ File deletion failed:`, error);
                                    toast({
                                      title: t('campaignSetup.fileDeleteFailed'),
                                      description: error.message || t('campaignSetup.fileDeleteFailedMessage'),
                                      variant: "destructive",
                                    });
                                  });
                              }
                            }}
                            className="bg-red-600 hover:bg-red-700 text-white"
                          >
                            Delete File
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* No Campaign Selected State */}
          {!campaign?.id && (
            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              <div className="text-center">
                <FileText className="h-8 w-8 text-blue-400 mx-auto mb-2" />
                <p className="text-sm text-blue-600">{t('campaignSetup.selectCampaignFirst')}</p>
                <p className="text-xs text-blue-500">{t('campaignSetup.knowledgeBaseSpecific')}</p>
              </div>
            </div>
          )}

          {/* Empty State - Show when no data AND no recently uploaded file */}
          {!knowledgeBaseLoading && campaign?.id && (!knowledgeBase?.knowledgeBase || knowledgeBase.knowledgeBase.length === 0) && !recentlyUploadedFile && (
            <div className="mt-4 p-4 bg-slate-50 rounded-lg">
              <div className="text-center">
                <FileText className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                <p className="text-sm text-slate-600">{t('campaignSetup.noFilesUploaded')}</p>
                <p className="text-xs text-slate-500">{t('campaignSetup.uploadPdfsToTrain')}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* AI Prompt Configuration */}
      <Card className="glass-card border-gradient shadow-xl hover:shadow-2xl transition-all duration-300 group">
        <CardHeader>
          <CardTitle className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
              <Bot className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gradient">{t('campaignSetup.aiConfigurationTitle')}</h3>
              <p className="text-sm text-muted-foreground/80 font-medium">{t('campaignSetup.aiConfigurationSubtitle')}</p>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* First Prompt */}
          <PromptEditor
            value={firstPrompt}
            onChange={setFirstPrompt}
            label={t('campaignSetup.firstPrompt')}
            className=""
          />

          {/* System Persona - Disabled */}
          <div>
            <Label htmlFor="system-persona" className="text-sm font-medium text-slate-700">
              {t('campaignSetup.systemPersonaFixed')}
            </Label>
            <Textarea
              id="system-persona"
              value={systemPersona}
              disabled
              className="mt-2 resize-none bg-gradient-to-r from-slate-100 to-blue-100/50 text-slate-600 border-slate-300"
              rows={4}
            />
            <p className="mt-1 text-xs text-slate-500">
              {t('campaignSetup.systemPersonaNote')}
            </p>
          </div>

          <Button 
            onClick={handleUpdateAgent}
            disabled={updateAgentMutation.isPending}
            className="w-full btn-gradient"
          >
            {updateAgentMutation.isPending ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                {t('campaignSetup.updating')}
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                {t('campaignSetup.updateAgent')}
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
