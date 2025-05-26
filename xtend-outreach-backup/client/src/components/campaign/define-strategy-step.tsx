import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCampaign } from "@/hooks/use-campaign";
import { useState, useEffect } from "react";
import { EmailSequenceItem } from "@shared/schema";
import { Pencil, Plus, Trash2, ArrowUp, ArrowDown, Info } from "lucide-react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { v4 as uuidv4 } from "uuid";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface DefineStrategyStepProps {
  onNext: () => void;
  onBack: () => void;
}

export function DefineStrategyStep({ onNext, onBack }: DefineStrategyStepProps) {
  const { updateCampaign, campaign, addEmailSequenceItem, updateEmailSequenceItem, removeEmailSequenceItem } = useCampaign();
  
  const [name, setName] = useState(campaign.name || "");
  const [objective, setObjective] = useState(campaign.objective || "Book a demo");
  const [customObjective, setCustomObjective] = useState(campaign.customObjective || "");
  const [tone, setTone] = useState(campaign.tone || "Professional");
  const [sequenceCount, setSequenceCount] = useState(campaign.sequenceCount?.toString() || "3");
  const [interval, setInterval] = useState(campaign.interval?.toString() || "3");
  const [showCustomObjective, setShowCustomObjective] = useState(objective === "Custom...");
  const [editingSequenceItem, setEditingSequenceItem] = useState<EmailSequenceItem | null>(null);

  useEffect(() => {
    setShowCustomObjective(objective === "Custom...");
  }, [objective]);

  useEffect(() => {
    // Update sequence count when manually changed
    const emailSequence = Array.isArray(campaign.emailSequence) ? campaign.emailSequence : [];
    
    if (parseInt(sequenceCount) !== emailSequence.length) {
      if (parseInt(sequenceCount) > emailSequence.length) {
        // Add new items if needed
        const currentCount = emailSequence.length;
        const newCount = parseInt(sequenceCount);
        for (let i = currentCount; i < newCount; i++) {
          addEmailSequenceItem();
        }
      } else {
        // Remove items if needed
        // This will keep removing the last item until we reach the desired count
        const newSequence = [...emailSequence];
        while (newSequence.length > parseInt(sequenceCount) && newSequence.length > 1) {
          newSequence.pop();
        }
        updateCampaign({ 
          emailSequence: newSequence,
          sequenceCount: newSequence.length
        });
      }
    }
  }, [sequenceCount, Array.isArray(campaign.emailSequence) ? campaign.emailSequence.length : 0]);

  const handleNext = () => {
    if (!name.trim()) {
      return; // Don't proceed if name is empty
    }
    
    // Log the current campaign state before updating
    console.log("Current campaign state before strategy update:", campaign);
    
    const updates = {
      name,
      objective,
      customObjective: showCustomObjective ? customObjective : undefined,
      tone,
      sequenceCount: parseInt(sequenceCount),
      interval: parseInt(interval),
    };
    
    console.log("Updating campaign with strategy:", updates);
    
    // Update the campaign in React state
    updateCampaign(updates);
    
    // Also save to sessionStorage for redundancy
    try {
      const storedData = sessionStorage.getItem('campaignWizardState') || '{}';
      const campaignData = JSON.parse(storedData);
      
      // Update with strategy data
      Object.assign(campaignData, updates);
      
      // Make sure we include the emailSequence
      if (campaign.emailSequence) {
        campaignData.emailSequence = campaign.emailSequence;
      }
      
      // Save back to sessionStorage
      sessionStorage.setItem('campaignWizardState', JSON.stringify(campaignData));
      console.log("Saved strategy data to sessionStorage");
    } catch (e) {
      console.error("Failed to save strategy data to sessionStorage:", e);
    }
    
    // Log again after updating to verify state changes
    setTimeout(() => {
      console.log("Campaign state after strategy update:", campaign);
    }, 0);
    
    onNext();
  };

  const handleUpdateSequenceItem = (id: string, updates: Partial<EmailSequenceItem>) => {
    // Update in React state
    updateEmailSequenceItem(id, updates);
    
    // Also update in sessionStorage
    try {
      setTimeout(() => {
        // Get the updated sequence after the React state update has been processed
        const updatedSequence = campaign.emailSequence;
        
        if (updatedSequence) {
          const storedData = sessionStorage.getItem('campaignWizardState') || '{}';
          const campaignData = JSON.parse(storedData);
          
          // Update the email sequence in storage
          campaignData.emailSequence = updatedSequence;
          
          // Save back to sessionStorage
          sessionStorage.setItem('campaignWizardState', JSON.stringify(campaignData));
          console.log("Updated email sequence item in sessionStorage");
        }
      }, 0);
    } catch (e) {
      console.error("Failed to update email sequence in sessionStorage:", e);
    }
    
    setEditingSequenceItem(null);
  };

  const handleStartEdit = (item: EmailSequenceItem) => {
    setEditingSequenceItem({...item});
  };

  const handleCancelEdit = () => {
    setEditingSequenceItem(null);
  };

  return (
    <div className="space-y-6">
      <div className="max-w-3xl">
        <label className="block text-sm font-medium text-gray-700 mb-4">Define your outreach strategy</label>
        
        <div className="space-y-6">
          <div>
            <Label htmlFor="campaign-name">Campaign Name</Label>
            <Input 
              type="text" 
              id="campaign-name" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Q2 SaaS Outreach" 
              className="mt-1"
            />
          </div>
          
          <div>
            <Label htmlFor="objective">Campaign Objective</Label>
            <Select 
              value={objective} 
              onValueChange={setObjective}
            >
              <SelectTrigger id="objective" className="mt-1">
                <SelectValue placeholder="Select an objective" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Book a demo">Book a demo</SelectItem>
                <SelectItem value="Request a call">Request a call</SelectItem>
                <SelectItem value="Introduce new product">Introduce new product</SelectItem>
                <SelectItem value="Follow up from event">Follow up from event</SelectItem>
                <SelectItem value="Start a partnership">Start a partnership</SelectItem>
                <SelectItem value="Reconnect">Reconnect</SelectItem>
                <SelectItem value="Offer free trial">Offer free trial</SelectItem>
                <SelectItem value="Share case study">Share case study</SelectItem>
                <SelectItem value="Custom...">Custom...</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {objective !== "Custom..." && (
            <div className="bg-slate-50 p-3 rounded border border-slate-200 mt-1 text-sm text-slate-700">
              {objective === "Book a demo" && (
                <p>This email sequence will focus on convincing recipients to schedule a product demonstration. It will highlight benefits and value they'll receive from seeing the product in action.</p>
              )}
              {objective === "Request a call" && (
                <p>This email sequence will aim to get recipients on a phone call. The messaging will be brief and focused on specific pain points that can be discussed in more detail on the call.</p>
              )}
              {objective === "Introduce new product" && (
                <p>This email sequence will introduce a new product to prospects, highlighting its innovative features and specific benefits based on the recipient's role and industry.</p>
              )}
              {objective === "Follow up from event" && (
                <p>This email sequence will reference a specific event and continue conversations that began there, reminding recipients of how your solutions relate to their needs.</p>
              )}
              {objective === "Start a partnership" && (
                <p>This email sequence will propose a partnership, focusing on mutual benefits and complementary strengths with a clear path to explore the opportunity further.</p>
              )}
              {objective === "Reconnect" && (
                <p>This email sequence will rekindle previous relationships, referencing past interactions and providing compelling reasons to reconnect now.</p>
              )}
              {objective === "Offer free trial" && (
                <p>This email sequence will emphasize the value recipients will get from a trial period, with clear information on how to get started and trial terms.</p>
              )}
              {objective === "Share case study" && (
                <p>This email sequence will present relevant case studies showing results achieved for similar companies, connecting these outcomes to the recipient's specific challenges.</p>
              )}
            </div>
          )}
          
          {showCustomObjective && (
            <div>
              <Label htmlFor="custom-objective">Custom Objective Description</Label>
              <Textarea 
                id="custom-objective" 
                value={customObjective}
                onChange={(e) => setCustomObjective(e.target.value)}
                placeholder="Describe your objective in detail..." 
                rows={3} 
                className="mt-1" 
              />
              <p className="text-xs text-slate-500 mt-2">Provide specific details about your campaign objective. This information will be used to guide the AI in generating more targeted email content.</p>
            </div>
          )}
          
          <div>
            <div className="flex items-center gap-2">
              <Label htmlFor="tone">Email Tone</Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-5 w-5 rounded-full p-0">
                      <Info className="h-3.5 w-3.5 text-slate-500" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">The tone affects how the AI generates email copy, impacting word choice, sentence structure, and overall impression.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Select 
              value={tone} 
              onValueChange={setTone}
            >
              <SelectTrigger id="tone" className="mt-1">
                <SelectValue placeholder="Select a tone" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Professional">Professional</SelectItem>
                <SelectItem value="Friendly">Friendly</SelectItem>
                <SelectItem value="Casual">Casual</SelectItem>
                <SelectItem value="Formal">Formal</SelectItem>
                <SelectItem value="Enthusiastic">Enthusiastic</SelectItem>
                <SelectItem value="Direct">Direct</SelectItem>
              </SelectContent>
            </Select>
            
            <div className="bg-slate-50 p-3 rounded border border-slate-200 mt-2 text-sm text-slate-700">
              {tone === "Professional" && <p>Balanced and appropriate for business communications while remaining approachable.</p>}
              {tone === "Friendly" && <p>Warm and conversational, creating rapport while maintaining respect.</p>}
              {tone === "Casual" && <p>Relaxed and informal, using contractions and simpler language.</p>}
              {tone === "Formal" && <p>More structured and traditional business language with careful phrasing.</p>}
              {tone === "Enthusiastic" && <p>Energetic and passionate, showing excitement about possibilities.</p>}
              {tone === "Direct" && <p>Straightforward and concise, getting straight to the point with minimal preamble.</p>}
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Label htmlFor="sequence-count">Number of Emails in Sequence</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-5 w-5 rounded-full p-0">
                        <Info className="h-3.5 w-3.5 text-slate-500" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">A 3-email sequence is typically ideal for cold outreach. The first email introduces, the second adds value, and the third creates urgency.</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Select 
                value={sequenceCount} 
                onValueChange={setSequenceCount}
              >
                <SelectTrigger id="sequence-count" className="mt-1">
                  <SelectValue placeholder="Select number" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 email</SelectItem>
                  <SelectItem value="2">2 emails</SelectItem>
                  <SelectItem value="3">3 emails (recommended)</SelectItem>
                  <SelectItem value="4">4 emails</SelectItem>
                  <SelectItem value="5">5 emails</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <Label htmlFor="interval">Days Between Emails</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-5 w-5 rounded-full p-0">
                        <Info className="h-3.5 w-3.5 text-slate-500" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">3-4 days is typically optimal. Too short seems pushy, too long and recipients may forget your previous message.</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Select 
                value={interval} 
                onValueChange={setInterval}
              >
                <SelectTrigger id="interval" className="mt-1">
                  <SelectValue placeholder="Select days" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 day</SelectItem>
                  <SelectItem value="2">2 days</SelectItem>
                  <SelectItem value="3">3 days (recommended)</SelectItem>
                  <SelectItem value="4">4 days</SelectItem>
                  <SelectItem value="5">5 days</SelectItem>
                  <SelectItem value="7">7 days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Email Sequence Structure</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {(campaign.emailSequence as EmailSequenceItem[] || []).map((item, index) => (
                  <div 
                    key={item.id} 
                    className="flex items-start p-4 bg-slate-50 border border-slate-200 rounded-md shadow-sm"
                  >
                    <div className="flex-shrink-0 mr-4">
                      <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-sm font-medium">
                        {item.order}
                      </div>
                      {index > 0 && (
                        <div className="mt-1 text-xs text-gray-500 flex items-center justify-center">
                          +{item.delay} days
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex justify-between">
                        <h3 className="text-sm font-semibold text-slate-900">{item.title}</h3>
                        <div className="flex space-x-1">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-7 w-7 p-0" 
                            onClick={() => handleStartEdit(item)}
                          >
                            <Pencil className="h-4 w-4 text-slate-500" />
                          </Button>
                          {Array.isArray(campaign.emailSequence) && campaign.emailSequence.length > 1 && (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-7 w-7 p-0" 
                              onClick={() => removeEmailSequenceItem(item.id)}
                            >
                              <Trash2 className="h-4 w-4 text-slate-500" />
                            </Button>
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-slate-600 mt-1">{item.description}</p>
                      
                      {editingSequenceItem && editingSequenceItem.id === item.id && (
                        <Popover open={!!editingSequenceItem} onOpenChange={open => !open && handleCancelEdit()}>
                          <PopoverTrigger asChild>
                            <div />
                          </PopoverTrigger>
                          <PopoverContent className="w-80">
                            <div className="space-y-3">
                              <h3 className="font-medium text-sm">Edit Email {item.order}</h3>
                              
                              <div>
                                <Label htmlFor="email-title">Title</Label>
                                <Input 
                                  id="email-title" 
                                  value={editingSequenceItem.title}
                                  onChange={(e) => setEditingSequenceItem({...editingSequenceItem, title: e.target.value})}
                                  className="mt-1"
                                />
                              </div>
                              
                              <div>
                                <Label htmlFor="email-description">Description (for AI)</Label>
                                <Textarea 
                                  id="email-description" 
                                  value={editingSequenceItem.description}
                                  onChange={(e) => setEditingSequenceItem({...editingSequenceItem, description: e.target.value})}
                                  className="mt-1" 
                                  rows={3}
                                />
                              </div>
                              
                              {item.order > 1 && (
                                <div>
                                  <Label htmlFor="email-delay">Days after previous email</Label>
                                  <Select 
                                    value={editingSequenceItem.delay.toString()} 
                                    onValueChange={val => setEditingSequenceItem({...editingSequenceItem, delay: parseInt(val)})}
                                  >
                                    <SelectTrigger id="email-delay" className="mt-1">
                                      <SelectValue placeholder="Select days" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="1">1</SelectItem>
                                      <SelectItem value="2">2</SelectItem>
                                      <SelectItem value="3">3</SelectItem>
                                      <SelectItem value="4">4</SelectItem>
                                      <SelectItem value="5">5</SelectItem>
                                      <SelectItem value="7">7</SelectItem>
                                      <SelectItem value="10">10</SelectItem>
                                      <SelectItem value="14">14</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              )}
                              
                              <div className="flex justify-end space-x-2 mt-4">
                                <Button variant="outline" size="sm" onClick={handleCancelEdit}>
                                  Cancel
                                </Button>
                                <Button 
                                  size="sm" 
                                  onClick={() => handleUpdateSequenceItem(item.id, editingSequenceItem)}
                                >
                                  Save Changes
                                </Button>
                              </div>
                            </div>
                          </PopoverContent>
                        </Popover>
                      )}
                    </div>
                  </div>
                ))}
                
                <Button 
                  variant="outline" 
                  className="w-full mt-2 border-dashed" 
                  onClick={addEmailSequenceItem}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Another Email
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
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
          disabled={!name.trim()}
          className="flex items-center"
        >
          Next Step
          <span className="material-icons ml-1 text-sm">arrow_forward</span>
        </Button>
      </div>
    </div>
  );
}
