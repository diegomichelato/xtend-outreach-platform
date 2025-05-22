import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { EmailAccount, InsertEmailAccount, CreatorEmailAccount } from '@shared/schema';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

export function useEmailAccounts() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all email accounts
  const {
    data: emailAccounts = [],
    isLoading,
    isError,
    error,
  } = useQuery<EmailAccount[]>({
    queryKey: ['/api/email-accounts'],
  });

  // Get email accounts for a creator
  const getCreatorEmailAccounts = (creatorId: number) => {
    return useQuery<EmailAccount[]>({
      queryKey: [`/api/creators/${creatorId}/email-accounts`],
      enabled: !!creatorId,
    });
  };

  // Link email account to a creator
  const linkEmailAccount = useMutation<
    CreatorEmailAccount,
    Error,
    { 
      creatorId: number; 
      emailAccountIds: number[];
      isPrimary?: boolean;
    }
  >({
    mutationFn: async ({ creatorId, emailAccountIds, isPrimary = false }) => {
      return await apiRequest(
        'POST',
        `/api/creators/${creatorId}/email-accounts`, 
        { 
          emailAccountIds, 
          isPrimary 
        }
      );
    },
    onSuccess: (data, { creatorId }) => {
      queryClient.invalidateQueries({ 
        queryKey: [`/api/creators/${creatorId}/email-accounts`] 
      });
      
      toast({
        title: 'Email Accounts Linked',
        description: 'Email accounts have been linked to the creator',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to link email accounts',
        variant: 'destructive',
      });
    },
  });

  // Unlink email account from a creator
  const unlinkEmailAccount = useMutation<
    boolean,
    Error,
    { creatorId: number; emailAccountId: number }
  >({
    mutationFn: async ({ creatorId, emailAccountId }) => {
      return await apiRequest(
        'DELETE',
        `/api/creators/${creatorId}/email-accounts/${emailAccountId}`
      );
    },
    onSuccess: (_, { creatorId }) => {
      queryClient.invalidateQueries({ 
        queryKey: [`/api/creators/${creatorId}/email-accounts`] 
      });
      
      toast({
        title: 'Email Account Unlinked',
        description: 'Email account has been unlinked from the creator',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to unlink email account',
        variant: 'destructive',
      });
    },
  });

  // Set primary email account for a creator
  const setPrimaryEmailAccount = useMutation<
    boolean,
    Error,
    { creatorId: number; emailAccountId: number }
  >({
    mutationFn: async ({ creatorId, emailAccountId }) => {
      return await apiRequest(
        'POST',
        `/api/creators/${creatorId}/email-accounts/${emailAccountId}/set-primary`
      );
    },
    onSuccess: (_, { creatorId }) => {
      queryClient.invalidateQueries({ 
        queryKey: [`/api/creators/${creatorId}/email-accounts`] 
      });
      
      toast({
        title: 'Primary Email Set',
        description: 'Primary email account has been updated',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to set primary email account',
        variant: 'destructive',
      });
    },
  });

  // Add a new email account
  const addEmailAccount = useMutation<
    EmailAccount,
    Error,
    InsertEmailAccount
  >({
    mutationFn: async (emailAccount) => {
      return await apiRequest(
        'POST',
        '/api/email-accounts',
        emailAccount
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/email-accounts'] });
      
      toast({
        title: 'Email Account Added',
        description: 'New email account has been added',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to add email account',
        variant: 'destructive',
      });
    },
  });

  // Update an email account
  const updateEmailAccount = useMutation<
    EmailAccount,
    Error,
    Partial<EmailAccount>
  >({
    mutationFn: async (data) => {
      if (!data.id) {
        throw new Error("Email account ID is required for update");
      }
      
      // Make a copy of the data to avoid modifying the original
      const updateData = { ...data };
      const id = updateData.id;
      
      // Remove id from the update data since it's in the URL
      delete updateData.id;
      
      const url = `/api/email-accounts/${id}`;
      console.log("Making update API request to:", url, updateData);
      
      try {
        const response = await fetch(url, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updateData),
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Update failed: ${response.status} ${response.statusText} - ${errorText}`);
        }
        
        return await response.json();
      } catch (error) {
        console.error("Update API request failed:", error);
        throw error;
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/email-accounts'] });
      queryClient.invalidateQueries({ 
        queryKey: ['/api/email-accounts', data.id.toString()] 
      });
      
      toast({
        title: 'Email Account Updated',
        description: 'Email account has been updated successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update email account',
        variant: 'destructive',
      });
    },
  });

  // Delete an email account
  const deleteEmailAccount = useMutation<
    boolean,
    Error,
    number
  >({
    mutationFn: async (id) => {
      const url = `/api/email-accounts/${id}`;
      console.log("Making delete API request to:", url);
      
      try {
        const response = await fetch(url, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          }
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Delete failed: ${response.status} ${response.statusText} - ${errorText}`);
        }
        
        return await response.json();
      } catch (error) {
        console.error("Delete API request failed:", error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/email-accounts'] });
      
      toast({
        title: 'Email Account Deleted',
        description: 'Email account has been deleted',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to delete email account',
        variant: 'destructive',
      });
    },
  });

  // Cleanup test email accounts
  const cleanupTestEmailAccounts = useMutation<
    { message: string; count: number },
    Error,
    void
  >({
    mutationFn: async () => {
      const url = '/api/email-accounts/cleanup-test';
      console.log("Making cleanup API request to:", url);
      
      try {
        const response = await fetch(url, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          }
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Cleanup failed: ${response.status} ${response.statusText} - ${errorText}`);
        }
        
        return await response.json();
      } catch (error) {
        console.error("Cleanup API request failed:", error);
        throw error;
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/email-accounts'] });
      
      toast({
        title: 'Test Accounts Cleaned Up',
        description: data.message || `Removed ${data.count} test email accounts`,
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to clean up test email accounts',
        variant: 'destructive',
      });
    },
  });

  // Validate email account configuration
  const validateEmailAccount = useMutation<
    { valid: boolean; issues: string[]; canConnect: boolean; details?: any },
    Error,
    Partial<EmailAccount>
  >({
    mutationFn: async (emailAccountData) => {
      // Create a URL with the correct API path
      const url = '/api/email-accounts/validate';
      console.log("Making validation API request to:", url);
      
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(emailAccountData),
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Validation failed: ${response.status} ${response.statusText} - ${errorText}`);
        }
        
        return await response.json();
      } catch (error) {
        console.error("Validation API request failed:", error);
        throw error;
      }
    },
    onError: (error) => {
      toast({
        title: 'Validation Error',
        description: error.message || 'Failed to validate email account',
        variant: 'destructive',
      });
    },
  });

  // Send a test email
  const sendTestEmail = useMutation<
    { success: boolean; messageId?: string; error?: string; testMode?: boolean },
    Error,
    { accountId: number | string; recipient: string }
  >({
    mutationFn: async ({ accountId, recipient }) => {
      const url = `/api/email-accounts/${accountId}/test`;
      console.log("Making test email API request to:", url);
      
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ recipient }),
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Test email failed: ${response.status} ${response.statusText} - ${errorText}`);
        }
        
        return await response.json();
      } catch (error) {
        console.error("Test email API request failed:", error);
        throw error;
      }
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({
          title: 'Test Email Sent',
          description: data.testMode 
            ? 'Test email simulated successfully (in test mode, no actual email sent)' 
            : 'Test email sent successfully! Check your inbox.',
        });
      } else {
        toast({
          title: 'Email Not Sent',
          description: data.error || 'Failed to send test email',
          variant: 'destructive',
        });
      }
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to send test email',
        variant: 'destructive',
      });
    },
  });

  return {
    emailAccounts,
    isLoading,
    isError,
    error,
    // Added refetch function for email accounts
    refetchAccounts: () => queryClient.invalidateQueries({ queryKey: ['/api/email-accounts'] }),
    // Email account management
    getCreatorEmailAccounts,
    linkEmailAccount,
    unlinkEmailAccount,
    setPrimaryEmailAccount,
    addEmailAccount,
    updateEmailAccount,
    deleteEmailAccount,
    cleanupTestEmailAccounts,
    // New validation and testing functions
    validateEmailAccount,
    sendTestEmail,
  };
}