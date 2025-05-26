import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Copy, CopyCheck, Mail } from "lucide-react";
import { useState } from "react";

interface EmailPreviewModalProps {
  email: any | null;
  isOpen: boolean;
  onClose: () => void;
  recipientName?: string;
  recipientEmail?: string;
  senderName?: string;
  sequenceNumber?: number;
  totalSequences?: number;
  interval?: number;
  allEmails?: any[];
  currentIndex?: number;
  onChangeIndex?: (index: number) => void;
}

export function EmailPreviewModal({ 
  email, 
  isOpen, 
  onClose, 
  recipientName = "Sample Recipient",
  recipientEmail = "recipient@example.com",
  senderName = "Campaign Sender",
  sequenceNumber,
  totalSequences,
  interval,
  allEmails = [],
  currentIndex = 0,
  onChangeIndex
}: EmailPreviewModalProps) {
  const [copied, setCopied] = useState<string | null>(null);
  
  if (!email) return null;
  
  // Generate a clean sender email based on the sender name
  const senderEmail = `${senderName.toLowerCase().replace(/\s/g, '')}@xtendcreators.com`;
  
  const handleCopy = (type: string, content: string) => {
    navigator.clipboard.writeText(content).then(() => {
      setCopied(type);
      setTimeout(() => setCopied(null), 2000);
    });
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-slate-900 flex items-center justify-between">
            <div className="flex items-center">
              <Mail className="mr-2 h-5 w-5 text-primary" />
              Email Preview {allEmails.length > 1 && `(${currentIndex + 1}/${allEmails.length})`}
            </div>
            {allEmails.length > 1 && (
              <div className="flex items-center space-x-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => onChangeIndex?.(Math.max(0, currentIndex - 1))}
                  disabled={currentIndex === 0}
                >
                  Previous
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => onChangeIndex?.(Math.min(allEmails.length - 1, currentIndex + 1))}
                  disabled={currentIndex === allEmails.length - 1}
                >
                  Next
                </Button>
              </div>
            )}
          </DialogTitle>
        </DialogHeader>
        
        <div className="border rounded-lg overflow-hidden mt-4 shadow-sm">
          {/* Email Header */}
          <div className="bg-slate-50 px-5 py-4 border-b">
            <div className="mb-2.5 flex items-center justify-between">
              <div className="flex items-start">
                <span className="text-xs uppercase tracking-wide font-medium text-slate-500 w-16">From:</span>
                <span className="text-sm font-medium text-slate-900">{senderName} &lt;{senderEmail}&gt;</span>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-7 w-7 p-0" 
                onClick={() => handleCopy('from', `${senderName} <${senderEmail}>`)}
              >
                {copied === 'from' ? <CopyCheck className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5 text-slate-400" />}
              </Button>
            </div>
            <div className="mb-2.5 flex items-center justify-between">
              <div className="flex items-start">
                <span className="text-xs uppercase tracking-wide font-medium text-slate-500 w-16">To:</span>
                <span className="text-sm font-medium text-slate-900">{recipientName} &lt;{recipientEmail}&gt;</span>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-7 w-7 p-0" 
                onClick={() => handleCopy('to', `${recipientName} <${recipientEmail}>`)}
              >
                {copied === 'to' ? <CopyCheck className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5 text-slate-400" />}
              </Button>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-start">
                <span className="text-xs uppercase tracking-wide font-medium text-slate-500 w-16">Subject:</span>
                <span className="text-sm font-medium text-slate-900">{email.subject}</span>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-7 w-7 p-0" 
                onClick={() => handleCopy('subject', email.subject)}
              >
                {copied === 'subject' ? <CopyCheck className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5 text-slate-400" />}
              </Button>
            </div>
          </div>
          
          {/* Email Body */}
          <div className="p-6 bg-white max-h-[60vh] overflow-y-auto">
            <div className="text-sm text-slate-700 leading-relaxed">
              {email.body ? (
                email.body.split('\n').map((line: string, i: number) => (
                  <p key={i} className={i > 0 ? "mt-4" : ""}>{line}</p>
                ))
              ) : (
                <p>Email content not available.</p>
              )}
              
              {/* Email Footer */}
              <div className="mt-6 pt-4 border-t border-slate-200">
                <p className="text-xs text-slate-400">
                  To unsubscribe from these emails, <a href="#" className="text-primary hover:text-primary/80">click here</a>
                </p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="mt-5 flex justify-between gap-3">
          <Button
            variant="outline"
            className="text-sm"
            onClick={() => handleCopy('all', `From: ${senderName} <${senderEmail}>\nTo: ${recipientName} <${recipientEmail}>\nSubject: ${email.subject || 'No subject'}\n\n${email.body || 'No content'}`)}
          >
            {copied === 'all' ? (
              <>
                <CopyCheck className="mr-2 h-4 w-4 text-green-500" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="mr-2 h-4 w-4" />
                Copy Full Email
              </>
            )}
          </Button>
          
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            <Button
              variant="default"
              onClick={() => {
                // This would typically open an email editor
                // For now, just copy the email to clipboard and show a notification
                handleCopy('all', `From: ${senderName} <${senderEmail}>\nTo: ${recipientName} <${recipientEmail}>\nSubject: ${email.subject || 'No subject'}\n\n${email.body || 'No content'}`);
              }}
            >
              Use This Template
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
