import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ContactTable } from "@/components/contact/contact-table";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiRequest } from "@/lib/queryClient";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  FileSearch,
  Clipboard,
  Loader2,
  User,
  Building,
  Mail,
  Calendar,
  CheckCircle,
  RefreshCw,
  Users,
  Plus,
  X,
  ChevronLeft,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { CompanyProfilePreview } from "./company-profile-preview";
import { CreatorCard } from "@/components/campaign/creator-card";
import { PricingSelectionStep } from "./pricing-selection-step";
import { CreatorFitStep } from "./creator-fit-step";

interface NewProposalFormProps {
  onSuccess?: () => void;
}

const proposalFormSchema = z.object({
  name: z.string().min(1, "Proposal name is required"),
  contactId: z.number().optional(),
  status: z.string().default("draft"),
  value: z.coerce.number().optional(),
  notes: z.string().optional(),
  followupDate: z.date().optional(),
  // Added fields for R&D Assessment
  campaignCPM: z.string().optional(),
  campaignBudget: z.string().optional(),
  partnershipModel: z.string().optional(),
  campaignObjectives: z.string().optional(),
  contentFormat: z.string().optional(),
  usageRights: z.string().optional(),
  partnershipDuration: z.string().optional(),
  rdNotes: z.string().optional(),
});

type ProposalFormValues = z.infer<typeof proposalFormSchema>;
type Contact = {
  id: number;
  firstName: string;
  lastName: string;
  company: string;
  email: string;
  industry: string;
  [key: string]: any;
};

