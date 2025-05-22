import { useState, useEffect } from "react";
import { Campaign } from "@shared/schema";
import { v4 as uuidv4 } from "uuid";

// Define the email sequence item type
interface EmailSequenceItem {
  id: string;
  order: number;
  title: string;
  description?: string;
  subject?: string;
  body?: string;
  delay?: number; // Delay in days
}

export interface CampaignDraft extends Partial<Campaign> {
  // Core IDs
  contactListId?: number;
  creatorId?: number;
  emailAccountId?: number;
  
  // Email sequence
  emailSequence?: EmailSequenceItem[];
  
  // Related objects (stored temporarily)
  creatorName?: string;
  contactList?: {
    id: number;
    name: string;
    description?: string;
    contactCount?: number;
    createdAt?: string;
    updatedAt?: string;
  };
  creator?: {
    id: number;
    name: string;
    email?: string;
    role?: string;
    company?: string;
  };
  emailAccount?: {
    id: number;
    email: string;
    name?: string;
    provider?: string;
  };
  recipientCount?: number;
  userEmail?: string;
}

// Default campaign state
const getDefaultCampaignState = (): CampaignDraft => ({
  status: "draft",
  sequenceCount: 3,
  interval: 3,
  tone: "Professional",
  objective: "Book a demo",
  emailSequence: [
    {
      id: uuidv4(),
      order: 1,
      title: "Initial Contact",
      description: "Introduce yourself and the purpose of your outreach",
      delay: 0,
    },
    {
      id: uuidv4(),
      order: 2,
      title: "Follow-up",
      description: "Follow up on the previous email with additional value",
      delay: 3,
    },
    {
      id: uuidv4(),
      order: 3,
      title: "Final Outreach",
      description: "Final attempt with a stronger call to action",
      delay: 3,
    }
  ]
});

// Use sessionStorage as primary storage and localStorage as backup
// This ensures data is consistent within a browser session
const getInitialState = (): CampaignDraft => {
  if (typeof window === 'undefined') {
    return getDefaultCampaignState();
  }
  
  try {
    // First try sessionStorage (primary source for current session)
    const sessionState = sessionStorage.getItem('campaignWizardState');
    if (sessionState) {
      const parsedState = JSON.parse(sessionState);
      console.log("Loaded campaign state from sessionStorage:", parsedState);
      
      return {
        ...getDefaultCampaignState(), // Start with defaults
        ...parsedState, // Overlay with saved values
      } as CampaignDraft;
    }
    
    // Fall back to localStorage if no sessionStorage data
    const localState = localStorage.getItem('campaignWizardState');
    if (localState) {
      const parsedState = JSON.parse(localState);
      console.log("Loaded campaign state from localStorage fallback:", parsedState);
      
      // Immediately also save to sessionStorage for consistency
      sessionStorage.setItem('campaignWizardState', localState);
      
      return {
        ...getDefaultCampaignState(), // Start with defaults
        ...parsedState, // Overlay with saved values
      } as CampaignDraft;
    }
  } catch (e) {
    console.error("Error loading campaign state:", e);
  }
  
  return getDefaultCampaignState();
};

export function useCampaign() {
  const [campaign, setCampaign] = useState<CampaignDraft>(getInitialState());

  const updateCampaign = (updates: Partial<CampaignDraft>) => {
    setCampaign((prev) => {
      const updatedCampaign = {
        ...prev,
        ...updates,
      };
      
      console.log("Campaign updated:", updatedCampaign);
      
      // Persist to both sessionStorage (primary) and localStorage (backup)
      try {
        // Save to sessionStorage (primary for current session)
        sessionStorage.setItem('campaignWizardState', JSON.stringify(updatedCampaign));
        
        // Also save to localStorage as backup
        localStorage.setItem('campaignWizardState', JSON.stringify(updatedCampaign));
        
        console.log("Campaign state persisted to session and local storage");
      } catch (e) {
        console.error("Error persisting campaign state:", e);
      }
      
      return updatedCampaign;
    });
  };

  const resetCampaign = () => {
    // Clear both sessionStorage and localStorage to avoid reloading old campaign data
    try {
      sessionStorage.removeItem('campaignWizardState');
      localStorage.removeItem('campaignWizardState');
      console.log("Cleared campaign state from session and local storage");
    } catch (e) {
      console.error("Error clearing campaign state from storage:", e);
    }
    
    // Set campaign back to default state
    const defaultState = getDefaultCampaignState();
    setCampaign(defaultState);
    console.log("Campaign state reset to defaults");
  };

  const addEmailSequenceItem = () => {
    setCampaign((prev) => {
      // Ensure emailSequence is treated as an array even if undefined
      const currentSequence = Array.isArray(prev.emailSequence) ? prev.emailSequence : [];
      const newOrder = currentSequence.length + 1;
      
      return {
        ...prev,
        sequenceCount: newOrder,
        emailSequence: [
          ...currentSequence,
          {
            id: uuidv4(),
            order: newOrder,
            title: `Email ${newOrder}`,
            description: `Content for email ${newOrder}`,
            subject: "",
            body: "",
            delay: 3,
          }
        ],
      };
    });
  };

  const updateEmailSequenceItem = (id: string, updates: Partial<EmailSequenceItem>) => {
    setCampaign((prev) => {
      // Ensure emailSequence is treated as an array even if undefined
      const currentSequence = Array.isArray(prev.emailSequence) ? prev.emailSequence : [];
      const updatedSequence = currentSequence.map(item => 
        item.id === id ? { ...item, ...updates } : item
      );
      
      return {
        ...prev,
        emailSequence: updatedSequence,
      };
    });
  };

  const removeEmailSequenceItem = (id: string) => {
    setCampaign((prev) => {
      // Ensure emailSequence is treated as an array even if undefined
      const currentSequence = Array.isArray(prev.emailSequence) ? prev.emailSequence : [];
      if (currentSequence.length <= 1) {
        return prev; // Don't remove if it's the last item
      }
      
      const filteredSequence = currentSequence.filter(item => item.id !== id);
      // Reorder remaining items
      const reorderedSequence = filteredSequence.map((item, index) => ({
        ...item,
        order: index + 1
      }));
      
      return {
        ...prev,
        sequenceCount: reorderedSequence.length,
        emailSequence: reorderedSequence,
      };
    });
  };

  return {
    campaign,
    updateCampaign,
    resetCampaign,
    addEmailSequenceItem,
    updateEmailSequenceItem,
    removeEmailSequenceItem
  };
}
