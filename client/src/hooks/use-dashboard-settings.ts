import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { DashboardSettings } from '@/components/dashboard-settings';

const DEFAULT_SETTINGS: DashboardSettings = {
  selectedCharts: [
    { name: "Active Campaigns", type: "active_campaigns", icon: "Play", color: "blue" },
    { name: "Calls Today", type: "calls_today", icon: "Phone", color: "green" },
    { name: "Success Rate", type: "call_success", icon: "TrendingUp", color: "emerald" },
    { name: "Total Call Minutes", type: "total_minutes", icon: "Clock", color: "purple" }
  ],
  refreshInterval: 30,
  showAnimations: true,
  compactView: false
};

export function useDashboardSettings() {
  const [settings, setSettings] = useState<DashboardSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const queryClient = useQueryClient();

  // Load settings from localStorage on mount
  useEffect(() => {
    const loadSettings = () => {
      try {
        const savedSettings = localStorage.getItem('dashboard-settings');
        if (savedSettings) {
          const parsed = JSON.parse(savedSettings);
          setSettings({ ...DEFAULT_SETTINGS, ...parsed });
        }
      } catch (error) {
        console.error('Failed to load dashboard settings:', error);
        setSettings(DEFAULT_SETTINGS);
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, []);

  // Save settings to localStorage
  const saveSettings = (newSettings: Partial<DashboardSettings>) => {
    try {
      const updatedSettings = { ...settings, ...newSettings };
      setSettings(updatedSettings);
      localStorage.setItem('dashboard-settings', JSON.stringify(updatedSettings));
      
      // Invalidate queries to refresh dashboard components
      queryClient.invalidateQueries({ queryKey: ["/api/analytics/dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-settings"] });
      
      return true;
    } catch (error) {
      console.error('Failed to save dashboard settings:', error);
      return false;
    }
  };

  // Reset to default settings
  const resetSettings = () => {
    try {
      setSettings(DEFAULT_SETTINGS);
      localStorage.removeItem('dashboard-settings');
      
      // Invalidate queries to refresh dashboard components
      queryClient.invalidateQueries({ queryKey: ["/api/analytics/dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-settings"] });
      
      return true;
    } catch (error) {
      console.error('Failed to reset dashboard settings:', error);
      return false;
    }
  };

  // Update specific chart selection
  const toggleChart = (chartType: string) => {
    const currentCharts = settings.selectedCharts;
    const isSelected = currentCharts.some(c => c.type === chartType);
    
    let newCharts;
    if (isSelected) {
      newCharts = currentCharts.filter(c => c.type !== chartType);
    } else {
      // Find the chart definition from available charts
      const availableCharts = [
        { name: "Active Campaigns", type: "active_campaigns", icon: "Play", color: "blue" },
        { name: "Calls Today", type: "calls_today", icon: "Phone", color: "green" },
        { name: "Success Rate", type: "call_success", icon: "TrendingUp", color: "emerald" },
        { name: "Connection Failures", type: "call_failure", icon: "XCircle", color: "red" },
        { name: "Total Call Minutes", type: "total_minutes", icon: "Clock", color: "purple" },
        { name: "Avg Call Duration", type: "avg_call_duration", icon: "BarChart3", color: "indigo" },
        { name: "Total Campaigns", type: "total_campaigns", icon: "Target", color: "orange" },
        { name: "Completed Calls", type: "completed_calls", icon: "CheckCircle", color: "teal" }
      ];
      
      const chartToAdd = availableCharts.find(c => c.type === chartType);
      if (chartToAdd) {
        newCharts = [...currentCharts, chartToAdd];
      } else {
        newCharts = currentCharts;
      }
    }
    
    return saveSettings({ selectedCharts: newCharts });
  };

  return {
    settings,
    isLoading,
    saveSettings,
    resetSettings,
    toggleChart,
    // Convenience getters
    selectedCharts: settings.selectedCharts,
    refreshInterval: settings.refreshInterval,
    showAnimations: settings.showAnimations,
    compactView: settings.compactView
  };
} 