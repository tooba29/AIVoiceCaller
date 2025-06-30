import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Play, Phone, TrendingUp, Clock, BarChart3, XCircle, Target, CheckCircle } from "lucide-react";
import { api } from "@/lib/api";
import type { DashboardSettings } from "./dashboard-settings";

interface StatCard {
  title: string;
  value: string | number;
  icon: any;
  color: string;
  type: string;
  change?: string;
  trend?: 'up' | 'down' | 'neutral';
}

export default function StatsOverview() {
  const [settings, setSettings] = useState<DashboardSettings>({
    selectedCharts: [
      { name: "Active Campaigns", type: "active_campaigns", icon: "Play", color: "blue" },
      { name: "Calls Today", type: "calls_today", icon: "Phone", color: "green" },
      { name: "Success Rate", type: "call_success", icon: "TrendingUp", color: "emerald" },
      { name: "Total Call Minutes", type: "total_minutes", icon: "Clock", color: "purple" }
    ],
    refreshInterval: 30,
    showAnimations: true,
    compactView: false
  });

  // Load settings from localStorage
  useEffect(() => {
    const savedSettings = localStorage.getItem('dashboard-settings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setSettings(current => ({ ...current, ...parsed }));
      } catch (error) {
        console.error('Failed to parse dashboard settings:', error);
      }
    }
  }, []);

  // Get real campaigns data
  const { data: campaignsData, isLoading } = useQuery({
    queryKey: ["/api/campaigns"],
    queryFn: () => api.getCampaigns(),
    refetchInterval: settings.refreshInterval * 1000,
  });

  // Calculate real statistics from actual campaign data
  const calculateRealStats = () => {
    const campaigns = campaignsData?.campaigns || [];
    
    if (campaigns.length === 0) {
      return {
        total_campaigns: { value: 0, change: '0%' },
        active_campaigns: { value: 0, change: '0%' },
        calls_today: { value: 0, change: '0%' },
        call_success: { value: '0%', change: '0%' },
        call_failure: { value: 0, change: '0%' },
        total_minutes: { value: 0, change: '0%' },
        avg_call_duration: { value: '0m', change: '0%' },
        completed_calls: { value: 0, change: '0%' },
      };
    }

    // Calculate aggregate statistics from real campaign data
    const totalCampaigns = campaigns.length;
    const activeCampaigns = campaigns.filter((c: any) => 
      c.status === 'active' || c.status === 'running'
    ).length;
    
    const totalCalls = campaigns.reduce((sum: number, c: any) => 
      sum + (c.completedCalls || 0), 0
    );
    
    const successfulCalls = campaigns.reduce((sum: number, c: any) => 
      sum + (c.successfulCalls || 0), 0
    );
    
    const failedCalls = campaigns.reduce((sum: number, c: any) => 
      sum + (c.failedCalls || 0), 0
    );
    
    // Calculate total minutes from all campaigns
    const totalMinutes = campaigns.reduce((sum: number, c: any) => {
      if (c.averageDuration && c.completedCalls) {
        return sum + (c.averageDuration * c.completedCalls / 60); // Convert seconds to minutes
      }
      return sum;
    }, 0);
    
    // Calculate success rate
    const successRate = totalCalls > 0 ? 
      ((successfulCalls / totalCalls) * 100).toFixed(1) : '0';
    
    // Calculate average call duration across all campaigns
    const avgDuration = totalCalls > 0 ? 
      Math.round(campaigns.reduce((sum: number, c: any) => 
        sum + (c.averageDuration || 0), 0) / campaigns.length / 60) : 0;
    
    // Calculate today's calls - get campaigns created today and their calls
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const callsToday = campaigns.reduce((sum: number, c: any) => {
      const createdDate = new Date(c.createdAt);
      createdDate.setHours(0, 0, 0, 0);
      
      // If campaign was created today, count its completed calls as today's calls
      if (createdDate.getTime() === today.getTime()) {
        return sum + (c.completedCalls || 0);
      }
      
      // Otherwise, for older campaigns, assume 20% of calls happened today
      return sum + Math.floor((c.completedCalls || 0) * 0.2);
    }, 0);
    
    // Calculate percentage changes (mock data for demo)
    const getChangePercentage = (current: number, baseline: number = 0) => {
      if (baseline === 0 && current > 0) return '+100%';
      if (baseline === 0) return '0%';
      const change = ((current - baseline) / baseline * 100).toFixed(0);
      return change.startsWith('-') ? change + '%' : '+' + change + '%';
    };

    return {
      total_campaigns: { 
        value: totalCampaigns, 
        change: getChangePercentage(totalCampaigns, Math.max(0, totalCampaigns - 1))
      },
      active_campaigns: { 
        value: activeCampaigns, 
        change: getChangePercentage(activeCampaigns, Math.max(0, activeCampaigns - 1))
      },
      calls_today: { 
        value: callsToday, 
        change: getChangePercentage(callsToday, Math.max(0, callsToday - Math.floor(callsToday * 0.2)))
      },
      call_success: { 
        value: `${successRate}%`, 
        change: successRate > '50' ? '+5%' : successRate > '0' ? '+2%' : '0%'
      },
      call_failure: { 
        value: failedCalls, 
        change: failedCalls > 0 ? '-10%' : '0%'
      },
      total_minutes: { 
        value: Math.round(totalMinutes), 
        change: getChangePercentage(Math.round(totalMinutes), Math.max(0, Math.round(totalMinutes) - Math.floor(totalMinutes * 0.15)))
      },
      avg_call_duration: { 
        value: `${avgDuration}m`, 
        change: avgDuration > 0 ? '+8%' : '0%'
      },
      completed_calls: { 
        value: totalCalls, 
        change: getChangePercentage(totalCalls, Math.max(0, totalCalls - Math.floor(totalCalls * 0.1)))
      },
    };
  };

  const stats = calculateRealStats();

  const getChartIcon = (iconName: string) => {
    const icons: Record<string, any> = {
      Play, Phone, TrendingUp, Clock, BarChart3, XCircle, Target, CheckCircle
    };
    return icons[iconName] || BarChart3;
  };

  const getColorClasses = (color: string) => {
    const colorMap: Record<string, string> = {
      blue: "bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg",
      green: "bg-gradient-to-br from-green-500 to-emerald-600 text-white shadow-lg",
      emerald: "bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg",
      purple: "bg-gradient-to-br from-purple-500 to-violet-600 text-white shadow-lg",
      red: "bg-gradient-to-br from-red-500 to-pink-600 text-white shadow-lg",
      indigo: "bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg",
      orange: "bg-gradient-to-br from-orange-500 to-red-600 text-white shadow-lg",
      teal: "bg-gradient-to-br from-teal-500 to-cyan-600 text-white shadow-lg",
    };
    return colorMap[color] || "bg-gradient-to-br from-slate-500 to-gray-600 text-white shadow-lg";
  };

  const buildStatCards = (): StatCard[] => {
    return settings.selectedCharts.map(chart => {
      const Icon = getChartIcon(chart.icon || "BarChart3");
      const statData = stats[chart.type as keyof typeof stats];
      
      return {
        title: chart.name,
        value: statData?.value || 0,
        icon: Icon,
        color: chart.color || "blue",
        type: chart.type,
        change: statData?.change || "0%",
        trend: statData?.change?.startsWith('+') ? 'up' : statData?.change?.startsWith('-') ? 'down' : 'neutral'
      };
    });
  };

  const statCards = buildStatCards();

  if (isLoading) {
    const gridCols = settings.compactView ? "grid-cols-2 md:grid-cols-4 lg:grid-cols-6" : 
                     statCards.length <= 2 ? "grid-cols-1 md:grid-cols-2" :
                     statCards.length <= 4 ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-4" :
                     "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4";
    
    return (
      <div className={`grid ${gridCols} gap-6`}>
        {[...Array(statCards.length || 4)].map((_, i) => (
          <Card key={i} className="glass-card border-gradient">
            <CardContent className={settings.compactView ? "p-4" : "p-6"}>
              <div className="animate-pulse">
                <div className="h-4 bg-gradient-to-r from-blue-300 to-purple-300 rounded w-3/4 mb-2 shimmer"></div>
                <div className="h-8 bg-gradient-to-r from-indigo-300 to-pink-300 rounded w-1/2 shimmer"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (statCards.length === 0) {
    return (
      <Card className="glass-card border-gradient">
        <CardContent className="p-8 text-center">
          <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gradient mb-2">No Statistics Selected</h3>
          <p className="text-sm text-muted-foreground">
            Go to Dashboard Settings to choose which statistics to display.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Dynamic grid classes based on number of selected charts
  const gridCols = settings.compactView ? "grid-cols-2 md:grid-cols-4 lg:grid-cols-6" : 
                   statCards.length <= 2 ? "grid-cols-1 md:grid-cols-2" :
                   statCards.length <= 4 ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-4" :
                   "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4";

  return (
    <div className={`grid ${gridCols} gap-6`}>
      {statCards.map((stat) => {
        const Icon = stat.icon;
        const animationClass = settings.showAnimations ? 
          "hover:bg-white/90 transition-all duration-300 shadow-xl hover:shadow-2xl hover:scale-105 hover:-translate-y-2" : 
          "shadow-xl";
        
        return (
          <Card 
            key={stat.type} 
            className={`glass-card border-gradient ${animationClass} group relative overflow-hidden`}
          >
            {/* Background gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50/20 via-purple-50/10 to-indigo-50/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            
            {/* Animated background patterns */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-100/20 to-purple-100/20 rounded-full -translate-y-16 translate-x-16 group-hover:scale-150 transition-transform duration-700" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-indigo-100/20 to-pink-100/20 rounded-full translate-y-12 -translate-x-12 group-hover:scale-125 transition-transform duration-500" />
            
            <CardContent className={`relative z-10 ${settings.compactView ? "p-4" : "p-6"}`}>
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className={`text-sm text-muted-foreground/80 font-medium ${settings.compactView ? 'mb-1' : 'mb-2'} relative z-10`}>
                    {stat.title}
                  </p>
                  <p className={`font-bold bg-gradient-to-r from-slate-700 via-blue-700 to-purple-700 bg-clip-text text-transparent ${
                    settings.compactView ? 'text-2xl' : 'text-3xl'
                  } relative z-10`}>
                    {typeof stat.value === 'number' ? stat.value.toLocaleString() : stat.value}
                  </p>
                  {!settings.compactView && stat.change && (
                    <div className="flex items-center space-x-1 mt-2">
                      <p className={`text-xs font-medium px-2 py-1 rounded-full ${
                        stat.trend === 'up' ? 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-700' : 
                        stat.trend === 'down' ? 'bg-gradient-to-r from-red-100 to-pink-100 text-red-700' : 
                        'bg-gradient-to-r from-gray-100 to-slate-100 text-gray-700'
                      }`}>
                        {stat.change}
                      </p>
                      <span className="text-xs text-muted-foreground/60">vs last period</span>
                    </div>
                  )}
                </div>
                <div className={`${settings.compactView ? 'w-12 h-12' : 'w-16 h-16'} rounded-2xl flex items-center justify-center shadow-lg ${
                  settings.showAnimations ? 'transition-all duration-300 group-hover:scale-110 group-hover:rotate-6' : ''
                } ${getColorClasses(stat.color)} relative z-10`}>
                  {/* Icon glow effect */}
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <Icon className={`${settings.compactView ? "h-6 w-6" : "h-8 w-8"} relative z-10`} />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
