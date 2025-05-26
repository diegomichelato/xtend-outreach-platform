import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { Creator } from "@shared/schema";
import { useCampaign } from "@/hooks/use-campaign";
import { Loader2 } from "lucide-react";
import { CreatorCard } from "./creator-card";
import { useToast } from "@/hooks/use-toast";

// Define interfaces for type safety
interface EmailAccount {
  id: number;
  email: string;
  name?: string;
  provider?: string;
}

interface SelectCreatorStepProps {
  onNext: () => void;
  onBack: () => void;
}

export function SelectCreatorStep({ onNext, onBack }: SelectCreatorStepProps) {
  const [selectedCreatorId, setSelectedCreatorId] = useState<number | null>(null);
  const { updateCampaign, campaign } = useCampaign();
  const { toast } = useToast();
  
  // Initialize with campaign data if available
  useEffect(() => {
    if (campaign.creatorId) {
      setSelectedCreatorId(campaign.creatorId);
    }
  }, [campaign.creatorId]);
  
  const { data: creators, isLoading } = useQuery<Creator[]>({
    queryKey: ['/api/creators'],
  });

  const handleSelectCreator = (creatorId: number) => {
    setSelectedCreatorId(creatorId);
  };
  
  // Compute the selected creator from the list of creators
  const selectedCreator = creators?.find(creator => creator.id === selectedCreatorId) || null;

  // Get primary email account for the selected creator
  const { data: primaryEmailAccount, isLoading: isLoadingPrimary } = useQuery<EmailAccount>({
    queryKey: [`/api/creators/${selectedCreatorId}/email-account/primary`],
    enabled: !!selectedCreatorId,
  });

  // Effect to show error toast if no email account is found
  useEffect(() => {
    if (selectedCreatorId && !isLoadingPrimary && !primaryEmailAccount) {
      toast({
        title: "Warning",
        description: "No email account found for this creator. Email sending will not be available.",
        variant: "destructive",
        duration: 5000,
      });
    }
  }, [selectedCreatorId, primaryEmailAccount, isLoadingPrimary, toast]);

  const handleNext = async () => {
    if (selectedCreatorId) {
      console.log("Selected creator ID:", selectedCreatorId);
      
      // Always call updateCampaign only ONCE with all the needed properties
      // This ensures React state is correctly updated without race conditions
      // IMPORTANT: Include the FULL OBJECT, not just the ID
      const updates: Record<string, any> = { 
        creatorId: selectedCreatorId,
        creatorName: selectedCreator?.name,
        // Store the entire creator object to avoid needing to re-fetch it later
        creator: selectedCreator
      };
      
      // If we have a primary email account, include it in the same update
      if (primaryEmailAccount && primaryEmailAccount.id) {
        console.log("Using primary email account:", primaryEmailAccount.id);
        updates.emailAccountId = primaryEmailAccount.id;
        updates.emailAccount = primaryEmailAccount;
      } else {
        console.log("No primary email account found for creator");
        toast({
          title: "Missing email account",
          description: "No email account found for this creator. Please link an email account to this creator before continuing.",
          variant: "destructive",
          duration: 5000,
        });
        return; // Prevent going to next step
      }
      
      // Do a single update with all fields
      updateCampaign(updates);
      
      // Also save to sessionStorage for redundancy
      try {
        const storedData = sessionStorage.getItem('campaignWizardState') || '{}';
        const campaignData = JSON.parse(storedData);
        
        // Update with creator data
        campaignData.creatorId = selectedCreatorId;
        campaignData.creatorName = selectedCreator?.name;
        campaignData.creator = selectedCreator;
        
        // Include email account if available
        if (primaryEmailAccount && primaryEmailAccount.id) {
          campaignData.emailAccountId = primaryEmailAccount.id;
          campaignData.emailAccount = primaryEmailAccount;
        }
        
        // Save back to sessionStorage
        sessionStorage.setItem('campaignWizardState', JSON.stringify(campaignData));
        console.log("Saved creator and email account to sessionStorage");
      } catch (e) {
        console.error("Failed to save creator data to sessionStorage:", e);
      }
      
      // Log the campaign state after update
      setTimeout(() => {
        console.log("Campaign state after creator selection:", campaign);
      }, 0);
      
      onNext();
    }
  };

  // We're already computing selectedCreator above

  return (
    <div className="space-y-6">
      <div className="max-w-4xl">
        <label className="block text-sm font-medium text-gray-700 mb-4">Select a creator for this campaign</label>
        
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {creators && creators.length > 0 ? (
              creators.map((creator) => (
                <CreatorCard 
                  key={creator.id}
                  creator={creator}
                  selected={selectedCreatorId === creator.id}
                  onSelect={() => handleSelectCreator(creator.id)}
                  selectable
                />
              ))
            ) : (
              <div className="col-span-3 text-center py-6 text-muted-foreground">
                No creators found. Please add a creator first.
              </div>
            )}
          </div>
        )}
        
        {/* Selected Creator Preview */}
        {selectedCreator && (
          <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <h3 className="text-sm font-medium text-gray-900 mb-2">Creator Profile: {selectedCreator.name}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500 mb-1">Biography</p>
                <p className="text-sm text-gray-700">
                  {selectedCreator.bio || "No biography provided."}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Brand Voice</p>
                <p className="text-sm text-gray-700">
                  {selectedCreator.brandVoice || "No brand voice provided."}
                </p>
              </div>
            </div>
            {selectedCreator.googleDriveFolder && (
              <div className="mt-3 flex items-center">
                <p className="text-xs text-gray-500">Google Drive files connected: <span className="text-primary-DEFAULT">Connected</span></p>
              </div>
            )}
          </div>
        )}
      </div>
      
      <div className="flex justify-between pt-4">
        <Button
          onClick={onBack}
          variant="outline"
          className="flex items-center"
        >
          <span className="material-icons mr-1 text-sm">arrow_back</span>
          Previous Step
        </Button>
        <Button
          onClick={handleNext}
          disabled={!selectedCreatorId}
          className="flex items-center"
        >
          Next Step
          <span className="material-icons ml-1 text-sm">arrow_forward</span>
        </Button>
      </div>
    </div>
  );
}
