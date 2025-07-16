import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Plus, FolderOpen } from "lucide-react";
import { api } from "@/lib/api";
import { useTranslation } from "react-i18next";

interface CampaignSelectorProps {
  onCampaignSelect: (campaign: any) => void;
}

export default function CampaignSelector({ onCampaignSelect }: CampaignSelectorProps) {
  const { t } = useTranslation();
  const [showNewCampaign, setShowNewCampaign] = useState(false);
  const [newCampaignName, setNewCampaignName] = useState("");
  const { toast } = useToast();

  // Get existing campaigns
  const { data: campaignsData } = useQuery({
    queryKey: ["/api/campaigns"],
    queryFn: () => api.getCampaigns(),
  });

  // Initialize campaign mutation
  const initializeMutation = useMutation({
    mutationFn: (data: { name?: string; type: 'new' | 'existing' }) => 
      api.post("/api/campaigns/initialize", data),
    onSuccess: (data) => {
      if (data.campaign) {
        onCampaignSelect(data.campaign);
        toast({
          title: t('campaignSelector.campaignCreated'),
          description: t('campaignSelector.campaignCreatedSuccess'),
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: t('common.error'),
        description: error.message || t('campaignSelector.createFailed'),
        variant: "destructive",
      });
    },
  });

  // Select campaign mutation
  const selectMutation = useMutation({
    mutationFn: (campaignId: number) => 
      api.post("/api/campaigns/select", { campaignId }),
    onSuccess: (data) => {
      if (data.campaign) {
        onCampaignSelect(data.campaign);
        toast({
          title: t('campaignSelector.campaignSelected'),
          description: t('campaignSelector.campaignSelectedSuccess'),
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: t('common.error'),
        description: error.message || t('campaignSelector.selectFailed'),
        variant: "destructive",
      });
    },
  });

  const handleCreateCampaign = () => {
    if (!newCampaignName.trim()) {
      toast({
        title: t('campaignSelector.validationError'),
        description: t('campaignSelector.enterCampaignNameError'),
        variant: "destructive",
      });
      return;
    }

    initializeMutation.mutate({ 
      type: 'new',
      name: newCampaignName.trim()
    });
  };

  const handleSelectCampaign = (campaignId: number) => {
    selectMutation.mutate(campaignId);
  };

  return (
    <Card className="border border-border bg-card/50 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300">
      <CardHeader>
        <CardTitle className="flex items-center space-x-4">
          <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-500 rounded-2xl flex items-center justify-center shadow-md">
            <FolderOpen className="h-6 w-6 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-foreground">{t('campaignSelector.title')}</h3>
            <p className="text-sm text-muted-foreground font-medium">{t('campaignSelector.subtitle')}</p>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* New Campaign Section */}
        <div className="space-y-4">
          <Button 
            variant="outline" 
            className="w-full"
            onClick={() => setShowNewCampaign(!showNewCampaign)}
          >
            <Plus className="h-4 w-4 mr-2" />
            {t('campaignSelector.createNewCampaign')}
          </Button>

          {showNewCampaign && (
            <div className="space-y-4 p-4 bg-accent/20 rounded-lg">
              <Input
                placeholder={t('campaignSelector.enterCampaignName')}
                value={newCampaignName}
                onChange={(e) => setNewCampaignName(e.target.value)}
              />
              <Button 
                className="w-full"
                onClick={handleCreateCampaign}
                disabled={initializeMutation.isPending}
              >
                {initializeMutation.isPending ? t('campaignSelector.creating') : t('campaignSelector.createCampaign')}
              </Button>
            </div>
          )}
        </div>

        {/* Existing Campaigns Section */}
        <div className="space-y-4">
          <h4 className="font-medium text-sm text-muted-foreground">{t('campaignSelector.existingCampaigns')}</h4>
          {campaignsData?.campaigns?.length > 0 ? (
            <div className="space-y-2">
              {campaignsData.campaigns.map((campaign: any) => (
                <Button
                  key={campaign.id}
                  variant="outline"
                  className="w-full justify-between"
                  onClick={() => handleSelectCampaign(campaign.id)}
                  disabled={selectMutation.isPending}
                >
                  <span>{campaign.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {campaign.status}
                  </span>
                </Button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              {t('campaignSelector.noExistingCampaigns')}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
} 