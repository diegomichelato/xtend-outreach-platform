import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Loader2, HelpCircle, AlertCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Create a schema for email account validation
const formSchema = z.object({
  name: z.string().min(1, { message: "Account name is required" }),
  email: z.string().email({ message: "Invalid email address" }),
  provider: z.string().min(1, { message: "Provider is required" }),
  dailyLimit: z.number().optional(),
  warmupEnabled: z.boolean().default(false),
  
  // Gmail App Password specific field
  useAppPassword: z.boolean().default(false),
  appPassword: z.string().optional().refine(
    (val) => {
      if (val === undefined || val === "") return true;
      // App password should be 16 characters long without spaces
      return val.length === 16 && !val.includes(" ");
    }, 
    { message: "App Password must be 16 characters without spaces" }
  ),
  
  // SMTP Fields
  smtpHost: z.string().min(1, { message: "SMTP host is required" }),
  smtpPort: z.number().min(1, { message: "SMTP port is required" }),
  smtpSecure: z.boolean().default(true),
  smtpUsername: z.string().min(1, { message: "SMTP username is required" }),
  smtpPassword: z.string().optional(),
  
  // IMAP Fields
  imapHost: z.string().min(1, { message: "IMAP host is required" }),
  imapPort: z.number().min(1, { message: "IMAP port is required" }),
  imapSecure: z.boolean().default(true),
  imapUsername: z.string().min(1, { message: "IMAP username is required" }),
  imapPassword: z.string().optional(),
  
  // Additional fields
  active: z.boolean().default(true),
  testMode: z.boolean().default(false),
  sendRate: z.number().min(1).default(10), // emails per hour
  creatorId: z.number().optional(),
}).superRefine((data, ctx) => {
  // If app password is being used, it's required
  if (data.useAppPassword && (!data.appPassword || data.appPassword.length === 0)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "App Password is required when using App Password mode",
      path: ["appPassword"],
    });
  }
  
  // If not using app password, SMTP password is required
  if (!data.useAppPassword && (!data.smtpPassword || data.smtpPassword.length === 0)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "SMTP Password is required",
      path: ["smtpPassword"],
    });
  }
  
  // If not using app password, IMAP password is required
  if (!data.useAppPassword && (!data.imapPassword || data.imapPassword.length === 0)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "IMAP Password is required",
      path: ["imapPassword"],
    });
  }
});

