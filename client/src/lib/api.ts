export interface CampaignStats {
  activeCampaigns: number;
  callsToday: number;
  successRate: string;
  totalMinutes: number;
}

export interface DashboardAnalytics {
  charts: {
    name: string;
    type: string;
    data: any;
  }[];
}

export interface FileUploadResponse {
  success: boolean;
  voice?: Voice;
  error?: string;
  leadsCount?: number;
  leads?: any[];
  message?: string;
}

export interface Voice {
  id: string;
  name: string;
  description: string;
  isCloned: boolean;
  sampleUrl?: string;
  settings?: {
    stability: number;
    similarity_boost: number;
    style: number;
    use_speaker_boost: boolean;
  };
  category?: 'premade' | 'cloned' | 'generated';
}

export interface Campaign {
  id: number;
  name: string;
  firstPrompt: string;
  systemPersona: string;
  selectedVoiceId?: string;
  status: string;
  totalLeads: number;
  completedCalls: number;
  successfulCalls: number;
  failedCalls: number;
  pendingLeads?: number;
  callingLeads?: number;
  averageDuration?: number;
  createdAt: string;
}

export interface Lead {
  id: number;
  campaignId: number;
  firstName: string;
  lastName: string;
  contactNo: string;
  status: string;
  callDuration?: number;
  createdAt: string;
}

export interface DashboardChart {
  name: string;
  type: string;
  icon?: string;
  color?: string;
}

export interface UpdateDashboardRequest {
  charts: DashboardChart[];
}

export interface CampaignDetailsResponse {
  campaign: Campaign;
  leads: Lead[];
  callLogs: CallLog[];
  stats: {
    totalLeads: number;
    completed: number;
    failed: number;
    pending: number;
  };
}

export interface CallLog {
  id: number;
  campaignId?: number;
  leadId?: number;
  phoneNumber: string;
  status: string;
  duration?: number;
  elevenLabsConversationId?: string;
  createdAt: string;
}

const BASE_URL = '';  // Use relative URLs since we're on the same domain

async function handleResponse(response: Response) {
  const data = await response.json();
  if (!response.ok) {
    // Handle authentication errors
    if (response.status === 401) {
      // Let the AuthProvider handle the 401 by reloading
      window.location.reload();
      return;
    }
    throw new Error(data.error || 'API request failed');
  }
  return data;
}

