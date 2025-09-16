import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import Sidebar from "@/components/sidebar";
import StatsOverview from "@/components/stats-overview";
import CampaignSetup from "@/components/campaign-setup";
import VoiceSelection from "@/components/voice-selection";
import LeadsUpload from "@/components/leads-upload";
import CampaignActions from "@/components/campaign-actions";
import CampaignSelector from "@/components/campaign-selector";
import DashboardSettings from "@/components/dashboard-settings";
import AnimatedBanner from "@/components/animated-banner";
import LanguageSwitcher from "@/components/language-switcher";
import CampaignsOverview from "@/components/campaigns-overview";
import CallTracking from "@/components/call-tracking";
import { Button } from "@/components/ui/button";
import { Bell, Settings2, Sparkles, Zap, Sun, Moon, Menu } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "@/hooks/use-theme";
import { api } from "@/lib/api";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export default function Dashboard() {
  const { t } = useTranslation();
  const [currentCampaign, setCurrentCampaign] = useState<any>(null);
  const [selectedVoiceId, setSelectedVoiceId] = useState<string>("");
  const [uploadedLeads, setUploadedLeads] = useState<any[]>([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { toast } = useToast();
  const { theme, toggleTheme } = useTheme();

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
    <div className="flex h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-green-50 dark:from-slate-900 dark:via-purple-900/20 dark:to-green-900/20">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <Sidebar />
      </div>
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Enhanced Header */}
        <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200/50 dark:border-slate-700/50 px-4 sm:px-6 lg:px-8 py-4 sm:py-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {/* Mobile Menu Button */}
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="lg:hidden hover:bg-gradient-to-r hover:from-purple-500 hover:to-green-500 hover:text-white transition-all duration-300"
                  >
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-80 p-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl">
                  <Sidebar />
                </SheetContent>
              </Sheet>
              
              <div className="space-y-1 sm:space-y-2">
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold spark-gradient-text">
                      {t('auth.title')}
                    </h2>
                    <Sparkles className="absolute -top-1 -right-3 sm:-top-2 sm:-right-6 h-4 w-4 sm:h-6 sm:w-6 text-yellow-500 animate-pulse" />
                  </div>
                </div>
                <p className="text-slate-600 dark:text-slate-400 text-sm sm:text-base lg:text-lg font-medium hidden sm:block">
                  {t('auth.subtitle')}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-4">
              {/* Language Switcher */}
              <div className="hidden sm:block">
                <LanguageSwitcher />
              </div>
              
              {/* Theme Toggle */}
              <Button
                variant="outline"
                size="icon"
                onClick={toggleTheme}
                className="hover:bg-gradient-to-r hover:from-purple-500 hover:to-green-500 hover:text-white hover:border-transparent transition-all duration-300 shadow-lg hover:shadow-xl"
                title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
              >
                {theme === 'light' ? (
                  <Moon className="h-4 w-4 sm:h-5 sm:w-5" />
                ) : (
                  <Sun className="h-4 w-4 sm:h-5 sm:w-5" />
                )}
              </Button>
              
              <Sheet>
                <SheetTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="icon" 
                    className="hover:bg-gradient-to-r hover:from-purple-500 hover:to-green-500 hover:text-white hover:border-transparent transition-all duration-300 shadow-lg hover:shadow-xl"
                  >
                    <Settings2 className="h-4 w-4 sm:h-5 sm:w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl">
                  <SheetHeader>
                    <SheetTitle className="text-xl sm:text-2xl font-bold spark-gradient-text">
                      Dashboard Settings
                    </SheetTitle>
                  </SheetHeader>
                  <div className="mt-6">
                    <DashboardSettings />
                  </div>
                </SheetContent>
              </Sheet>
              <Button 
                variant="ghost" 
                size="icon" 
                className="relative hover:bg-gradient-to-r hover:from-red-500 hover:to-pink-500 hover:text-white transition-all duration-300 shadow-lg hover:shadow-xl"
              >
                <Bell className="h-4 w-4 sm:h-5 sm:w-5" />
                <span className="absolute -top-1 -right-1 w-4 h-4 sm:w-6 sm:h-6 bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs rounded-full flex items-center justify-center font-bold animate-pulse">
                  3
                </span>
              </Button>
            </div>
          </div>
        </header>

        {/* Enhanced Main Content */}
        <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8 bg-transparent">
          <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
            
            {/* Animated Banner */}
            <AnimatedBanner />
            
            {/* Campaign Selection - Moved to Top */}
            {!currentCampaign ? (
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-6 sm:h-8 bg-gradient-to-b from-purple-500 to-green-500 rounded-full"></div>
                  <h3 className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-slate-200">
                    Select Your Campaign
                  </h3>
                </div>
                <CampaignSelector onCampaignSelect={handleCampaignUpdate} />
              </div>
            ) : (
              // Enhanced Campaign Setup
              <div className="space-y-4 sm:space-y-6">
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-6 sm:h-8 bg-gradient-to-b from-green-500 to-emerald-500 rounded-full"></div>
                  <h3 className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-slate-200">
                    Campaign Configuration
                  </h3>
                </div>
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 sm:gap-8">
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
              </div>
            )}

            {/* Enhanced Quick Stats */}
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <Zap className="h-6 w-6 text-yellow-500 animate-pulse" />
                <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-200">
                  Performance Overview
                </h3>
              </div>
              <StatsOverview />
            </div>

            {/* Campaigns Overview */}
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-8 bg-gradient-to-b from-indigo-500 to-purple-500 rounded-full"></div>
                <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-200">
                  Your Campaigns
                </h3>
              </div>
              <CampaignsOverview />
            </div>

            {/* Call Tracking */}
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-8 bg-gradient-to-b from-green-500 to-emerald-500 rounded-full"></div>
                <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-200">
                  Live Call Tracking
                </h3>
              </div>
              <CallTracking />
            </div>

            {/* Enhanced Test & Launch */}
            {currentCampaign && (
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-8 bg-gradient-to-b from-orange-500 to-red-500 rounded-full"></div>
                  <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-200">
                    Launch & Monitor
                  </h3>
                </div>
                <CampaignActions 
                  campaign={currentCampaign}
                  selectedVoiceId={selectedVoiceId}
                  uploadedLeads={uploadedLeads}
                />
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