interface EmailAccountAddDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EmailAccountAddDialog({
  open,
  onOpenChange,
}: EmailAccountAddDialogProps) {
  const [activeTab, setActiveTab] = useState("basic");
  const queryClient = useQueryClient();
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      provider: "",
      dailyLimit: 100,
      warmupEnabled: false,
      useAppPassword: false,
      appPassword: "",
      smtpHost: "",
      smtpPort: 587,
      smtpSecure: true,
      smtpUsername: "",
      smtpPassword: "",
      imapHost: "",
      imapPort: 993,
      imapSecure: true,
      imapUsername: "",
      imapPassword: "",
      active: true,
      testMode: false,
      sendRate: 10,
      creatorId: undefined,
    },
  });
  
  // Helper to automatically set sensible defaults based on provider selection
  const emailProvider = form.watch("provider");
  const useAppPassword = form.watch("useAppPassword");
  
  // Effect to update SMTP and IMAP settings when provider changes
  if (emailProvider && emailProvider !== form.getValues("provider")) {
    let smtpDefaults = {
      smtpHost: "",
      smtpPort: 587,
      smtpSecure: true,
    };
    
    let imapDefaults = {
      imapHost: "",
      imapPort: 993,
      imapSecure: true,
    };
    
    switch (emailProvider) {
      case "gmail":
      case "gsuite":
        smtpDefaults = {
          smtpHost: "smtp.gmail.com",
          smtpPort: 587,
          smtpSecure: true,
        };
        imapDefaults = {
          imapHost: "imap.gmail.com",
          imapPort: 993,
          imapSecure: true,
        };
        break;
      case "outlook":
      case "office365":
        smtpDefaults = {
          smtpHost: "smtp-mail.outlook.com",
          smtpPort: 587,
          smtpSecure: true,
        };
        imapDefaults = {
          imapHost: "outlook.office365.com",
          imapPort: 993,
          imapSecure: true,
        };
        break;
    }
    
    // Update form values
    form.setValue("smtpHost", smtpDefaults.smtpHost);
    form.setValue("smtpPort", smtpDefaults.smtpPort);
    form.setValue("smtpSecure", smtpDefaults.smtpSecure);
    form.setValue("imapHost", imapDefaults.imapHost);
    form.setValue("imapPort", imapDefaults.imapPort);
    form.setValue("imapSecure", imapDefaults.imapSecure);
  }
  
  // Add email account mutation
  const addEmailAccount = {
    isPending: false,
    mutate: async (values: z.infer<typeof formSchema>) => {
      try {
        // Transform the values to match the API expectations
        const transformedValues = {
          ...values,
          // If using app password, use it for both SMTP and IMAP
          smtpPassword: values.useAppPassword ? values.appPassword : values.smtpPassword,
          imapPassword: values.useAppPassword ? values.appPassword : values.imapPassword,
        };

        // Remove the app password field before submitting
        const { appPassword, useAppPassword, ...accountData } = transformedValues;
        
        const result = await apiRequest("/api/email-accounts", {
          method: "POST",
          body: JSON.stringify(accountData),
        });
        
        if (result.success) {
          // Invalidate queries
          queryClient.invalidateQueries({ queryKey: ["/api/email-accounts"] });
          
          // Close the dialog
          onOpenChange(false);
          
          // Reset the form
          form.reset();
        }
      } catch (error) {
        console.error("Failed to add email account:", error);
      }
    }
  };
  
  const onSubmit = (data: z.infer<typeof formSchema>) => {
    addEmailAccount.mutate(data);
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Email Account</DialogTitle>
          <DialogDescription>
            Add a new email account to use for outreach campaigns.
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <Tabs defaultValue="basic" value={activeTab} onValueChange={setActiveTab} className="mb-6">
              <TabsList className="grid grid-cols-3 w-full">
                <TabsTrigger value="basic">Basic Info</TabsTrigger>
                <TabsTrigger value="smtp">SMTP Config</TabsTrigger>
                <TabsTrigger value="imap">IMAP Config</TabsTrigger>
              </TabsList>
              
              {/* Basic Info Tab */}
              <TabsContent value="basic" className="space-y-4 pt-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Address</FormLabel>
                      <FormControl>
                        <Input placeholder="email@example.com" {...field} />
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
                      <FormLabel>Account Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Marketing Team Email" {...field} />
                      </FormControl>
                      <FormDescription>
                        A friendly name to identify this account
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
                        onValueChange={(value) => {
                          field.onChange(value);
                          // Skip to next tab when provider is selected
                          if (value) {
                            setTimeout(() => setActiveTab("smtp"), 100);
                          }
                        }} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a provider" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="gmail">Gmail</SelectItem>
                          <SelectItem value="outlook">Outlook</SelectItem>
                          <SelectItem value="gsuite">Google Workspace</SelectItem>
                          <SelectItem value="office365">Office 365</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
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
                      <FormLabel>Daily Send Limit</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="100" 
                          {...field}
                          value={field.value || ""}
                          onChange={(e) => {
                            const value = e.target.value === "" ? undefined : parseInt(e.target.value);
                            field.onChange(value);
                          }}
                        />
                      </FormControl>
                      <FormDescription>
                        Maximum emails to send per day (optional)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="warmupEnabled"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Enable Email Warmup</FormLabel>
                        <FormDescription>
                          Gradually increase sending volume to improve deliverability
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
                
                {/* Gmail App Password Section */}
                {(emailProvider === "gmail" || emailProvider === "gsuite") && (
                  <div className="space-y-4 rounded-md border p-4 mt-4 bg-blue-50">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-medium text-blue-800">Gmail App Password Setup</h3>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-6 w-6">
                              <HelpCircle className="h-4 w-4 text-blue-600" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-sm">
                            <p>Gmail accounts with 2FA enabled require an App Password instead of your regular password.</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    
                    <div className="bg-blue-100 text-blue-800 border border-blue-200 p-4 rounded-md">
                      <div className="flex items-start">
                        <AlertCircle className="h-4 w-4 mr-2 mt-1" />
                        <div>
                          <h4 className="font-medium">Gmail requires an App Password</h4>
                          <p className="text-sm mt-1">
                            If you have 2-Step Verification enabled on your Google account, you'll need to create an App Password 
                            to use instead of your regular password.
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <FormField
                      control={form.control}
                      name="useAppPassword"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 bg-white">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Use Gmail App Password</FormLabel>
                            <FormDescription>
                              My Gmail account has 2-Step Verification enabled and requires an App Password
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />
                    
                    {useAppPassword && (
                      <FormField
                        control={form.control}
                        name="appPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Gmail App Password</FormLabel>
                            <FormControl>
                              <Input 
                                type="password" 
                                placeholder="16-character App Password (no spaces)"
                                {...field} 
                              />
                            </FormControl>
                            <FormDescription>
                              Enter the 16-character App Password without spaces (e.g., abcdefghijklmnop)
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                    
                    <div className="text-sm text-blue-700 mt-2">
                      <p className="font-medium">How to get an App Password:</p>
                      <ol className="list-decimal pl-5 space-y-1 mt-1">
                        <li>Go to your Google Account settings &gt; Security</li>
                        <li>Under "Signing in to Google," select "App passwords"</li>
                        <li>Create a new app password for "Mail" and "Other"</li>
                        <li>Enter a name like "Email Outreach Platform"</li>
                        <li>Copy the 16-character password (remove any spaces)</li>
                      </ol>
                    </div>
                  </div>
                )}
                
                <div className="flex justify-end">
                  <Button 
                    type="button" 
                    onClick={() => setActiveTab("smtp")}
                    variant="secondary"
                  >
                    Next: SMTP Settings
                  </Button>
                </div>
              </TabsContent>
              
              {/* SMTP Configuration Tab */}
              <TabsContent value="smtp" className="space-y-4 pt-4">
                <div className="space-y-4 rounded-md border p-4">
                  <h3 className="text-sm font-medium">SMTP Configuration</h3>
                  
                  <FormField
                    control={form.control}
                    name="smtpHost"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>SMTP Host</FormLabel>
                        <FormControl>
                          <Input placeholder="smtp.gmail.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="smtpPort"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>SMTP Port</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              placeholder="587" 
                              {...field}
                              value={field.value || ""}
                              onChange={(e) => {
                                const value = e.target.value === "" ? undefined : parseInt(e.target.value);
                                field.onChange(value);
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="smtpSecure"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md p-2 mt-7">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Use SSL/TLS</FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="smtpUsername"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>SMTP Username</FormLabel>
                        <FormControl>
                          <Input placeholder="username@example.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {!useAppPassword && (
                    <FormField
                      control={form.control}
                      name="smtpPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>SMTP Password</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="••••••••" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>
                
                <div className="flex justify-between">
                  <Button 
                    type="button" 
                    onClick={() => setActiveTab("basic")}
                    variant="outline"
                  >
                    Back
                  </Button>
                  <Button 
                    type="button" 
                    onClick={() => setActiveTab("imap")}
                    variant="secondary"
                  >
                    Next: IMAP Settings
                  </Button>
                </div>
              </TabsContent>
              
              {/* IMAP Configuration Tab */}
              <TabsContent value="imap" className="space-y-4 pt-4">
                <div className="space-y-4 rounded-md border p-4">
                  <h3 className="text-sm font-medium">IMAP Configuration</h3>
                  <FormField
                    control={form.control}
                    name="imapHost"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>IMAP Host</FormLabel>
                        <FormControl>
                          <Input placeholder="imap.gmail.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="imapPort"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>IMAP Port</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              placeholder="993" 
                              {...field}
                              value={field.value || ""}
                              onChange={(e) => {
                                const value = e.target.value === "" ? undefined : parseInt(e.target.value);
                                field.onChange(value);
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="imapSecure"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md p-2 mt-7">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Use SSL/TLS</FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="imapUsername"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>IMAP Username</FormLabel>
                        <FormControl>
                          <Input placeholder="username@example.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {!useAppPassword && (
                    <FormField
                      control={form.control}
                      name="imapPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>IMAP Password</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="••••••••" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>
                
                <div className="flex justify-between">
                  <Button 
                    type="button" 
                    onClick={() => setActiveTab("smtp")}
                    variant="outline"
                  >
                    Back
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={addEmailAccount.isPending}
                  >
                    {addEmailAccount.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Add Account
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}