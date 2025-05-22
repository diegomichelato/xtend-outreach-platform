import { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from 'date-fns';
import { Copy, Globe, FileDown, ExternalLink } from "lucide-react";
import { Proposal } from '@shared/schema';
import { useToast } from '@/hooks/use-toast';

interface PublishDialogProps {
  proposal: Proposal | null;
  isOpen: boolean;
  onClose: () => void;
  onPublish: (proposalId: number, publishSettings: any) => void;
  publishedLandingPage: any | null;
}

export function PublishDialog({ 
  proposal, 
  isOpen, 
  onClose, 
  onPublish, 
  publishedLandingPage 
}: PublishDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [autoOpenUrl, setAutoOpenUrl] = useState(true);
  const [publishSettings, setPublishSettings] = useState({
    pageName: '',
    expirationDays: 30, // Always use 30 days as the standard expiration
    isPasswordProtected: false,
    password: '',
    brandPrimaryColor: '#3B82F6',
    brandSecondaryColor: '#1E3A8A',
    brandFooterText: 'This proposal is confidential and intended for the recipient only.'
  });

  // Initialize publish settings when the dialog opens or proposal changes
  useEffect(() => {
    if (proposal) {
      setPublishSettings({
        ...publishSettings,
        pageName: proposal.contactCompany 
          ? `${proposal.contactCompany} - ${format(new Date(), 'MM/dd/yyyy')}`
          : `Partnership Details - ${format(new Date(), 'MM/dd/yyyy')}`,
      });
    }
  }, [proposal]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!proposal) return;
    
    setIsSubmitting(true);
    
    try {
      await onPublish(proposal.id, publishSettings);
      toast({
        title: 'Publishing proposal',
        description: 'Your proposal is being published as a landing page...'
      });
    } catch (error) {
      console.error('Error publishing proposal:', error);
      toast({
        title: 'Publishing failed',
        description: 'There was an error publishing your proposal.',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get the direct share URL for the landing page
  const getDirectShareUrl = () => {
    return publishedLandingPage?.fullUrl || 
           publishedLandingPage?.url || 
           (publishedLandingPage?.unique_id ? 
            `${window.location.protocol}//${window.location.host}/shared/${publishedLandingPage.unique_id}` : 
            null);
  };
  
  // Auto-open the URL when the landing page becomes available
  useEffect(() => {
    if (publishedLandingPage && autoOpenUrl) {
      const url = getDirectShareUrl();
      if (url) {
        // Open the URL in a new tab automatically
        window.open(url, '_blank');
      }
    }
  }, [publishedLandingPage, autoOpenUrl]);
  
  // Handle copying link to clipboard
  const handleCopyLink = async () => {
    const url = getDirectShareUrl();
    
    if (!url) {
      toast({
        title: "URL not available",
        description: "The landing page URL is not available.",
        variant: "destructive"
      });
      return;
    }

    try {
      await navigator.clipboard.writeText(url);
      toast({
        title: "Link copied",
        description: "The landing page URL has been copied to clipboard."
      });
    } catch (error) {
      toast({
        title: "Copy failed",
        description: "Could not copy the link to clipboard.",
        variant: "destructive"
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      {!publishedLandingPage ? (
        <DialogContent className="sm:max-w-[500px]">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>Publish as Landing Page</DialogTitle>
              <DialogDescription>
                Create a shareable landing page for this proposal that clients can view in a browser.
              </DialogDescription>
            </DialogHeader>
            
            <div className="py-4">
              <div className="grid grid-cols-4 items-center gap-4 mb-2">
                <Label htmlFor="pageName" className="text-right">
                  Page name
                </Label>
                <Input
                  id="pageName"
                  value={publishSettings.pageName}
                  onChange={(e) => setPublishSettings({...publishSettings, pageName: e.target.value})}
                  className="col-span-3"
                  placeholder={`${proposal?.contactCompany || 'Company'} - ${new Date().toLocaleDateString()}`}
                  required
                />
              </div>
              
              {/* All other fields removed for simplicity */}
              <p className="text-sm text-muted-foreground mt-4 ml-1">
                The page will be published with standard settings and available for 30 days.
              </p>
            </div>
            
            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={onClose}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Publishing...' : 'Publish'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      ) : (
        <DialogContent className="sm:max-w-[520px]">
          <DialogTitle className="text-xl font-semibold">Partnership Details Published!</DialogTitle>
          <DialogDescription className="text-sm mt-1">
            Your partnership details are now available as a shareable landing page.
          </DialogDescription>
          
          <div className="py-4 space-y-4">
            <div>
              <div className="flex items-center mb-1">
                <Globe className="h-4 w-4 mr-2 text-blue-500" />
                <span className="text-sm font-medium">Landing Page URL</span>
              </div>
              <div className="flex items-center">
                <Input 
                  readOnly 
                  value={getDirectShareUrl() || ''} 
                  className="flex-1 font-mono text-sm"
                />
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={handleCopyLink}
                  className="ml-1 h-9 w-9"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            <div className="text-sm text-muted-foreground">
              <span>Expiration: </span> Expires in 30 days
            </div>
          </div>
          
          <div className="flex justify-between gap-4 pt-2">
            <Button 
              variant="outline" 
              onClick={() => {
                const url = getDirectShareUrl();
                if (url) window.open(url, '_blank');
              }}
              className="flex-1"
            >
              View Page
            </Button>
            
            <Button 
              variant="outline" 
              onClick={() => {
                // Get the direct URL
                const url = getDirectShareUrl();
                
                // Open the URL in a new tab
                if (url) window.open(url, '_blank');
                
                // Show a toast explaining how to save as PDF
                toast({
                  title: "Download PDF",
                  description: "Use your browser's print function (Ctrl+P or Cmd+P) to save as PDF.",
                });
              }}
              className="flex-1"
            >
              Download PDF
            </Button>
          </div>
          
          <Button 
            onClick={onClose}
            variant="ghost" 
            size="sm" 
            className="absolute right-4 top-4 px-2 h-6 text-gray-500 hover:text-gray-700"
          >
            <span className="text-lg font-light">×</span>
          </Button>
        </DialogContent>
      )}
    </Dialog>
  );
}