export function NewProposalForm({ onSuccess }: NewProposalFormProps) {
  const [step, setStep] = useState(1);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [researchData, setResearchData] = useState<any>(null);
  const [isResearching, setIsResearching] = useState(false);
  const [selectedCreators, setSelectedCreators] = useState<any[]>([]);
  const [creatorFits, setCreatorFits] = useState<any[]>([]);
  const [selectedPricing, setSelectedPricing] = useState<any[]>([]);
  
  const { toast } = useToast();
  
  // Fetch contacts from the main contacts endpoint instead of direct-contacts
  const { data: contacts = [], isLoading: isLoadingContacts } = useQuery({
    queryKey: ["/api/contacts"],
  });
  
  // Fetch creators for Step 6 with better error handling and retries
  const { 
    data: creators = [], 
    isLoading: isLoadingCreators,
    error: creatorsError,
    refetch: refetchCreators
  } = useQuery({
    queryKey: ["/api/creators"],
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * (2 ** attemptIndex), 10000),
    onError: (error) => {
      console.error("Error loading creators:", error);
      toast({
        title: "Creator Loading Issue",
        description: "There was a problem loading creators. Please try again.",
        variant: "destructive",
      });
    }
  });

  const form = useForm<ProposalFormValues>({
    resolver: zodResolver(proposalFormSchema),
    defaultValues: {
      name: "",
      status: "draft",
    },
  });

  const startResearch = async () => {
    if (!selectedContact) return;
    
    setIsResearching(true);
    try {
      const response = await fetch('/api/proposals/research', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          company: selectedContact.company,
          industry: selectedContact.industry,
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }
      
      const result = await response.json();
      setResearchData(result);
      setStep(3);
    } catch (error) {
      console.error("Research error:", error);
      toast({
        title: "Research Failed",
        description: "Unable to complete company research. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsResearching(false);
    }
  };

  const onSubmit = async (data: ProposalFormValues = form.getValues()) => {
    try {
      // Simplified proposal data - most minimal version that will pass validation
      const proposalData = {
        name: selectedContact?.company ? `${selectedContact.company} Proposal` : `Proposal ${new Date().toLocaleDateString()}`,
        status: 'draft', 
        contactName: selectedContact?.firstName || '',
        contactCompany: selectedContact?.company || '',
        contactEmail: selectedContact?.email || '',
        contactIndustry: selectedContact?.industry || '',
        creators: selectedCreators?.map(c => c.id) || [],
        creatorFits: creatorFits || {},
        creatorPricing: selectedPricing || [],
      };
      
      console.log("Submitting minimal proposal data:", proposalData);
      
      const response = await fetch('/api/proposals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(proposalData)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error("Server validation error:", errorData);
        // Show detailed error in toast
        toast({
          title: "Error creating proposal",
          description: errorData.message || "Unknown error occurred",
          variant: "destructive"
        });
        throw new Error(`Failed to create proposal: ${errorData.message || 'Unknown error'}`);
      }
      
      toast({
        title: "Proposal Created",
        description: "Your new proposal has been created successfully.",
      });
      
      // Reset form and state
      form.reset();
      setSelectedContact(null);
      setResearchData(null);
      setSelectedCreators([]);
      setSelectedPricing([]);
      setStep(1);
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error("Error creating proposal:", error);
      toast({
        title: "Error",
        description: "Failed to create the proposal. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleContactSelect = (contact: Contact) => {
    setSelectedContact(contact);
    
    // Auto-generate proposal name with company and date
    const today = new Date();
    const formattedDate = today.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
    const proposalName = `${contact.company} Proposal - ${formattedDate}`;
    
    form.setValue("name", proposalName);
    form.setValue("contactId", contact.id);
    form.setValue("contactName", `${contact.firstName} ${contact.lastName || ''}`);
    form.setValue("contactCompany", contact.company);
    form.setValue("contactIndustry", contact.industry || '');
    
    setStep(2);
  };
  
  const handleCreatorSelect = (creator: any) => {
    setSelectedCreators(prev => {
      // If creator is already selected, remove it
      if (prev.some(c => c.id === creator.id)) {
        return prev.filter(c => c.id !== creator.id);
      }
      // Otherwise add it to the selection
      return [...prev, creator];
    });
  };
  
  const isCreatorSelected = (creatorId: number) => {
    return selectedCreators.some(creator => creator.id === creatorId);
  };

  // Step 1: Select Contact
  const renderStep1 = () => {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Step 1: Select a Contact</h3>
        <p className="text-muted-foreground">
          Start by selecting a contact from your database to create a proposal for.
        </p>
        {isLoadingContacts ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <ContactTable 
            contacts={contacts} 
            onSelect={handleContactSelect}
            selectedId={selectedContact?.id}
            hideActions
          />
        )}
      </div>
    );
  };

  // Step 2: Company Research
  const renderStep2 = () => {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium">Step 2: Company Research</h3>
          <Button variant="outline" size="sm" onClick={() => setStep(1)}>
            Back to Contacts
          </Button>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Contact Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  {selectedContact?.firstName} {selectedContact?.lastName || ""}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <Building className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{selectedContact?.company}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{selectedContact?.email}</span>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button 
              className="w-full" 
              onClick={startResearch}
              disabled={isResearching}
            >
              {isResearching ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Researching...
                </>
              ) : (
                <>
                  <FileSearch className="mr-2 h-4 w-4" />
                  Start Company Research
                </>
              )}
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  };

  // Step 3: Research Results
  const renderStep3 = () => {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium">Step 3: Company Research Results</h3>
          <div className="space-x-2">
            <Button variant="outline" size="sm" onClick={() => setStep(2)}>
              Back to Research
            </Button>
            <Button size="sm" onClick={() => setStep(4)}>
              Continue to R&D Assessment
            </Button>
          </div>
        </div>
        
        <div className="space-y-4">
          <div className="flex justify-between items-start mb-2">
            <div>
              <h4 className="text-base font-semibold mb-1">
                {selectedContact?.company || "Company"} Research Analysis
              </h4>
              <p className="text-sm text-muted-foreground">
                Review the AI-driven research to determine if there's a good fit with your creators.
              </p>
            </div>
            <Badge variant="secondary">
              <Calendar className="mr-1 h-3 w-3" />
              {new Date().toLocaleDateString()}
            </Badge>
          </div>
          
          {/* Interactive Company Profile Preview - Full width for better display */}
          <div className="w-full overflow-x-auto py-2">
            <div className="min-w-full">
              <CompanyProfilePreview data={researchData} />
            </div>
          </div>
          
          <div className="flex justify-end mt-4">
            <Button variant="outline" className="mr-2" onClick={startResearch}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh Research
            </Button>
            <Button onClick={() => setStep(4)}>
              <CheckCircle className="mr-2 h-4 w-4" />
              Continue to R&D Assessment
            </Button>
          </div>
        </div>
      </div>
    );
  };

  // Step 4: R&D Assessment
  const renderStep4 = () => {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium">Step 4: R&D Assessment</h3>
          <Button variant="outline" size="sm" onClick={() => setStep(3)}>
            Back to Research Results
          </Button>
        </div>
        
        <p className="text-muted-foreground mb-4">
          Before finalizing the proposal, we need to gather key metrics and partnership details. You can either generate an email to ask these questions or provide the answers if you already have them.
        </p>
        
        <Tabs defaultValue="email">
          <TabsList className="w-full">
            <TabsTrigger value="email" className="flex-1">Generate Email Questions</TabsTrigger>
            <TabsTrigger value="form" className="flex-1">Input Known Details</TabsTrigger>
            <TabsTrigger value="research" className="flex-1">Research Results</TabsTrigger>
          </TabsList>
          
          <TabsContent value="email" className="space-y-4 py-4">
            <Card>
              <CardHeader>
                <CardTitle>Partnership Assessment Email</CardTitle>
                <CardDescription>
                  Generate an email to ask important partnership questions based on the research findings.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 border rounded-md">
                    <h4 className="font-medium mb-2">Subject: Partnership Information Request - {selectedContact?.company}</h4>
                    <div className="space-y-4 text-sm">
                      <p>Hello {selectedContact?.firstName || "there"},</p>
                      
                      <p>Thank you for your interest in partnering with our creators. Based on our initial research of {selectedContact?.company}, we believe there might be a good fit for collaboration. To tailor our proposal specifically to your needs, I'd appreciate if you could provide some additional information:</p>
                      
                      <ol className="list-decimal ml-5 space-y-2">
                        <li><strong>Campaign Budget and CPM:</strong> What is your expected CPM (Cost Per Mille) for this project? What overall budget range do you have in mind?</li>
                        <li><strong>Partnership Model:</strong> What partnership model are you looking for? (e.g., affiliate, sponsored content, brand ambassador)</li>
                        <li><strong>Campaign Objectives:</strong> What is this campaign primarily focused on? (e.g., brand awareness, lead generation, product launch)</li>
                        <li><strong>Content Format:</strong> What format(s) would you prefer for the campaign? (e.g., video reviews, Instagram posts, TikTok shorts)</li>
                        <li><strong>Usage Rights:</strong> What usage rights are you seeking for the created content?</li>
                        <li><strong>Partnership Duration:</strong> Are you looking for a long-term partnership or a single project collaboration?</li>
                      </ol>
                      
                      <p>Your responses will help us craft a tailored proposal that aligns with your specific goals and requirements. I'm also happy to schedule a call to discuss these points in more detail.</p>
                      
                      <p>Looking forward to your response.</p>
                      
                      <p>Best regards,<br />[Your Name]</p>
                    </div>
                  </div>
                  
                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => {
                      // Copy text to clipboard
                      const emailText = document.querySelector('.p-4.border.rounded-md')?.textContent;
                      if (emailText) {
                        navigator.clipboard.writeText(emailText);
                        toast({
                          title: "Copied to Clipboard",
                          description: "Email template has been copied to your clipboard.",
                        });
                      }
                    }}>
                      Copy to Clipboard
                    </Button>
                    <Button 
                      variant="secondary" 
                      onClick={async () => {
                        try {
                          // Create a minimal draft proposal
                          const draftProposal = {
                            name: selectedContact?.company ? `${selectedContact.company} Draft` : 'Draft Proposal',
                            status: 'draft',
                            contactName: selectedContact ? `${selectedContact.firstName} ${selectedContact.lastName || ''}`.trim() : '',
                            contactCompany: selectedContact?.company || '',
                            contactEmail: selectedContact?.email || '',
                            contactIndustry: selectedContact?.industry || '',
                            researchData: researchData || {},
                          };
                          
                          const response = await fetch('/api/proposals', {
                            method: 'POST',
                            headers: {
                              'Content-Type': 'application/json',
                            },
                            body: JSON.stringify(draftProposal)
                          });
                          
                          if (!response.ok) {
                            throw new Error('Failed to save proposal');
                          }
                          
                          toast({
                            title: "Proposal saved",
                            description: "Your draft has been saved and you can continue later.",
                          });
                          window.location.href = '/proposals';
                        } catch (error) {
                          console.error("Error saving draft proposal:", error);
                          toast({
                            title: "Error saving",
                            description: "Could not save your draft. Please try again.",
                            variant: "destructive"
                          });
                        }
                      }}
                    >
                      Save and Close
                    </Button>
                    <Button onClick={() => setStep(5)}>
                      Continue to Project Overview
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="form" className="space-y-4 py-4">
            <Card>
              <CardHeader>
                <CardTitle>Input Known Details</CardTitle>
                <CardDescription>
                  If you already have the answers to these partnership questions, enter them below.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* CPM and Budget */}
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="cpm" className="text-sm font-medium">Campaign CPM</label>
                        <Input 
                          id="cpm"
                          placeholder="e.g., $15 per 1000 impressions"
                          className="mt-1"
                          onChange={(e) => form.setValue("campaignCPM", e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground mt-1">Cost Per Mille (1000 impressions)</p>
                      </div>
                      <div>
                        <label htmlFor="budget" className="text-sm font-medium">Campaign Budget</label>
                        <Input 
                          id="budget"
                          placeholder="e.g., $5,000 - $10,000"
                          className="mt-1"
                          onChange={(e) => form.setValue("campaignBudget", e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground mt-1">Total budget range for the project</p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Partnership Model */}
                  <div>
                    <label htmlFor="model" className="text-sm font-medium">Partnership Model</label>
                    <Select onValueChange={(value) => form.setValue("partnershipModel", value)}>
                      <SelectTrigger id="model" className="mt-1">
                        <SelectValue placeholder="Select a partnership model" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sponsored">Sponsored Content</SelectItem>
                        <SelectItem value="affiliate">Affiliate Marketing</SelectItem>
                        <SelectItem value="ambassador">Brand Ambassador</SelectItem>
                        <SelectItem value="collab">Product Collaboration</SelectItem>
                        <SelectItem value="review">Product Review</SelectItem>
                        <SelectItem value="other">Other (specify in notes)</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground mt-1">The type of partnership arrangement</p>
                  </div>
                  
                  {/* Campaign Objectives */}
                  <div>
                    <label htmlFor="objectives" className="text-sm font-medium">Campaign Objectives</label>
                    <Textarea 
                      id="objectives"
                      placeholder="e.g., Increase brand awareness among tech enthusiasts, generate leads for new product..."
                      className="mt-1"
                      onChange={(e) => form.setValue("campaignObjectives", e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground mt-1">What is this campaign primarily focused on?</p>
                  </div>
                  
                  {/* Content Format */}
                  <div>
                    <label htmlFor="format" className="text-sm font-medium">Content Format</label>
                    <Textarea 
                      id="format"
                      placeholder="e.g., 2 dedicated YouTube videos and 3 Instagram posts..."
                      className="mt-1"
                      onChange={(e) => form.setValue("contentFormat", e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground mt-1">Format(s) preferred for the campaign</p>
                  </div>
                  
                  {/* Usage Rights */}
                  <div>
                    <label htmlFor="rights" className="text-sm font-medium">Usage Rights</label>
                    <Select onValueChange={(value) => form.setValue("usageRights", value)}>
                      <SelectTrigger id="rights" className="mt-1">
                        <SelectValue placeholder="Select usage rights" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="creator">Creator Platforms Only</SelectItem>
                        <SelectItem value="brand">Brand Platforms Only</SelectItem>
                        <SelectItem value="both">Both Creator & Brand Platforms</SelectItem>
                        <SelectItem value="full">Full Commercial Rights</SelectItem>
                        <SelectItem value="limited">Limited Commercial Rights</SelectItem>
                        <SelectItem value="tbd">To Be Determined</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground mt-1">Rights sought for the created content</p>
                  </div>
                  
                  {/* Partnership Duration */}
                  <div>
                    <label htmlFor="duration" className="text-sm font-medium">Partnership Duration</label>
                    <Select onValueChange={(value) => form.setValue("partnershipDuration", value)}>
                      <SelectTrigger id="duration" className="mt-1">
                        <SelectValue placeholder="Select partnership duration" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="single">Single Project</SelectItem>
                        <SelectItem value="short">Short-term (3-6 months)</SelectItem>
                        <SelectItem value="medium">Medium-term (6-12 months)</SelectItem>
                        <SelectItem value="long">Long-term (12+ months)</SelectItem>
                        <SelectItem value="ongoing">Ongoing/Renewable</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground mt-1">Is this a one-off or long-term partnership?</p>
                  </div>
                  
                  {/* Additional Notes */}
                  <div>
                    <label htmlFor="rdNotes" className="text-sm font-medium">Additional Notes</label>
                    <Textarea 
                      id="rdNotes"
                      placeholder="Any other relevant information about this partnership..."
                      className="mt-1"
                      onChange={(e) => form.setValue("rdNotes", e.target.value)}
                    />
                  </div>
                  
                  <div className="flex justify-end space-x-2">
                    <Button 
                      variant="secondary" 
                      onClick={async () => {
                        try {
                          // Create a minimal draft proposal
                          const draftProposal = {
                            name: selectedContact?.company ? `${selectedContact.company} Draft` : 'Draft Proposal',
                            status: 'draft',
                            contactName: selectedContact ? `${selectedContact.firstName} ${selectedContact.lastName || ''}`.trim() : '',
                            contactCompany: selectedContact?.company || '',
                            contactEmail: selectedContact?.email || '',
                            contactIndustry: selectedContact?.industry || '',
                            researchData: researchData || {},
                          };
                          
                          const response = await fetch('/api/proposals', {
                            method: 'POST',
                            headers: {
                              'Content-Type': 'application/json',
                            },
                            body: JSON.stringify(draftProposal)
                          });
                          
                          if (!response.ok) {
                            throw new Error('Failed to save proposal');
                          }
                          
                          toast({
                            title: "Proposal saved",
                            description: "Your draft has been saved and you can continue later.",
                          });
                          window.location.href = '/proposals';
                        } catch (error) {
                          console.error("Error saving draft proposal:", error);
                          toast({
                            title: "Error saving",
                            description: "Could not save your draft. Please try again.",
                            variant: "destructive"
                          });
                        }
                      }}
                    >
                      Save and Close
                    </Button>
                    <Button type="button" onClick={() => setStep(5)}>
                      Continue to Project Overview
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="research" className="space-y-4 py-4">
            <CompanyProfilePreview data={researchData} />
          </TabsContent>
        </Tabs>
      </div>
    );
  };

  // Step 6: Select Creators
  const renderStep6 = () => {
    const handleRefreshCreators = () => {
      refetchCreators();
    };

    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium">Step 6: Select Creators</h3>
          <Button variant="outline" size="sm" onClick={() => setStep(5)}>
            Back to Project Overview
          </Button>
        </div>
        
        <div className="bg-muted/30 p-6 rounded-lg border">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h3 className="text-lg font-medium">Select Creators for {selectedContact?.company || "This Project"}</h3>
              <p className="text-sm text-muted-foreground mt-1">Choose which creators to include in your proposal with {selectedContact?.company || "this company"}.</p>
            </div>
            <div className="flex items-center">
              <Badge variant="secondary" className="font-medium py-1 px-3 text-sm">
                {selectedCreators.length} Selected
              </Badge>
            </div>
          </div>
          
          {isLoadingCreators ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Loading creators...</p>
            </div>
          ) : creatorsError ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <div className="rounded-full bg-red-100 p-3">
                <X className="h-6 w-6 text-red-600" />
              </div>
              <div className="text-center">
                <h4 className="font-medium mb-1">Unable to load creators</h4>
                <p className="text-sm text-muted-foreground mb-4">
                  There was a problem loading creator data. This might be due to a temporary connection issue.
                </p>
                <Button onClick={handleRefreshCreators} variant="outline" className="gap-2">
                  <RefreshCw className="h-4 w-4" />
                  Try Again
                </Button>
              </div>
            </div>
          ) : creators.length > 0 ? (
            <>
              <div className="flex items-center gap-3 mb-5">
                <div className="relative w-full max-w-xs">
                  <svg 
                    className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" 
                    xmlns="http://www.w3.org/2000/svg" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="2" 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                  >
                    <circle cx="11" cy="11" r="8" />
                    <path d="m21 21-4.3-4.3" />
                  </svg>
                  <Input 
                    placeholder="Search creators..." 
                    className="pl-9"
                    type="search"
                  />
                </div>
                <Select defaultValue="all">
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="All categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All categories</SelectItem>
                    <SelectItem value="tech">Tech</SelectItem>
                    <SelectItem value="beauty">Beauty</SelectItem>
                    <SelectItem value="lifestyle">Lifestyle</SelectItem>
                    <SelectItem value="gaming">Gaming</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 pb-2">
                {creators.map((creator) => (
                  <CreatorCard 
                    key={creator.id}
                    creator={creator}
                    selected={isCreatorSelected(creator.id)}
                    onSelect={() => handleCreatorSelect(creator)}
                    selectable
                  />
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-8 space-y-4">
              <div className="rounded-full bg-yellow-100 p-3 mx-auto w-fit">
                <Users className="h-6 w-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-muted-foreground mb-2">No creators found in the database.</p>
                <p className="text-sm text-muted-foreground mb-4">
                  You need at least one creator to generate a proposal. Please add creators to your database first.
                </p>
                <div className="flex justify-center gap-3">
                  <Button 
                    onClick={handleRefreshCreators} 
                    variant="outline" 
                    className="gap-2"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Refresh
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
        
        {selectedCreators.length > 0 && (
          <div className="mt-6 p-5 bg-primary/5 border border-primary/20 rounded-lg shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="font-medium text-primary">Selected Creators</h4>
                <p className="text-sm text-muted-foreground">These creators will be included in your proposal</p>
              </div>
              <Badge variant="outline" className="font-medium text-primary border-primary/30">
                {selectedCreators.length} Selected
              </Badge>
            </div>
            <div className="space-y-2.5">
              {selectedCreators.map(creator => (
                <div key={creator.id} className="flex justify-between items-center p-3 bg-white rounded-md border border-gray-200 hover:border-primary/30 transition-colors group">
                  <div className="flex items-center">
                    <div 
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white mr-3 shadow-sm"
                      style={{ backgroundColor: creator.profileColor || '#4F46E5' }}
                    >
                      <span className="font-medium">{creator.initials || creator.name.charAt(0)}</span>
                    </div>
                    <div>
                      <p className="font-medium text-sm">{creator.name}</p>
                      <p className="text-xs text-muted-foreground">{creator.role}</p>
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => handleCreatorSelect(creator)} 
                    className="h-8 w-8 text-gray-400 hover:text-red-500 hover:bg-red-50 opacity-70 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
        
        <div className="flex justify-between items-center pt-8 mt-4 border-t">
          <Button variant="outline" onClick={() => setStep(5)}>
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back to Project Overview
          </Button>
          
          <Button 
            onClick={() => setStep(7)} 
            disabled={selectedCreators.length === 0}
            className="relative px-8 py-6 shadow-md transition-all hover:shadow-lg"
            size="lg"
          >
            <div className="flex items-center gap-2">
              <div>
                <div className="font-medium text-base">Continue to Creator Fit</div>
                <div className="text-xs opacity-90">With {selectedCreators.length} creator{selectedCreators.length !== 1 ? 's' : ''}</div>
              </div>
              <CheckCircle className="ml-2 h-5 w-5" />
            </div>
            {selectedCreators.length === 0 && (
              <div className="absolute -top-6 left-0 right-0 text-center text-orange-500 text-xs">
                Please select at least one creator
              </div>
            )}
          </Button>
        </div>
      </div>
    );
  };
  
  // Step 5: Project Overview
  const renderStep5 = () => {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium">Step 5: Project Overview</h3>
          <Button variant="outline" size="sm" onClick={() => setStep(4)}>
            Back to R&D Assessment
          </Button>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left column - Partnership details */}
          <div className="space-y-6">
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle>
                    {selectedContact?.company || "Company"} Partnership
                  </CardTitle>
                  <Badge className={
                    researchData?.partnershipPotential?.toLowerCase() === "high" 
                      ? "bg-green-100 text-green-800" 
                      : researchData?.partnershipPotential?.toLowerCase() === "medium" 
                      ? "bg-yellow-100 text-yellow-800" 
                      : "bg-red-100 text-red-800"
                  }>
                    {researchData?.partnershipPotential || "Medium"} Potential
                  </Badge>
                </div>
                <CardDescription>
                  Project details and metrics
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground">Campaign CPM</h4>
                    <p className="font-medium">{form.getValues("campaignCPM") || "Not specified"}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground">Budget Range</h4>
                    <p className="font-medium">{form.getValues("campaignBudget") || "Not specified"}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground">Partnership Model</h4>
                    <p className="font-medium">
                      {form.getValues("partnershipModel") === "sponsored" ? "Sponsored Content" :
                      form.getValues("partnershipModel") === "affiliate" ? "Affiliate Marketing" :
                      form.getValues("partnershipModel") === "ambassador" ? "Brand Ambassador" :
                      form.getValues("partnershipModel") === "collab" ? "Product Collaboration" :
                      form.getValues("partnershipModel") === "review" ? "Product Review" :
                      form.getValues("partnershipModel") === "other" ? "Other" :
                      "Not specified"}
                    </p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground">Duration</h4>
                    <p className="font-medium">
                      {form.getValues("partnershipDuration") === "single" ? "Single Project" :
                      form.getValues("partnershipDuration") === "short" ? "Short-term (3-6 months)" :
                      form.getValues("partnershipDuration") === "medium" ? "Medium-term (6-12 months)" :
                      form.getValues("partnershipDuration") === "long" ? "Long-term (12+ months)" :
                      form.getValues("partnershipDuration") === "ongoing" ? "Ongoing/Renewable" :
                      "Not specified"}
                    </p>
                  </div>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">Campaign Objectives</h4>
                  <p className="text-sm mt-1">{form.getValues("campaignObjectives") || "Not specified"}</p>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">Content Format</h4>
                  <p className="text-sm mt-1">{form.getValues("contentFormat") || "Not specified"}</p>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">Usage Rights</h4>
                  <p className="text-sm mt-1">
                    {form.getValues("usageRights") === "creator" ? "Creator Platforms Only" :
                    form.getValues("usageRights") === "brand" ? "Brand Platforms Only" :
                    form.getValues("usageRights") === "both" ? "Both Creator & Brand Platforms" :
                    form.getValues("usageRights") === "full" ? "Full Commercial Rights" :
                    form.getValues("usageRights") === "limited" ? "Limited Commercial Rights" :
                    form.getValues("usageRights") === "tbd" ? "To Be Determined" :
                    "Not specified"}
                  </p>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>Company Research Summary</CardTitle>
                <CardDescription>Key information about {selectedContact?.company}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">Company Description</h4>
                  <p className="text-sm mt-1">{researchData?.description || "Not available"}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground">Company Size</h4>
                    <p className="font-medium">{researchData?.companySize || "Unknown"}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground">Target Audience</h4>
                    <p className="font-medium">{researchData?.targetAudience || "Unknown"}</p>
                  </div>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">Key Products/Services</h4>
                  <p className="text-sm mt-1">{researchData?.products || "Not available"}</p>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Right column - Proposal Summary */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle>Proposal Summary</CardTitle>
                <CardDescription>Review your proposal details before selecting creators</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Company</h4>
                  <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-md">
                    <Building className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{selectedContact?.company}</span>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Contact</h4>
                  <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-md">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span>{selectedContact?.firstName} {selectedContact?.lastName}</span>
                    <span className="ml-auto text-xs text-muted-foreground">{selectedContact?.role || ''}</span>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Partnership Details</h4>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-muted/50 rounded-md">
                      <div className="text-xs text-muted-foreground mb-1">Partnership Model</div>
                      <div className="font-medium">{form.getValues("partnershipModel") || "Not specified"}</div>
                    </div>
                    
                    <div className="p-3 bg-muted/50 rounded-md">
                      <div className="text-xs text-muted-foreground mb-1">Content Format</div>
                      <div className="font-medium">{form.getValues("contentFormat") || "Not specified"}</div>
                    </div>
                    
                    <div className="p-3 bg-muted/50 rounded-md">
                      <div className="text-xs text-muted-foreground mb-1">CPM</div>
                      <div className="font-medium">${form.getValues("campaignCPM") || "0.00"}</div>
                    </div>
                    
                    <div className="p-3 bg-muted/50 rounded-md">
                      <div className="text-xs text-muted-foreground mb-1">Budget</div>
                      <div className="font-medium">${form.getValues("campaignBudget") || "0.00"}</div>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Proposal Name</h4>
                  <Input 
                    value={form.getValues("name")} 
                    onChange={(e) => form.setValue("name", e.target.value)}
                    className="bg-muted/50"
                  />
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button type="button" variant="outline" onClick={() => setStep(4)}>
                  Back to R&D Assessment
                </Button>
                <Button type="button" onClick={() => setStep(6)} className="gap-2">
                  Continue to Select Creators
                  <Users className="h-4 w-4" />
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      </div>
    );
  };

  // Step 7: Select Pricing Options
  // Creator Fit Explanations Step
  const renderCreatorFitStep = () => {
    return (
      <CreatorFitStep
        selectedCreatorIds={selectedCreators.map(creator => creator.id)}
        onNext={(fits) => {
          setCreatorFits(fits);
          setStep(8); // Move to pricing selection after creator fits
        }}
        onBack={() => setStep(6)}
      />
    );
  };
  
  // Pricing Selection Step
  const renderPricingStep = () => {
    const handlePricingComplete = (pricing: any[]) => {
      console.log("Pricing selection complete, submitting proposal...");
      setSelectedPricing(pricing);
      // Force move to next step 
      setStep(9); // Force move to final step
      setTimeout(() => {
        onSubmit();
      }, 100);
    };
    
    return (
      <PricingSelectionStep 
        selectedCreatorIds={selectedCreators.map(creator => creator.id)}
        onNext={handlePricingComplete}
        onBack={() => setStep(7)} // Go back to creator fit step
      />
    );
  };

  const renderStepContent = () => {
    switch (step) {
      case 1:
        return renderStep1();
      case 2:
        return renderStep2();
      case 3:
        return renderStep3();
      case 4:
        return renderStep4();
      case 5:
        return renderStep5();
      case 6:
        return renderStep6();
      case 7:
        return renderCreatorFitStep();
      case 8:
        return renderPricingStep();
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {renderStepContent()}
    </div>
  );
}