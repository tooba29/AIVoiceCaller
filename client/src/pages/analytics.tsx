import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart3, TrendingUp, Clock, Phone, Users, Target, Calendar, Download, Play } from "lucide-react";
import { api } from "@/lib/api";
import Sidebar from "@/components/sidebar";

export default function Analytics() {
  const [timeRange, setTimeRange] = useState("7d");

  const { data: campaignsData } = useQuery({
    queryKey: ["/api/campaigns"],
    queryFn: () => api.getCampaigns(),
  });

  const campaigns = campaignsData?.campaigns || [];

  // Calculate analytics data
  const totalCampaigns = campaigns.length;
  const activeCampaigns = campaigns.filter((c: any) => c.status === "active").length;
  const totalCalls = campaigns.reduce((sum: number, c: any) => sum + (c.completedCalls || 0), 0);
  const successfulCalls = campaigns.reduce((sum: number, c: any) => sum + (c.successfulCalls || 0), 0);
  const failedCalls = campaigns.reduce((sum: number, c: any) => sum + (c.failedCalls || 0), 0);
  const successRate = totalCalls > 0 ? ((successfulCalls / totalCalls) * 100).toFixed(1) : "0";

  const analyticsCards = [
    {
      title: "Total Campaigns",
      value: totalCampaigns,
      icon: Target,
      color: "blue",
      change: "+12%",
    },
    {
      title: "Active Campaigns", 
      value: activeCampaigns,
      icon: Play,
      color: "green",
      change: "+8%",
    },
    {
      title: "Total Calls",
      value: totalCalls,
      icon: Phone,
      color: "purple",
      change: "+23%",
    },
    {
      title: "Success Rate",
      value: `${successRate}%`,
      icon: TrendingUp,
      color: "emerald",
      change: "+5%",
    },
  ];

  const getColorClasses = (color: string) => {
    const colorMap: Record<string, string> = {
      blue: "bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300",
      green: "bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-300",
      purple: "bg-purple-100 text-purple-600 dark:bg-purple-900 dark:text-purple-300",
      emerald: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900 dark:text-emerald-300",
    };
    return colorMap[color] || "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300";
  };

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-card border-b border-border px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold text-foreground bg-gradient-to-r from-primary to-violet-400 bg-clip-text text-transparent">
                Analytics
              </h2>
              <p className="text-muted-foreground mt-2">Track performance and insights for your campaigns</p>
            </div>
            <div className="flex items-center space-x-4">
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="24h">Last 24 hours</SelectItem>
                  <SelectItem value="7d">Last 7 days</SelectItem>
                  <SelectItem value="30d">Last 30 days</SelectItem>
                  <SelectItem value="90d">Last 90 days</SelectItem>
                </SelectContent>
              </Select>
              <Button className="bg-primary hover:bg-primary/90 shadow-lg">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-8 bg-background">
          <div className="max-w-7xl mx-auto space-y-8">
            
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {analyticsCards.map((metric, index) => {
                const Icon = metric.icon;
                return (
                  <Card key={index} className="border border-border bg-card/50 backdrop-blur-sm hover:bg-card/80 transition-all duration-300 shadow-lg hover:shadow-xl">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground font-medium">{metric.title}</p>
                          <p className="text-3xl font-bold text-foreground mt-2">
                            {typeof metric.value === 'number' ? metric.value.toLocaleString() : metric.value}
                          </p>
                          <p className="text-sm text-green-600 mt-1">{metric.change}</p>
                        </div>
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-md ${getColorClasses(metric.color)}`}>
                          <Icon className="h-7 w-7" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              
              {/* Call Volume Chart */}
              <Card className="border border-border bg-card/50 backdrop-blur-sm shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center shadow-md">
                      <BarChart3 className="h-5 w-5 text-white" />
                    </div>
                    <span>Call Volume</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64 flex items-center justify-center bg-muted/20 rounded-xl">
                    <div className="text-center">
                      <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                      <p className="text-muted-foreground">Call volume chart</p>
                      <p className="text-sm text-muted-foreground/70">Chart visualization would appear here</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Success Rate Trend */}
              <Card className="border border-border bg-card/50 backdrop-blur-sm shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl flex items-center justify-center shadow-md">
                      <TrendingUp className="h-5 w-5 text-white" />
                    </div>
                    <span>Success Rate Trend</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64 flex items-center justify-center bg-muted/20 rounded-xl">
                    <div className="text-center">
                      <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                      <p className="text-muted-foreground">Success rate trend</p>
                      <p className="text-sm text-muted-foreground/70">Trend visualization would appear here</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Campaign Performance Table */}
            <Card className="border border-border bg-card/50 backdrop-blur-sm shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-md">
                    <Users className="h-5 w-5 text-white" />
                  </div>
                  <span>Campaign Performance</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {campaigns.length === 0 ? (
                  <div className="text-center py-12">
                    <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-foreground mb-2">No Campaign Data</h3>
                    <p className="text-muted-foreground">Create campaigns to see performance analytics here.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left py-3 px-4 font-medium text-muted-foreground">Campaign</th>
                          <th className="text-left py-3 px-4 font-medium text-muted-foreground">Status</th>
                          <th className="text-center py-3 px-4 font-medium text-muted-foreground">Total Leads</th>
                          <th className="text-center py-3 px-4 font-medium text-muted-foreground">Completed</th>
                          <th className="text-center py-3 px-4 font-medium text-muted-foreground">Success Rate</th>
                          <th className="text-center py-3 px-4 font-medium text-muted-foreground">Created</th>
                        </tr>
                      </thead>
                      <tbody>
                        {campaigns.map((campaign: any) => {
                          const campaignSuccessRate = campaign.completedCalls > 0 
                            ? ((campaign.successfulCalls || 0) / campaign.completedCalls * 100).toFixed(1)
                            : "0";
                          
                          return (
                            <tr key={campaign.id} className="border-b border-border/50 hover:bg-accent/20 transition-colors">
                              <td className="py-3 px-4">
                                <div className="font-medium text-foreground">{campaign.name}</div>
                              </td>
                              <td className="py-3 px-4">
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  campaign.status === 'active' ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' :
                                  campaign.status === 'paused' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300' :
                                  campaign.status === 'completed' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' :
                                  'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                                }`}>
                                  {campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-center text-foreground">{campaign.totalLeads}</td>
                              <td className="py-3 px-4 text-center text-foreground">{campaign.completedCalls || 0}</td>
                              <td className="py-3 px-4 text-center text-foreground">{campaignSuccessRate}%</td>
                              <td className="py-3 px-4 text-center text-muted-foreground text-sm">
                                {new Date(campaign.createdAt).toLocaleDateString()}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Additional Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              <Card className="border border-border bg-card/50 backdrop-blur-sm shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-3 text-lg">
                    <Clock className="h-5 w-5 text-primary" />
                    <span>Average Call Duration</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center">
                    <p className="text-3xl font-bold text-foreground">2.4m</p>
                    <p className="text-sm text-muted-foreground mt-1">Per call average</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border border-border bg-card/50 backdrop-blur-sm shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-3 text-lg">
                    <Calendar className="h-5 w-5 text-primary" />
                    <span>Peak Hours</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center">
                    <p className="text-3xl font-bold text-foreground">2-4 PM</p>
                    <p className="text-sm text-muted-foreground mt-1">Best call times</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border border-border bg-card/50 backdrop-blur-sm shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-3 text-lg">
                    <Phone className="h-5 w-5 text-primary" />
                    <span>Daily Average</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center">
                    <p className="text-3xl font-bold text-foreground">{Math.round(totalCalls / 7)}</p>
                    <p className="text-sm text-muted-foreground mt-1">Calls per day</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}