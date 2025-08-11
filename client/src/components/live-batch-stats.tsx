import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, Phone, CheckCircle, XCircle, Clock, AlertCircle, Minus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useToast } from "@/hooks/use-toast";

interface LiveBatchStatsProps {
  campaignId: string;
  refreshInterval?: number; // in milliseconds, default 10 seconds
}

interface LiveStats {
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
  failed: number;
  cancelled: number;
  successRate: number;
}

interface BatchStatusData {
  batchId: string;
  batchStatus: string;
  liveStats: LiveStats;
  recipients: Array<{
    id: string;
    phoneNumber: string;
    status: string;
    uiStatus: string;
    statusColor: string;
    statusIcon: string;
    conversationId?: string;
    leadInfo: {
      leadId?: string;
      firstName?: string;
      lastName?: string;
    };
  }>;
  fetchedAt: string;
}

export default function LiveBatchStats({ campaignId, refreshInterval = 10000 }: LiveBatchStatsProps) {
  const [liveData, setLiveData] = useState<BatchStatusData | null>(null);
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const { toast } = useToast();

  const fetchLiveData = async () => {
    try {
      const response = await fetch(`/api/campaigns/${campaignId}/batch-status`, {
        method: 'GET',
        credentials: 'include',
      });
      
      if (response.ok) {
        const data = await response.json();
        setLiveData(data);
        setLastUpdated(new Date());
        return data;
      } else {
        console.warn('Could not fetch live batch status:', response.statusText);
        return null;
      }
    } catch (error) {
      console.error('Error fetching live batch status:', error);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualRefresh = async () => {
    setIsLoading(true);
    const data = await fetchLiveData();
    if (data) {
      toast({
        title: "Live data updated",
        description: `Refreshed ${data.liveStats.total} call statuses from ElevenLabs`,
      });
    }
  };

  // Auto-refresh effect
  useEffect(() => {
    fetchLiveData();

    if (!autoRefresh) return;

    const interval = setInterval(fetchLiveData, refreshInterval);
    return () => clearInterval(interval);
  }, [campaignId, refreshInterval, autoRefresh]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4" />;
      case 'in_progress':
        return <Phone className="h-4 w-4" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4" />;
      case 'failed':
        return <XCircle className="h-4 w-4" />;
      case 'cancelled':
        return <Minus className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'failed':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (isLoading && !liveData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 animate-spin" />
            Loading Live Batch Status...
          </CardTitle>
        </CardHeader>
      </Card>
    );
  }

  if (!liveData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Live Batch Status</CardTitle>
          <CardDescription>No batch data available for this campaign</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                Live Batch Status
              </CardTitle>
              {/* Removed verbose description to keep UI clean */}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={autoRefresh ? "bg-green-50 border-green-200" : ""}
              >
                {autoRefresh ? t('campaignDetails.autoRefreshOn') : t('campaignDetails.autoRefreshOff')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleManualRefresh}
                disabled={isLoading}
              >
                {isLoading ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                {t('common.refresh')}
              </Button>
            </div>
          </div>
          {lastUpdated && (
            <p className="text-xs text-muted-foreground">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </p>
          )}
        </CardHeader>
      </Card>

      {/* Live Statistics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-blue-50">
                Total
              </Badge>
            </div>
            <p className="text-2xl font-bold mt-2">{liveData.liveStats.total}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-yellow-600" />
              <Badge variant="outline" className="bg-yellow-50">
                Pending
              </Badge>
            </div>
            <p className="text-2xl font-bold mt-2 text-yellow-600">{liveData.liveStats.pending}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-blue-600" />
              <Badge variant="outline" className="bg-blue-50">
                In Progress
              </Badge>
            </div>
            <p className="text-2xl font-bold mt-2 text-blue-600">{liveData.liveStats.inProgress}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <Badge variant="outline" className="bg-green-50">
                Completed
              </Badge>
            </div>
            <p className="text-2xl font-bold mt-2 text-green-600">{liveData.liveStats.completed}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-600" />
              <Badge variant="outline" className="bg-red-50">
                Failed
              </Badge>
            </div>
            <p className="text-2xl font-bold mt-2 text-red-600">{liveData.liveStats.failed}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-green-50">
                Success Rate
              </Badge>
            </div>
            <p className="text-2xl font-bold mt-2 text-green-600">{liveData.liveStats.successRate}%</p>
          </CardContent>
        </Card>
      </div>

      {/* Batch Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {getStatusIcon(liveData.batchStatus)}
            Batch Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Badge className={getStatusColor(liveData.batchStatus)}>
            {liveData.batchStatus.toUpperCase()}
          </Badge>
        </CardContent>
      </Card>

      {/* Recent Recipients (first 5) */}
      {liveData.recipients && liveData.recipients.length > 0 && (
        <Card>
          <CardHeader>
                          <CardTitle>{t('campaignDetails.recentCallStatus')}</CardTitle>
              <CardDescription>{t('campaignDetails.liveStatusUpdates')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {liveData.recipients.slice(0, 5).map((recipient) => (
                <div key={recipient.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(recipient.status)}
                      <span className="font-medium">
                        {recipient.leadInfo.firstName} {recipient.leadInfo.lastName}
                      </span>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {recipient.phoneNumber}
                    </span>
                  </div>
                  <Badge className={getStatusColor(recipient.status)}>
                    {recipient.uiStatus}
                  </Badge>
                </div>
              ))}
              {liveData.recipients.length > 5 && (
                <p className="text-sm text-muted-foreground text-center">
                  ... and {liveData.recipients.length - 5} more calls
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 