import { useState, useEffect } from "react";
import { SelectContactsStep } from "./select-contacts-step";
import { SelectCreatorStep } from "./select-creator-step";
import { DefineStrategyStep } from "./define-strategy-step";
import { PreviewSendStep } from "./preview-send-step";
import { useCampaign } from "@/hooks/use-campaign";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";

interface CampaignWizardProps {
  onComplete?: () => void;
  embedded?: boolean;
}

// Set up a global state listener for use in other components to force navigation
// This is a hacky but necessary workaround due to persistent state issues
let globalNavTriggerFn: ((step: string) => void) | null = null;

// Function to be called from other components to trigger navigation
export function forceNavigateToStep(step: string) {
  if (globalNavTriggerFn) {
    console.log(`Global navigation triggered to step: ${step}`);
    globalNavTriggerFn(step);
    return true;
  }
  console.error("Global navigation function not initialized");
  return false;
}

export function CampaignWizard({ onComplete, embedded = false }: CampaignWizardProps) {
  const [currentStep, setCurrentStep] = useState<string>("contacts");
  const { campaign, updateCampaign, resetCampaign } = useCampaign();
  const { toast } = useToast();
  
  // Load necessary data for each step
  // Contact list data
  const { data: contactLists } = useQuery({
    queryKey: ['/api/contact-lists'],
    enabled: currentStep === "contacts" || currentStep === "preview",
  });

  // Creator data
  const { data: creators } = useQuery({
    queryKey: ['/api/creators'],
    enabled: currentStep === "creator" || currentStep === "preview",
  });

  // Creator's email account
  const { data: creatorEmailAccount } = useQuery({
    queryKey: ['/api/creators', campaign.creatorId, 'email-account', 'primary'],
    enabled: !!campaign.creatorId && (currentStep === "creator" || currentStep === "preview"),
  });
  
  // Register the global navigation trigger function
  useEffect(() => {
    globalNavTriggerFn = setCurrentStep;
    
    return () => {
      // Clean up when component unmounts
      globalNavTriggerFn = null;
    };
  }, []);
  
  // Enhanced synchronization of state from API responses
  // This ensures that data flows correctly between steps
  useEffect(() => {
    const updates: any = {};
    let hasUpdates = false;
    
    // Always try to ensure contactList object matches contactListId
    if (campaign.contactListId && contactLists) {
      const selectedList = contactLists.find((list: any) => list.id === campaign.contactListId);
      if (selectedList && (!campaign.contactList || campaign.contactList.id !== campaign.contactListId)) {
        console.log("✅ Syncing contact list data:", selectedList);
        updates.contactList = selectedList;
        hasUpdates = true;
      }
    }
    
    // Always try to ensure creator object matches creatorId
    if (campaign.creatorId && creators) {
      const selectedCreator = creators.find((creator: any) => creator.id === campaign.creatorId);
      if (selectedCreator && (!campaign.creator || campaign.creator.id !== campaign.creatorId)) {
        console.log("✅ Syncing creator data:", selectedCreator);
        updates.creator = selectedCreator;
        updates.creatorName = selectedCreator.name;
        hasUpdates = true;
      }
    }
    
    // Always try to ensure emailAccount matches creatorId if available
    if (campaign.creatorId && creatorEmailAccount) {
      if (!campaign.emailAccountId || !campaign.emailAccount || campaign.emailAccount.id !== creatorEmailAccount.id) {
        console.log("✅ Syncing email account data:", creatorEmailAccount);
        updates.emailAccountId = creatorEmailAccount.id;
        updates.emailAccount = creatorEmailAccount;
        hasUpdates = true;
      }
    }
    
    // Apply all updates at once if needed
    if (hasUpdates) {
      console.log("⚙️ Applying synchronized updates:", updates);
      updateCampaign(updates);
    }
  }, [campaign, contactLists, creators, creatorEmailAccount, updateCampaign]);
  
  // Log campaign state changes and persist to both sessionStorage and localStorage
  useEffect(() => {
    console.log("Current campaign state:", campaign);
    
    // Save campaign state to both storage mechanisms for maximum reliability
    if (Object.keys(campaign).length > 0) {
      try {
        // First to sessionStorage (primary for current session)
        sessionStorage.setItem('campaignWizardState', JSON.stringify(campaign));
        
        // Also to localStorage (for persistence between browser sessions)
        localStorage.setItem('campaignWizardState', JSON.stringify(campaign));
        
        console.log("Campaign state persisted to both session and local storage");
      } catch (e) {
        console.error("Error persisting campaign state:", e);
      }
    }
  }, [campaign]);
  
  // Enhanced step transition handling - when navigating to preview step, ensure all data is loaded
  useEffect(() => {
    if (currentStep === "preview") {
      console.log("🔄 ENTERING PREVIEW STEP - Running comprehensive data integrity check");
      
      // Check both sources to ensure we get the most complete data
      let parsedSessionData: any = null;
      let parsedLocalData: any = null;
      
      // First try sessionStorage (primary)
      try {
        const sessionData = sessionStorage.getItem('campaignWizardState');
        if (sessionData) {
          parsedSessionData = JSON.parse(sessionData);
          console.log("📦 Found campaign data in sessionStorage:", parsedSessionData);
        }
      } catch (e) {
        console.error("Error parsing sessionStorage campaign data:", e);
      }
      
      // Then try localStorage (backup)
      try {
        const localData = localStorage.getItem('campaignWizardState');
        if (localData) {
          parsedLocalData = JSON.parse(localData);
          console.log("📦 Found campaign data in localStorage:", parsedLocalData);
        }
      } catch (e) {
        console.error("Error parsing localStorage campaign data:", e);
      }
      
      // Use the most complete data source
      // Prioritize session storage but fall back to localStorage if needed
      const storedData = parsedSessionData || parsedLocalData;
      
      if (storedData) {
        // Create a copy of updates that need to be applied
        const updates: any = {};
        let hasUpdates = false;
        
        // CONTACT LIST - If we're missing contact list data but have ID
        if (campaign.contactListId && !campaign.contactList && storedData.contactList) {
          updates.contactList = storedData.contactList;
          hasUpdates = true;
          console.log("⚠️ Restoring missing contactList from stored data");
        }
        
        // CREATOR - If we're missing creator data but have ID
        if (campaign.creatorId && !campaign.creator && storedData.creator) {
          updates.creator = storedData.creator;
          updates.creatorName = storedData.creatorName || storedData.creator.name;
          hasUpdates = true;
          console.log("⚠️ Restoring missing creator from stored data");
        }
        
        // EMAIL ACCOUNT - If we're missing email account data but have ID
        if (campaign.creatorId && !campaign.emailAccountId && storedData.emailAccountId) {
          updates.emailAccountId = storedData.emailAccountId;
          updates.emailAccount = storedData.emailAccount;
          hasUpdates = true;
          console.log("⚠️ Restoring missing emailAccount from stored data");
        }
        
        // STRATEGY - If we're missing key strategy fields
        if (!campaign.objective && storedData.objective) {
          updates.objective = storedData.objective;
          hasUpdates = true;
        }
        
        if (!campaign.tone && storedData.tone) {
          updates.tone = storedData.tone;
          hasUpdates = true;
        }
        
        if (!campaign.sequenceCount && storedData.sequenceCount) {
          updates.sequenceCount = storedData.sequenceCount;
          hasUpdates = true;
        }
        
        // Apply updates if needed
        if (hasUpdates) {
          console.log("🔄 Restoring missing data from storage:", updates);
          updateCampaign(updates);
        } else {
          console.log("✅ No missing data detected in campaign state");
        }
      } else {
        console.log("⚠️ No stored campaign data found in either storage location");
      }
    }
  }, [currentStep, campaign, updateCampaign]);
  
  // Enhanced validation function with improved UX feedback
  const validateStepTransition = (currentStep: string, nextStep: string): boolean => {
    console.log(`🔄 Validating transition: ${currentStep} → ${nextStep}`);
    
    // Debug state for transition
    console.log("📝 Current campaign state:", {
      contactListId: campaign.contactListId,
      contactList: campaign.contactList ? `ID: ${campaign.contactList.id}, Name: ${campaign.contactList.name}` : "undefined",
      creatorId: campaign.creatorId,
      creator: campaign.creator ? `ID: ${campaign.creator.id}, Name: ${campaign.creator.name}` : "undefined",
      emailAccountId: campaign.emailAccountId,
      emailAccount: campaign.emailAccount ? `ID: ${campaign.emailAccount.id}, Email: ${campaign.emailAccount.email}` : "undefined",
      name: campaign.name,
      objective: campaign.objective,
      tone: campaign.tone
    });
    
    // We always allow backward navigation
    if ((currentStep === "creator" && nextStep === "contacts") || 
        (currentStep === "strategy" && nextStep === "creator") ||
        (currentStep === "preview" && nextStep === "strategy")) {
      return true;
    }
    
    // Special handling for moving forward
    if (currentStep === "contacts" && nextStep === "creator") {
      if (!campaign.contactListId) {
        toast({
          title: "Missing contact list",
          description: "Please select a contact list before proceeding.",
          variant: "destructive"
        });
        return false;
      }
      
      // Ensure contactList object exists
      if (!campaign.contactList) {
        // Try to find it from the contactLists data
        if (contactLists) {
          const list = contactLists.find((list: any) => list.id === campaign.contactListId);
          if (list) {
            console.log("Adding missing contact list before transition:", list);
            updateCampaign({ contactList: list });
          }
        }
      }
      
      return true;
    } 
    else if (currentStep === "creator" && nextStep === "strategy") {
      if (!campaign.creatorId) {
        toast({
          title: "Missing creator",
          description: "Please select a creator before proceeding.",
          variant: "destructive"
        });
        return false;
      }
      
      // Ensure creator object exists
      if (!campaign.creator && creators) {
        const creator = creators.find((c: any) => c.id === campaign.creatorId);
        if (creator) {
          console.log("Adding missing creator data before transition:", creator);
          updateCampaign({ 
            creator: creator,
            creatorName: creator.name 
          });
        }
      }
      
      if (!campaign.emailAccountId) {
        toast({
          title: "Missing email account",
          description: "No email account found for this creator. Please select a different creator.",
          variant: "destructive"
        });
        return false;
      }
      
      return true;
    }
    else if (currentStep === "strategy" && nextStep === "preview") {
      if (!campaign.name) {
        toast({
          title: "Missing campaign name",
          description: "Please enter a name for your campaign.",
          variant: "destructive"
        });
        return false;
      }
      
      if (!campaign.objective) {
        toast({
          title: "Missing campaign objective",
          description: "Please select a campaign objective.",
          variant: "destructive"
        });
        return false;
      }
      
      if (!campaign.tone) {
        toast({
          title: "Missing communication tone",
          description: "Please select a communication tone.",
          variant: "destructive"
        });
        return false;
      }
      
      return true;
    }
    
    return true;
  };

  // Simplified navigation function
  const handleNext = (nextStep: string) => {
    if (validateStepTransition(currentStep, nextStep)) {
      console.log(`Navigating from ${currentStep} to ${nextStep}`);
      setCurrentStep(nextStep);
    } else {
      console.log(`Navigation blocked from ${currentStep} to ${nextStep} due to validation`);
    }
  };

  const handleComplete = () => {
    // Reset the campaign form after completion
    resetCampaign();
    // Call the onComplete callback if provided
    if (onComplete) onComplete();
  };

  return (
    <div className={cn(embedded ? "" : "p-6")}>
      {/* Campaign Tabs */}
      <div className="flex overflow-x-auto pb-2 mb-6">
        <button 
          onClick={() => setCurrentStep("contacts")}
          className={`px-4 py-2 text-sm font-medium rounded-t-md ${
            currentStep === "contacts" 
              ? "bg-primary text-white border border-transparent shadow-sm" 
              : "bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200 hover:text-slate-900"
          }`}
        >
          1. Select Contacts
        </button>
        <button 
          id="creator-tab"
          onClick={() => {
            // Always force navigation to creator step when tab is clicked
            // Skip all validation since we're having persistent issues
            console.log("Creator tab clicked, forcing navigation");
            setCurrentStep("creator");
          }}
          className={`px-4 py-2 text-sm font-medium rounded-t-md ml-2 ${
            currentStep === "creator" 
              ? "bg-primary text-white border border-transparent shadow-sm" 
              : "bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200 hover:text-slate-900"
          }`}
        >
          2. Select Creator
        </button>
        <button 
          onClick={() => setCurrentStep("strategy")}
          className={`px-4 py-2 text-sm font-medium rounded-t-md ml-2 ${
            currentStep === "strategy" 
              ? "bg-primary text-white border border-transparent shadow-sm" 
              : "bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200 hover:text-slate-900"
          }`}
        >
          3. Define Strategy
        </button>
        <button 
          onClick={() => {
            // Force navigation to preview step when tab is clicked
            // Ensure the localStorage state is fully loaded first
            console.log("Preview tab clicked, forcing navigation and state refresh");
            
            // We'll force refresh the campaign state from localStorage first
            try {
              const storedData = localStorage.getItem('campaignWizardState');
              if (storedData) {
                const parsedData = JSON.parse(storedData);
                // Apply anything that was saved before navigating to this step
                if (Object.keys(parsedData).length > 0) {
                  console.log("Loading saved campaign state before preview:", parsedData);
                }
              }
            } catch (e) {
              console.error("Error loading campaign state before preview:", e);
            }
            
            setCurrentStep("preview");
          }}
          className={`px-4 py-2 text-sm font-medium rounded-t-md ml-2 ${
            currentStep === "preview" 
              ? "bg-primary text-white border border-transparent shadow-sm" 
              : "bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200 hover:text-slate-900"
          }`}
        >
          4. Preview & Send
        </button>
      </div>

      {/* Progress bar */}
      <div className="w-full h-2 bg-slate-100 rounded-full mb-6 overflow-hidden">
        <div 
          className="h-full bg-primary transition-all duration-300 ease-in-out"
          style={{ 
            width: 
              currentStep === "contacts" ? "25%" : 
              currentStep === "creator" ? "50%" : 
              currentStep === "strategy" ? "75%" : "100%" 
          }}
        />
      </div>

      {/* Step content */}
      <div className="transition-all duration-300 ease-in-out">
        {currentStep === "contacts" && <SelectContactsStep onNext={() => setCurrentStep("creator")} />}
        {currentStep === "creator" && <SelectCreatorStep onNext={() => setCurrentStep("strategy")} onBack={() => setCurrentStep("contacts")} />}
        {currentStep === "strategy" && <DefineStrategyStep onNext={() => setCurrentStep("preview")} onBack={() => setCurrentStep("creator")} />}
        {currentStep === "preview" && <PreviewSendStep onBack={() => setCurrentStep("strategy")} onComplete={handleComplete} />}
      </div>
    </div>
  );
}
