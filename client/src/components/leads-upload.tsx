import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "./ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Users, Upload, FileSpreadsheet, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { useTranslation } from "react-i18next";

interface LeadsUploadProps {
  campaignId?: number;
  onLeadsUpload: (leads: any[]) => void;
  uploadedLeads: any[];
}

export default function LeadsUpload({ campaignId, onLeadsUpload, uploadedLeads }: LeadsUploadProps) {
  const { t } = useTranslation();
  const [isDragging, setIsDragging] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // CSV upload mutation
  const csvUploadMutation = useMutation({
    mutationFn: ({ file, campaignId }: { file: File; campaignId: number }) =>
      api.uploadCSV(file, campaignId.toString()),
    onSuccess: (data) => {
      toast({
        title: "Leads Uploaded",
        description: `${data.leadsCount} leads uploaded successfully!`,
        duration: 1000, // Auto-dismiss after 3 seconds
      });
      onLeadsUpload(data.leads || []);
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
    },
    onError: (error: any) => {
      toast({
        title: t('leadsUpload.uploadFailed'),
        description: error.message || t('leadsUpload.uploadFailedMessage'),
        variant: "destructive",
      });
    },
  });

  // Delete leads mutation
  const deleteLeadsMutation = useMutation({
    mutationFn: (campaignId: number) => api.deleteLeads(campaignId),
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete leads",
        variant: "destructive",
        duration: 1000,
      });
    },
  });

  const handleCSVUpload = (file: File) => {
    if (!campaignId) {
      toast({
        title: t('leadsUpload.noCampaign'),
        description: t('leadsUpload.createCampaignFirst'),
        variant: "destructive",
      });
      return;
    }

    if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
      toast({
        title: t('leadsUpload.invalidCsv'),
        description: t('leadsUpload.csvFormatError'),
        variant: "destructive",
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB
      toast({
        title: t('voiceSelection.fileTooLarge'),
        description: t('leadsUpload.csvTooLarge'),
        variant: "destructive",
      });
      return;
    }

    csvUploadMutation.mutate({ file, campaignId });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    const csvFile = files.find(file => 
      file.type === 'text/csv' || file.name.endsWith('.csv')
    );
    
    if (csvFile) {
      handleCSVUpload(csvFile);
    } else {
      toast({
        title: t('leadsUpload.invalidCsv'),
        description: t('leadsUpload.csvFormatError'),
        variant: "destructive",
      });
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleCSVUpload(file);
    }
  };

  const handleDeleteLeads = () => {
    if (!campaignId || typeof campaignId !== 'number') {
      toast({
        title: "Error",
        description: "Campaign ID is required",
        variant: "destructive",
        duration: 1000,
      });
      return;
    }

    deleteLeadsMutation.mutate(campaignId, {
      onSuccess: () => {
        onLeadsUpload([]);
        toast({
          title: "Leads Deleted",
          description: "All leads have been deleted successfully",
          duration: 1000,
        });
      },
    });
  };

  return (
    <Card className="border border-border bg-card/50 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300">
      <CardHeader>
        <CardTitle className="flex items-center space-x-4">
          <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl flex items-center justify-center shadow-md">
            <Users className="h-6 w-6 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-foreground">{t('leadsUpload.title')}</h3>
            <p className="text-sm text-muted-foreground font-medium">{t('leadsUpload.subtitle')}</p>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* CSV Upload */}
        <div
          className={`border-2 border-dashed rounded-lg p-6 text-center mb-4 transition-colors cursor-pointer ${
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
          onClick={() => document.getElementById('csv-upload')?.click()}
        >
          <FileSpreadsheet className="h-8 w-8 text-slate-400 mx-auto mb-3" />
          <p className="text-sm font-medium text-slate-600 mb-2">{t('leadsUpload.uploadCsv')}</p>
          <p className="text-xs text-slate-500 mb-3">
            {t('leadsUpload.requiredColumns')}
          </p>
          <Button
            variant="default"
            disabled={csvUploadMutation.isPending || !campaignId}
            className="bg-primary hover:bg-primary/90"
          >
            {csvUploadMutation.isPending ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                {t('leadsUpload.uploading')}
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                {t('leadsUpload.uploadCsv')}
              </>
            )}
          </Button>
          <input
            id="csv-upload"
            type="file"
            accept=".csv"
            className="hidden"
            onChange={handleFileInput}
          />
        </div>

        {!campaignId && (
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg mb-4">
            <p className="text-sm text-yellow-700">
              {t('leadsUpload.createCampaignFirst')}
            </p>
          </div>
        )}

        {/* Lead Preview */}
        {uploadedLeads.length > 0 && (
          <div className="bg-slate-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <p className="text-sm font-medium text-slate-700">{t('leadsUpload.leadPreview')}</p>
              <div className="flex items-center gap-2 min-w-fit">
                <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                  {uploadedLeads.length} {t('leadsUpload.contacts')}
                </Badge>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-red-600 hover:text-red-700"
                    >
                      Delete All Leads
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete All Leads</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete all {uploadedLeads.length} uploaded leads? This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={handleDeleteLeads}
                        className="bg-red-600 hover:bg-red-700 text-white"
                        disabled={deleteLeadsMutation.isPending}
                      >
                        {deleteLeadsMutation.isPending ? "Deleting..." : "Delete All"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {uploadedLeads.slice(0, 10).map((lead, index) => (
                <div key={index} className="flex items-center justify-between py-2 px-3 bg-white rounded text-xs">
                  <span className="font-medium">
                    {lead.firstName} {lead.lastName}
                  </span>
                  <span className="text-slate-500">{lead.contactNo}</span>
                </div>
              ))}
              {uploadedLeads.length > 10 && (
                <div className="py-2 px-3 text-center text-xs text-slate-500 bg-white rounded">
                  +{uploadedLeads.length - 10} {t('leadsUpload.moreContacts')}
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
