import { useState } from "react";
import { useEmailAccounts } from "@/hooks/use-email-accounts";
import { EmailAccountsList } from "@/components/email-accounts";
import { EmailTestDialog } from "@/components/email-accounts/email-test-dialog";
import { Button } from "@/components/ui/button";
import { Mail, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Page for managing all email accounts across the platform
export default function EmailAccountsPage() {
  const [testDialogOpen, setTestDialogOpen] = useState(false);
  const [isCleaningUp, setIsCleaningUp] = useState(false);
  const { toast } = useToast();
  const { cleanupTestEmailAccounts } = useEmailAccounts();
  
  // Function to clean up test emails and email accounts
  async function cleanupTestEmails() {
    try {
      setIsCleaningUp(true);
      
      // Clean up test email accounts first
      await cleanupTestEmailAccounts.mutateAsync();
      
      // Then clean up test emails
      const response = await fetch("/api/emails/cleanup-test", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json"
        }
      });
      
      const result = await response.json();
      
      if (response.ok) {
        toast({
          title: "Test emails cleaned up",
          description: result.message || `Removed ${result.deletedCount || 0} test emails`,
        });
      } else {
        throw new Error(result.message || "Failed to clean up test emails");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to clean up test emails",
        variant: "destructive",
      });
    } finally {
      setIsCleaningUp(false);
    }
  }
  
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Email Accounts</h1>
          <p className="text-muted-foreground mt-1">
            Manage your email accounts for sending outreach emails.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline"
            onClick={cleanupTestEmails}
            disabled={isCleaningUp}
            className="flex items-center gap-1"
          >
            <Trash2 className="h-4 w-4" />
            {isCleaningUp ? "Cleaning..." : "Remove Test Emails"}
          </Button>
          <Button 
            onClick={() => setTestDialogOpen(true)}
            className="flex items-center gap-2"
          >
            <Mail className="h-4 w-4" />
            Send Test Email
          </Button>
        </div>
      </div>
      
      <div className="grid gap-6">
        <EmailAccountsList />
      </div>
      
      <EmailTestDialog 
        open={testDialogOpen} 
        onOpenChange={setTestDialogOpen}
      />
    </div>
  );
}