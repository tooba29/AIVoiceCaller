import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Search, Plus, Play, Pause, Square, MoreHorizontal, Edit2, Check, X, Upload, MessageSquare, Trash2 } from "lucide-react";
import { api, type Campaign } from "@/lib/api";
import Sidebar from "@/components/sidebar";
import { useToast } from "@/hooks/use-toast";

export default function Campaigns() {
  const [searchTerm, setSearchTerm] = useState("");
  const [editingCampaign, setEditingCampaign] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editGreeting, setEditGreeting] = useState("");
  const [showGreetingDialog, setShowGreetingDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedCampaignId, setSelectedCampaignId] = useState<number | null>(null);
  const [campaignToDelete, setCampaignToDelete] = useState<Campaign | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: campaignsData, isLoading } = useQuery({
    queryKey: ["/api/campaigns"],
    queryFn: () => api.getCampaigns(),
    refetchInterval: 5000,
  });

  // Update campaign mutation
  const updateCampaignMutation = useMutation({
    mutationFn: ({ id, updates }: { id: number; updates: any }) =>
      api.updateCampaign(id, updates),
    onSuccess: () => {
      toast({
        title: "Campaign Updated",
        description: "Campaign has been updated successfully.",
      });
      setEditingCampaign(null);
      setShowGreetingDialog(false);
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update campaign",
        variant: "destructive",
      });
    },
  });

  // CSV upload mutation
  const csvUploadMutation = useMutation({
    mutationFn: (data: { file: File; campaignId: string }) =>
      api.uploadCSV(data.file, data.campaignId),
    onSuccess: () => {
      toast({
        title: "Leads Updated",
        description: "CSV file has been uploaded successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
    },
    onError: (error: any) => {
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload CSV file",
        variant: "destructive",
      });
    },
  });

  // Campaign status mutation
  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      api.updateCampaign(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
    },
    onError: (error: any) => {
      toast({
        title: "Status Update Failed",
        description: error.message || "Failed to update campaign status",
        variant: "destructive",
      });
    },
  });

  // Delete campaign mutation
  const deleteCampaignMutation = useMutation({
    mutationFn: (id: number) => api.deleteCampaign(id),
    onSuccess: () => {
      toast({
        title: "Campaign Deleted",
        description: "Campaign has been deleted successfully.",
      });
      setShowDeleteDialog(false);
      setCampaignToDelete(null);
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
    },
    onError: (error: any) => {
      toast({
        title: "Delete Failed",
        description: error.message || "Failed to delete campaign",
        variant: "destructive",
      });
    },
  });

  const handleEditClick = (campaign: Campaign) => {
    setEditingCampaign(campaign.id);
    setEditName(campaign.name);
  };

  const handleEditGreeting = (campaign: Campaign) => {
    setSelectedCampaignId(campaign.id);
    setEditGreeting(campaign.firstPrompt);
    setShowGreetingDialog(true);
  };

  const handleSaveGreeting = () => {
    if (!selectedCampaignId) return;
    
    if (!editGreeting.trim()) {
      toast({
        title: "Validation Error",
        description: "Greeting message cannot be empty",
        variant: "destructive",
      });
      return;
    }

    updateCampaignMutation.mutate({
      id: selectedCampaignId,
      updates: { firstPrompt: editGreeting.trim() }
    });
  };

  const handleSaveEdit = (campaignId: number) => {
    if (!editName.trim()) {
      toast({
        title: "Validation Error",
        description: "Campaign name cannot be empty",
        variant: "destructive",
      });
      return;
    }

    updateCampaignMutation.mutate({
      id: campaignId,
      updates: { name: editName.trim() }
    });
  };

  const handleCancelEdit = () => {
    setEditingCampaign(null);
    setEditName("");
  };

  const handleFileUpload = (campaignId: number, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== 'text/csv') {
      toast({
        title: "Invalid File",
        description: "Please upload a CSV file",
        variant: "destructive",
      });
      return;
    }

    csvUploadMutation.mutate({
      file,
      campaignId: campaignId.toString()
    });
  };

  const handleStatusUpdate = (campaignId: number, status: string) => {
    updateStatusMutation.mutate({ id: campaignId, status });
  };

  const handleDeleteClick = (campaign: Campaign) => {
    setCampaignToDelete(campaign);
    setShowDeleteDialog(true);
  };

  const handleConfirmDelete = () => {
    if (!campaignToDelete) return;
    deleteCampaignMutation.mutate(campaignToDelete.id);
  };

  const filteredCampaigns = (campaignsData?.campaigns as Campaign[] || []).filter((campaign: Campaign) =>
    campaign.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300";
      case "paused":
        return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300";
      case "completed":
        return "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300";
      case "draft":
        return "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300";
      default:
        return "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300";
    }
  };

  const getProgressPercentage = (campaign: Campaign) => {
    if (campaign.totalLeads === 0) return 0;
    return Math.round(((campaign.completedCalls || 0) / campaign.totalLeads) * 100);
  };

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-card border-b border-border px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold text-foreground bg-gradient-to-r from-primary to-violet-400 bg-clip-text text-transparent">
                Campaigns
              </h2>
              <p className="text-muted-foreground mt-2">Manage all your voice calling campaigns</p>
            </div>
            <Button className="bg-primary hover:bg-primary/90 shadow-lg">
              <Plus className="h-4 w-4 mr-2" />
              New Campaign
            </Button>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-8 bg-background">
          <div className="max-w-7xl mx-auto space-y-6">
            
            {/* Search and Filters */}
            <div className="flex items-center space-x-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search campaigns..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Campaigns Grid */}
            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="mt-2 text-sm text-muted-foreground">Loading campaigns...</p>
              </div>
            ) : filteredCampaigns.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No campaigns found</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredCampaigns.map((campaign: Campaign) => (
                  <Card key={campaign.id} className="border border-border bg-card/50 backdrop-blur-sm hover:bg-card/80 transition-all duration-300 shadow-lg hover:shadow-xl">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg font-semibold text-foreground truncate">
                          {editingCampaign === campaign.id ? (
                            <div className="flex items-center space-x-2">
                              <Input
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                className="text-base"
                                autoFocus
                              />
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleSaveEdit(campaign.id)}
                                disabled={updateCampaignMutation.isPending}
                              >
                                <Check className="h-4 w-4 text-green-600" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleCancelEdit}
                                disabled={updateCampaignMutation.isPending}
                              >
                                <X className="h-4 w-4 text-red-600" />
                              </Button>
                            </div>
                          ) : (
                            campaign.name
                          )}
                        </CardTitle>
                        <div className="flex items-center space-x-2">
                          <Badge className={getStatusColor(campaign.status)}>
                            {campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
                          </Badge>
                          {!editingCampaign && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditClick(campaign)}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      
                      {/* Progress */}
                      <div>
                        <div className="flex items-center justify-between text-sm mb-2">
                          <span className="text-muted-foreground">Progress</span>
                          <span className="text-foreground font-medium">
                            {campaign.completedCalls || 0} / {campaign.totalLeads} calls
                          </span>
                        </div>
                        <Progress value={getProgressPercentage(campaign)} className="h-2" />
                      </div>

                      {/* Stats */}
                      <div className="grid grid-cols-3 gap-3 text-center">
                        <div className="p-2 bg-accent/50 rounded-lg">
                          <p className="text-lg font-semibold text-foreground">{campaign.successfulCalls || 0}</p>
                          <p className="text-xs text-green-600">Success</p>
                        </div>
                        <div className="p-2 bg-accent/50 rounded-lg">
                          <p className="text-lg font-semibold text-foreground">{campaign.failedCalls || 0}</p>
                          <p className="text-xs text-red-600">Failed</p>
                        </div>
                        <div className="p-2 bg-accent/50 rounded-lg">
                          <p className="text-lg font-semibold text-foreground">
                            {campaign.totalLeads - (campaign.completedCalls || 0)}
                          </p>
                          <p className="text-xs text-yellow-600">Pending</p>
                        </div>
                      </div>

                      {/* Edit Actions */}
                      <div className="flex items-center justify-between border-t border-border pt-4">
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditGreeting(campaign)}
                          >
                            <MessageSquare className="h-3 w-3 mr-1" />
                            Edit Greeting
                          </Button>
                          <label className="cursor-pointer">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => document.getElementById(`csv-upload-${campaign.id}`)?.click()}
                            >
                              <Upload className="h-3 w-3 mr-1" />
                              Update Leads
                            </Button>
                            <input
                              id={`csv-upload-${campaign.id}`}
                              type="file"
                              accept=".csv"
                              className="hidden"
                              onChange={(e) => handleFileUpload(campaign.id, e)}
                            />
                          </label>
                        </div>
                      </div>

                      {/* Campaign Control Actions */}
                      <div className="flex items-center justify-between pt-2">
                        <div className="flex items-center space-x-2">
                          {campaign.status === "active" && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleStatusUpdate(campaign.id, "paused")}
                            >
                              <Pause className="h-3 w-3 mr-1" />
                              Pause
                            </Button>
                          )}
                          {campaign.status === "paused" && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleStatusUpdate(campaign.id, "active")}
                            >
                              <Play className="h-3 w-3 mr-1" />
                              Resume
                            </Button>
                          )}
                          {campaign.status === "draft" && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleStatusUpdate(campaign.id, "active")}
                            >
                              <Play className="h-3 w-3 mr-1" />
                              Start
                            </Button>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleStatusUpdate(campaign.id, "stopped")}
                        >
                          <Square className="h-3 w-3" />
                        </Button>
                      </div>

                      {/* Add Delete Button */}
                      <div className="flex items-center justify-between border-t border-border pt-4">
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteClick(campaign)}
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Delete
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Greeting Edit Dialog */}
      <Dialog open={showGreetingDialog} onOpenChange={setShowGreetingDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Greeting Message</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Textarea
              value={editGreeting}
              onChange={(e) => setEditGreeting(e.target.value)}
              placeholder="Enter the greeting message..."
              rows={4}
            />
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => setShowGreetingDialog(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveGreeting}
                disabled={updateCampaignMutation.isPending}
              >
                {updateCampaignMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Campaign</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{campaignToDelete?.name}"? This action cannot be undone.
              {campaignToDelete?.status === "active" && (
                <p className="text-destructive mt-2">
                  This campaign is currently active. Please stop it before deleting.
                </p>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="space-x-2">
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={deleteCampaignMutation.isPending || campaignToDelete?.status === "active"}
            >
              {deleteCampaignMutation.isPending ? "Deleting..." : "Delete Campaign"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}