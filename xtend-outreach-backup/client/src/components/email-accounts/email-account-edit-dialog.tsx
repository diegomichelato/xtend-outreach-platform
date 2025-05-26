import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, AlertCircle, SendIcon, CheckCircle2, XCircle } from "lucide-react";
import { EmailAccount } from "@shared/schema";
import { useEmailAccounts } from "@/hooks/use-email-accounts";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { 
  Dialog as TestEmailDialog, 
  DialogContent as TestEmailDialogContent,
  DialogHeader as TestEmailDialogHeader,
  DialogTitle as TestEmailDialogTitle,
  DialogDescription as TestEmailDialogDescription,
  DialogFooter as TestEmailDialogFooter
} from "@/components/ui/dialog";

// Define form schema for email account
const formSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address" }),
  name: z.string().min(2, { message: "Name must be at least 2 characters" }),
  provider: z.string().min(1, { message: "Please select a provider" }),
  status: z.string().default("active"),
  dailyLimit: z.coerce.number().min(1).optional(),
  warmupEnabled: z.boolean().default(false),
  // SMTP details
  smtpHost: z.string().optional(),
  smtpPort: z.coerce.number().optional(),
  smtpUsername: z.string().optional(),
  smtpPassword: z.string().optional(),
  smtpSecure: z.boolean().default(true),
  // IMAP details
  imapHost: z.string().optional(),
  imapPort: z.coerce.number().optional(),
  imapUsername: z.string().optional(),
  imapPassword: z.string().optional(),
  imapSecure: z.boolean().default(true),
});

type FormValues = z.infer<typeof formSchema>;

interface EmailAccountEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  emailAccount: EmailAccount | null;
}

