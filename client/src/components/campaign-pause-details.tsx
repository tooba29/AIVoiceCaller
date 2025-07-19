import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, Phone, User, AlertCircle, Play, CheckCircle, XCircle } from "lucide-react";
import { api } from "@/lib/api";
import { formatDateTime, getCallStatusBadgeColor } from "@/lib/campaign-utils";

interface OngoingCall {
  callId: number;
  twilioCallSid: string | null;
  phoneNumber: string;
  status: string;
  lead: {
    id: number;
    firstName: string;
    lastName: string;
    contactNo: string;
  } | null;
  createdAt: string;
}

interface CampaignPauseDetails {
  campaign: {
    id: number;
    name: string;
    status: string;
    pausedAt: string;
    resumedAt: string;
    lastProcessedLeadId: number;
  };
  statistics: {
    totalLeads: number;
    pendingLeads: number;
    callingLeads: number;
    completedLeads: number;
    failedLeads: number;
    totalCallsTriggered: number;
    ongoingCallsCount: number;
  };
  ongoingCalls: OngoingCall[];
  lastProcessedLead: {
    id: number;
    firstName: string;
    lastName: string;
    contactNo: string;
  } | null;
}

interface CampaignPauseDetailsProps {
  campaignId: number;
  campaignName: string;
  isOpen: boolean;
  onClose: () => void;
  onResume: () => void;
}

export default function CampaignPauseDetails({
  campaignId,
  campaignName,
  isOpen,
  onClose,
  onResume
}: CampaignPauseDetailsProps) {
  const { t } = useTranslation();

  const { data: pauseDetails, isLoading } = useQuery<CampaignPauseDetails>({
    queryKey: [`/api/campaigns/${campaignId}/pause-details`],
    queryFn: () => api.getCampaignPauseDetails(campaignId),
    enabled: isOpen && campaignId > 0,
    refetchInterval: 5000, // Refresh every 5 seconds to show live status
  });

  // Using centralized utility functions from campaign-utils

  if (isLoading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Campaign Pause Details</DialogTitle>
          </DialogHeader>
          <div className="p-6">
            <div className="animate-pulse space-y-4">
              <div className="h-4 bg-gray-200 rounded w-1/3"></div>
              <div className="h-20 bg-gray-200 rounded"></div>
              <div className="h-40 bg-gray-200 rounded"></div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!pauseDetails) {
    return null;
  }

  const { campaign, statistics, ongoingCalls, lastProcessedLead } = pauseDetails;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-orange-500" />
            Campaign Pause Details: {campaignName}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 p-2">
          {/* Pause Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Pause Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Paused At</p>
                  <p className="font-medium">{formatDateTime(campaign.pausedAt)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Last Resumed At</p>
                  <p className="font-medium">{formatDateTime(campaign.resumedAt)}</p>
                </div>
                {lastProcessedLead && (
                  <div className="md:col-span-2">
                    <p className="text-sm text-gray-600">Last Processed Lead</p>
                    <p className="font-medium">
                      {lastProcessedLead.firstName} {lastProcessedLead.lastName} - {lastProcessedLead.contactNo}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Campaign Statistics */}
          <Card>
            <CardHeader>
              <CardTitle>Campaign Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{statistics.totalLeads}</div>
                  <div className="text-sm text-blue-600">Total Leads</div>
                </div>
                <div className="text-center p-3 bg-yellow-50 rounded-lg">
                  <div className="text-2xl font-bold text-yellow-600">{statistics.pendingLeads}</div>
                  <div className="text-sm text-yellow-600">Pending</div>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{statistics.completedLeads}</div>
                  <div className="text-sm text-green-600">Completed</div>
                </div>
                <div className="text-center p-3 bg-red-50 rounded-lg">
                  <div className="text-2xl font-bold text-red-600">{statistics.failedLeads}</div>
                  <div className="text-sm text-red-600">Failed</div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                <div className="text-center p-3 bg-orange-50 rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">{statistics.callingLeads}</div>
                  <div className="text-sm text-orange-600">Currently Calling</div>
                </div>
                <div className="text-center p-3 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">{statistics.totalCallsTriggered}</div>
                  <div className="text-sm text-purple-600">Calls Triggered</div>
                </div>
                <div className="text-center p-3 bg-indigo-50 rounded-lg">
                  <div className="text-2xl font-bold text-indigo-600">{statistics.ongoingCallsCount}</div>
                  <div className="text-sm text-indigo-600">Ongoing Calls</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Ongoing Calls */}
          {ongoingCalls && ongoingCalls.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  Ongoing Calls ({ongoingCalls.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {ongoingCalls.map((call: OngoingCall, index: number) => (
                    <div key={call.callId} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <User className="h-4 w-4 text-gray-500" />
                        <div>
                          <p className="font-medium">
                            {call.lead ? `${call.lead.firstName} ${call.lead.lastName}` : 'Unknown Lead'}
                          </p>
                          <p className="text-sm text-gray-600">{call.phoneNumber}</p>
                          <p className="text-xs text-gray-500">
                            Started: {formatDateTime(call.createdAt)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={getCallStatusBadgeColor(call.status)}>
                          {call.status}
                        </Badge>
                        {call.twilioCallSid && (
                          <Badge variant="outline" className="text-xs">
                            {call.twilioCallSid.substring(0, 8)}...
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="flex justify-between items-center pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            <Button onClick={onResume} className="bg-green-600 hover:bg-green-700">
              <Play className="h-4 w-4 mr-2" />
              Resume Campaign
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 