import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { api, type DashboardChart } from "@/lib/api";

const AVAILABLE_CHARTS: DashboardChart[] = [
  { name: "Success Rate", type: "call_success" },
  { name: "Failures", type: "call_failure" },
  { name: "Active Campaigns", type: "active_campaigns" },
  { name: "Total Minutes", type: "total_minutes" },
  { name: "Calls Today", type: "calls_today" },
  { name: "Average Call Duration", type: "avg_call_duration" }
];

export default function DashboardSettings() {
  const [selectedCharts, setSelectedCharts] = useState<DashboardChart[]>(AVAILABLE_CHARTS.slice(0, 4));
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const updateSettingsMutation = useMutation({
    mutationFn: (charts: DashboardChart[]) => 
      api.updateDashboardSettings({ charts }),
    onSuccess: () => {
      toast({
        title: "Settings Updated",
        description: "Dashboard settings have been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/analytics/dashboard"] });
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update dashboard settings",
        variant: "destructive",
      });
    },
  });

  const handleChartToggle = (chart: DashboardChart) => {
    setSelectedCharts(current => {
      const isSelected = current.some(c => c.type === chart.type);
      if (isSelected) {
        return current.filter(c => c.type !== chart.type);
      } else {
        return [...current, chart];
      }
    });
  };

  const handleSaveSettings = () => {
    if (selectedCharts.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please select at least one chart to display",
        variant: "destructive",
      });
      return;
    }
    updateSettingsMutation.mutate(selectedCharts);
  };

  return (
    <Card className="border border-border bg-card/50 backdrop-blur-sm shadow-lg">
      <CardHeader>
        <CardTitle>Dashboard Settings</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {AVAILABLE_CHARTS.map((chart) => (
              <div key={chart.type} className="flex items-center space-x-2">
                <Checkbox
                  id={chart.type}
                  checked={selectedCharts.some(c => c.type === chart.type)}
                  onCheckedChange={() => handleChartToggle(chart)}
                />
                <Label htmlFor={chart.type}>{chart.name}</Label>
              </div>
            ))}
          </div>
          <Button
            onClick={handleSaveSettings}
            disabled={updateSettingsMutation.isPending}
            className="w-full"
          >
            {updateSettingsMutation.isPending ? "Saving..." : "Save Settings"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
} 