import { useCallback, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCampaign } from "@/hooks/use-campaign";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Check, Filter, Search, X } from "lucide-react";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

type ContactType = 'Brand' | 'Agency' | 'Creator' | 'Media' | 'Other' | 'all' | null;

interface Contact {
  id: number;
  type: string | null;
  firstName: string;
  lastName: string | null;
  email: string;
  company: string;
  role: string | null;
  industry: string;
  tags?: string[];
  status?: string;
  lastContacted?: string | null;
  updatedAt?: string;
  createdAt?: string;
  notes?: string | null;
  phone?: string | null;
}

interface SelectContactsStepProps {
  onNext?: () => void;
}

export const SelectContactsStep = ({ onNext }: SelectContactsStepProps = {}) => {
  const { campaign, updateCampaign } = useCampaign();
  const { toast } = useToast();
  
  // Contact filtering state
  const [contactType, setContactType] = useState<ContactType>(null);
  const [selectedIndustry, setSelectedIndustry] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedContacts, setSelectedContacts] = useState<number[]>([]);
  
  // Campaign naming state
  const [isNamingDialogOpen, setIsNamingDialogOpen] = useState(false);
  const [campaignName, setCampaignName] = useState(campaign.name || '');
  
  // Get all industries from API
  const { data: industries = [] } = useQuery<string[]>({
    queryKey: ['/api/contacts/industries'],
  });
  
  // Fetch contacts with filtering
  const buildQueryParams = useCallback(() => {
    const params = new URLSearchParams();
    
    if (searchQuery) {
      params.append('q', searchQuery);
    }
    
    if (contactType && contactType !== 'all') {
      params.append('type', contactType);
    }
    
    if (selectedIndustry && selectedIndustry !== 'all' && contactType === 'Brand') {
      params.append('industry', selectedIndustry);
    }
    
    return params.toString();
  }, [contactType, selectedIndustry, searchQuery]);
  
  const queryString = buildQueryParams();
  const apiUrl = queryString ? `/api/contacts?${queryString}` : '/api/contacts';
  
  const { 
    data: contacts = [] as Contact[], 
    isLoading,
    refetch 
  } = useQuery<Contact[]>({
    queryKey: [apiUrl],
  });
  
  // Reset industry when contact type changes
  useEffect(() => {
    if (contactType !== 'Brand') {
      setSelectedIndustry('');
    }
  }, [contactType]);
  
  // Check/uncheck all contacts
  const toggleSelectAll = () => {
    if (selectedContacts.length === contacts.length) {
      setSelectedContacts([]);
    } else {
      setSelectedContacts(contacts.map((contact: Contact) => contact.id));
    }
  };
  
  // Toggle selection of a single contact
  const toggleContactSelection = (contactId: number) => {
    if (selectedContacts.includes(contactId)) {
      setSelectedContacts(selectedContacts.filter(id => id !== contactId));
    } else {
      setSelectedContacts([...selectedContacts, contactId]);
    }
  };
  
  // Open campaign naming dialog
  const openNamingDialog = () => {
    if (selectedContacts.length === 0) {
      toast({
        title: "No contacts selected",
        description: "Please select at least one contact to continue.",
        variant: "destructive"
      });
      return;
    }
    
    // If a campaign name was already set, use it
    setCampaignName(campaign.name || '');
    setIsNamingDialogOpen(true);
  };
  
  // Save selected contacts and campaign name, then continue to next step
  const handleSaveSelection = async () => {
    if (selectedContacts.length === 0) {
      toast({
        title: "No contacts selected",
        description: "Please select at least one contact to continue.",
        variant: "destructive"
      });
      return;
    }
    
    // If no campaign name is provided, generate a default one
    const finalCampaignName = campaignName.trim() || `Campaign ${new Date().toLocaleDateString()}`;
    
    try {
      // Create a temporary contact list with the selected contacts
      const response = await fetch('/api/contact-lists', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: finalCampaignName,
          contactIds: selectedContacts
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to create contact list');
      }
      
      const contactList = await response.json();
      
      // Log the contact list creation
      console.log("Created contact list with ID:", contactList.id, "for", selectedContacts.length, "contacts");
      
      // Update campaign with both the contact list ID, the full object, and the name
      // This is critical to ensure the preview step has direct access to the data without needing to fetch it
      updateCampaign({
        name: finalCampaignName,
        contactListId: contactList.id,
        contactList: contactList, // Store the single object, not an array
        recipientCount: selectedContacts.length
      });
      
      // Also save to sessionStorage for redundancy
      try {
        const storedData = sessionStorage.getItem('campaignWizardState') || '{}';
        const campaignData = JSON.parse(storedData);
        
        // Update with our contact list data and campaign name
        campaignData.name = finalCampaignName;
        campaignData.contactListId = contactList.id;
        campaignData.contactList = contactList;
        campaignData.recipientCount = selectedContacts.length;
        
        // Save back to sessionStorage
        sessionStorage.setItem('campaignWizardState', JSON.stringify(campaignData));
        console.log("Saved contact list and campaign name to sessionStorage:", contactList.id);
      } catch (e) {
        console.error("Failed to save data to sessionStorage:", e);
      }
      
      toast({
        title: "Campaign created",
        description: `${finalCampaignName}: ${selectedContacts.length} contacts selected.`
      });
      
      // Let the parent component handle navigation
      // The campaign wizard will detect the contactListId update and handle the navigation
      if (onNext) {
        console.log("Triggering navigation to next step with contactListId:", contactList.id);
        onNext();
      }
      
      // Close the dialog if it's open
      setIsNamingDialogOpen(false);
      
    } catch (error) {
      console.error("Error saving contact selection:", error);
      toast({
        title: "Error",
        description: "Failed to save contact selection. Please try again.",
        variant: "destructive"
      });
    }
  };
  
  // Reset all filters
  const resetFilters = () => {
    setContactType(null);
    setSelectedIndustry('');
    setSearchQuery('');
  };
  
  return (
    <>
      {/* Campaign naming dialog */}
      <Dialog open={isNamingDialogOpen} onOpenChange={setIsNamingDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Name Your Campaign</DialogTitle>
            <DialogDescription>
              Give your campaign a name to help you identify it later
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <Label htmlFor="campaign-name" className="text-right mb-2 block">
              Campaign Name
            </Label>
            <Input 
              id="campaign-name"
              value={campaignName} 
              onChange={(e) => setCampaignName(e.target.value)}
              placeholder="e.g., Spring Promotion 2025"
              className="w-full"
              autoFocus
            />
          </div>
          
          <DialogFooter className="flex flex-row justify-between sm:justify-between">
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={handleSaveSelection} type="submit" className="bg-primary">
              Save & Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    
      <Card>
        <CardHeader>
          <CardTitle>Select Contacts for Campaign</CardTitle>
          <CardDescription>
            Filter and select contacts to include in your email campaign
          </CardDescription>
        </CardHeader>
        <CardContent>
        {/* "Next" button that appears when contacts are selected */}
        {campaign.contactListId && (
          <div className="flex justify-end mb-4">
            <Button 
              onClick={() => {
                console.log("Continue to Next Step button clicked");
                
                // Try multiple direct approaches for navigation
                
                // Approach 1: Click the creator tab directly
                const creatorTab = document.getElementById('creator-tab');
                if (creatorTab) {
                  console.log("Found creator tab by ID, clicking it");
                  (creatorTab as HTMLButtonElement).click();
                  
                  // Force a second click after a small delay for better reliability
                  setTimeout(() => {
                    if (creatorTab) {
                      console.log("Clicking creator tab again after delay");
                      (creatorTab as HTMLButtonElement).click();
                    }
                  }, 50);
                } 
                
                // Approach 2: Call the onNext callback
                if (onNext) {
                  console.log("Using onNext callback");
                  onNext();
                }
              }} 
              className="bg-primary hover:bg-primary/90 text-white font-semibold"
            >
              Continue to Next Step →
            </Button>
          </div>
        )}
        
        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="w-full md:w-1/3">
            <Select 
              value={contactType || ''} 
              onValueChange={(value) => setContactType(value as ContactType)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Contact Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="Brand">Brand</SelectItem>
                <SelectItem value="Agency">Agency</SelectItem>
                <SelectItem value="Creator">Creator</SelectItem>
                <SelectItem value="Media">Media</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="w-full md:w-1/3">
            <Select 
              value={selectedIndustry} 
              onValueChange={setSelectedIndustry}
              disabled={contactType !== 'Brand'}
            >
              <SelectTrigger>
                <SelectValue placeholder="Industry" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Industries</SelectItem>
                {industries.map((industry) => (
                  <SelectItem key={industry} value={industry}>
                    {industry}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="w-full md:w-1/3 flex space-x-2">
            <div className="relative flex-grow">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search contacts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
            <Button 
              variant="outline" 
              size="icon"
              onClick={resetFilters}
              title="Reset filters"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {/* Active filters */}
        {(contactType || selectedIndustry || searchQuery) && (
          <div className="flex flex-wrap gap-2 mb-4">
            <Badge variant="secondary" className="flex items-center gap-1">
              <Filter className="h-3 w-3" />
              Filters:
            </Badge>
            
            {contactType && (
              <Badge className="flex items-center gap-1">
                Type: {contactType}
                <button 
                  onClick={() => setContactType(null)}
                  className="ml-1 rounded-full hover:bg-primary-foreground"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            
            {selectedIndustry && (
              <Badge className="flex items-center gap-1">
                Industry: {selectedIndustry}
                <button 
                  onClick={() => setSelectedIndustry('')}
                  className="ml-1 rounded-full hover:bg-primary-foreground"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            
            {searchQuery && (
              <Badge className="flex items-center gap-1">
                Search: {searchQuery}
                <button 
                  onClick={() => setSearchQuery('')}
                  className="ml-1 rounded-full hover:bg-primary-foreground"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
          </div>
        )}
        
        {/* Contact selection table */}
        <div className="border rounded-md mt-4">
          <div className="p-4 flex justify-between items-center bg-muted/50">
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={toggleSelectAll}
              >
                {selectedContacts.length === contacts.length && contacts.length > 0 ? 'Deselect All' : 'Select All'}
              </Button>
              
              <span className="text-sm text-muted-foreground">
                {selectedContacts.length} of {contacts.length} selected
              </span>
            </div>
            
            <Button 
              variant="outline" 
              size="sm"
              onClick={openNamingDialog}
              disabled={selectedContacts.length === 0}
              className="flex items-center gap-1"
            >
              <Check className="w-4 h-4" /> Save & Name Campaign
            </Button>
          </div>
          
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]"></TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Industry</TableHead>
                <TableHead>Email</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    Loading contacts...
                  </TableCell>
                </TableRow>
              ) : contacts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    No contacts found matching your criteria
                  </TableCell>
                </TableRow>
              ) : (
                contacts.map((contact: Contact) => (
                  <TableRow key={contact.id} className="cursor-pointer hover:bg-muted/50">
                    <TableCell>
                      <div 
                        className={`w-5 h-5 rounded border flex items-center justify-center
                          ${selectedContacts.includes(contact.id) 
                            ? 'bg-primary border-primary text-primary-foreground' 
                            : 'border-input'
                          }`}
                        onClick={() => toggleContactSelection(contact.id)}
                      >
                        {selectedContacts.includes(contact.id) && (
                          <Check className="h-3 w-3" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell onClick={() => toggleContactSelection(contact.id)}>
                      {contact.firstName} {contact.lastName}
                    </TableCell>
                    <TableCell onClick={() => toggleContactSelection(contact.id)}>
                      {contact.company}
                    </TableCell>
                    <TableCell onClick={() => toggleContactSelection(contact.id)}>
                      {contact.type}
                    </TableCell>
                    <TableCell onClick={() => toggleContactSelection(contact.id)}>
                      {contact.industry}
                    </TableCell>
                    <TableCell onClick={() => toggleContactSelection(contact.id)}>
                      {contact.email}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        </CardContent>
      </Card>
    </>
  );
};