import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { Rocket, Phone, Play, AlertCircle } from "lucide-react";
import { api } from "@/lib/api";

interface CampaignActionsProps {
  campaign: any;
  selectedVoiceId: string;
  uploadedLeads: any[];
}

export default function CampaignActions({ campaign, selectedVoiceId, uploadedLeads }: CampaignActionsProps) {
  const [testPhoneNumber, setTestPhoneNumber] = useState("");
  const [testFirstName, setTestFirstName] = useState("");
  const [testCallStatus, setTestCallStatus] = useState<"idle" | "calling" | "completed" | "failed">("idle");
  
  const { toast } = useToast();

  // Test call mutation
  const testCallMutation = useMutation({
    mutationFn: (data: { phoneNumber: string; campaignId?: number; firstName?: string }) =>
      api.makeTestCall(data),
    onSuccess: (data) => {
      setTestCallStatus("completed");
      toast({
        title: "Test Call Successful",
        description: data.message || "Test call completed successfully.",
      });
      setTimeout(() => setTestCallStatus("idle"), 3000);
    },
    onError: (error: any) => {
      setTestCallStatus("failed");
      toast({
        title: "Test Call Failed",
        description: error.message || "Failed to make test call.",
        variant: "destructive",
      });
      setTimeout(() => setTestCallStatus("idle"), 3000);
    },
  });

  // Start campaign mutation
  const startCampaignMutation = useMutation({
    mutationFn: (campaignId: number) => api.startCampaign(campaignId),
    onSuccess: (data) => {
      toast({
        title: "Campaign Started",
        description: data.message || "Campaign has been started successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Campaign Start Failed",
        description: error.message || "Failed to start campaign.",
        variant: "destructive",
      });
    },
  });

  const handleTestCall = () => {
    if (!testPhoneNumber.trim()) {
      toast({
        title: "Phone Number Required",
        description: "Please enter a phone number for the test call.",
        variant: "destructive",
      });
      return;
    }

    if (!campaign) {
      toast({
        title: "No Campaign",
        description: "Please create a campaign first.",
        variant: "destructive",
      });
      return;
    }

    setTestCallStatus("calling");
    testCallMutation.mutate({
      phoneNumber: testPhoneNumber.trim(),
      campaignId: campaign.id,
      firstName: testFirstName.trim() || "there"
    });
  };

  const handleStartCampaign = () => {
    if (!campaign?.firstPrompt) {
      toast({
        title: "Initial Message Required",
        description: "Please set an initial message for the campaign.",
        variant: "destructive",
      });
      return;
    }

    if (!selectedVoiceId) {
      toast({
        title: "Voice Required",
        description: "Please select a voice for the campaign.",
        variant: "destructive",
      });
      return;
    }

    if (!campaign?.knowledgeBaseId) {
      toast({
        title: "Knowledge Base Required",
        description: "Please upload a knowledge base PDF file.",
        variant: "destructive",
      });
      return;
    }

    if (uploadedLeads.length === 0) {
      toast({
        title: "Leads Required",
        description: "Please upload leads CSV file before starting the campaign.",
        variant: "destructive",
      });
      return;
    }

    const confirmMessage = `Are you sure you want to start the campaign?\n\nThis will:\n- Use the selected voice (${selectedVoiceId})\n- Process ${uploadedLeads.length} leads\n- Use the uploaded knowledge base\n- Start with: "${campaign.firstPrompt}"`;
    
    if (window.confirm(confirmMessage)) {
      startCampaignMutation.mutate(campaign.id);
    }
  };

  const estimatedDuration = Math.ceil(uploadedLeads.length * 2.5 / 60); // Assume 2.5 minutes per call average

  const isReadyToLaunch = campaign?.firstPrompt && selectedVoiceId && campaign?.knowledgeBaseId && uploadedLeads.length > 0;

  return (
    <Card className="border border-border bg-card/50 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300">
      <CardHeader>
        <CardTitle className="flex items-center space-x-4">
          <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-2xl flex items-center justify-center shadow-md">
            <Rocket className="h-6 w-6 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-foreground">Campaign Launch</h3>
            <p className="text-sm text-muted-foreground font-medium">Test and start your campaign</p>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Test Call */}
          <div className="space-y-4">
            <h4 className="font-medium text-slate-800">Test Single Call</h4>
            <div className="flex flex-col space-y-3">
              <div className="flex space-x-3">
                <Input
                  type="text"
                  placeholder="First Name (optional)"
                  value={testFirstName}
                  onChange={(e) => setTestFirstName(e.target.value)}
                  className="flex-1"
                />
              </div>
              <div className="flex space-x-3">
                <Input
                  type="tel"
                  placeholder="+1 (555) 123-4567"
                  value={testPhoneNumber}
                  onChange={(e) => setTestPhoneNumber(e.target.value)}
                  className="flex-1"
                />
                <Button
                  onClick={handleTestCall}
                  disabled={testCallMutation.isPending || testCallStatus === "calling" || !isReadyToLaunch}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {testCallStatus === "calling" ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Calling...
                    </>
                  ) : testCallStatus === "completed" ? (
                    <>
                      <div className="h-4 w-4 rounded-full bg-green-500 mr-2"></div>
                      Completed
                    </>
                  ) : testCallStatus === "failed" ? (
                    <>
                      <AlertCircle className="h-4 w-4 mr-2" />
                      Failed
                    </>
                  ) : (
                    <>
                      <Phone className="h-4 w-4 mr-2" />
                      Test Call
                    </>
                  )}
                </Button>
              </div>

              {/* Test Call Status */}
              {testCallStatus === "calling" && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    <span className="text-sm text-blue-700">Making test call...</span>
                  </div>
                </div>
              )}

              {!isReadyToLaunch && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-700">
                    Complete all required steps to enable test calls:
                    <ul className="mt-2 list-disc list-inside">
                      {!campaign?.firstPrompt && <li>Set initial message</li>}
                      {!selectedVoiceId && <li>Select a voice</li>}
                      {!campaign?.knowledgeBaseId && <li>Upload knowledge base</li>}
                      {uploadedLeads.length === 0 && <li>Upload leads CSV</li>}
                    </ul>
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Launch Campaign */}
          <div className="space-y-4">
            <h4 className="font-medium text-slate-800">Launch Campaign</h4>
            <div className="space-y-4">
              <Button
                onClick={handleStartCampaign}
                disabled={!isReadyToLaunch || startCampaignMutation.isPending}
                className="w-full bg-emerald-600 hover:bg-emerald-700 h-12 text-lg"
              >
                {startCampaignMutation.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                    Starting Campaign...
                  </>
                ) : (
                  <>
                    <Play className="h-5 w-5 mr-2" />
                    Start Campaign
                  </>
                )}
              </Button>

              {/* Campaign Requirements Status */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
                <h5 className="font-medium text-slate-700">Campaign Requirements:</h5>
                <ul className="space-y-2">
                  <li className="flex items-center text-sm">
                    <div className={`w-5 h-5 rounded-full mr-3 flex items-center justify-center ${campaign?.firstPrompt ? 'bg-green-500' : 'bg-slate-300'}`}>
                      {campaign?.firstPrompt && <span className="text-white">✓</span>}
                    </div>
                    Initial Message {campaign?.firstPrompt ? 'Set' : 'Required'}
                  </li>
                  <li className="flex items-center text-sm">
                    <div className={`w-5 h-5 rounded-full mr-3 flex items-center justify-center ${selectedVoiceId ? 'bg-green-500' : 'bg-slate-300'}`}>
                      {selectedVoiceId && <span className="text-white">✓</span>}
                    </div>
                    Voice Selection {selectedVoiceId ? 'Complete' : 'Required'}
                  </li>
                  <li className="flex items-center text-sm">
                    <div className={`w-5 h-5 rounded-full mr-3 flex items-center justify-center ${campaign?.knowledgeBaseId ? 'bg-green-500' : 'bg-slate-300'}`}>
                      {campaign?.knowledgeBaseId && <span className="text-white">✓</span>}
                    </div>
                    Knowledge Base {campaign?.knowledgeBaseId ? 'Uploaded' : 'Required'}
                  </li>
                  <li className="flex items-center text-sm">
                    <div className={`w-5 h-5 rounded-full mr-3 flex items-center justify-center ${uploadedLeads.length > 0 ? 'bg-green-500' : 'bg-slate-300'}`}>
                      {uploadedLeads.length > 0 && <span className="text-white">✓</span>}
                    </div>
                    Leads CSV {uploadedLeads.length > 0 ? `(${uploadedLeads.length} leads)` : 'Required'}
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
