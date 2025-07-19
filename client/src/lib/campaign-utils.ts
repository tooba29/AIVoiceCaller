/**
 * Utility functions for campaign operations and formatting
 */

// Date formatting utilities
export const formatDateTime = (dateString: string | null | undefined): string => {
  if (!dateString) return "N/A";
  try {
    return new Date(dateString).toLocaleString();
  } catch {
    return "Invalid Date";
  }
};

export const formatDate = (dateString: string | null | undefined): string => {
  if (!dateString) return "N/A";
  try {
    return new Date(dateString).toLocaleDateString();
  } catch {
    return "Invalid Date";
  }
};

// Status badge utilities
export const getStatusBadgeClasses = (status: string): string => {
  const statusMap: Record<string, string> = {
    active: "border-green-200 bg-green-50 text-green-700",
    paused: "border-yellow-200 bg-yellow-50 text-yellow-700", 
    completed: "border-blue-200 bg-blue-50 text-blue-700",
    draft: "border-gray-200 bg-gray-50 text-gray-700",
    failed: "border-red-200 bg-red-50 text-red-700"
  };
  return statusMap[status] || statusMap.draft;
};

export const getStatusColor = (status: string): string => {
  const colorMap: Record<string, string> = {
    active: "bg-green-100 text-green-700",
    paused: "bg-yellow-100 text-yellow-700",
    completed: "bg-blue-100 text-blue-700", 
    draft: "bg-gray-100 text-gray-700",
    failed: "bg-red-100 text-red-700"
  };
  return colorMap[status] || colorMap.draft;
};

export const getCallStatusBadgeColor = (status: string): string => {
  const statusColorMap: Record<string, string> = {
    initiated: 'bg-blue-100 text-blue-700',
    ringing: 'bg-yellow-100 text-yellow-700',
    'in-progress': 'bg-green-100 text-green-700',
    completed: 'bg-green-100 text-green-700',
    failed: 'bg-red-100 text-red-700',
    busy: 'bg-orange-100 text-orange-700',
    'no-answer': 'bg-gray-100 text-gray-700'
  };
  return statusColorMap[status] || 'bg-gray-100 text-gray-700';
};

// Campaign statistics utilities
export const calculateProgress = (campaign: { completedCalls?: number; totalLeads?: number }): number => {
  if (!campaign.totalLeads || campaign.totalLeads === 0) return 0;
  const completed = campaign.completedCalls || 0;
  return Math.round((completed / campaign.totalLeads) * 100);
};

export const getProgressPercentage = (campaign: { completedCalls?: number; totalLeads?: number }): number => {
  return calculateProgress(campaign);
};

// Campaign validation utilities
export const validateCampaignForLaunch = (campaign: any, selectedVoiceId: string | null, uploadedLeads: any[]): {
  isReady: boolean;
  missingFields: string[];
} => {
  const missingFields: string[] = [];
  
  if (!campaign?.firstPrompt) missingFields.push('First Prompt');
  if (!selectedVoiceId) missingFields.push('Voice Selection');
  if (!campaign?.knowledgeBaseId) missingFields.push('Knowledge Base');
  if (uploadedLeads.length === 0) missingFields.push('Leads Upload');
  
  return {
    isReady: missingFields.length === 0,
    missingFields
  };
};

// File validation utilities
export const validateCSVFile = (file: File): { isValid: boolean; error?: string } => {
  if (file.type !== 'text/csv') {
    return { isValid: false, error: 'Please upload a CSV file' };
  }
  
  if (file.size > 10 * 1024 * 1024) { // 10MB limit
    return { isValid: false, error: 'File size should be less than 10MB' };
  }
  
  return { isValid: true };
};

// Campaign timing utilities
export const getCampaignDuration = (startDate: string | null, endDate: string | null): string => {
  if (!startDate) return "Not started";
  if (!endDate) return "In progress";
  
  try {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffMs = end.getTime() - start.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (diffHours > 0) {
      return `${diffHours}h ${diffMinutes}m`;
    }
    return `${diffMinutes}m`;
  } catch {
    return "Unknown";
  }
};

// Lead status utilities  
export const getLeadStatusCounts = (leads: any[]) => {
  return leads.reduce((counts, lead) => {
    const status = lead.status || 'pending';
    counts[status] = (counts[status] || 0) + 1;
    return counts;
  }, {} as Record<string, number>);
};

// Call status utilities
export const getCallStatusCounts = (callLogs: any[]) => {
  return callLogs.reduce((counts, log) => {
    const status = log.status || 'unknown';
    counts[status] = (counts[status] || 0) + 1;
    return counts;
  }, {} as Record<string, number>);
};

// Format phone number for display
export const formatPhoneNumber = (phoneNumber: string): string => {
  if (!phoneNumber) return '';
  
  // Remove all non-digit characters
  const cleaned = phoneNumber.replace(/\D/g, '');
  
  // Format as US phone number if 10 digits
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  
  // Format as international if 11+ digits
  if (cleaned.length >= 11) {
    return `+${cleaned.slice(0, 1)} (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7, 11)}`;
  }
  
  return phoneNumber; // Return as-is if can't format
}; 