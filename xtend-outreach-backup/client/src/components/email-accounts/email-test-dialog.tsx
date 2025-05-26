import React from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEmailAccounts } from "@/hooks/use-email-accounts";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Define the form schema
const testEmailSchema = z.object({
  emailAccountId: z.string({ required_error: "Please select an email account" }),
  to: z.string({ required_error: "Recipient email is required" })
    .email("Please enter a valid email address"),
  subject: z.string({ required_error: "Subject is required" })
    .min(1, "Subject is required"),
  body: z.string({ required_error: "Email body is required" })
    .min(1, "Email body is required"),
});

type TestEmailFormValues = z.infer<typeof testEmailSchema>;

interface EmailTestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EmailTestDialog({ open, onOpenChange }: EmailTestDialogProps) {
  const { toast } = useToast();
  const { emailAccounts } = useEmailAccounts();
  const [isSending, setIsSending] = React.useState(false);
  
  // Set up the form
  const form = useForm<TestEmailFormValues>({
    resolver: zodResolver(testEmailSchema),
    defaultValues: {
      emailAccountId: "",
      to: "",
      subject: "Test Email",
      body: "This is a test email sent from Xtend Creators platform.",
    },
  });
  
  async function onSubmit(data: TestEmailFormValues) {
    try {
      setIsSending(true);
      
      console.log("Sending test email with data:", {
        emailAccountId: data.emailAccountId,
        to: data.to,
        subject: data.subject,
      });
      
      // Validate the form data before sending
      if (!data.emailAccountId) {
        throw new Error("Please select an email account");
      }
      
      if (!data.to) {
        throw new Error("Recipient email is required");
      }
      
      // Send the email using the API
      const response = await fetch("/api/emails/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          emailAccountId: data.emailAccountId,
          to: data.to,
          subject: data.subject,
          text: data.body, // Plain text version
          html: `<p>${data.body.replace(/\n/g, "<br />")}</p>`, // HTML version with line breaks
        }),
      });
      
      // Process the response
      if (response.ok) {
        const result = await response.json();
        
        // Show success message with any extra info from the server
        toast({
          title: "Email sent successfully!",
          description: `Message ID: ${result.messageId || "N/A"}${result.useTestTransport ? " (Test mode - no actual email sent)" : ""}`,
        });
        
        onOpenChange(false);
        form.reset();
      } else {
        // Parse error from response
        const errorData = await response.json();
        throw new Error(errorData.message || errorData.error || "Failed to send email");
      }
    } catch (error) {
      console.error("Error sending test email:", error);
      
      // Show error notification to the user
      toast({
        title: "Failed to send email",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  }
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Send Test Email</DialogTitle>
          <DialogDescription>
            Use this form to send a test email from one of your configured email accounts.
            <div className="mt-2 p-2 border border-yellow-200 bg-yellow-50 rounded-md text-yellow-700 text-sm">
              <strong>Development Mode:</strong> In development mode, emails are simulated and not actually sent to recipients. In production mode, real emails will be sent if SMTP settings are properly configured for your email accounts.
            </div>
            <div className="mt-2 p-2 border border-green-200 bg-green-50 rounded-md text-green-700 text-sm">
              <strong>Special Accounts For Real Sending:</strong> The system will always use real email sending (not simulation) for <code className="bg-gray-100 px-1 py-0.5 rounded">shayirimi@stemmgt.com</code> and <code className="bg-gray-100 px-1 py-0.5 rounded">ana@stemgroup.io</code> accounts regardless of development mode. Select one of these accounts to send real emails.
            </div>
            <div className="mt-2 p-2 border border-blue-200 bg-blue-50 rounded-md text-blue-700 text-sm">
              <strong>Timeout Issues:</strong> If you experience timeout errors when sending emails, it may be due to network restrictions. Try using the special accounts mentioned above with their environment variable passwords.
            </div>
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="emailAccountId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>From Email Account</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={isSending}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select an email account" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {emailAccounts?.map((account) => (
                        <SelectItem key={account.id} value={account.id.toString()}>
                          {account.name} ({account.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="to"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>To</FormLabel>
                  <FormControl>
                    <Input placeholder="recipient@example.com" {...field} disabled={isSending} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="subject"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Subject</FormLabel>
                  <FormControl>
                    <Input placeholder="Email subject" {...field} disabled={isSending} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="body"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Message</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter your email message here"
                      className="min-h-[100px]"
                      {...field}
                      disabled={isSending}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => onOpenChange(false)} disabled={isSending}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSending}>
                {isSending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isSending ? "Sending..." : "Send Email"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}