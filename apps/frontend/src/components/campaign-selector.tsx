import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Plus, FolderOpen } from "lucide-react";
import { api } from "@/lib/api";

interface CampaignSelectorProps {
  onCampaignSelect: (campaign: any) => void;
}

export default function CampaignSelector({ onCampaignSelect }: CampaignSelectorProps) {
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  // Get existing campaigns
  const { data: campaignsData } = useQuery({
    queryKey: ["/api/campaigns"],
    queryFn: () => api.getCampaigns(),
  });


  // Select campaign mutation
  const selectMutation = useMutation({
    mutationFn: (campaignId: number) => 
      api.post("/api/campaigns/select", { campaignId }),
    onSuccess: (data) => {
      if (data.campaign) {
        onCampaignSelect(data.campaign);
        toast({
          title: "Campaign Selected",
          description: "Campaign has been loaded successfully.",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to select campaign",
        variant: "destructive",
      });
    },
  });


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
            <h3 className="text-xl font-bold text-foreground">Campaign Selection</h3>
            <p className="text-sm text-muted-foreground font-medium">Create a new campaign or select an existing one</p>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* New Campaign Section */}
        <div className="space-y-4">
          <Button 
            variant="outline" 
            className="w-full"
            onClick={() => setLocation('/campaigns')}
          >
            <Plus className="h-4 w-4 mr-2" />
            Create New Campaign
          </Button>
        </div>

        {/* Existing Campaigns Section */}
        <div className="space-y-4">
          <h4 className="font-medium text-sm text-muted-foreground">Existing Campaigns</h4>
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
              No existing campaigns found
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
} 