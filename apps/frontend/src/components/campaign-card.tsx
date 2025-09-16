import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Campaign } from "@/lib/api";
import { Eye, Edit, Trash2 } from "lucide-react";
import { useLocation } from "wouter";

interface CampaignCardProps {
  campaign: Campaign;
  onDelete: (campaign: Campaign) => void;
  onEdit: (campaign: Campaign) => void;
}

export function CampaignCard({ campaign, onDelete, onEdit }: CampaignCardProps) {
  const [, setLocation] = useLocation();

  const getStatusClass = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-blue-500";
      case "active":
        return "bg-green-500";
      case "paused":
        return "bg-yellow-500";
      default:
        return "bg-gray-500";
    }
  };

  const progress = campaign.totalLeads > 0 ? (campaign.completedCalls / campaign.totalLeads) * 100 : 0;
  
  // Check if campaign can be edited (draft status with no calls made)
  const canEdit = campaign.status === 'draft' && (campaign.completedCalls || 0) === 0;

  return (
    <Card className="relative bg-white/50 dark:bg-black/50 backdrop-blur-sm border border-gray-200/20 shadow-lg rounded-2xl overflow-hidden group">
      <div className="absolute top-4 right-4 z-10">
        <div className={`w-3 h-3 rounded-full ${getStatusClass(campaign.status)}`}></div>
      </div>
      <CardHeader>
        <CardTitle className="text-xl font-bold text-gray-800 dark:text-white">{campaign.name}</CardTitle>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {campaign.status} - Created {new Date(campaign.createdAt).toLocaleDateString()}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-between items-center">
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-800 dark:text-white">{campaign.completedCalls}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Total Calls</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-500">{campaign.successfulCalls}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Successful</p>
          </div>
        </div>
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Progress</p>
          <div className="flex items-center gap-2">
            <Progress value={progress} className="w-full" />
            <span className="text-sm text-gray-500 dark:text-gray-400">{Math.round(progress)}%</span>
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-4 border-t border-gray-200/20">
          <Button variant="ghost" size="icon" onClick={() => setLocation(`/campaigns/${campaign.id}`)}>
            <Eye className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          </Button>
          {canEdit ? (
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => onEdit(campaign)}
              title="Edit campaign"
            >
              <Edit className="h-5 w-5 text-gray-500 dark:text-gray-400" />
            </Button>
          ) : (
            <Button 
              variant="ghost" 
              size="icon" 
              disabled
              title={campaign.status !== 'draft' 
                ? "Cannot edit published campaigns" 
                : "Cannot edit campaigns with completed calls"
              }
            >
              <Edit className="h-5 w-5 text-gray-300 dark:text-gray-600" />
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={() => onDelete(campaign)}>
            <Trash2 className="h-5 w-5 text-red-500" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
