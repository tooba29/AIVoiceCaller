import { apiRequest } from "./queryClient";

export interface CampaignStats {
  activeCampaigns: number;
  callsToday: number;
  successRate: string;
  totalMinutes: number;
}

export interface FileUploadResponse {
  success: boolean;
  knowledgeBase?: any;
  leadsCount?: number;
  leads?: any[];
  voice?: any;
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
  category?: string;
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

export const api = {
  // PDF Knowledge Base Upload
  uploadPDF: async (file: File): Promise<FileUploadResponse> => {
    const formData = new FormData();
    formData.append('pdf', file);
    
    const response = await fetch('/api/upload-pdf', {
      method: 'POST',
      body: formData,
      credentials: 'include',
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to upload PDF');
    }
    
    return response.json();
  },

  // Update Agent Configuration
  updateAgent: async (data: {
    firstPrompt: string;
    systemPersona: string;
    campaignId?: number;
  }) => {
    const response = await apiRequest('POST', '/api/update-agent', data);
    return response.json();
  },

  // Get Available Voices
  getVoices: async (): Promise<{ voices: Voice[] }> => {
    const response = await apiRequest('GET', '/api/voices');
    return response.json();
  },

  // Clone Voice
  cloneVoice: async (file: File, data: { name: string; description?: string }): Promise<FileUploadResponse> => {
    const formData = new FormData();
    formData.append('audio', file);
    formData.append('name', data.name);
    if (data.description) {
      formData.append('description', data.description);
    }
    
    const response = await fetch('/api/clone-voice', {
      method: 'POST',
      body: formData,
      credentials: 'include',
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to clone voice');
    }
    
    return response.json();
  },

  // Upload CSV Leads
  uploadCSV: async (file: File, campaignId: number): Promise<FileUploadResponse> => {
    const formData = new FormData();
    formData.append('csv', file);
    formData.append('campaignId', campaignId.toString());
    
    const response = await fetch('/api/upload-csv', {
      method: 'POST',
      body: formData,
      credentials: 'include',
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to upload CSV');
    }
    
    return response.json();
  },

  // Make Test Call
  makeTestCall: async (data: { phoneNumber: string; campaignId?: number }) => {
    const response = await apiRequest('POST', '/api/make-outbound-call', data);
    return response.json();
  },

  // Start Campaign
  startCampaign: async (campaignId: number) => {
    const response = await apiRequest('POST', '/api/start-campaign', { campaignId });
    return response.json();
  },

  // Get Campaigns
  getCampaigns: async (): Promise<{ campaigns: Campaign[] }> => {
    const response = await apiRequest('GET', '/api/campaigns');
    return response.json();
  },

  // Get Campaign Details
  getCampaignDetails: async (id: number) => {
    const response = await apiRequest('GET', `/api/campaigns/${id}`);
    return response.json();
  },

  // Get Knowledge Base
  getKnowledgeBase: async () => {
    const response = await apiRequest('GET', '/api/knowledge-base');
    return response.json();
  },

  // Mock stats for dashboard
  getStats: async (): Promise<CampaignStats> => {
    // This would typically come from a real endpoint
    return {
      activeCampaigns: 12,
      callsToday: 1247,
      successRate: "78.5%",
      totalMinutes: 2856,
    };
  },
};
