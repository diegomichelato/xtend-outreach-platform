import { useState, useEffect } from "react";
import { useEmailAccounts } from "@/hooks/use-email-accounts";
import { EmailAccount } from "@shared/schema";
import { EmailAccountAddDialog } from "./email-account-add-dialog";
import { EmailAccountEditDialog } from "./email-account-edit-dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { 
  Loader2, 
  Plus, 
  AlertCircle, 
  RefreshCw, 
  MoreHorizontal, 
  Pencil, 
  Trash2,
  Info
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";

export function EmailAccountsList() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<EmailAccount | null>(null);
  const [displayAccounts, setDisplayAccounts] = useState<any[]>([]);
  const { toast } = useToast();
  
  const { 
    emailAccounts = [], 
    isLoading: isLoadingAccounts, 
    isError: isErrorAccounts,
    error,
    deleteEmailAccount,
    refetchAccounts
  } = useEmailAccounts();
  
  // Process accounts when they change
  useEffect(() => {
    if (emailAccounts && emailAccounts.length > 0) {
      // Make a normalized copy of the accounts with required fields
      const normalized = emailAccounts.map((account: any, index: number) => {
        return {
          ...account,
          // Ensure required fields for UI rendering
          id: account.id || `sl-${index}`,
          email: account.email || account.from_email || `unknown-${index}@example.com`,
          name: account.name || account.from_name || "Unknown",
          status: account.status || "inactive",
          provider: account.provider || "smtp",
          dailyLimit: account.dailyLimit || 100,
          warmupEnabled: account.warmupEnabled || false
        };
      });
      
      setDisplayAccounts(normalized);
      console.log("Normalized email accounts for display:", normalized.length);
    } else {
      setDisplayAccounts([]);
    }
  }, [emailAccounts]);
  
  return (
    <>
      <Tabs defaultValue="table" className="w-full">
        <div className="flex justify-between items-center mb-4">
          <TabsList>
            <TabsTrigger value="table">Table View</TabsTrigger>
          </TabsList>
          
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                // Refetch accounts
                refetchAccounts();
              }}
              disabled={isLoadingAccounts}
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              Refresh
            </Button>
            <Button 
              size="sm" 
              onClick={() => setIsAddDialogOpen(true)}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Account
            </Button>
          </div>
        </div>
        
        <TabsContent value="table" className="mt-0">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Email Accounts</CardTitle>
              <CardDescription>
                Manage connected email accounts for your creators
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingAccounts ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : isErrorAccounts ? (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Failed to load email accounts. Please try again.
                  </AlertDescription>
                </Alert>
              ) : !displayAccounts || displayAccounts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No email accounts connected yet.</p>
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => setIsAddDialogOpen(true)}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Email Account
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Provider</TableHead>
                      <TableHead>Daily Limit</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {displayAccounts.map((account, index) => (
                      <TableRow key={account.id || account.email || index}>
                        <TableCell className="font-medium">
                          {account.email}
                        </TableCell>
                        <TableCell>
                          {account.name || account.from_name || "Unnamed"}
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={account.status === "active" ? "success" : "secondary"}
                          >
                            {account.status || "inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell>{account.provider || "smtp"}</TableCell>
                        <TableCell>{account.dailyLimit || "100"}</TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                                <span className="sr-only">Open menu</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuItem 
                                onClick={() => {
                                  setSelectedAccount(account as EmailAccount);
                                  setIsEditDialogOpen(true);
                                }}
                              >
                                <Info className="h-4 w-4 mr-2" />
                                View Details
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
            <CardFooter className="text-sm text-muted-foreground">
              These email accounts can be assigned to creators for sending emails.
            </CardFooter>
          </Card>
        </TabsContent>
        

      </Tabs>
      
      {/* Email account add dialog */}
      <EmailAccountAddDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
      />
      
      {/* Email account edit dialog */}
      <EmailAccountEditDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        emailAccount={selectedAccount}
      />
    </>
  );
}