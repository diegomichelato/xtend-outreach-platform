import { useState } from "react";
import { useEmailAccounts } from "@/hooks/use-email-accounts";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2 } from "lucide-react";
import { EmailAccount } from "@shared/schema";

interface EmailAccountLinkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  creatorId: number;
  creatorName: string;
}

export function EmailAccountLinkDialog({
  open,
  onOpenChange,
  creatorId,
  creatorName,
}: EmailAccountLinkDialogProps) {
  const [selectedEmailAccountId, setSelectedEmailAccountId] = useState<string>("");
  const [makePrimary, setMakePrimary] = useState(true);
  
  const { 
    emailAccounts, 
    isLoading: isLoadingAccounts, 
    linkEmailAccount,
    getCreatorEmailAccounts
  } = useEmailAccounts();
  
  const { data: creatorEmailAccounts } = getCreatorEmailAccounts(creatorId);
  
  // Filter out email accounts that are already linked to this creator
  const availableEmailAccounts = emailAccounts?.filter(account => 
    !creatorEmailAccounts?.some(creatorAccount => 
      creatorAccount.id === account.id
    )
  );
  
  const handleEmailChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedEmailAccountId(e.target.value);
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmailAccountId) return;
    
    const accountId = parseInt(selectedEmailAccountId);
    
    linkEmailAccount.mutate({
      creatorId,
      emailAccountIds: [accountId],
      isPrimary: makePrimary
    }, {
      onSuccess: () => {
        onOpenChange(false);
        setSelectedEmailAccountId("");
        setMakePrimary(true);
      }
    });
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Link Email Account</DialogTitle>
            <DialogDescription>
              Select an email account to link to {creatorName}.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            {isLoadingAccounts ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <span className="ml-2">Loading accounts...</span>
              </div>
            ) : !availableEmailAccounts || availableEmailAccounts.length === 0 ? (
              <div className="text-center text-sm text-muted-foreground py-2">
                <p>No available email accounts to link.</p>
                <p className="mt-1">All accounts are already linked to this creator or none exist.</p>
              </div>
            ) : (
              <>
                <div>
                  <Label htmlFor="email-account-select" className="text-base font-medium mb-1 block">
                    Select Email Account
                  </Label>
                  <p className="text-sm text-muted-foreground mb-3">
                    Choose an email account to associate with this creator.
                  </p>
                  
                  <select
                    id="email-account-select"
                    value={selectedEmailAccountId}
                    onChange={handleEmailChange}
                    className="w-full p-2 border border-gray-300 rounded"
                  >
                    <option value="">Select an email account...</option>
                    {availableEmailAccounts.map((account) => (
                      <option key={account.id} value={account.id.toString()}>
                        {account.email} ({account.provider})
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="flex items-center space-x-2 pt-2">
                  <Checkbox 
                    id="make-primary" 
                    checked={makePrimary}
                    onCheckedChange={(checked) => setMakePrimary(checked as boolean)}
                  />
                  <Label
                    htmlFor="make-primary"
                    className="text-sm font-normal leading-none peer-disabled:cursor-not-allowed"
                  >
                    Set as primary email account for this creator
                  </Label>
                </div>
              </>
            )}
          </div>
          
          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={
                !selectedEmailAccountId || 
                linkEmailAccount.isPending || 
                !availableEmailAccounts || 
                availableEmailAccounts.length === 0
              }
            >
              {linkEmailAccount.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Link Account
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}