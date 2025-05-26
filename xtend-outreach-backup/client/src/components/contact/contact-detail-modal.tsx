import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Contact } from "@shared/schema";
import { EditContactModal } from "./edit-contact-modal";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, ExternalLink, Loader2, Mail, Phone, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ContactDetailModalProps {
  contact: Contact;
  trigger?: React.ReactNode;
}

export function ContactDetailModal({ contact, trigger }: ContactDetailModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();

  const handleDeleteContact = async () => {
    setIsDeleting(true);
    try {
      await apiRequest("DELETE", `/api/contacts/${contact.id}`);
      queryClient.invalidateQueries({ queryKey: ['/api/contacts'] });
      toast({
        title: "Contact deleted",
        description: `${contact.firstName} ${contact.lastName} was deleted successfully.`,
      });
      setIsDeleteDialogOpen(false);
      setIsOpen(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete contact. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const formatDate = (date: string | Date | null | undefined) => {
    if (!date) return "Never";
    try {
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      return dateObj.toLocaleDateString() + " " + dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return "Invalid date";
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          {trigger || (
            <Button 
              variant="ghost" 
              className="h-8 text-primary-DEFAULT hover:text-primary-DEFAULT/80 hover:bg-primary-DEFAULT/10 p-0"
            >
              View
            </Button>
          )}
        </DialogTrigger>
        <DialogContent className="sm:max-w-[650px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center justify-between">
              <span>
                {contact.firstName} {contact.lastName}
              </span>
              <div className="flex gap-2">
                <EditContactModal contact={contact} />
                <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => setIsDeleteDialogOpen(true)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </DialogTitle>
            <DialogDescription>
              <span className="text-primary-DEFAULT font-medium">{contact.role || "No role specified"}</span>
              {contact.role && " at "}
              <span className="font-medium">{contact.company}</span>
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 mt-4">
            <div className="space-y-1">
              <h3 className="text-sm font-medium text-gray-500">Type</h3>
              <p>{contact.type || "—"}</p>
            </div>
            
            <div className="space-y-1">
              <h3 className="text-sm font-medium text-gray-500">Industry</h3>
              <p>{contact.industry || "—"}</p>
            </div>
            
            <div className="space-y-1">
              <h3 className="text-sm font-medium text-gray-500">Email</h3>
              <p className="flex items-center">
                <Mail className="h-4 w-4 mr-2 text-primary-DEFAULT" />
                <a href={`mailto:${contact.email}`} className="text-primary-DEFAULT hover:underline">
                  {contact.email}
                </a>
              </p>
            </div>
            
            {contact.businessEmail && (
              <div className="space-y-1">
                <h3 className="text-sm font-medium text-gray-500">Business Email</h3>
                <p className="flex items-center">
                  <Mail className="h-4 w-4 mr-2 text-primary-DEFAULT" />
                  <a href={`mailto:${contact.businessEmail}`} className="text-primary-DEFAULT hover:underline">
                    {contact.businessEmail}
                  </a>
                </p>
              </div>
            )}
            
            {contact.phone && (
              <div className="space-y-1">
                <h3 className="text-sm font-medium text-gray-500">Phone</h3>
                <p className="flex items-center">
                  <Phone className="h-4 w-4 mr-2 text-primary-DEFAULT" />
                  <a href={`tel:${contact.phone}`} className="text-primary-DEFAULT hover:underline">
                    {contact.phone}
                  </a>
                </p>
              </div>
            )}
            
            {contact.linkedin && (
              <div className="space-y-1">
                <h3 className="text-sm font-medium text-gray-500">LinkedIn</h3>
                <p className="flex items-center">
                  <ExternalLink className="h-4 w-4 mr-2 text-primary-DEFAULT" />
                  <a 
                    href={contact.linkedin.startsWith('http') ? contact.linkedin : `https://${contact.linkedin}`}
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary-DEFAULT hover:underline"
                  >
                    Profile
                  </a>
                </p>
              </div>
            )}
            
            {contact.businessLinkedin && (
              <div className="space-y-1">
                <h3 className="text-sm font-medium text-gray-500">Business LinkedIn</h3>
                <p className="flex items-center">
                  <ExternalLink className="h-4 w-4 mr-2 text-primary-DEFAULT" />
                  <a 
                    href={contact.businessLinkedin.startsWith('http') ? contact.businessLinkedin : `https://${contact.businessLinkedin}`}
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary-DEFAULT hover:underline"
                  >
                    Company Profile
                  </a>
                </p>
              </div>
            )}
            
            {contact.website && (
              <div className="space-y-1">
                <h3 className="text-sm font-medium text-gray-500">Website</h3>
                <p className="flex items-center">
                  <ExternalLink className="h-4 w-4 mr-2 text-primary-DEFAULT" />
                  <a 
                    href={contact.website.startsWith('http') ? contact.website : `https://${contact.website}`}
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary-DEFAULT hover:underline"
                  >
                    {contact.website.replace(/^https?:\/\//, '')}
                  </a>
                </p>
              </div>
            )}
            
            {contact.country && (
              <div className="space-y-1">
                <h3 className="text-sm font-medium text-gray-500">Country</h3>
                <p>{contact.country}</p>
              </div>
            )}
            
            {contact.tags && contact.tags.length > 0 && (
              <div className="space-y-1 col-span-2">
                <h3 className="text-sm font-medium text-gray-500">Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {contact.tags.map((tag, index) => (
                    <span 
                      key={index}
                      className="text-xs bg-primary-DEFAULT/10 text-primary-DEFAULT px-2 py-1 rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          {contact.notes && (
            <div className="mt-6 space-y-1">
              <h3 className="text-sm font-medium text-gray-500">Notes</h3>
              <p className="text-sm whitespace-pre-wrap p-3 bg-gray-50 rounded-md border">
                {contact.notes}
              </p>
            </div>
          )}
          
          <div className="mt-6 space-y-1 text-xs text-gray-500">
            <p>Created: {formatDate(contact.createdAt)}</p>
            <p>Last Updated: {formatDate(contact.updatedAt)}</p>
            <p>Last Contacted: {formatDate(contact.lastContacted)}</p>
          </div>
          
          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to delete this contact?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the contact and remove all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteContact} className="bg-red-500 text-white hover:bg-red-600">
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <AlertTriangle className="mr-2 h-4 w-4" />
                  Delete
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}