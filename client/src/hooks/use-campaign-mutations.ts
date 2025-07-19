import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";

interface MutationConfig {
  successTitle?: string;
  successMessage?: string;
  errorTitle?: string;
  errorMessage?: string;
  onSuccess?: () => void;
  onError?: (error: any) => void;
  invalidateQueries?: boolean;
}

export function useCampaignMutations() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createMutation = <TData, TVariables>(
    mutationFn: (variables: TVariables) => Promise<TData>,
    config: MutationConfig = {}
  ) => {
    const {
      successTitle,
      successMessage,
      errorTitle,
      errorMessage,
      onSuccess,
      onError,
      invalidateQueries = true
    } = config;

    return useMutation({
      mutationFn,
      onSuccess: (data) => {
        if (successTitle || successMessage) {
          toast({
            title: successTitle || t('common.success'),
            description: successMessage || t('common.operationSuccessful'),
          });
        }
        
        if (invalidateQueries) {
          queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
        }
        
        onSuccess?.();
      },
      onError: (error: any) => {
        toast({
          title: errorTitle || t('common.error'),
          description: error.message || errorMessage || t('common.operationFailed'),
          variant: "destructive",
        });
        
        onError?.(error);
      },
    });
  };

  const updateCampaignStatus = createMutation(
    ({ id, status }: { id: number; status: string }) => api.updateCampaign(id, { status }),
    {
      successTitle: t('campaigns.statusUpdated'),
      successMessage: t('campaigns.statusUpdateSuccess'),
      errorTitle: t('campaigns.updateFailed'),
      errorMessage: t('campaigns.failedToUpdateCampaign'),
    }
  );

  const deleteCampaign = createMutation(
    (id: number) => api.deleteCampaign(id),
    {
      successTitle: t('campaigns.campaignDeleted'),
      successMessage: t('campaigns.campaignDeletedSuccess'),
      errorTitle: t('campaigns.deleteFailed'),
      errorMessage: t('campaigns.failedToDeleteCampaign'),
    }
  );

  const resumeCampaign = createMutation(
    (campaignId: number) => api.resumeCampaign(campaignId),
    {
      successTitle: t('campaigns.campaignResumed'),
      successMessage: t('campaigns.campaignResumedSuccess'),
      errorTitle: t('campaigns.resumeFailed'),
      errorMessage: t('campaigns.failedToResumeCampaign'),
    }
  );

  const uploadCSV = createMutation(
    (data: { file: File; campaignId: string }) => api.uploadCSV(data.file, data.campaignId),
    {
      successTitle: t('leadsUpload.leadsUploaded'),
      successMessage: "CSV file has been uploaded successfully.",
      errorTitle: t('leadsUpload.uploadFailed'),
      errorMessage: t('leadsUpload.uploadFailedMessage'),
    }
  );

  const updateCampaign = createMutation(
    ({ id, updates }: { id: number; updates: any }) => api.updateCampaign(id, updates),
    {
      successTitle: t('campaigns.campaignUpdated'),
      successMessage: t('campaigns.campaignUpdateSuccess'),
      errorTitle: t('campaigns.updateFailed'),
      errorMessage: t('campaigns.failedToUpdateCampaign'),
    }
  );

  return {
    updateCampaignStatus,
    deleteCampaign,
    resumeCampaign,
    uploadCSV,
    updateCampaign,
    createMutation, // For custom mutations
  };
} 