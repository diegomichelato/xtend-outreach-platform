import { useState } from "react";
import { useEmailAccounts } from "@/hooks/use-email-accounts";
import { EmailAccountLinkDialog } from "./email-account-link-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, RefreshCw, Star, StarOff, Trash } from "lucide-react";
import { EmailAccount } from "@shared/schema";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface CreatorEmailAccountProps {
  creatorId: number;
  creatorName: string;
}

export function CreatorEmailAccount({ creatorId, creatorName }: CreatorEmailAccountProps) {
  const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false);
  const [emailAccountToUnlink, setEmailAccountToUnlink] = useState<EmailAccount | null>(null);
  
  const { 
    getCreatorEmailAccounts,
    unlinkEmailAccount,
    setPrimaryEmailAccount
  } = useEmailAccounts();
  
  const { 
    data: creatorEmailAccounts, 
    isLoading, 
    isError,
    refetch: refetchCreatorEmailAccounts 
  } = getCreatorEmailAccounts(creatorId);
  
  const handleSetPrimary = (emailAccountId: number) => {
    setPrimaryEmailAccount.mutate(
      { creatorId, emailAccountId },
      { onSuccess: () => refetchCreatorEmailAccounts() }
    );
  };
  
  const handleUnlink = () => {
    if (!emailAccountToUnlink) return;
    
    unlinkEmailAccount.mutate(
      { creatorId, emailAccountId: emailAccountToUnlink.id },
      { 
        onSuccess: () => {
          refetchCreatorEmailAccounts();
          setEmailAccountToUnlink(null);
        }
      }
    );
  };
  
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex justify-between items-center">
            <span>Email Accounts</span>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetchCreatorEmailAccounts()}
                disabled={isLoading}
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                Refresh
              </Button>
              <Button 
                size="sm" 
                onClick={() => setIsLinkDialogOpen(true)}
              >
                <Plus className="h-4 w-4 mr-1" />
                Link Account
              </Button>
            </div>
          </CardTitle>
          <CardDescription>
            Email accounts associated with {creatorName} for sending outreach emails.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : isError ? (
            <div className="text-center py-4 text-destructive">
              Error loading email accounts
            </div>
          ) : !creatorEmailAccounts || creatorEmailAccounts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No email accounts linked to this creator yet.</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => setIsLinkDialogOpen(true)}
              >
                <Plus className="h-4 w-4 mr-1" />
                Link Email Account
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[180px]">Email</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Primary</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {creatorEmailAccounts.map((account) => (
                  <TableRow key={account.id}>
                    <TableCell className="font-medium">
                      {account.email}
                    </TableCell>
                    <TableCell>{account.provider}</TableCell>
                    <TableCell>
                      <Badge 
                        variant={account.status === "active" ? "success" : "secondary"}
                      >
                        {account.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {account.isPrimary ? (
                        <Badge variant="default" className="bg-amber-500 hover:bg-amber-600">
                          <Star className="h-3 w-3 mr-1" />
                          Primary
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="hover:bg-transparent">
                          <StarOff className="h-3 w-3 mr-1" />
                          Secondary
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      {!account.isPrimary && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleSetPrimary(account.id)}
                          disabled={setPrimaryEmailAccount.isPending}
                        >
                          {setPrimaryEmailAccount.isPending && (
                            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                          )}
                          <Star className="h-3 w-3 mr-1" />
                          Set Primary
                        </Button>
                      )}
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => setEmailAccountToUnlink(account)}
                          >
                            <Trash className="h-3 w-3 mr-1" />
                            Unlink
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              Unlink Email Account
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to unlink this email account from {creatorName}?
                              {account.isPrimary && (
                                <span className="block mt-2 font-semibold text-destructive">
                                  Warning: This is the primary email account for this creator.
                                </span>
                              )}
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={handleUnlink}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              {unlinkEmailAccount.isPending && (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              )}
                              Unlink
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
        <CardFooter className="text-sm text-muted-foreground">
          Email accounts with "Primary" status will be used by default for campaigns.
        </CardFooter>
      </Card>
      
      <EmailAccountLinkDialog
        open={isLinkDialogOpen}
        onOpenChange={setIsLinkDialogOpen}
        creatorId={creatorId}
        creatorName={creatorName}
      />
    </>
  );
}