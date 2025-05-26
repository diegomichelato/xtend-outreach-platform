import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2 } from "lucide-react";

interface CampaignDeleteDialogProps {
  campaignId?: number;
  campaignName?: string;
  isOpen: boolean;
  onClose: () => void;
}

export function CampaignDeleteDialog({
  campaignId,
  campaignName,
  isOpen,
  onClose,
}: CampaignDeleteDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { mutate: deleteCampaign, isPending } = useMutation({
    mutationFn: async () => {
      if (!campaignId) return null;
      return apiRequest("DELETE", `/api/campaigns/${campaignId}`);
    },
    onSuccess: () => {
      // Invalidate relevant queries to trigger a refetch
      queryClient.invalidateQueries({ queryKey: ['/api/campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['/api/campaigns/recent'] });
      
      toast({
        title: "Campaign deleted",
        description: "Campaign has been deleted successfully.",
      });
      
      onClose();
    },
    onError: (error) => {
      console.error("Failed to delete campaign:", error);
      toast({
        title: "Failed to delete campaign",
        description: "There was an error deleting the campaign. Please try again.",
        variant: "destructive",
      });
    }
  });

  const handleDelete = () => {
    deleteCampaign();
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete the campaign{" "}
            <span className="font-medium">{campaignName}</span> and all of its associated data. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleDelete();
            }}
            disabled={isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              "Delete"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}