export function EmailAccountEditDialog({ open, onOpenChange, emailAccount }: EmailAccountEditDialogProps) {
  const [activeTab, setActiveTab] = useState("general");
  const [isDeleting, setIsDeleting] = useState(false);
  const [isTestEmailDialogOpen, setIsTestEmailDialogOpen] = useState(false);
  const [validationResult, setValidationResult] = useState<{ valid: boolean; issues: string[]; canConnect: boolean } | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [testEmailRecipient, setTestEmailRecipient] = useState("");
  
  const { 
    updateEmailAccount, 
    deleteEmailAccount, 
    validateEmailAccount,
    sendTestEmail 
  } = useEmailAccounts();
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      name: "",
      provider: "gmail",
      status: "active",
      dailyLimit: 100,
      warmupEnabled: false,
      smtpSecure: true,
      imapSecure: true
    }
  });
  
  // Update form values when email account changes
  useEffect(() => {
    if (emailAccount) {
      form.reset({
        email: emailAccount.email,
        name: emailAccount.name,
        provider: emailAccount.provider,
        status: emailAccount.status,
        dailyLimit: emailAccount.dailyLimit || undefined,
        warmupEnabled: emailAccount.warmupEnabled || false,
        smtpHost: emailAccount.smtpHost || undefined,
        smtpPort: emailAccount.smtpPort || undefined,
        smtpUsername: emailAccount.smtpUsername || undefined,
        smtpPassword: undefined, // Don't populate password for security
        smtpSecure: emailAccount.smtpSecure ?? true,
        imapHost: emailAccount.imapHost || undefined,
        imapPort: emailAccount.imapPort || undefined,
        imapUsername: emailAccount.imapUsername || undefined,
        imapPassword: undefined, // Don't populate password for security
        imapSecure: emailAccount.imapSecure ?? true
      });
    }
  }, [emailAccount, form]);
  
  // Handle form submission
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  async function onSubmit(data: FormValues) {
    if (!emailAccount) return;
    
    // Prepare update data, preserving the original data and only changing what was modified
    const submitData = {
      // Include the original email account data as base
      ...emailAccount,
      // Apply form updates
      ...data,
      id: emailAccount.id,
      // Only include password fields if they were actually changed (not empty)
      // Otherwise keep the original password (it's not actually returned in the API)
      smtpPassword: data.smtpPassword || undefined,
      imapPassword: data.imapPassword || undefined,
    };
    
    // Validate data before submitting
    const validation = await validateEmailAccountData(submitData);
    if (!validation.valid) {
      toast({
        title: "Validation Error",
        description: validation.error || "Please check the form for errors",
        variant: "destructive",
      });
      return;
    }
    
    try {
      await updateEmailAccount.mutateAsync(submitData);
      
      // Verify the update was successful by checking if the data was persisted properly
      await queryClient.invalidateQueries({ queryKey: ['/api/email-accounts', emailAccount.id.toString()] });
      await new Promise(resolve => setTimeout(resolve, 500)); // Small delay to ensure data is fetched
      
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Update Failed",
        description: error instanceof Error ? error.message : "Failed to update email account",
        variant: "destructive",
      });
    }
  }
  
  // Validate email account data before submission
  async function validateEmailAccountData(data: Partial<EmailAccount>): Promise<{ valid: boolean; error?: string }> {
    // Check required fields
    if (!data.email) return { valid: false, error: "Email address is required" };
    if (!data.name) return { valid: false, error: "Display name is required" };
    if (!data.provider) return { valid: false, error: "Provider is required" };
    
    // SMTP settings validation
    if (data.smtpHost && !data.smtpPort) {
      return { valid: false, error: "SMTP port is required when host is provided" };
    }
    
    // IMAP settings validation
    if (data.imapHost && !data.imapPort) {
      return { valid: false, error: "IMAP port is required when host is provided" };
    }
    
    return { valid: true };
  }
  
  // Validate email account connectivity with the server
  async function handleValidateConfiguration() {
    if (!emailAccount) return;
    
    setIsValidating(true);
    setValidationResult(null);
    
    try {
      // Get current form values
      const formData = form.getValues();
      
      // Perform basic client-side validation first
      const localValidation = await validateEmailAccountData(formData);
      if (!localValidation.valid) {
        toast({
          title: "Validation Error",
          description: localValidation.error || "Please fix form errors before validating",
          variant: "destructive",
        });
        setIsValidating(false);
        return;
      }
      
      // Prepare data for validation - only include relevant fields for SMTP
      const validationData = {
        id: emailAccount.id,
        email: formData.email,
        name: formData.name, 
        provider: formData.provider,
        status: formData.status,
        smtpHost: formData.smtpHost,
        smtpPort: formData.smtpPort,
        smtpUsername: formData.smtpUsername,
        smtpPassword: formData.smtpPassword,
        smtpSecure: formData.smtpSecure
      };
      
      console.log("Sending validation data:", validationData);
      
      // Send to server for validation
      const result = await validateEmailAccount.mutateAsync(validationData);
      
      setValidationResult(result);
      
      if (result.valid && result.canConnect) {
        toast({
          title: "Validation Successful",
          description: "Email account configuration is valid and connection test passed",
        });
      } else if (result.valid) {
        toast({
          title: "Validation Completed",
          description: "Email account configuration is valid, but connection could not be established",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Validation Failed",
          description: result.issues?.join(", ") || "Email account configuration has issues that need to be fixed",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Validation error:", error);
      toast({
        title: "Validation Error",
        description: error instanceof Error ? error.message : "Failed to validate email configuration",
        variant: "destructive"
      });
    } finally {
      setIsValidating(false);
    }
  }
  
  // Handle sending a test email
  async function handleSendTestEmail() {
    setIsTestEmailDialogOpen(true);
  }
  
  // Submit test email
  async function submitTestEmail() {
    if (!emailAccount || !testEmailRecipient) return;
    
    try {
      const result = await sendTestEmail.mutateAsync({
        accountId: emailAccount.id,
        recipient: testEmailRecipient
      });
      
      setIsTestEmailDialogOpen(false);
      setTestEmailRecipient(""); // Reset the recipient field
    } catch (error) {
      toast({
        title: "Test Email Error",
        description: error instanceof Error ? error.message : "Failed to send test email",
        variant: "destructive"
      });
    }
  }
  
  // Handle account deletion
  async function handleDelete() {
    if (!emailAccount) return;
    
    setIsDeleting(true);
    try {
      await deleteEmailAccount.mutateAsync(emailAccount.id);
      onOpenChange(false);
    } finally {
      setIsDeleting(false);
    }
  }
  
  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Email Account</DialogTitle>
            <DialogDescription>
              Update this email account's settings or configuration.
            </DialogDescription>
          </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="general">General</TabsTrigger>
                <TabsTrigger value="smtp">SMTP Settings</TabsTrigger>
                <TabsTrigger value="imap">IMAP Settings</TabsTrigger>
              </TabsList>
              
              {/* General Tab */}
              <TabsContent value="general" className="space-y-4 mt-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Address</FormLabel>
                      <FormControl>
                        <Input placeholder="yourname@example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Display Name</FormLabel>
                      <FormControl>
                        <Input placeholder="John Doe" {...field} />
                      </FormControl>
                      <FormDescription>
                        Name that will appear in the "From" field
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="provider"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Provider</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a provider" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="gmail">Gmail</SelectItem>
                          <SelectItem value="outlook">Outlook / Microsoft 365</SelectItem>
                          <SelectItem value="yahoo">Yahoo Mail</SelectItem>
                          <SelectItem value="zoho">Zoho Mail</SelectItem>
                          <SelectItem value="other">Other Provider</SelectItem>
                        </SelectContent>
                      </Select>
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
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="paused">Paused</SelectItem>
                          <SelectItem value="suspended">Suspended</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="dailyLimit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Daily Sending Limit</FormLabel>
                      <FormControl>
                        <Input type="number" min={1} {...field} />
                      </FormControl>
                      <FormDescription>
                        Maximum number of emails to send per day
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="warmupEnabled"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Email Warmup</FormLabel>
                        <FormDescription>
                          Gradually increase sending volume to improve deliverability
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </TabsContent>
              
              {/* SMTP Tab */}
              <TabsContent value="smtp" className="space-y-4 mt-4">
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    These settings are required for sending emails from this account.
                  </AlertDescription>
                </Alert>
                
                <FormField
                  control={form.control}
                  name="smtpHost"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>SMTP Host</FormLabel>
                      <FormControl>
                        <Input placeholder="smtp.gmail.com" {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="smtpPort"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>SMTP Port</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="587" {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="smtpUsername"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>SMTP Username</FormLabel>
                      <FormControl>
                        <Input placeholder="your.email@example.com" {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="smtpPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>SMTP Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="••••••••" {...field} value={field.value || ""} />
                      </FormControl>
                      <FormDescription>
                        {emailAccount?.smtpPassword ? "Leave blank to keep current password" : ""}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="smtpSecure"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Use Secure Connection (TLS)</FormLabel>
                        <FormDescription>
                          Enable for secure email transmission (recommended)
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </TabsContent>
              
              {/* IMAP Tab */}
              <TabsContent value="imap" className="space-y-4 mt-4">
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    These settings are required to track email replies and manage conversations.
                  </AlertDescription>
                </Alert>
                
                <FormField
                  control={form.control}
                  name="imapHost"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>IMAP Host</FormLabel>
                      <FormControl>
                        <Input placeholder="imap.gmail.com" {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="imapPort"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>IMAP Port</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="993" {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="imapUsername"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>IMAP Username</FormLabel>
                      <FormControl>
                        <Input placeholder="your.email@example.com" {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="imapPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>IMAP Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="••••••••" {...field} value={field.value || ""} />
                      </FormControl>
                      <FormDescription>
                        {emailAccount?.imapPassword ? "Leave blank to keep current password" : ""}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="imapSecure"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Use Secure Connection (TLS)</FormLabel>
                        <FormDescription>
                          Enable for secure connection to mail server (recommended)
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </TabsContent>
            </Tabs>
            
            {/* Display validation results if available */}
            {validationResult && (
              <div className="mb-6">
                <Alert variant={validationResult.valid ? (validationResult.canConnect ? "default" : "warning") : "destructive"}>
                  {validationResult.valid ? (
                    validationResult.canConnect ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      <AlertCircle className="h-4 w-4" />
                    )
                  ) : (
                    <XCircle className="h-4 w-4" />
                  )}
                  <AlertTitle>
                    {validationResult.valid 
                      ? (validationResult.canConnect 
                          ? "Configuration Verified"
                          : "Configuration Valid But Connection Failed")
                      : "Configuration Issues Detected"
                    }
                  </AlertTitle>
                  <AlertDescription>
                    {validationResult.valid 
                      ? (validationResult.canConnect 
                          ? "Your email account is properly configured and connection test passed."
                          : "Your email configuration looks valid, but we couldn't establish a connection. This may be due to network issues, firewall settings, or incorrect credentials.")
                      : (
                        <ul className="list-disc pl-5 mt-2">
                          {validationResult.issues.map((issue, index) => (
                            <li key={index}>{issue}</li>
                          ))}
                        </ul>
                      )
                    }
                  </AlertDescription>
                </Alert>
              </div>
            )}
            
            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2 justify-between mb-6">
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-nowrap"
                  onClick={handleValidateConfiguration}
                  disabled={isValidating || !emailAccount?.id}
                >
                  {isValidating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Validating...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Validate Configuration
                    </>
                  )}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  className="flex-nowrap"
                  onClick={handleSendTestEmail}
                  disabled={sendTestEmail.isPending || !emailAccount?.id}
                >
                  {sendTestEmail.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <SendIcon className="mr-2 h-4 w-4" />
                      Send Test Email
                    </>
                  )}
                </Button>
              </div>
            </div>
            
            <DialogFooter className="flex justify-between items-center pt-4">
              <Button 
                type="button" 
                variant="destructive" 
                onClick={handleDelete}
                disabled={updateEmailAccount.isPending || deleteEmailAccount.isPending || isDeleting || isValidating || sendTestEmail.isPending}
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  "Delete Account"
                )}
              </Button>
              
              <div className="flex space-x-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => onOpenChange(false)}
                  disabled={updateEmailAccount.isPending || isValidating || sendTestEmail.isPending}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={updateEmailAccount.isPending || isValidating || sendTestEmail.isPending}
                >
                  {updateEmailAccount.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
    
    {/* Test Email Dialog */}
    <TestEmailDialog open={isTestEmailDialogOpen} onOpenChange={setIsTestEmailDialogOpen}>
      <TestEmailDialogContent>
        <TestEmailDialogHeader>
          <TestEmailDialogTitle>Send Test Email</TestEmailDialogTitle>
          <TestEmailDialogDescription>
            Send a test email to verify your account configuration.
          </TestEmailDialogDescription>
        </TestEmailDialogHeader>
        
        <div className="py-4">
          <Label htmlFor="test-email-recipient">Recipient Email</Label>
          <Input
            id="test-email-recipient"
            type="email"
            placeholder="recipient@example.com"
            value={testEmailRecipient}
            onChange={(e) => setTestEmailRecipient(e.target.value)}
            className="mt-2"
          />
          <p className="text-sm text-muted-foreground mt-2">
            Enter the email address where you want to receive the test message
          </p>
        </div>
        
        <TestEmailDialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsTestEmailDialogOpen(false)}
            disabled={sendTestEmail.isPending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={submitTestEmail}
            disabled={!testEmailRecipient || sendTestEmail.isPending}
          >
            {sendTestEmail.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              "Send Test Email"
            )}
          </Button>
        </TestEmailDialogFooter>
      </TestEmailDialogContent>
    </TestEmailDialog>
    </>
  );
}