import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { Rocket, Phone, Play, AlertCircle } from "lucide-react";
import { api } from "@/lib/api";
import { useTranslation } from "react-i18next";

interface CampaignActionsProps {
  campaign: any;
  selectedVoiceId: string;
  uploadedLeads: any[];
}

export default function CampaignActions({ campaign, selectedVoiceId, uploadedLeads }: CampaignActionsProps) {
  const { t } = useTranslation();
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
        title: t('campaignActions.testCallSuccessful'),
        description: data.message || t('campaignActions.testCallSuccessMessage'),
      });
      setTimeout(() => setTestCallStatus("idle"), 3000);
    },
    onError: (error: any) => {
      setTestCallStatus("failed");
      toast({
        title: t('campaignActions.testCallFailed'),
        description: error.message || t('campaignActions.testCallFailedMessage'),
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
        title: t('campaignActions.campaignStarted'),
        description: data.message || t('campaignActions.campaignStartedMessage'),
      });
    },
    onError: (error: any) => {
      toast({
        title: t('campaignActions.campaignStartFailed'),
        description: error.message || t('campaignActions.campaignStartFailedMessage'),
        variant: "destructive",
      });
    },
  });

  const handleTestCall = () => {
    if (!testPhoneNumber.trim()) {
      toast({
        title: t('campaignActions.phoneNumberRequired'),
        description: t('campaignActions.enterPhoneNumber'),
        variant: "destructive",
      });
      return;
    }

    if (!campaign) {
      toast({
        title: t('campaignActions.noCampaign'),
        description: t('campaignActions.createCampaignFirst'),
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
    if (!campaign || !selectedVoiceId || uploadedLeads.length === 0) {
      toast({
        title: t('campaignActions.cannotStartCampaign'),
        description: t('campaignActions.cannotStartCampaignMessage'),
        variant: "destructive",
      });
      return;
    }

    // Start campaign logic here
    console.log("Starting campaign with:", {
      campaignId: campaign.id,
      voiceId: selectedVoiceId,
      leadsCount: uploadedLeads.length,
    });

    // Actually trigger the campaign start
    startCampaignMutation.mutate(campaign.id);
  };

  const isReadyToLaunch = campaign?.firstPrompt && selectedVoiceId && campaign?.knowledgeBaseId && uploadedLeads.length > 0;

  return (
    <Card className="border border-border bg-card/50 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300">
      <CardHeader>
        <CardTitle className="flex items-center space-x-4">
          <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-2xl flex items-center justify-center shadow-md">
            <Rocket className="h-6 w-6 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-foreground">{t('campaignActions.title')}</h3>
            <p className="text-sm text-muted-foreground font-medium">{t('campaignActions.subtitle')}</p>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Test Call */}
          <div className="space-y-4">
            <h4 className="font-medium text-slate-800">{t('campaignActions.testSingleCall')}</h4>
            <div className="flex flex-col space-y-3">
              <div className="flex space-x-3">
                <Input
                  type="text"
                  placeholder={t('campaignActions.firstNameOptional')}
                  value={testFirstName}
                  onChange={(e) => setTestFirstName(e.target.value)}
                  className="flex-1"
                />
              </div>
              <div className="flex space-x-3">
                <Input
                  type="tel"
                  placeholder={t('campaignActions.phoneNumberPlaceholder')}
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
                      {t('campaignActions.calling')}
                    </>
                  ) : testCallStatus === "completed" ? (
                    <>
                      <div className="h-4 w-4 rounded-full bg-green-500 mr-2"></div>
                      {t('campaignActions.completed')}
                    </>
                  ) : testCallStatus === "failed" ? (
                    <>
                      <AlertCircle className="h-4 w-4 mr-2" />
                      {t('campaignActions.failed')}
                    </>
                  ) : (
                    <>
                      <Phone className="h-4 w-4 mr-2" />
                      {t('campaignActions.testCall')}
                    </>
                  )}
                </Button>
              </div>

              {/* Test Call Status */}
              {testCallStatus === "calling" && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    <span className="text-sm text-blue-700">{t('campaignActions.makingTestCall')}</span>
                  </div>
                </div>
              )}

              {!isReadyToLaunch && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-700">
                    {t('campaignActions.completeRequiredSteps')}
                    <ul className="mt-2 list-disc list-inside">
                      {!campaign?.firstPrompt && <li>{t('campaignActions.setInitialMessage')}</li>}
                      {!selectedVoiceId && <li>{t('campaignActions.selectVoice')}</li>}
                      {!campaign?.knowledgeBaseId && <li>{t('campaignActions.uploadKnowledgeBase')}</li>}
                      {uploadedLeads.length === 0 && <li>{t('campaignActions.uploadLeadsCSV')}</li>}
                    </ul>
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Launch Campaign */}
          <div className="space-y-4">
            <h4 className="font-medium text-slate-800">{t('campaignActions.launchCampaign')}</h4>
            <div className="space-y-4">
              <Button
                onClick={handleStartCampaign}
                disabled={!isReadyToLaunch || startCampaignMutation.isPending}
                className="w-full bg-emerald-600 hover:bg-emerald-700 h-12 text-lg"
              >
                {startCampaignMutation.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                    {t('campaignActions.startingCampaign')}
                  </>
                ) : (
                  <>
                    <Play className="h-5 w-5 mr-2" />
                    {t('campaignActions.startCampaign')}
                  </>
                )}
              </Button>

              {/* Campaign Requirements Status */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
                <h5 className="font-medium text-slate-700">{t('campaignActions.campaignRequirements')}</h5>
                <ul className="space-y-2">
                  <li className="flex items-center text-sm">
                    <div className={`w-5 h-5 rounded-full mr-3 flex items-center justify-center ${campaign?.firstPrompt ? 'bg-green-500' : 'bg-slate-300'}`}>
                      {campaign?.firstPrompt && <span className="text-white">✓</span>}
                    </div>
                    {t('campaignActions.initialMessage')} {campaign?.firstPrompt ? t('campaignActions.set') : t('campaignActions.required')}
                  </li>
                  <li className="flex items-center text-sm">
                    <div className={`w-5 h-5 rounded-full mr-3 flex items-center justify-center ${selectedVoiceId ? 'bg-green-500' : 'bg-slate-300'}`}>
                      {selectedVoiceId && <span className="text-white">✓</span>}
                    </div>
                    {t('campaignActions.voiceSelection')} {selectedVoiceId ? t('campaignActions.complete') : t('campaignActions.required')}
                  </li>
                  <li className="flex items-center text-sm">
                    <div className={`w-5 h-5 rounded-full mr-3 flex items-center justify-center ${campaign?.knowledgeBaseId ? 'bg-green-500' : 'bg-slate-300'}`}>
                      {campaign?.knowledgeBaseId && <span className="text-white">✓</span>}
                    </div>
                    {t('campaignActions.knowledgeBase')} {campaign?.knowledgeBaseId ? t('campaignActions.uploaded') : t('campaignActions.required')}
                  </li>
                  <li className="flex items-center text-sm">
                    <div className={`w-5 h-5 rounded-full mr-3 flex items-center justify-center ${uploadedLeads.length > 0 ? 'bg-green-500' : 'bg-slate-300'}`}>
                      {uploadedLeads.length > 0 && <span className="text-white">✓</span>}
                    </div>
                    {t('campaignActions.leadsCSV')} {uploadedLeads.length > 0 ? `(${uploadedLeads.length} ${t('campaignActions.leads')})` : t('campaignActions.required')}
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
