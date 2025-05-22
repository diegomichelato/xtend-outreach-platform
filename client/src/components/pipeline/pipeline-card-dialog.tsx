import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Search, User, Building, Mail } from "lucide-react";
import { format } from "date-fns";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";

// Pipeline card type
interface PipelineCard {
  id: number;
  companyName: string;
  contactName?: string;
  contactEmail?: string;
  description?: string;
  value?: number;
  currentStage: string;
  vertical: string;
  creatorName?: string;
  followUpDate?: string;
  notes?: string;
}

// Pipeline stage type
interface PipelineStage {
  id: string;
  name: string;
}

// Creator type
interface Creator {
  id: number;
  name: string;
  role?: string;
  profileImageUrl?: string;
}

// Contact type
interface Contact {
  id: number;
  firstName: string;
  lastName: string | null;
  email: string;
  company: string;
  role: string | null;
  industry: string;
}

interface PipelineCardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingCard: PipelineCard | null;
  onSave: () => void;
}

export function PipelineCardDialog({ open, onOpenChange, existingCard, onSave }: PipelineCardDialogProps) {
  // Form data state
  const [formData, setFormData] = useState<Partial<PipelineCard>>({
    companyName: "",
    contactName: "",
    contactEmail: "",
    description: "",
    value: undefined,
    currentStage: "1", // Default to first stage
    vertical: "brands", // Default to brands vertical
    creatorName: "",
    followUpDate: undefined,
    notes: ""
  });
  
  const [date, setDate] = useState<Date | undefined>(undefined);
  
  // Contact selection states
  const [contactSearchInput, setContactSearchInput] = useState('');
  const [isContactPopoverOpen, setIsContactPopoverOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  
  // Creator selection states
  const [isCreatorPopoverOpen, setIsCreatorPopoverOpen] = useState(false);
  const [selectedCreator, setSelectedCreator] = useState<Creator | null>(null);
  const [creatorSearchInput, setCreatorSearchInput] = useState('');
  
  // Get contacts list
  const { data: contacts = [] } = useQuery<Contact[]>({
    queryKey: ['/api/contacts'],
    refetchOnWindowFocus: false,
  });
  
  // Get creators list
  const { data: creatorsList = [] } = useQuery<Creator[]>({
    queryKey: ['/api/creators'],
    refetchOnWindowFocus: false,
  });
  
  // Reset form when dialog opens/closes or card changes
  useEffect(() => {
    if (open && existingCard) {
      // Editing existing card
      setFormData({
        companyName: existingCard.companyName,
        contactName: existingCard.contactName || "",
        contactEmail: existingCard.contactEmail || "",
        description: existingCard.description || "",
        value: existingCard.value,
        currentStage: existingCard.currentStage || "1", // Default to Warm Leads
        vertical: existingCard.vertical.toLowerCase(),
        creatorName: existingCard.creatorName || "",
        followUpDate: existingCard.followUpDate,
        notes: existingCard.notes || ""
      });
      
      // Set date if followUpDate exists
      if (existingCard.followUpDate) {
        setDate(new Date(existingCard.followUpDate));
      } else {
        setDate(undefined);
      }
      
      // Set selected contact if contact info exists
      if (existingCard.contactName && existingCard.contactEmail && contacts.length > 0) {
        const matchedContact = contacts.find(contact => 
          `${contact.firstName} ${contact.lastName || ''}`.trim() === existingCard.contactName.trim() && 
          contact.email === existingCard.contactEmail
        );
        if (matchedContact) {
          setSelectedContact(matchedContact);
        } else {
          setSelectedContact(null);
        }
      }
      
      // Set selected creator if creator name exists
      if (existingCard.creatorName && creatorsList.length > 0) {
        const matchedCreator = creatorsList.find(creator => 
          creator.name === existingCard.creatorName
        );
        if (matchedCreator) {
          setSelectedCreator(matchedCreator);
        } else {
          setSelectedCreator(null);
        }
      }
    } else if (open) {
      // Adding new card - reset form
      setFormData({
        companyName: "",
        contactName: "",
        contactEmail: "",
        description: "",
        value: undefined,
        currentStage: "1", // Default to first stage
        vertical: "brands", // Default to brands vertical
        creatorName: "",
        followUpDate: undefined,
        notes: ""
      });
      setDate(undefined);
    }
  }, [open, existingCard]);
  
  const queryClient = useQueryClient();
  
  // Handle input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  // Handle dropdown changes
  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  // Handle date change
  const handleDateChange = (date: Date | undefined) => {
    setDate(date);
    setFormData(prev => ({ 
      ...prev, 
      followUpDate: date ? date.toISOString() : undefined 
    }));
  };
  
  // Save card data
  const handleSave = async () => {
    try {
      if (!formData.companyName) {
        toast({
          title: "Error",
          description: "Company name is required",
          variant: "destructive",
        });
        return;
      }
      
      // Convert value to number if present
      const formattedData = {
        ...formData,
        value: formData.value ? Number(formData.value) : undefined,
      };
      
      if (existingCard?.id) {
        // Update existing card
        await fetch(`/api/pipeline/cards/${existingCard.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(formattedData),
        });
        toast({
          title: "Success",
          description: "Pipeline card updated successfully",
        });
      } else {
        // Create new card
        await fetch("/api/pipeline/cards", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(formattedData),
        });
        toast({
          title: "Success",
          description: "Pipeline card created successfully",
        });
      }
      
      // Invalidate queries to refresh the data
      queryClient.invalidateQueries({ queryKey: ['/api/pipeline/cards'] });
      
      // Notify parent and close dialog
      onSave();
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving pipeline card:", error);
      toast({
        title: "Error",
        description: "Failed to save pipeline card",
        variant: "destructive",
      });
    }
  };
  
  // Fetch pipeline stages
  const { data: stages = [] } = useQuery({
    queryKey: ['/api/pipeline-stages'],
    select: (data: PipelineStage[]) => data,
  });
  
  // Fetch creators for dropdown
  const { data: creators = [] } = useQuery({
    queryKey: ['/api/creators'],
    select: (data: Creator[]) => data,
  });
  
  // Handle dialog close
  const handleDialogClose = () => {
    onOpenChange(false);
  };
  
  return (
    <Dialog open={open} onOpenChange={(open) => !open && handleDialogClose()}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{existingCard ? "Edit Pipeline Card" : "Add New Pipeline Card"}</DialogTitle>
          <DialogDescription>
            {existingCard 
              ? "Update the details of this pipeline card." 
              : "Fill in the details to add a new opportunity to your pipeline."}
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="vertical" className="text-right">
              Vertical
            </Label>
            <div className="col-span-3">
              <Select 
                value={formData.vertical} 
                onValueChange={(value) => handleSelectChange("vertical", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select vertical" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="brands">Brands</SelectItem>
                  <SelectItem value="agencies">Agencies</SelectItem>
                  <SelectItem value="partners">Partners</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="companyName" className="text-right">
              Company Name*
            </Label>
            <Input
              id="companyName"
              name="companyName"
              value={formData.companyName}
              onChange={handleChange}
              className="col-span-3"
              required
            />
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="contactName" className="text-right">
              Contact
            </Label>
            <div className="col-span-3">
              <Popover open={isContactPopoverOpen} onOpenChange={setIsContactPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className="w-full justify-between"
                  >
                    {selectedContact ? 
                      `${selectedContact.firstName} ${selectedContact.lastName || ''}` : 
                      formData.contactName || "Select contact..."
                    }
                    <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[300px] p-0">
                  <Command>
                    <CommandInput 
                      placeholder="Search contacts..." 
                      value={contactSearchInput}
                      onValueChange={setContactSearchInput}
                    />
                    <CommandList>
                      <CommandEmpty>No contacts found.</CommandEmpty>
                      <CommandGroup>
                        {contacts.map((contact) => (
                          <CommandItem
                            key={contact.id}
                            value={`${contact.firstName} ${contact.lastName || ''}`}
                            onSelect={() => {
                              setSelectedContact(contact);
                              setFormData(prev => ({
                                ...prev,
                                companyName: contact.company,
                                contactName: `${contact.firstName} ${contact.lastName || ''}`,
                                contactEmail: contact.email
                              }));
                              setIsContactPopoverOpen(false);
                            }}
                            className="flex items-center"
                          >
                            <User className="mr-2 h-4 w-4" />
                            <div className="flex flex-col">
                              <span>{contact.firstName} {contact.lastName || ''}</span>
                              <span className="text-xs text-muted-foreground">{contact.company}</span>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="contactEmail" className="text-right">
              Contact Email
            </Label>
            <Input
              id="contactEmail"
              name="contactEmail"
              type="email"
              value={formData.contactEmail}
              onChange={handleChange}
              className={`col-span-3 ${selectedContact ? "bg-gray-50" : ""}`}
              readOnly={!!selectedContact}
            />
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="description" className="text-right">
              Description
            </Label>
            <Textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              className="col-span-3"
              rows={3}
            />
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="currentStage" className="text-right">
              Pipeline Stage
            </Label>
            <div className="col-span-3">
              <Select 
                value={formData.currentStage} 
                onValueChange={(value) => handleSelectChange("currentStage", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select stage" />
                </SelectTrigger>
                <SelectContent>
                  {stages.map((stage) => (
                    <SelectItem key={stage.id} value={stage.id}>
                      {stage.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="value" className="text-right">
              Value ($)
            </Label>
            <Input
              id="value"
              name="value"
              type="number"
              value={formData.value || ""}
              onChange={handleChange}
              className="col-span-3"
              placeholder="Estimated value"
            />
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="creatorName" className="text-right">
              Creator
            </Label>
            <div className="col-span-3">
              <Popover open={isCreatorPopoverOpen} onOpenChange={setIsCreatorPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className="w-full justify-between"
                  >
                    {selectedCreator ? 
                      selectedCreator.name : 
                      formData.creatorName || "Select creator..."
                    }
                    <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[300px] p-0">
                  <Command>
                    <CommandInput 
                      placeholder="Search creators..." 
                      value={creatorSearchInput}
                      onValueChange={setCreatorSearchInput}
                    />
                    <CommandList>
                      <CommandEmpty>No creators found.</CommandEmpty>
                      <CommandGroup>
                        <CommandItem
                          value="none"
                          onSelect={() => {
                            setSelectedCreator(null);
                            setFormData(prev => ({
                              ...prev,
                              creatorName: ""
                            }));
                            setIsCreatorPopoverOpen(false);
                          }}
                          className="flex items-center"
                        >
                          <User className="mr-2 h-4 w-4" />
                          <span>None</span>
                        </CommandItem>
                        {creatorsList
                          .filter(creator => 
                            creatorSearchInput === '' || 
                            creator.name.toLowerCase().includes(creatorSearchInput.toLowerCase()) ||
                            (creator.role && creator.role.toLowerCase().includes(creatorSearchInput.toLowerCase()))
                          )
                          .map((creator) => (
                          <CommandItem
                            key={creator.id}
                            value={creator.name}
                            onSelect={() => {
                              setSelectedCreator(creator);
                              setFormData(prev => ({
                                ...prev,
                                creatorName: creator.name
                              }));
                              setIsCreatorPopoverOpen(false);
                              setCreatorSearchInput('');
                            }}
                            className="flex items-center"
                          >
                            {creator.profileImageUrl ? (
                              <div className="relative mr-2 h-6 w-6 overflow-hidden rounded-full">
                                <img
                                  src={creator.profileImageUrl}
                                  alt={creator.name}
                                  className="h-full w-full object-cover"
                                />
                              </div>
                            ) : (
                              <User className="mr-2 h-4 w-4" />
                            )}
                            <div className="flex flex-col">
                              <span>{creator.name}</span>
                              {creator.role && (
                                <span className="text-xs text-muted-foreground">{creator.role}</span>
                              )}
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="followUpDate" className="text-right">
              Follow-up Date
            </Label>
            <div className="col-span-3">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "PPP") : "Select date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={handleDateChange}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="notes" className="text-right">
              Notes
            </Label>
            <Textarea
              id="notes"
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              className="col-span-3"
              rows={3}
              placeholder="Additional notes..."
            />
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={handleDialogClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            {existingCard ? "Update" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}