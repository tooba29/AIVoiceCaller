import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Users, Upload, FileSpreadsheet } from "lucide-react";
import { api } from "@/lib/api";

interface LeadsUploadProps {
  campaignId?: number;
  onLeadsUpload: (leads: any[]) => void;
  uploadedLeads: any[];
}

export default function LeadsUpload({ campaignId, onLeadsUpload, uploadedLeads }: LeadsUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // CSV upload mutation
  const csvUploadMutation = useMutation({
    mutationFn: ({ file, campaignId }: { file: File; campaignId: number }) =>
      api.uploadCSV(file, campaignId),
    onSuccess: (data) => {
      toast({
        title: "CSV Uploaded",
        description: `Successfully uploaded ${data.leadsCount} leads.`,
      });
      onLeadsUpload(data.leads || []);
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
    },
    onError: (error: any) => {
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload CSV.",
        variant: "destructive",
      });
    },
  });

  const handleCSVUpload = (file: File) => {
    if (!campaignId) {
      toast({
        title: "No Campaign",
        description: "Please create or select a campaign first.",
        variant: "destructive",
      });
      return;
    }

    if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
      toast({
        title: "Invalid File",
        description: "Please upload a CSV file.",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB
      toast({
        title: "File Too Large",
        description: "CSV file must be smaller than 5MB.",
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
        title: "Invalid File",
        description: "Please upload a CSV file.",
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

  return (
    <Card className="border border-slate-200">
      <CardHeader>
        <CardTitle className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
            <Users className="h-5 w-5 text-orange-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-800">Lead Management</h3>
            <p className="text-sm text-slate-600 font-normal">Upload and manage your calling lists</p>
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
          <p className="text-sm font-medium text-slate-600 mb-2">Upload CSV File</p>
          <p className="text-xs text-slate-500 mb-3">
            Required columns: first_name, last_name, contact_no
          </p>
          <Button
            variant="default"
            disabled={csvUploadMutation.isPending || !campaignId}
            className="bg-primary hover:bg-primary/90"
          >
            {csvUploadMutation.isPending ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Uploading...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Upload CSV
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
              Please create a campaign first to upload leads.
            </p>
          </div>
        )}

        {/* Lead Preview */}
        {uploadedLeads.length > 0 && (
          <div className="bg-slate-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-slate-700">Uploaded Leads</p>
              <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                {uploadedLeads.length} contacts
              </Badge>
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
                  +{uploadedLeads.length - 10} more contacts...
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
