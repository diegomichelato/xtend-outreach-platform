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
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { CompanyProfilePreview } from "./company-profile-preview";

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
});

type ProposalFormValues = z.infer<typeof proposalFormSchema>;

export function NewProposalForm({ onSuccess }: NewProposalFormProps) {
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [selectedContact, setSelectedContact] = useState<any>(null);
  const [isResearching, setIsResearching] = useState(false);
  const [researchData, setResearchData] = useState<any>(null);
  
  // Fetch contacts from the main contacts endpoint instead of direct-contacts
  const { data: contacts = [], isLoading: isLoadingContacts } = useQuery({
    queryKey: ["/api/contacts"],
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

  const onSubmit = async (data: ProposalFormValues) => {
    try {
      // Add selected contact info and research data
      const proposalData = {
        ...data,
        contactId: selectedContact?.id,
        contactName: selectedContact ? `${selectedContact.firstName} ${selectedContact.lastName || ''}`.trim() : undefined,
        contactCompany: selectedContact?.company,
        contactEmail: selectedContact?.email,
        researchData: researchData,
      };
      
      await apiRequest('/api/proposals', 'POST', proposalData);
      
      toast({
        title: "Proposal Created",
        description: "Your new proposal has been created successfully.",
      });
      
      // Reset form and state
      form.reset();
      setSelectedContact(null);
      setResearchData(null);
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

  const handleContactSelect = (contact: any) => {
    setSelectedContact(contact);
    form.setValue("name", `Proposal for ${contact.company}`);
    setStep(2);
  };

  const renderStepContent = () => {
    switch (step) {
      case 1:
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
      
      case 2:
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
                      {selectedContact.firstName} {selectedContact.lastName || ""}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Building className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{selectedContact.company}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{selectedContact.email}</span>
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
      
      case 3:
        return (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">Step 3: Company Research Results</h3>
              <div className="space-x-2">
                <Button variant="outline" size="sm" onClick={() => setStep(2)}>
                  Back to Research
                </Button>
                <Button size="sm" onClick={() => setStep(4)}>
                  Continue to Proposal Details
                </Button>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="flex justify-between items-start">
                <p className="text-muted-foreground">
                  Review the AI-driven research about {selectedContact?.company || "this company"} to determine if there's a good fit with your creators.
                </p>
                <Badge variant="secondary">
                  <Calendar className="mr-1 h-3 w-3" />
                  {new Date().toLocaleDateString()}
                </Badge>
              </div>
              
              {/* Interactive Company Profile Preview */}
              <CompanyProfilePreview data={researchData} />
              
              <div className="flex justify-end">
                <Button variant="outline" className="mr-2" onClick={startResearch}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Refresh Research
                </Button>
                <Button onClick={() => setStep(4)}>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Continue to Proposal
                </Button>
              </div>
            </div>
          </div>
        );
        
      case 4:
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
                        <Button onClick={() => setStep(5)}>
                          Continue to Proposal
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
                      
                      <div className="flex justify-end">
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
      
      case 5:
        return (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">Step 5: Project Overview</h3>
              <Button variant="outline" size="sm" onClick={() => setStep(4)}>
                Back to R&D Assessment
              </Button>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-6">
                <Card>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle>
                        {selectedContact?.company || "Company"} Partnership
                      </CardTitle>
                      <Badge className={researchData?.partnershipPotential?.toLowerCase() === "high" ? "bg-green-100 text-green-800" : 
                                        researchData?.partnershipPotential?.toLowerCase() === "medium" ? "bg-yellow-100 text-yellow-800" : 
                                        "bg-red-100 text-red-800"}>
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
              </div>
              
              <div className="space-y-6">
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
                
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle>Finalize Proposal</CardTitle>
                        <CardDescription>
                          Add a name and any final notes to your proposal
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <FormField
                          control={form.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Proposal Name</FormLabel>
                              <FormControl>
                                <Input placeholder="Enter a name for this proposal" {...field} />
                              </FormControl>
                              <FormDescription>
                                A descriptive name for this partnership proposal
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="notes"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Additional Notes</FormLabel>
                              <FormControl>
                                <Textarea 
                                  placeholder="Enter any additional notes or details for this proposal" 
                                  className="min-h-[100px]"
                                  {...field} 
                                />
                              </FormControl>
                              <FormDescription>
                                Any special considerations or important details about this partnership
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <div className="flex justify-end space-x-2 pt-2">
                          <Button 
                            type="button" 
                            variant="outline"
                            onClick={() => setStep(4)}
                          >
                            Back
                          </Button>
                          <Button type="submit">
                            Save Proposal
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </form>
                </Form>
                        <FormItem>
                          <FormLabel>Proposal Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter proposal name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Status</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select status" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="draft">Draft</SelectItem>
                              <SelectItem value="ready">Ready</SelectItem>
                              <SelectItem value="sent">Sent</SelectItem>
                              <SelectItem value="accepted">Accepted</SelectItem>
                              <SelectItem value="rejected">Rejected</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="value"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Estimated Value</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="Enter estimated value"
                              {...field}
                              // Convert empty string to undefined
                              onChange={(e) => {
                                const value = e.target.value;
                                field.onChange(value === "" ? undefined : parseInt(value, 10));
                              }}
                            />
                          </FormControl>
                          <FormDescription>
                            Optional: Enter the estimated value of this deal
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="followupDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Follow-up Date</FormLabel>
                          <FormControl>
                            <Input
                              type="date"
                              {...field}
                              value={field.value ? new Date(field.value).toISOString().split('T')[0] : ""}
                              onChange={(e) => {
                                const value = e.target.value;
                                field.onChange(value ? new Date(value) : undefined);
                              }}
                            />
                          </FormControl>
                          <FormDescription>
                            Optional: When to follow up on this proposal
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Notes</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Enter any additional notes here"
                              className="min-h-[100px]"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            Optional: Add any specific details or notes about this opportunity
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="flex justify-end">
                      <Button type="submit">
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Create Proposal
                      </Button>
                    </div>
                  </form>
                </Form>
              </TabsContent>
              
              <TabsContent value="research" className="space-y-4 py-4">
                {researchData ? (
                  <div className="space-y-4">
                    <div className="flex justify-between items-start">
                      <h3 className="text-base font-medium">Company Research Results</h3>
                      <Badge variant="secondary">
                        <Calendar className="mr-1 h-3 w-3" />
                        {new Date().toLocaleDateString()}
                      </Badge>
                    </div>
                    
                    {/* Interactive Company Profile Preview */}
                    <CompanyProfilePreview data={researchData} />
                    
                    <div className="flex justify-end">
                      <Button variant="outline" className="mr-2" onClick={startResearch}>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Refresh Research
                      </Button>
                      <Button onClick={() => form.handleSubmit(onSubmit)()}>
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Create Proposal
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
                    <h3 className="font-medium">Loading research data...</h3>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        );
      
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