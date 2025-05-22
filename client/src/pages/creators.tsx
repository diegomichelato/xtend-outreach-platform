import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Plus, AlertCircle, RefreshCw, Globe } from "lucide-react";
import { useState } from "react";
import { Creator } from "@shared/schema";
import { CreatorCard } from "@/components/campaign/creator-card";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useEmailAccounts } from "@/hooks/use-email-accounts";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UrlExtractor } from "@/components/creator/url-extractor";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AddTylerButton } from "@/components/creator/add-tyler-button";

const creatorFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  role: z.string().min(2, "Role must be at least 2 characters"),
  bio: z.string().optional(),
  brandVoice: z.string().optional(),
  googleDriveFolder: z.string().optional(),
  pillarUrl: z.string().url("Must be a valid URL").optional(),
  emailAccountIds: z.array(z.string()).optional(),
  primaryEmailAccountId: z.string().optional(),
});

type CreatorFormValues = z.infer<typeof creatorFormSchema>;

export default function Creators() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentCreator, setCurrentCreator] = useState<Creator | null>(null);
  const [extractedCreatorData, setExtractedCreatorData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("manual");
  const { toast } = useToast();
  
  const { data: creators, isLoading } = useQuery<Creator[]>({
    queryKey: ['/api/creators'],
  });
  
  // Delete creator mutation
  const deleteCreatorMutation = useMutation({
    mutationFn: async (creatorId: number) => {
      const response = await apiRequest("DELETE", `/api/creators/${creatorId}`);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/creators'] });
      toast({
        title: "Creator deleted",
        description: "The creator was successfully deleted.",
      });
    },
    onError: (error) => {
      console.error("Error deleting creator:", error);
      toast({
        title: "Error",
        description: "Failed to delete creator. Please try again.",
        variant: "destructive",
      });
    }
  });
  
  // Update creator mutation
  const updateCreatorMutation = useMutation({
    mutationFn: async (data: { id: number, values: Partial<Creator> }) => {
      const response = await apiRequest("PATCH", `/api/creators/${data.id}`, data.values);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/creators'] });
      toast({
        title: "Creator updated",
        description: "The creator was successfully updated.",
      });
      setIsDialogOpen(false);
      setIsEditing(false);
      setCurrentCreator(null);
    },
    onError: (error) => {
      console.error("Error updating creator:", error);
      toast({
        title: "Error",
        description: "Failed to update creator. Please try again.",
        variant: "destructive",
      });
    }
  });
  
  // Fetch email accounts for dropdown
  const {
    emailAccounts,
    refetchAccounts
  } = useEmailAccounts();

  const form = useForm<CreatorFormValues>({
    resolver: zodResolver(creatorFormSchema),
    defaultValues: {
      name: "",
      role: "",
      bio: "",
      brandVoice: "",
      googleDriveFolder: "",
      pillarUrl: "",
      emailAccountIds: [],
      primaryEmailAccountId: "",
    },
  });

  // Function to handle form initialization when editing a creator
  const handleEditCreator = (creator: Creator) => {
    // Reset the form with the creator's values
    form.reset({
      name: creator.name,
      role: creator.role,
      bio: creator.bio || "",
      brandVoice: creator.brandVoice || "",
      googleDriveFolder: creator.googleDriveFolder || "",
      pillarUrl: creator.pillarUrl || "",
      emailAccountIds: [], // We would need to fetch the creator's email accounts
      primaryEmailAccountId: "", // We would need to fetch the creator's primary email account
    });
    
    // Set the editing state
    setIsEditing(true);
    setCurrentCreator(creator);
    setIsDialogOpen(true);
  };
  
  // Function to handle creator deletion
  const handleDeleteCreator = (id: number) => {
    deleteCreatorMutation.mutate(id);
  };
  
  // Function to handle extracted data from URL
  const handleExtractedData = (data: any) => {
    setExtractedCreatorData(data);
    
    // Update form values with extracted data
    if (data.name) form.setValue('name', data.name);
    if (data.role) form.setValue('role', data.role);
    if (data.bio) form.setValue('bio', data.bio);
    
    // If there's a source URL in metadata, use it for pillarUrl
    if (data.metaData?.sourceUrl) {
      form.setValue('pillarUrl', data.metaData.sourceUrl);
    }
    
    // Switch to the manual tab to let user review and edit the data
    setActiveTab("manual");
  };
  
  async function onSubmit(values: CreatorFormValues) {
    try {
      // Different handling for editing vs creating
      if (isEditing && currentCreator) {
        // Update existing creator
        updateCreatorMutation.mutate({
          id: currentCreator.id,
          values: {
            name: values.name,
            role: values.role,
            bio: values.bio,
            brandVoice: values.brandVoice,
            googleDriveFolder: values.googleDriveFolder,
            pillarUrl: values.pillarUrl,
          },
        });
      } else {
        // Check if primary email account was selected when emails are attached
        if (values.emailAccountIds?.length > 0 && !values.primaryEmailAccountId) {
          toast({
            title: "Primary email required",
            description: "Please select a primary email account for this creator.",
            variant: "destructive",
          });
          return;
        }
        
        // Create the creator
        const response = await apiRequest("POST", "/api/creators", {
          name: values.name,
          role: values.role,
          bio: values.bio,
          brandVoice: values.brandVoice,
          googleDriveFolder: values.googleDriveFolder,
          pillarUrl: values.pillarUrl,
        });
        
        // Parse the response JSON
        const creatorResponse = await response.json();
        
        // Make sure we have a valid creator ID 
        if (!creatorResponse || typeof creatorResponse.id !== 'number') {
          console.error("Invalid creator response:", creatorResponse);
          toast({
            title: "Error",
            description: "Creator was added but there was an issue with the response. Email accounts could not be linked.",
            variant: "destructive",
          });
          queryClient.invalidateQueries({ queryKey: ['/api/creators'] });
          setIsDialogOpen(false);
          form.reset();
          return;
        }
        
        // Creator was successfully added, now associate email accounts
        if (values.emailAccountIds && values.emailAccountIds.length > 0) {
          // Associate the email accounts with the creator directly
          let hasEmailLinkingErrors = false;
          
          // Associate all selected email accounts with the creator
          for (const emailAccountId of values.emailAccountIds) {
            const isPrimary = emailAccountId === values.primaryEmailAccountId;
            const creatorId = creatorResponse.id;
            
            try {
              console.log(`Linking account ${emailAccountId} to creator ${creatorId}, isPrimary: ${isPrimary}`);
              await apiRequest("POST", `/api/creators/${creatorId}/email-accounts`, {
                emailAccountIds: [parseInt(emailAccountId)],
                isPrimary
              });
            } catch (linkError) {
              console.error("Failed to link email account:", linkError);
              hasEmailLinkingErrors = true;
            }
          }
          
          if (hasEmailLinkingErrors) {
            toast({
              title: "Partial success",
              description: "Creator was added but some email accounts could not be linked. Please check your email account settings.",
              variant: "destructive",
            });
          } else {
            toast({
              title: "Creator added",
              description: "The creator and all email accounts were successfully added.",
            });
          }
        } else {
          toast({
            title: "Creator added",
            description: "The creator was successfully added to your account.",
          });
        }
        
        // Refresh the creators list
        queryClient.invalidateQueries({ queryKey: ['/api/creators'] });
      }
      
      // Close the dialog and reset the form
      setIsDialogOpen(false);
      setIsEditing(false);
      setCurrentCreator(null);
      form.reset();
      setExtractedCreatorData(null);
    } catch (error) {
      console.error("Error processing creator:", error);
      toast({
        title: "Error",
        description: `Failed to ${isEditing ? 'update' : 'add'} creator. Please try again.`,
        variant: "destructive",
      });
    }
  }

  return (
    <div className="container py-6 max-w-7xl mx-auto">
      {/* Page header */}
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Creators</h1>
          <p className="mt-1 text-muted-foreground">
            Manage and track the creators who represent your brand in email outreach campaigns
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center">
              <Plus className="mr-2 h-4 w-4" />
              Add Creator
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[625px]">
            <DialogHeader>
              <DialogTitle>{isEditing ? "Edit creator" : "Add a new creator"}</DialogTitle>
              <DialogDescription>
                {isEditing 
                  ? "Update the details for this creator."
                  : "Fill in the details about the creator who will be sending emails."
                }
              </DialogDescription>
            </DialogHeader>
            
            {!isEditing ? (
              <Tabs defaultValue="manual" value={activeTab} onValueChange={setActiveTab} className="mt-4">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="manual">Manual Input</TabsTrigger>
                  <TabsTrigger value="url" className="flex items-center gap-1">
                    <Globe className="h-4 w-4" />
                    Extract from URL
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="url" className="mt-4 mb-6">
                  <UrlExtractor onExtractedData={handleExtractedData} />
                  {extractedCreatorData && (
                    <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
                      <p className="text-sm font-medium text-green-700">Data extracted successfully!</p>
                      <p className="text-xs text-green-600 mt-1">The extracted information has been filled into the form. Continue to the "Manual Input" tab to review and complete additional details.</p>
                    </div>
                  )}
                </TabsContent>
                
                <TabsContent value="manual">
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Name</FormLabel>
                            <FormControl>
                              <Input placeholder="John Doe" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="role"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Role</FormLabel>
                            <FormControl>
                              <Input placeholder="SaaS Growth Expert" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="bio"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Biography</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="A brief description of the creator's background and expertise"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="brandVoice"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Brand Voice</FormLabel>
                            <FormDescription>
                              How does this creator express their brand personality in communications?
                            </FormDescription>
                            <FormControl>
                              <Textarea 
                                placeholder="Professional but approachable, technical but easy to understand..."
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="googleDriveFolder"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Google Drive Folder</FormLabel>
                              <FormDescription>
                                Optional link to creator's portfolio folder
                              </FormDescription>
                              <FormControl>
                                <Input placeholder="https://drive.google.com/..." {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="pillarUrl"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Pillar URL</FormLabel>
                              <FormDescription>
                                Main social profile or website
                              </FormDescription>
                              <FormControl>
                                <Input placeholder="https://..." {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      {emailAccounts && emailAccounts.length > 0 && (
                        <div className="space-y-4 border-t pt-4 mt-4">
                          <h3 className="text-lg font-medium">Email Accounts</h3>
                          <FormField
                            control={form.control}
                            name="emailAccountIds"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Email Accounts</FormLabel>
                                <FormDescription>
                                  Associate email accounts with this creator
                                </FormDescription>
                                <div className="flex gap-2 items-start">
                                  <Select
                                    onValueChange={(value) => {
                                      if (value === "select-all") {
                                        // Select all accounts
                                        const allAccountIds = emailAccounts.map(account => account.id.toString());
                                        field.onChange(allAccountIds);
                                      } else {
                                        // Add or remove individual account
                                        const currentValues = field.value || [];
                                        if (currentValues.includes(value)) {
                                          field.onChange(currentValues.filter(id => id !== value));
                                        } else {
                                          field.onChange([...currentValues, value]);
                                        }
                                      }
                                    }}
                                  >
                                    <FormControl>
                                      <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Select email accounts" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="select-all">Select All Accounts</SelectItem>
                                      {emailAccounts.map((account) => (
                                        <SelectItem 
                                          key={account.id} 
                                          value={account.id.toString()}
                                          className={field.value?.includes(account.id.toString()) ? "bg-muted" : ""}
                                        >
                                          <div className="flex items-center">
                                            <span>{account.email}</span>
                                            <Badge className="ml-2" variant="outline">{account.provider}</Badge>
                                          </div>
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                {field.value && field.value.length > 0 && (
                                  <div className="mt-2 flex flex-wrap gap-2">
                                    {field.value.map(accountId => {
                                      const account = emailAccounts.find(a => a.id.toString() === accountId);
                                      return account ? (
                                        <Badge 
                                          key={account.id}
                                          variant="secondary"
                                          className="p-1.5"
                                        >
                                          {account.email}
                                        </Badge>
                                      ) : null;
                                    })}
                                  </div>
                                )}
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="primaryEmailAccountId"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Primary Email Account</FormLabel>
                                <FormDescription>
                                  Select which email account should be the primary one for this creator
                                </FormDescription>
                                <Select
                                  onValueChange={field.onChange}
                                  value={field.value}
                                  disabled={!form.watch("emailAccountIds") || form.watch("emailAccountIds").length === 0}
                                >
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select primary email account" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {form.watch("emailAccountIds")?.map(accountId => {
                                      const account = emailAccounts.find(a => a.id.toString() === accountId);
                                      return account ? (
                                        <SelectItem 
                                          key={account.id} 
                                          value={account.id.toString()}
                                        >
                                          {account.email}
                                        </SelectItem>
                                      ) : null;
                                    })}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      )}
                      
                      <div className="flex justify-end pt-4">
                        <Button
                          type="submit"
                          disabled={
                            form.formState.isSubmitting || 
                            (!isEditing && emailAccounts && emailAccounts.length > 0 && 
                             (!form.watch("emailAccountIds") || form.watch("emailAccountIds").length === 0))
                          }
                        >
                          {form.formState.isSubmitting && (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          )}
                          {isEditing ? 'Update Creator' : 'Add Creator'}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </TabsContent>
              </Tabs>
            ) : (
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name</FormLabel>
                        <FormControl>
                          <Input placeholder="John Doe" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="role"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Role</FormLabel>
                        <FormControl>
                          <Input placeholder="SaaS Growth Expert" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="bio"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Biography</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="A brief description of the creator's background and expertise"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="brandVoice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Brand Voice</FormLabel>
                        <FormDescription>
                          How does this creator express their brand personality in communications?
                        </FormDescription>
                        <FormControl>
                          <Textarea 
                            placeholder="Professional but approachable, technical but easy to understand..."
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="googleDriveFolder"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Google Drive Folder</FormLabel>
                          <FormDescription>
                            Optional link to creator's portfolio folder
                          </FormDescription>
                          <FormControl>
                            <Input placeholder="https://drive.google.com/..." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="pillarUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Pillar URL</FormLabel>
                          <FormDescription>
                            Main social profile or website
                          </FormDescription>
                          <FormControl>
                            <Input placeholder="https://..." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="flex justify-end pt-4">
                    <Button
                      type="submit"
                      disabled={form.formState.isSubmitting}
                    >
                      {form.formState.isSubmitting && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      {isEditing ? 'Update Creator' : 'Add Creator'}
                    </Button>
                  </div>
                </form>
              </Form>
            )}
          </DialogContent>
        </Dialog>
      </div>

      {/* Creators Grid */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white shadow-sm rounded-xl border border-gray-100 p-6">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Total Creators</h3>
              <div className="flex items-end justify-between">
                <p className="text-3xl font-bold">{creators ? creators.length : 0}</p>
                <div className="bg-green-50 text-green-600 text-xs px-2 py-1 rounded-full">Active</div>
              </div>
            </div>
            
            <div className="bg-white shadow-sm rounded-xl border border-gray-100 p-6">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Active Campaigns</h3>
              <div className="flex items-end justify-between">
                <p className="text-3xl font-bold">0</p>
                <div className="bg-blue-50 text-blue-600 text-xs px-2 py-1 rounded-full">Ready</div>
              </div>
            </div>
            
            <div className="bg-white shadow-sm rounded-xl border border-gray-100 p-6">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Email Deliverability</h3>
              <div className="flex items-end justify-between">
                <p className="text-3xl font-bold">98<span className="text-lg">%</span></p>
                <div className="bg-green-50 text-green-600 text-xs px-2 py-1 rounded-full">Healthy</div>
              </div>
            </div>
          </div>
          
          {/* Creator Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {creators && creators.map((creator) => (
              <CreatorCard 
                key={creator.id} 
                creator={creator} 
                selectable={false}
                onEdit={handleEditCreator}
                onDelete={handleDeleteCreator}
              />
            ))}
            <div 
              onClick={() => {
                // Reset form when adding a new creator
                form.reset({
                  name: "",
                  role: "",
                  bio: "",
                  brandVoice: "",
                  googleDriveFolder: "",
                  pillarUrl: "",
                  emailAccountIds: [],
                  primaryEmailAccountId: "",
                });
                setIsEditing(false);
                setCurrentCreator(null);
                setExtractedCreatorData(null);
                setIsDialogOpen(true);
              }}
              className="border border-dashed border-gray-200 rounded-lg p-6 flex flex-col items-center justify-center gap-3 hover:border-primary/50 cursor-pointer transition-colors h-[250px]"
            >
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                <Plus className="h-6 w-6 text-primary" />
              </div>
              <p className="font-medium">Add New Creator</p>
              <p className="text-sm text-muted-foreground text-center">
                Connect a new creator to your outreach campaigns
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}