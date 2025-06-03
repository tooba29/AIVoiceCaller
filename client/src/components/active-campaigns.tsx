import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, RefreshCw, Pause, Square, Play } from "lucide-react";
import { api, type Campaign } from "@/lib/api";

export default function ActiveCampaigns() {
  const [refreshing, setRefreshing] = useState(false);

  // Get campaigns
  const { data: campaignsData, isLoading, refetch } = useQuery({
    queryKey: ["/api/campaigns"],
    queryFn: () => api.getCampaigns(),
    refetchInterval: 5000, // Refresh every 5 seconds for real-time updates
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setTimeout(() => setRefreshing(false), 1000);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-700";
      case "paused":
        return "bg-yellow-100 text-yellow-700";
      case "completed":
        return "bg-blue-100 text-blue-700";
      case "failed":
        return "bg-red-100 text-red-700";
      default:
        return "bg-slate-100 text-slate-700";
    }
  };

  const getProgressPercentage = (campaign: Campaign) => {
    if (campaign.totalLeads === 0) return 0;
    return Math.round((campaign.completedCalls / campaign.totalLeads) * 100);
  };

  const getSuccessRate = (campaign: Campaign) => {
    if (campaign.completedCalls === 0) return "0%";
    return Math.round((campaign.successfulCalls / campaign.completedCalls) * 100) + "%";
  };

  const getAverageDuration = (campaign: Campaign) => {
    // Mock average duration calculation
    return "2.4m";
  };

  if (isLoading) {
    return (
      <Card className="border border-slate-200">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-slate-200 rounded w-1/3"></div>
            <div className="space-y-4">
              {[...Array(2)].map((_, i) => (
                <div key={i} className="border border-slate-200 rounded-lg p-4">
                  <div className="h-4 bg-slate-200 rounded w-1/2 mb-3"></div>
                  <div className="h-2 bg-slate-200 rounded mb-3"></div>
                  <div className="grid grid-cols-4 gap-4">
                    {[...Array(4)].map((_, j) => (
                      <div key={j} className="h-8 bg-slate-200 rounded"></div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const campaigns = campaignsData?.campaigns || [];
  const activeCampaigns = campaigns.filter(c => c.status === "active" || c.status === "paused");

  return (
    <Card className="border border-border bg-card/50 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-2xl flex items-center justify-center shadow-md">
              <BarChart3 className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-foreground">Active Campaigns</h3>
              <p className="text-sm text-muted-foreground font-medium">Monitor your running campaigns</p>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={refreshing}
            className="border-slate-300 text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {activeCampaigns.length === 0 ? (
          <div className="text-center py-12">
            <BarChart3 className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-700 mb-2">No Active Campaigns</h3>
            <p className="text-slate-500">Start a campaign to see real-time monitoring here.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {activeCampaigns.map((campaign) => (
              <div key={campaign.id} className="border border-slate-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    {campaign.status === "active" && (
                      <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                    )}
                    {campaign.status === "paused" && (
                      <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                    )}
                    <h4 className="font-medium text-slate-800">{campaign.name}</h4>
                    <Badge className={getStatusColor(campaign.status)}>
                      {campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
                    </Badge>
                  </div>
                  <div className="flex items-center space-x-2">
                    {campaign.status === "active" && (
                      <Button variant="ghost" size="sm">
                        <Pause className="h-4 w-4" />
                      </Button>
                    )}
                    {campaign.status === "paused" && (
                      <Button variant="ghost" size="sm">
                        <Play className="h-4 w-4" />
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700">
                      <Square className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Progress */}
                <div className="mb-3">
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-slate-600">Progress</span>
                    <span className="text-slate-800 font-medium">
                      {campaign.completedCalls} / {campaign.totalLeads} calls
                    </span>
                  </div>
                  <Progress 
                    value={getProgressPercentage(campaign)} 
                    className="h-2"
                  />
                </div>

                {/* Stats */}
                <div className="grid grid-cols-4 gap-4 text-center">
                  <div>
                    <p className="text-lg font-semibold text-slate-800">{campaign.successfulCalls}</p>
                    <p className="text-xs text-green-600">Successful</p>
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-slate-800">{campaign.failedCalls}</p>
                    <p className="text-xs text-red-600">Failed</p>
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-slate-800">
                      {campaign.totalLeads - campaign.completedCalls}
                    </p>
                    <p className="text-xs text-yellow-600">Pending</p>
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-slate-800">{getAverageDuration(campaign)}</p>
                    <p className="text-xs text-slate-500">Avg Duration</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
