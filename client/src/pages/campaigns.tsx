import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Play, Pause, Trash2, Eye, Plus, Phone, Edit } from "lucide-react";
import { useLocation } from "wouter";
import { api, type Campaign } from "@/lib/api";
import Sidebar from "@/components/sidebar";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";

// Utility functions
const getStatusBadgeClasses = (status: string) => {
  switch (status) {
    case "active":
      return "border-green-200 bg-green-50 text-green-700";
    case "paused":
      return "border-yellow-200 bg-yellow-50 text-yellow-700";
    case "completed":
      return "border-blue-200 bg-blue-50 text-blue-700";
    case "draft":
      return "border-gray-200 bg-gray-50 text-gray-700";
    default:
      return "border-gray-200 bg-gray-50 text-gray-700";
  }
};

const formatDate = (dateString: string) => {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  return date.toLocaleDateString();
};

export default function Campaigns() {
  const [editingCampaign, setEditingCampaign] = useState<number | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedCampaignId, setSelectedCampaignId] = useState<number | null>(null);
  const [campaignToDelete, setCampaignToDelete] = useState<Campaign | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newCampaignName, setNewCampaignName] = useState("");

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
      setShowCreateDialog(false); // Close the create/edit dialog
      setNewCampaignName(""); // Clear the input field
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

  // Removed unused edit functions - functionality moved to dialog

  const handleCancelEdit = () => {
    setEditingCampaign(null);
    setNewCampaignName(""); // Clear the campaign name input
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

  const handleViewDetails = (campaignId: number) => {
    setLocation(`/campaigns/${campaignId}`);
  };

  // Display all campaigns (search functionality removed)
  const filteredCampaigns = (campaignsData?.campaigns as Campaign[] || []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-700";
      case "paused":
        return "bg-yellow-100 text-yellow-700";
      case "completed":
        return "bg-blue-100 text-blue-700";
      case "draft":
        return "bg-gray-100 text-gray-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const getProgressPercentage = (campaign: Campaign) => {
    if (campaign.totalLeads === 0) return 0;
    return Math.round(((campaign.completedCalls || 0) / campaign.totalLeads) * 100);
  };

  const handleCreateCampaign = () => {
    if (!newCampaignName.trim()) {
      toast({
        title: "Validation Error",
        description: "Campaign name cannot be empty",
        variant: "destructive",
      });
      return;
    }

    updateCampaignMutation.mutate({
      id: 0,
      updates: { name: newCampaignName.trim() }
    });
  };

  const handleUpdateCampaign = () => {
    if (!editingCampaign) {
      toast({
        title: "Error",
        description: "No campaign selected for editing",
        variant: "destructive",
      });
      return;
    }

    if (!newCampaignName.trim()) {
      toast({
        title: "Validation Error",
        description: "Campaign name cannot be empty",
        variant: "destructive",
      });
      return;
    }

    updateCampaignMutation.mutate({
      id: editingCampaign,
      updates: { name: newCampaignName.trim() }
    });
  };

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-gradient-to-r from-white/90 via-blue-50/80 to-purple-50/60 backdrop-blur-xl border-b border-white/20 px-8 py-6 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-4xl font-bold text-gradient mb-2">
                Campaign Management
              </h2>
              <p className="text-muted-foreground/80 text-lg">Create and manage your AI voice calling campaigns</p>
            </div>
            <div className="flex items-center space-x-4">
              <Button
                onClick={() => setShowCreateDialog(true)}
                className="btn-gradient hover-lift shadow-lg"
              >
                <Plus className="h-5 w-5 mr-2" />
                New Campaign
              </Button>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-8 bg-gradient-to-br from-slate-50/50 via-blue-50/30 to-indigo-50/20">
          <div className="max-w-7xl mx-auto">
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                {[...Array(6)].map((_, i) => (
                  <Card key={i} className="glass-card border-gradient">
                    <CardContent className="p-6">
                      <div className="animate-pulse">
                        <div className="h-6 bg-gradient-to-r from-blue-300 to-purple-300 rounded w-3/4 mb-4 shimmer"></div>
                        <div className="h-4 bg-gradient-to-r from-indigo-300 to-pink-300 rounded w-1/2 mb-4 shimmer"></div>
                        <div className="space-y-2">
                          <div className="h-3 bg-gradient-to-r from-slate-300 to-gray-300 rounded w-full shimmer"></div>
                          <div className="h-3 bg-gradient-to-r from-slate-300 to-gray-300 rounded w-2/3 shimmer"></div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : campaignsData?.campaigns.length === 0 ? (
              <div className="text-center py-16">
                <div className="glass-card border-gradient p-12 max-w-md mx-auto">
                  <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                    <Phone className="h-10 w-10 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-gradient mb-4">No Campaigns Yet</h3>
                  <p className="text-muted-foreground/80 mb-6">
                    Create your first AI voice calling campaign to get started with automated outreach.
                  </p>
                  <Button
                    onClick={() => setShowCreateDialog(true)}
                    className="btn-gradient hover-lift shadow-lg"
                  >
                    <Plus className="h-5 w-5 mr-2" />
                    Create Your First Campaign
                  </Button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                {campaignsData?.campaigns.map((campaign: Campaign) => (
                  <Card 
                    key={campaign.id} 
                    className="glass-card border-gradient hover:shadow-2xl transition-all duration-300 group cursor-pointer relative overflow-hidden"
                    onClick={() => handleViewDetails(campaign.id)}
                  >
                    {/* Background gradient animation */}
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-50/20 via-purple-50/10 to-indigo-50/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    
                    {/* Status indicator */}
                    <div className="absolute top-4 right-4 z-10">
                      {campaign.status === 'active' && (
                        <div className="w-3 h-3 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full animate-pulse shadow-lg"></div>
                      )}
                      {campaign.status === 'paused' && (
                        <div className="w-3 h-3 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full shadow-lg"></div>
                      )}
                      {campaign.status === 'completed' && (
                        <div className="w-3 h-3 bg-gradient-to-r from-blue-400 to-indigo-500 rounded-full shadow-lg"></div>
                      )}
                    </div>

                    <CardContent className="p-6 relative z-10">
                      <div className="space-y-4">
                        <div>
                          <h3 className="text-xl font-bold text-gradient mb-2 group-hover:text-blue-600 transition-colors duration-300">
                            {campaign.name}
                          </h3>
                          <div className="flex items-center space-x-2 mb-3">
                            <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusBadgeClasses(campaign.status)}`}>
                              {campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
                            </span>
                            <span className="text-xs text-muted-foreground/70">
                              Created {formatDate(campaign.createdAt)}
                            </span>
                          </div>
                        </div>

                        {/* Campaign metrics */}
                        <div className="grid grid-cols-2 gap-4">
                          <div className="text-center p-3 bg-gradient-to-br from-blue-50/50 to-indigo-50/30 rounded-xl border border-blue-100/50">
                            <div className="text-2xl font-bold text-gradient-primary">
                              {campaign.completedCalls || 0}
                            </div>
                            <div className="text-xs text-muted-foreground/70 font-medium">Total Calls</div>
                          </div>
                          <div className="text-center p-3 bg-gradient-to-br from-green-50/50 to-emerald-50/30 rounded-xl border border-green-100/50">
                            <div className="text-2xl font-bold text-gradient-success">
                              {campaign.successfulCalls || 0}
                            </div>
                            <div className="text-xs text-muted-foreground/70 font-medium">Successful</div>
                          </div>
                        </div>

                        {/* Progress bar */}
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground/70 font-medium">Progress</span>
                            <span className="text-muted-foreground/70 font-medium">
                              {campaign.totalLeads > 0 
                                ? Math.round((campaign.completedCalls / campaign.totalLeads) * 100)
                                : 0}%
                            </span>
                          </div>
                          <div className="w-full bg-gradient-to-r from-slate-200 to-gray-200 rounded-full h-2 overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-blue-500 to-purple-600 rounded-full transition-all duration-500 shadow-sm"
                              style={{
                                width: `${campaign.totalLeads > 0 
                                  ? Math.round((campaign.completedCalls / campaign.totalLeads) * 100)
                                  : 0}%`
                              }}
                            />
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center justify-between pt-2">
                          <div className="flex items-center space-x-2">
                            {campaign.status === 'active' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleStatusUpdate(campaign.id, "paused");
                                }}
                                className="h-8 px-3 border-orange-200 text-orange-700 hover:bg-orange-50"
                              >
                                <Pause className="h-3 w-3 mr-1" />
                                Pause
                              </Button>
                            )}
                            {campaign.status === 'paused' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleStatusUpdate(campaign.id, "active");
                                }}
                                className="h-8 px-3 border-green-200 text-green-700 hover:bg-green-50"
                              >
                                <Play className="h-3 w-3 mr-1" />
                                Resume
                              </Button>
                            )}
                          </div>
                          
                          <div className="flex items-center space-x-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleViewDetails(campaign.id);
                              }}
                              className="h-8 w-8 p-0 hover:bg-blue-100/50"
                            >
                              <Eye className="h-4 w-4 text-blue-600" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingCampaign(campaign.id);
                                setNewCampaignName(campaign.name); // Pre-populate with current name
                                setShowCreateDialog(true);
                              }}
                              className="h-8 w-8 p-0 hover:bg-blue-100/50"
                            >
                              <Edit className="h-4 w-4 text-blue-600" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setCampaignToDelete(campaign);
                                setShowDeleteDialog(true);
                              }}
                              className="h-8 w-8 p-0 hover:bg-red-100/50"
                            >
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </Button>
                          </div>
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

      {/* Create/Edit Campaign Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="glass-card border-gradient max-w-md">
          <DialogHeader>
            <DialogTitle className="text-gradient">
              {editingCampaign ? 'Edit Campaign' : 'Create New Campaign'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="campaign-name">Campaign Name</Label>
              <Input
                id="campaign-name"
                value={newCampaignName}
                onChange={(e) => setNewCampaignName(e.target.value)}
                placeholder="Enter campaign name"
                className="input-gradient"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCancelEdit}>
              Cancel
            </Button>
            <Button 
              onClick={editingCampaign ? handleUpdateCampaign : handleCreateCampaign}
              disabled={updateCampaignMutation.isPending || !newCampaignName.trim()}
              className="btn-gradient"
            >
              {(updateCampaignMutation.isPending) ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Updating...
                </>
              ) : (
                editingCampaign ? 'Update Campaign' : 'Create Campaign'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="glass-card border-gradient">
          <DialogHeader>
            <DialogTitle className="text-gradient">Delete Campaign</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground">
            Are you sure you want to delete this campaign? This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleConfirmDelete}
              disabled={deleteCampaignMutation.isPending}
              className="bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700"
            >
              {deleteCampaignMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Deleting...
                </>
              ) : (
                'Delete Campaign'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}