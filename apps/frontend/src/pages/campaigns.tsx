import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Plus, Search } from "lucide-react";
import { api, type Campaign } from "@/lib/api";
import Sidebar from "@/components/sidebar";
import { useToast } from "@/hooks/use-toast";
import CampaignManagement from "@/components/campaign-management";
import { CampaignCard } from "@/components/campaign-card";
import { useLocation } from "wouter";

interface CampaignManagementProps {
  campaignId?: string;
}

export default function Campaigns({ campaignId }: CampaignManagementProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [campaignToDelete, setCampaignToDelete] = useState<Campaign | null>(null);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: campaigns, isLoading } = useQuery({
    queryKey: ["/api/campaigns"],
    queryFn: api.getCampaigns,
  });

  const deleteCampaignMutation = useMutation({
    mutationFn: (id: number) => api.deleteCampaign(id),
    onSuccess: () => {
      toast({
        title: "Campaign Deleted",
        description: "The campaign has been successfully deleted.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
      setShowDeleteDialog(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete campaign",
        variant: "destructive",
      });
    },
  });

  const handleDeleteClick = (campaign: Campaign) => {
    setCampaignToDelete(campaign);
    setShowDeleteDialog(true);
  };

  const handleConfirmDelete = () => {
    if (campaignToDelete) {
      deleteCampaignMutation.mutate(campaignToDelete.id);
    }
  };

  const handleEditClick = (campaign: Campaign) => {
    // Validate that campaign can be edited (draft status with no calls)
    const canEdit = campaign.status === 'draft' && (campaign.completedCalls || 0) === 0;
    
    if (!canEdit) {
      toast({
        title: "Cannot Edit Campaign",
        description: campaign.status !== 'draft' 
          ? "Only draft campaigns can be edited" 
          : "Cannot edit campaigns with completed calls",
        variant: "destructive",
      });
      return;
    }
    
    setLocation(`/campaigns/${campaign.id}/edit`);
  };

  const filteredCampaigns = campaigns?.filter((campaign: Campaign) =>
    campaign.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Campaigns</h2>
              <p className="text-gray-500 dark:text-gray-400 mt-2">Manage all your voice calling campaigns</p>
            </div>
            <Button onClick={() => setLocation("/campaigns/new")} className="bg-indigo-600 hover:bg-indigo-700">
              <Plus className="h-4 w-4 mr-2" />
              New Campaign
            </Button>
          </div>
        </header>
        <main className="flex-1 overflow-auto p-8">
          <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex items-center space-x-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search campaigns..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-white dark:bg-gray-800"
                />
              </div>
            </div>
            {isLoading ? (
              <div className="text-center py-8">
                <p className="text-gray-500">Loading campaigns...</p>
              </div>
            ) : filteredCampaigns?.length === 0 ? (
              <div className="text-center py-16">
                <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">No campaigns found</h3>
                <p className="text-gray-500 dark:text-gray-400 mt-2">Get started by creating a new campaign.</p>
                <Button onClick={() => setLocation("/campaigns/new")} className="mt-4 bg-indigo-600 hover:bg-indigo-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Campaign
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredCampaigns?.map((campaign: Campaign) => (
                  <CampaignCard
                    key={campaign.id}
                    campaign={campaign}
                    onDelete={handleDeleteClick}
                    onEdit={handleEditClick}
                  />
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Are you sure?</DialogTitle>
            <DialogDescription>
              This action cannot be undone. This will permanently delete the "{campaignToDelete?.name}" campaign.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleConfirmDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}