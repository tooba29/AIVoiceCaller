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
  const [testCallStatus, setTestCallStatus] = useState<"idle" | "calling" | "completed" | "failed">("idle");
  
  const { toast } = useToast();

  // Test call mutation
  const testCallMutation = useMutation({
    mutationFn: (data: { phoneNumber: string; campaignId?: number }) =>
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
    });
  };

  const handleStartCampaign = () => {
    if (!campaign) {
      toast({
        title: "No Campaign",
        description: "Please create a campaign first.",
        variant: "destructive",
      });
      return;
    }

    if (!selectedVoiceId) {
      toast({
        title: "Voice Not Selected",
        description: "Please select a voice for the campaign.",
        variant: "destructive",
      });
      return;
    }

    if (uploadedLeads.length === 0) {
      toast({
        title: "No Leads",
        description: "Please upload leads before starting the campaign.",
        variant: "destructive",
      });
      return;
    }

    const confirmMessage = `Are you sure you want to start the campaign? This will begin calling all ${uploadedLeads.length} leads.`;
    
    if (window.confirm(confirmMessage)) {
      startCampaignMutation.mutate(campaign.id);
    }
  };

  const estimatedDuration = Math.ceil(uploadedLeads.length * 2.5 / 60); // Assume 2.5 minutes per call average

  const isReadyToLaunch = campaign && selectedVoiceId && uploadedLeads.length > 0;

  return (
    <Card className="border border-slate-200">
      <CardHeader>
        <CardTitle className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
            <Rocket className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-800">Test & Launch</h3>
            <p className="text-sm text-slate-600 font-normal">Test your configuration before launching the campaign</p>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Test Call */}
          <div className="space-y-4">
            <h4 className="font-medium text-slate-800">Test Single Call</h4>
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
                disabled={testCallMutation.isPending || testCallStatus === "calling"}
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

            {!campaign && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-700">
                  Create a campaign configuration to enable test calls.
                </p>
              </div>
            )}
          </div>

          {/* Campaign Launch */}
          <div className="space-y-4">
            <h4 className="font-medium text-slate-800">Launch Campaign</h4>
            
            {isReadyToLaunch ? (
              <div className="p-4 bg-slate-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-slate-600">Ready to call</span>
                  <span className="font-semibold text-slate-800">{uploadedLeads.length} leads</span>
                </div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm text-slate-600">Estimated duration</span>
                  <span className="font-semibold text-slate-800">~{estimatedDuration} hours</span>
                </div>
                <Button
                  onClick={handleStartCampaign}
                  disabled={startCampaignMutation.isPending}
                  className="w-full bg-emerald-600 hover:bg-emerald-700"
                >
                  {startCampaignMutation.isPending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Starting...
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 mr-2" />
                      Start Campaign
                    </>
                  )}
                </Button>
              </div>
            ) : (
              <div className="p-4 bg-slate-50 rounded-lg">
                <div className="space-y-2 mb-4">
                  <div className="flex items-center space-x-2">
                    <div className={`w-2 h-2 rounded-full ${campaign ? 'bg-green-500' : 'bg-slate-300'}`}></div>
                    <span className="text-sm text-slate-600">Campaign configuration</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className={`w-2 h-2 rounded-full ${selectedVoiceId ? 'bg-green-500' : 'bg-slate-300'}`}></div>
                    <span className="text-sm text-slate-600">Voice selection</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className={`w-2 h-2 rounded-full ${uploadedLeads.length > 0 ? 'bg-green-500' : 'bg-slate-300'}`}></div>
                    <span className="text-sm text-slate-600">Lead upload</span>
                  </div>
                </div>
                <Button disabled className="w-full bg-slate-300 text-slate-500">
                  <Play className="h-4 w-4 mr-2" />
                  Complete setup to launch
                </Button>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
