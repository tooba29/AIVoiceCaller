import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Play, Phone, TrendingUp, Clock, Sparkles, BarChart3, PieChart, Activity, MessageCircle, Users, Target, Zap } from "lucide-react";
import { api } from "@/lib/api";
import { useState, useEffect } from "react";

export default function StatsOverview() {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["/api/stats"],
    queryFn: () => api.getStats(),
  });

  const { data: campaignsData, isLoading: campaignsLoading } = useQuery({
    queryKey: ["/api/campaigns"],
    queryFn: () => api.getCampaigns(),
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  const isLoading = statsLoading || campaignsLoading;

  // Calculate real campaign statistics
  const getCampaignStats = () => {
    if (!campaignsData?.campaigns) {
      return {
        activeCampaigns: 0,
        totalCalls: 0,
        successfulCalls: 0,
        failedCalls: 0,
        successRate: 0,
        totalLeads: 0
      };
    }

    const campaigns = campaignsData.campaigns;
    const activeCampaigns = campaigns.filter((c: any) => c.status === 'active').length;
    const totalCalls = campaigns.reduce((sum: number, c: any) => sum + (c.completedCalls || 0), 0);
    const successfulCalls = campaigns.reduce((sum: number, c: any) => sum + (c.successfulCalls || 0), 0);
    const failedCalls = campaigns.reduce((sum: number, c: any) => sum + (c.failedCalls || 0), 0);
    const totalLeads = campaigns.reduce((sum: number, c: any) => sum + (c.totalLeads || 0), 0);
    const successRate = totalCalls > 0 ? Math.round((successfulCalls / totalCalls) * 100) : 0;

    return {
      activeCampaigns,
      totalCalls,
      successfulCalls,
      failedCalls,
      successRate,
      totalLeads
    };
  };

  const campaignStats = getCampaignStats();

  const [animatedValues, setAnimatedValues] = useState({
    callsToday: 0,
    successRate: 0,
    totalMinutes: 0,
    activeCampaigns: 0
  });

  // Animate values on mount
  useEffect(() => {
    const targetValues = {
      callsToday: campaignStats.totalCalls || stats?.callsToday || 0,
      successRate: campaignStats.successRate || parseInt(stats?.successRate?.replace('%', '') || '0'),
      totalMinutes: Math.round(campaignStats.totalCalls * 2.5) || stats?.totalMinutes || 0, // Estimate 2.5 minutes per call
      activeCampaigns: campaignStats.activeCampaigns || stats?.activeCampaigns || 0
    };

    const duration = 2000; // 2 seconds
    const steps = 60;
    const stepDuration = duration / steps;

    let currentStep = 0;
    const interval = setInterval(() => {
      currentStep++;
      const progress = currentStep / steps;
      
      setAnimatedValues({
        callsToday: Math.floor(targetValues.callsToday * progress),
        successRate: Math.floor(targetValues.successRate * progress),
        totalMinutes: Math.floor(targetValues.totalMinutes * progress),
        activeCampaigns: Math.floor(targetValues.activeCampaigns * progress)
      });

      if (currentStep >= steps) {
        clearInterval(interval);
      }
    }, stepDuration);

    return () => clearInterval(interval);
  }, [stats, campaignStats]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="border-0 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm shadow-lg">
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4 mb-2"></div>
                  <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const statCards = [
    {
      title: "Active Campaigns",
      value: animatedValues.activeCampaigns,
      icon: Play,
      color: "from-purple-500 to-pink-500",
      bgColor: "from-purple-50 to-pink-50",
      darkBgColor: "from-purple-900/20 to-pink-900/20",
      description: "Currently running campaigns",
      chartData: Array.from({ length: 12 }, (_, i) => Math.max(0, campaignStats.activeCampaigns + Math.floor(Math.random() * 5) - 2))
    },
    {
      title: "Calls Today", 
      value: animatedValues.callsToday,
      icon: Phone,
      color: "from-green-500 to-emerald-500",
      bgColor: "from-green-50 to-emerald-50",
      darkBgColor: "from-green-900/20 to-emerald-900/20",
      description: "Total calls made today",
      chartData: Array.from({ length: 12 }, (_, i) => Math.max(0, campaignStats.totalCalls + Math.floor(Math.random() * 20) - 10))
    },
    {
      title: "Success Rate",
      value: `${animatedValues.successRate}%`,
      icon: TrendingUp,
      color: "from-purple-600 to-green-500",
      bgColor: "from-purple-50 to-green-50",
      darkBgColor: "from-purple-900/20 to-green-900/20",
      description: "Overall campaign success",
      chartData: Array.from({ length: 12 }, (_, i) => Math.max(0, Math.min(100, campaignStats.successRate + Math.floor(Math.random() * 10) - 5)))
    },
    {
      title: "Total Minutes",
      value: animatedValues.totalMinutes,
      icon: Clock,
      color: "from-green-600 to-blue-500",
      bgColor: "from-green-50 to-blue-50",
      darkBgColor: "from-green-900/20 to-blue-900/20",
      description: "Total call duration",
      chartData: Array.from({ length: 12 }, (_, i) => Math.max(0, animatedValues.totalMinutes + Math.floor(Math.random() * 50) - 25))
    },
  ];

  // Chat animation data
  const chatMessages = [
    { id: 1, user: "John D.", message: "Great call quality!", time: "2 min ago", status: "positive" },
    { id: 2, user: "Sarah M.", message: "Very professional", time: "5 min ago", status: "positive" },
    { id: 3, user: "Mike R.", message: "Excellent follow-up", time: "8 min ago", status: "positive" },
    { id: 4, user: "Lisa K.", message: "Perfect timing", time: "12 min ago", status: "positive" }
  ];

  return (
    <div className="space-y-6">
      {/* Main Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card 
              key={index} 
              className={`group relative overflow-hidden border-0 bg-gradient-to-br ${stat.bgColor} dark:${stat.darkBgColor} backdrop-blur-xl shadow-xl hover:shadow-2xl transition-all duration-500 hover:scale-105 hover:-translate-y-1`}
            >
              {/* Animated background gradient */}
              <div className={`absolute inset-0 bg-gradient-to-br ${stat.color} opacity-0 group-hover:opacity-10 transition-opacity duration-500`}></div>
              
              {/* Sparkle effect */}
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                <Sparkles className="h-4 w-4 text-yellow-500 animate-pulse" />
              </div>
              
              <CardContent className="p-6 relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      {stat.title}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-500">
                      {stat.description}
                    </p>
                  </div>
                  <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${stat.color} flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-110`}>
                    <Icon className="h-8 w-8 text-white" />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <p className="text-4xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
                    {typeof stat.value === 'number' ? stat.value.toLocaleString() : stat.value}
                  </p>
                  
                  {/* Animated progress bar */}
                  <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1 overflow-hidden">
                    <div 
                      className={`h-full bg-gradient-to-r ${stat.color} rounded-full transition-all duration-1000 ease-out`}
                      style={{ 
                        width: `${typeof stat.value === 'number' ? Math.min((stat.value / 100) * 100, 100) : 0}%` 
                      }}
                    ></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Charts and Analytics Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Performance Chart */}
        <Card className="border-0 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm shadow-xl">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-green-500 rounded-xl flex items-center justify-center">
                  <BarChart3 className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">Performance Trends</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Last 12 hours</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm text-green-600 dark:text-green-400 font-medium">Live</span>
              </div>
            </div>
            
            {/* Animated Bar Chart */}
            <div className="space-y-4">
              <div className="flex items-end justify-between h-32">
                {statCards[1].chartData.slice(-6).map((value, index) => (
                  <div key={index} className="flex flex-col items-center space-y-2">
                    <div 
                      className="w-8 bg-gradient-to-t from-purple-500 to-green-500 rounded-t-lg transition-all duration-1000 ease-out"
                      style={{ 
                        height: `${(value / Math.max(...statCards[1].chartData)) * 100}%`,
                        animationDelay: `${index * 100}ms`
                      }}
                    ></div>
                    <span className="text-xs text-slate-600 dark:text-slate-400">{index + 1}h</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Live Chat Feed */}
        <Card className="border-0 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm shadow-xl">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-blue-500 rounded-xl flex items-center justify-center">
                  <MessageCircle className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">Live Feedback</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Recent call reviews</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm text-green-600 dark:text-green-400 font-medium">Active</span>
              </div>
            </div>
            
            {/* Animated Chat Messages */}
            <div className="space-y-4 max-h-48 overflow-y-auto custom-scrollbar">
              {chatMessages.map((message, index) => (
                <div 
                  key={message.id}
                  className="flex items-start space-x-3 p-3 bg-gradient-to-r from-green-50/50 to-blue-50/50 dark:from-green-900/20 dark:to-blue-900/20 rounded-xl border border-green-200/30 dark:border-green-700/30 fade-in"
                  style={{ animationDelay: `${index * 200}ms` }}
                >
                  <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <Users className="h-4 w-4 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{message.user}</p>
                      <span className="text-xs text-slate-500 dark:text-slate-400">{message.time}</span>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{message.message}</p>
                    <div className="flex items-center space-x-1 mt-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-xs text-green-600 dark:text-green-400 font-medium">Positive</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

    </div>
  );
}
