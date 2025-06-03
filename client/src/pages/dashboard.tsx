import { useState } from "react";
import Sidebar from "@/components/sidebar";
import StatsOverview from "@/components/stats-overview";
import CampaignSetup from "@/components/campaign-setup";
import VoiceSelection from "@/components/voice-selection";
import LeadsUpload from "@/components/leads-upload";
import CampaignActions from "@/components/campaign-actions";
import ActiveCampaigns from "@/components/active-campaigns";
import { Button } from "@/components/ui/button";
import { Bell, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Dashboard() {
  const [currentCampaign, setCurrentCampaign] = useState<any>(null);
  const [selectedVoiceId, setSelectedVoiceId] = useState<string>("");
  const [uploadedLeads, setUploadedLeads] = useState<any[]>([]);
  const { toast } = useToast();

  const handleCreateNewCampaign = () => {
    setCurrentCampaign(null);
    setSelectedVoiceId("");
    setUploadedLeads([]);
    toast({
      title: "New Campaign",
      description: "Ready to create a new campaign",
    });
  };

  const handleCampaignUpdate = (campaign: any) => {
    setCurrentCampaign(campaign);
  };

  const handleVoiceSelect = (voiceId: string) => {
    setSelectedVoiceId(voiceId);
  };

  const handleLeadsUpload = (leads: any[]) => {
    setUploadedLeads(leads);
  };

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar />
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-slate-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-slate-800">Campaign Dashboard</h2>
              <p className="text-slate-600 mt-1">Create and manage your AI voice calling campaigns</p>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                  3
                </span>
              </Button>
              <Button onClick={handleCreateNewCampaign} className="bg-primary hover:bg-primary/90">
                <Plus className="h-4 w-4 mr-2" />
                New Campaign
              </Button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-auto p-6">
          <div className="max-w-7xl mx-auto space-y-8">
            
            {/* Quick Stats */}
            <StatsOverview />

            {/* Campaign Setup */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              
              {/* Left Column: Configuration */}
              <div className="space-y-6">
                <CampaignSetup 
                  campaign={currentCampaign}
                  onCampaignUpdate={handleCampaignUpdate}
                />
              </div>

              {/* Right Column: Voice & Leads */}
              <div className="space-y-6">
                <VoiceSelection 
                  selectedVoiceId={selectedVoiceId}
                  onVoiceSelect={handleVoiceSelect}
                />
                <LeadsUpload 
                  campaignId={currentCampaign?.id}
                  onLeadsUpload={handleLeadsUpload}
                  uploadedLeads={uploadedLeads}
                />
              </div>
            </div>

            {/* Test & Launch */}
            <CampaignActions 
              campaign={currentCampaign}
              selectedVoiceId={selectedVoiceId}
              uploadedLeads={uploadedLeads}
            />

            {/* Active Campaigns */}
            <ActiveCampaigns />

          </div>
        </main>
      </div>
    </div>
  );
}