export const api = {
  // GET requests
  getCampaigns: () => 
    fetch(`${BASE_URL}/api/campaigns`, {
      credentials: 'include'
    }).then(handleResponse),
  
  getVoices: () => 
    fetch(`${BASE_URL}/api/voices`, {
      credentials: 'include'
    }).then(handleResponse),
  
  getKnowledgeBase: () => 
    fetch(`${BASE_URL}/api/knowledge-base`, {
      credentials: 'include'
    }).then(handleResponse),

  getCampaignKnowledgeBase: (campaignId: number) => 
    fetch(`${BASE_URL}/api/campaigns/${campaignId}/knowledge-base`, {
      credentials: 'include'
    }).then(handleResponse),

  // POST requests
  post: async (endpoint: string, data: any) => {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  // File upload requests
  uploadPDF: async (file: File, campaignId: string) => {
    const formData = new FormData();
    formData.append('pdf', file);
    formData.append('campaignId', campaignId);

    const response = await fetch(`${BASE_URL}/api/upload-pdf`, {
      method: 'POST',
      credentials: 'include',
      body: formData,
    });
    return handleResponse(response);
  },

  uploadCSV: async (file: File, campaignId: string) => {
    const formData = new FormData();
    formData.append('csv', file);
    formData.append('campaignId', campaignId);

    const response = await fetch(`${BASE_URL}/api/upload-csv`, {
      method: 'POST',
      credentials: 'include',
      body: formData,
    });
    return handleResponse(response);
  },

  uploadVoiceSample: async (file: File, name: string, description?: string) => {
    const formData = new FormData();
    formData.append('audio', file);
    formData.append('name', name);
    if (description) {
      formData.append('description', description);
    }

    const response = await fetch(`${BASE_URL}/api/clone-voice`, {
      method: 'POST',
      credentials: 'include',
      body: formData,
    });
    return handleResponse(response);
  },

  // Campaign actions
  updateAgent: async (data: any) => {
    const response = await fetch(`${BASE_URL}/api/update-agent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  makeTestCall: async (data: { phoneNumber: string; campaignId?: number; firstName?: string }) => {
    const response = await fetch(`${BASE_URL}/api/make-outbound-call`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  startCampaign: async (campaignId: number) => {
    const response = await fetch(`${BASE_URL}/api/start-campaign`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ campaignId }),
    });
    return handleResponse(response);
  },

  // Replace the mock getStats with real analytics
  getStats: async (): Promise<CampaignStats> => {
    try {
      const response = await fetch(`${BASE_URL}/api/analytics/dashboard`, {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Failed to fetch analytics');
      }

      const data: DashboardAnalytics = await response.json();
      
      // Extract values from the ElevenLabs response
      const stats: CampaignStats = {
        activeCampaigns: 0,
        callsToday: 0,
        successRate: "0%",
        totalMinutes: 0
      };

      data.charts.forEach(chart => {
        switch (chart.name) {
          case "active_campaigns":
            stats.activeCampaigns = parseInt(chart.data) || 0;
            break;
          case "calls_today":
            stats.callsToday = parseInt(chart.data) || 0;
            break;
          case "success_rate":
            stats.successRate = typeof chart.data === 'number' 
              ? `${Math.round(chart.data * 100)}%` 
              : '0%';
            break;
          case "total_minutes":
            stats.totalMinutes = parseInt(chart.data) || 0;
            break;
        }
      });

      return stats;
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
      // Return zeros if the API call fails
      return {
        activeCampaigns: 0,
        callsToday: 0,
        successRate: "0%",
        totalMinutes: 0
      };
    }
  },

  updateCampaign: async (campaignId: number, updates: {
    name?: string;
    status?: string;
    firstPrompt?: string;
    systemPersona?: string;
  }) => {
    const response = await fetch(`${BASE_URL}/api/campaigns/${campaignId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(updates),
    });
    return handleResponse(response);
  },

  // Reset campaign statistics (fix stale data)
  resetCampaignStats: async (campaignId: number) => {
    const response = await fetch(`${BASE_URL}/api/campaigns/${campaignId}/reset-stats`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });
    return handleResponse(response);
  },

  // Reset all campaign statistics (fix all stale data)
  resetAllCampaignStats: async () => {
    const response = await fetch(`${BASE_URL}/api/campaigns/reset-all-stats`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });
    return handleResponse(response);
  },

  deleteCampaign: async (campaignId: number) => {
    try {
      const response = await fetch(`${BASE_URL}/api/campaigns/${campaignId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: response.statusText }));
        throw new Error(errorData.error || 'Failed to delete campaign');
      }

      return response.json();
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to delete campaign');
    }
  },

  // Add updateDashboardSettings method
  updateDashboardSettings: async (settings: UpdateDashboardRequest) => {
    try {
      const response = await fetch(`${BASE_URL}/api/analytics/dashboard/settings`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(settings),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update dashboard settings');
      }

      return response.json();
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to update dashboard settings');
    }
  },

  // Get campaign details with conversations
  getCampaignDetails: async (campaignId: number): Promise<CampaignDetailsResponse> => {
    try {
      const response = await fetch(`${BASE_URL}/api/campaigns/${campaignId}/details`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: response.statusText }));
        throw new Error(errorData.error || 'Failed to fetch campaign details');
      }

      return response.json();
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to fetch campaign details');
    }
  },

  // Get conversation audio URL (returns audio stream URL)
  getConversationAudioUrl: (conversationId: string) => {
    const url = `${BASE_URL}/api/conversations/${conversationId}/audio`;
    console.log(`[API] 🎵 Generated conversation audio URL: ${url}`);
    return url;
  },

  deleteKnowledgeBase: async (id: number, campaignId: number) => {
    try {
      const response = await fetch(`${BASE_URL}/api/knowledge-base/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ campaignId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete knowledge base file');
      }

      return response.json();
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to delete knowledge base file');
    }
  },

  deleteLeads: async (campaignId: number) => {
    try {
      const response = await fetch(`${BASE_URL}/api/campaigns/${campaignId}/leads`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete leads');
      }

      return response.json();
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to delete leads');
    }
  },

  // Load dashboard settings from localStorage or use defaults
  getDashboardSettingsLocal() {
    const defaultSettings = {
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

    try {
      const saved = localStorage.getItem('dashboard-settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        return { ...defaultSettings, ...parsed };
      }
    } catch (error) {
      console.error('Failed to load dashboard settings:', error);
    }
    
    return defaultSettings;
  },

  // Save dashboard settings to localStorage
  saveDashboardSettingsLocal: (settings: any) => {
    try {
      localStorage.setItem('dashboard-settings', JSON.stringify(settings));
      return true;
    } catch (error) {
      console.error('Failed to save dashboard settings:', error);
      return false;
    }
  },
};
