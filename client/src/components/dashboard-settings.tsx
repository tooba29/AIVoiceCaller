import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { type DashboardChart } from "@/lib/api";
import { Play, Phone, TrendingUp, Clock, BarChart3, XCircle, Target, CheckCircle } from "lucide-react";

export interface DashboardSettings {
  selectedCharts: DashboardChart[];
  refreshInterval: number;
  showAnimations: boolean;
  compactView: boolean;
}

const AVAILABLE_CHARTS: DashboardChart[] = [
  { name: "Active Campaigns", type: "active_campaigns", icon: "Play", color: "blue" },
  { name: "Calls Today", type: "calls_today", icon: "Phone", color: "green" },
  { name: "Success Rate", type: "call_success", icon: "TrendingUp", color: "emerald" },
  { name: "Connection Failures", type: "call_failure", icon: "XCircle", color: "red" },
  { name: "Total Call Minutes", type: "total_minutes", icon: "Clock", color: "purple" },
  { name: "Avg Call Duration", type: "avg_call_duration", icon: "BarChart3", color: "indigo" },
  { name: "Total Campaigns", type: "total_campaigns", icon: "Target", color: "orange" },
  { name: "Completed Calls", type: "completed_calls", icon: "CheckCircle", color: "teal" }
];

const DEFAULT_SETTINGS: DashboardSettings = {
  selectedCharts: AVAILABLE_CHARTS.slice(0, 4), // First 4 charts by default
  refreshInterval: 30, // 30 seconds
  showAnimations: true,
  compactView: false
};

export default function DashboardSettings() {
  const [settings, setSettings] = useState<DashboardSettings>(DEFAULT_SETTINGS);
  const { toast } = useToast();
  const queryClient = useQueryClient();



  // Load settings from localStorage on component mount
  useEffect(() => {
    const savedSettings = localStorage.getItem('dashboard-settings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setSettings({ ...DEFAULT_SETTINGS, ...parsed });
      } catch (error) {
        console.error('Failed to parse dashboard settings:', error);
        setSettings(DEFAULT_SETTINGS);
      }
    }
  }, []);

  // Note: We don't need analytics data for dashboard settings

  const handleChartToggle = (chart: DashboardChart) => {
    setSettings(current => {
      const isSelected = current.selectedCharts.some(c => c.type === chart.type);
      const newSelectedCharts = isSelected
        ? current.selectedCharts.filter(c => c.type !== chart.type)
        : [...current.selectedCharts, chart];
      
      return {
        ...current,
        selectedCharts: newSelectedCharts
      };
    });
  };

  const handleRefreshIntervalChange = (interval: number) => {
    setSettings(current => ({
      ...current,
      refreshInterval: interval
    }));
  };

  const handleSaveSettings = () => {
    if (settings.selectedCharts.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please select at least one chart to display",
        variant: "destructive",
      });
      return;
    }

    // Save to localStorage
    localStorage.setItem('dashboard-settings', JSON.stringify(settings));
    
    // Invalidate queries to refresh the dashboard
    queryClient.invalidateQueries({ queryKey: ["/api/analytics/dashboard"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard-settings"] });
    
    toast({
      title: "Settings Saved",
      description: `Dashboard updated with ${settings.selectedCharts.length} charts and ${settings.refreshInterval}s refresh interval.`,
    });
  };

  const handleResetSettings = () => {
    setSettings(DEFAULT_SETTINGS);
    localStorage.removeItem('dashboard-settings');
    queryClient.invalidateQueries({ queryKey: ["/api/analytics/dashboard"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard-settings"] });
    
    toast({
      title: "Settings Reset",
      description: "Dashboard settings have been reset to defaults.",
    });
  };



  const getChartIcon = (iconName: string) => {
    const icons: Record<string, any> = {
      Play, Phone, TrendingUp, Clock, BarChart3, XCircle, Target, CheckCircle
    };
    return icons[iconName] || BarChart3;
  };

  return (
    <div className="space-y-6">


      <Card className="border border-border bg-card/50 backdrop-blur-sm shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Dashboard Statistics</span>
            <Badge variant="outline">{settings.selectedCharts.length} selected</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3">
              {AVAILABLE_CHARTS.map((chart) => {
                const Icon = getChartIcon(chart.icon || "BarChart3");
                const isSelected = settings.selectedCharts.some(c => c.type === chart.type);
                
                return (
                  <div 
                    key={chart.type} 
                    className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
                      isSelected 
                        ? 'border-primary bg-primary/5' 
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <Icon className={`h-4 w-4 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                      <Label 
                        htmlFor={chart.type}
                        className={`cursor-pointer ${isSelected ? 'text-foreground font-medium' : 'text-muted-foreground'}`}
                      >
                        {chart.name}
                      </Label>
                    </div>
                    <Checkbox
                      id={chart.type}
                      checked={isSelected}
                      onCheckedChange={() => handleChartToggle(chart)}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border border-border bg-card/50 backdrop-blur-sm shadow-lg">
        <CardHeader>
          <CardTitle>Display Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          
          {/* Refresh Interval */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Auto-refresh interval</Label>
            <div className="grid grid-cols-4 gap-2">
              {[15, 30, 60, 120].map((interval) => (
                <Button
                  key={interval}
                  variant={settings.refreshInterval === interval ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleRefreshIntervalChange(interval)}
                  className="text-xs"
                >
                  {interval}s
                </Button>
              ))}
            </div>
          </div>

          <Separator />

          {/* Animation Settings */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">Show animations</Label>
              <p className="text-xs text-muted-foreground">Enable hover effects and transitions</p>
            </div>
            <Switch
              checked={settings.showAnimations}
              onCheckedChange={(checked) => 
                setSettings(current => ({ ...current, showAnimations: checked }))
              }
            />
          </div>

          {/* Compact View */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">Compact view</Label>
              <p className="text-xs text-muted-foreground">Show more stats in less space</p>
            </div>
            <Switch
              checked={settings.compactView}
              onCheckedChange={(checked) => 
                setSettings(current => ({ ...current, compactView: checked }))
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Preview */}
      <Card className="border border-border bg-card/50 backdrop-blur-sm shadow-lg">
        <CardHeader>
          <CardTitle className="text-sm">Preview</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground mb-3">
            Your dashboard will show {settings.selectedCharts.length} statistics with {settings.refreshInterval}s refresh
          </p>
          <div className="grid grid-cols-2 gap-2">
            {settings.selectedCharts.slice(0, 4).map((chart) => {
              const Icon = getChartIcon(chart.icon || "BarChart3");
              return (
                <div key={chart.type} className="flex items-center space-x-2 p-2 bg-muted/50 rounded">
                  <Icon className="h-3 w-3 text-primary" />
                  <span className="text-xs font-medium truncate">{chart.name}</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex space-x-3">
        <Button
          onClick={handleSaveSettings}
          className="flex-1"
          disabled={settings.selectedCharts.length === 0}
        >
          Save Settings
        </Button>
        <Button
          onClick={handleResetSettings}
          variant="outline"
          className="flex-1"
        >
          Reset to Defaults
        </Button>
      </div>
    </div>
  );
} 