import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Phone, PhoneCall, PhoneOff, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

interface ActiveCall {
  callId: string;
  phoneNumber: string;
  status: string;
  startTime: string;
  campaignId: number;
  leadName: string;
}

interface CallHistoryItem {
  callId: string;
  phoneNumber: string;
  leadName: string;
  status: 'success' | 'failed' | 'declined' | 'no-answer';
  timestamp: string;
  duration?: number;
  provider: string;
  campaignId: number;
  campaignName: string;
}

const CallTracking: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'active' | 'history'>('active');

  // Fetch active calls
  const { data: activeCallsData, isLoading: activeLoading, refetch: refetchActive } = useQuery({
    queryKey: ['/api/calls/active'],
    queryFn: () => api.getActiveCalls(),
    refetchInterval: 2000, // Refresh every 2 seconds
  });

  // Fetch call history
  const { data: callHistoryData, isLoading: historyLoading, refetch: refetchHistory } = useQuery({
    queryKey: ['/api/calls/history'],
    queryFn: () => api.getCallHistory(),
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  const activeCalls: ActiveCall[] = activeCallsData?.activeCalls || [];
  const callHistory: CallHistoryItem[] = callHistoryData?.callHistory || [];

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'initiated':
      case 'ringing':
        return <PhoneCall className="h-4 w-4 text-blue-500 animate-pulse" />;
      case 'in-progress':
      case 'active':
        return <Phone className="h-4 w-4 text-green-500" />;
      case 'completed':
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'failed':
      case 'declined':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'no-answer':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'initiated':
      case 'ringing':
        return 'bg-blue-100 text-blue-800';
      case 'in-progress':
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'completed':
      case 'success':
        return 'bg-green-100 text-green-800';
      case 'failed':
      case 'declined':
        return 'bg-red-100 text-red-800';
      case 'no-answer':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Call Tracking</h2>
          <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setActiveTab('active')}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'active'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Active Calls ({activeCalls.length})
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'history'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Call History ({callHistory.length})
            </button>
          </div>
        </div>

        {activeTab === 'active' && (
          <div>
            {activeLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-2 text-gray-600">Loading active calls...</span>
              </div>
            ) : activeCalls.length === 0 ? (
              <div className="text-center py-8">
                <PhoneOff className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No active calls</p>
              </div>
            ) : (
              <div className="space-y-4">
                {activeCalls.map((call) => (
                  <div key={call.callId} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        {getStatusIcon(call.status)}
                        <div>
                          <p className="font-medium text-gray-900">{call.leadName}</p>
                          <p className="text-sm text-gray-600">{call.phoneNumber}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(call.status)}`}>
                          {call.status}
                        </span>
                        <p className="text-xs text-gray-500 mt-1">
                          Started: {formatTime(call.startTime)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'history' && (
          <div>
            {historyLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-2 text-gray-600">Loading call history...</span>
              </div>
            ) : callHistory.length === 0 ? (
              <div className="text-center py-8">
                <PhoneOff className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No call history available</p>
              </div>
            ) : (
              <div className="space-y-3">
                {callHistory.map((call) => (
                  <div key={call.callId} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        {getStatusIcon(call.status)}
                        <div>
                          <p className="font-medium text-gray-900">{call.leadName}</p>
                          <p className="text-sm text-gray-600">{call.phoneNumber}</p>
                          <p className="text-xs text-gray-500">Campaign: {call.campaignName}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(call.status)}`}>
                          {call.status}
                        </span>
                        <p className="text-xs text-gray-500 mt-1">
                          {formatTime(call.timestamp)}
                        </p>
                        {call.duration && (
                          <p className="text-xs text-gray-500">
                            Duration: {formatDuration(call.duration)}
                          </p>
                        )}
                        <p className="text-xs text-gray-500">
                          Provider: {call.provider}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CallTracking;
