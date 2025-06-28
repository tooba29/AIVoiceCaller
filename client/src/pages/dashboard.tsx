import { useState, useEffect } from "react";
import Sidebar from "@/components/sidebar";
import StatsOverview from "@/components/stats-overview";
import CampaignSetup from "@/components/campaign-setup";
import VoiceSelection from "@/components/voice-selection";
import LeadsUpload from "@/components/leads-upload";
import CampaignActions from "@/components/campaign-actions";
import CampaignSelector from "@/components/campaign-selector";
import DashboardSettings from "@/components/dashboard-settings";
import { Button } from "@/components/ui/button";
import { Bell, Settings2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export default function Dashboard() {
  const [currentCampaign, setCurrentCampaign] = useState<any>(null);
  const [selectedVoiceId, setSelectedVoiceId] = useState<string>("");
  const [uploadedLeads, setUploadedLeads] = useState<any[]>([]);
  const { toast } = useToast();

  const handleCampaignUpdate = (campaign: any) => {
    setCurrentCampaign(campaign);
    // Reset leads when switching campaigns
    setUploadedLeads([]);
  };

  const handleVoiceSelect = (voiceId: string) => {
    setSelectedVoiceId(voiceId);
  };

  const handleLeadsUpload = (leads: any[]) => {
    setUploadedLeads(leads);
  };

  // Load leads when campaign changes
  useEffect(() => {
    if (currentCampaign?.id) {
      // Fetch existing leads for the selected campaign
      fetch(`/api/campaigns/${currentCampaign.id}/leads`, {
        credentials: 'include'
      })
      .then(response => response.json())
      .then(leads => {
        if (Array.isArray(leads)) {
          setUploadedLeads(leads);
        }
      })
      .catch(error => {
        console.error('Failed to fetch leads:', error);
        setUploadedLeads([]);
      });
    } else {
      setUploadedLeads([]);
    }
  }, [currentCampaign?.id]);

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-card border-b border-border px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold text-foreground bg-gradient-to-r from-primary to-violet-400 bg-clip-text text-transparent">
                Campaign Dashboard
              </h2>
              <p className="text-muted-foreground mt-2">Configure and manage your AI voice calling campaign</p>
            </div>
            <div className="flex items-center space-x-4">
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" size="icon" className="hover:bg-accent">
                    <Settings2 className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent>
                  <SheetHeader>
                    <SheetTitle>Dashboard Settings</SheetTitle>
                  </SheetHeader>
                  <div className="mt-6">
                    <DashboardSettings />
                  </div>
                </SheetContent>
              </Sheet>
              <Button variant="ghost" size="icon" className="relative hover:bg-accent">
                <Bell className="h-5 w-5" />
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground text-xs rounded-full flex items-center justify-center">
                  3
                </span>
              </Button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-auto p-8 bg-background">
          <div className="max-w-7xl mx-auto space-y-8">
            
            {/* Quick Stats */}
            <StatsOverview />

            {!currentCampaign ? (
              // Show campaign selector if no campaign is selected
              <CampaignSelector onCampaignSelect={handleCampaignUpdate} />
            ) : (
              // Show campaign setup once a campaign is selected
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
                    campaignId={currentCampaign.id}
                    onLeadsUpload={handleLeadsUpload}
                    uploadedLeads={uploadedLeads}
                  />
                </div>
              </div>
            )}

            {/* Test & Launch */}
            {currentCampaign && (
              <CampaignActions 
                campaign={currentCampaign}
                selectedVoiceId={selectedVoiceId}
                uploadedLeads={uploadedLeads}
              />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
