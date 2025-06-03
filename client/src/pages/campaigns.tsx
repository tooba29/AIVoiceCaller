import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Search, Plus, Play, Pause, Square, MoreHorizontal } from "lucide-react";
import { api, type Campaign } from "@/lib/api";
import Sidebar from "@/components/sidebar";
import { useToast } from "@/hooks/use-toast";

export default function Campaigns() {
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();

  const { data: campaignsData, isLoading } = useQuery({
    queryKey: ["/api/campaigns"],
    queryFn: () => api.getCampaigns(),
    refetchInterval: 5000,
  });

  const campaigns = campaignsData?.campaigns || [];
  const filteredCampaigns = campaigns.filter(campaign =>
    campaign.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300";
      case "paused":
        return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300";
      case "completed":
        return "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300";
      case "draft":
        return "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300";
      default:
        return "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300";
    }
  };

  const getProgressPercentage = (campaign: Campaign) => {
    if (campaign.totalLeads === 0) return 0;
    return Math.round(((campaign.completedCalls || 0) / campaign.totalLeads) * 100);
  };

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-card border-b border-border px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold text-foreground bg-gradient-to-r from-primary to-violet-400 bg-clip-text text-transparent">
                Campaigns
              </h2>
              <p className="text-muted-foreground mt-2">Manage all your voice calling campaigns</p>
            </div>
            <Button className="bg-primary hover:bg-primary/90 shadow-lg">
              <Plus className="h-4 w-4 mr-2" />
              New Campaign
            </Button>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-8 bg-background">
          <div className="max-w-7xl mx-auto space-y-6">
            
            {/* Search and Filters */}
            <div className="flex items-center space-x-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search campaigns..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Campaigns Grid */}
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <Card key={i} className="border border-border">
                    <CardContent className="p-6">
                      <div className="animate-pulse space-y-4">
                        <div className="h-4 bg-muted rounded w-3/4"></div>
                        <div className="h-2 bg-muted rounded"></div>
                        <div className="grid grid-cols-3 gap-4">
                          {[...Array(3)].map((_, j) => (
                            <div key={j} className="h-12 bg-muted rounded"></div>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : filteredCampaigns.length === 0 ? (
              <Card className="border border-border bg-card/50">
                <CardContent className="p-12 text-center">
                  <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                    <Search className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-2">
                    {searchTerm ? "No campaigns found" : "No campaigns yet"}
                  </h3>
                  <p className="text-muted-foreground mb-6">
                    {searchTerm 
                      ? "Try adjusting your search terms" 
                      : "Create your first voice calling campaign to get started"
                    }
                  </p>
                  {!searchTerm && (
                    <Button className="bg-primary hover:bg-primary/90">
                      <Plus className="h-4 w-4 mr-2" />
                      Create Campaign
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredCampaigns.map((campaign) => (
                  <Card key={campaign.id} className="border border-border bg-card/50 backdrop-blur-sm hover:bg-card/80 transition-all duration-300 shadow-lg hover:shadow-xl">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg font-semibold text-foreground truncate">
                          {campaign.name}
                        </CardTitle>
                        <div className="flex items-center space-x-2">
                          <Badge className={getStatusColor(campaign.status)}>
                            {campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
                          </Badge>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      
                      {/* Progress */}
                      <div>
                        <div className="flex items-center justify-between text-sm mb-2">
                          <span className="text-muted-foreground">Progress</span>
                          <span className="text-foreground font-medium">
                            {campaign.completedCalls || 0} / {campaign.totalLeads} calls
                          </span>
                        </div>
                        <Progress value={getProgressPercentage(campaign)} className="h-2" />
                      </div>

                      {/* Stats */}
                      <div className="grid grid-cols-3 gap-3 text-center">
                        <div className="p-2 bg-accent/50 rounded-lg">
                          <p className="text-lg font-semibold text-foreground">{campaign.successfulCalls || 0}</p>
                          <p className="text-xs text-green-600">Success</p>
                        </div>
                        <div className="p-2 bg-accent/50 rounded-lg">
                          <p className="text-lg font-semibold text-foreground">{campaign.failedCalls || 0}</p>
                          <p className="text-xs text-red-600">Failed</p>
                        </div>
                        <div className="p-2 bg-accent/50 rounded-lg">
                          <p className="text-lg font-semibold text-foreground">
                            {campaign.totalLeads - (campaign.completedCalls || 0)}
                          </p>
                          <p className="text-xs text-yellow-600">Pending</p>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center justify-between pt-2">
                        <div className="flex items-center space-x-2">
                          {campaign.status === "active" && (
                            <Button variant="outline" size="sm">
                              <Pause className="h-3 w-3 mr-1" />
                              Pause
                            </Button>
                          )}
                          {campaign.status === "paused" && (
                            <Button variant="outline" size="sm">
                              <Play className="h-3 w-3 mr-1" />
                              Resume
                            </Button>
                          )}
                          {campaign.status === "draft" && (
                            <Button variant="outline" size="sm">
                              <Play className="h-3 w-3 mr-1" />
                              Start
                            </Button>
                          )}
                        </div>
                        <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                          <Square className="h-3 w-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}