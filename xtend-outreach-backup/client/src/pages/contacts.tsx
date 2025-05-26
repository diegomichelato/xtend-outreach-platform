import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ExternalLink, Eye, Filter, Mail, MoreVertical, Plus, Search, Trash2, Upload, X } from "lucide-react";
import { useState, useEffect } from "react";
import { Contact, ContactList } from "@shared/schema";
import { Loader2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CSVUploader } from "@/components/campaign/csv-uploader";
import { AddContactModal } from "@/components/contact/add-contact-modal";
import { EditContactModal } from "@/components/contact/edit-contact-modal";
import { ContactDetailModal } from "@/components/contact/contact-detail-modal";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Contacts() {
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [industryFilter, setIndustryFilter] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [uniqueIndustries, setUniqueIndustries] = useState<string[]>([]);
  const [uniqueTypes, setUniqueTypes] = useState<string[]>([]);
  const { toast } = useToast();
  
  const { data: contacts, isLoading: isLoadingContacts } = useQuery<Contact[]>({
    queryKey: ['/api/contacts'],
  });

  const { data: contactLists, isLoading: isLoadingLists } = useQuery<ContactList[]>({
    queryKey: ['/api/contact-lists'],
  });
  
  // Extract unique industry and type values from contacts
  useEffect(() => {
    if (contacts) {
      // Get all industries, then create a Set to get unique values
      const industriesSet = new Set<string>();
      const typesSet = new Set<string>();
      
      contacts.forEach(contact => {
        if (contact.industry) {
          industriesSet.add(contact.industry);
        }
        if (contact.type) {
          typesSet.add(contact.type);
        }
      });
      
      // Convert Sets to arrays, filter out falsy values, and sort
      const industries = Array.from(industriesSet).filter(Boolean) as string[];
      const types = Array.from(typesSet).filter(Boolean) as string[];
      
      setUniqueIndustries(industries.sort());
      setUniqueTypes(types.sort());
    }
  }, [contacts]);
  
  // Filter contacts based on search term, type, and industry filter
  const filteredContacts = contacts?.filter(contact => {
    const matchesSearch = searchTerm === '' || 
      Object.values(contact).some(value => 
        value && typeof value === 'string' && value.toLowerCase().includes(searchTerm.toLowerCase())
      );
    
    const matchesIndustry = !industryFilter || industryFilter === 'all' || contact.industry === industryFilter;
    const matchesType = !typeFilter || typeFilter === 'all' || contact.type === typeFilter;
    
    return matchesSearch && matchesIndustry && matchesType;
  });

  const handleCsvUpload = async (csvData: any[], listName: string) => {
    try {
      await apiRequest("POST", "/api/contacts/batch", {
        contacts: csvData,
        listName: listName
      });
      
      queryClient.invalidateQueries({ queryKey: ['/api/contacts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/contact-lists'] });
      
      toast({
        title: "Contacts uploaded",
        description: `Successfully uploaded ${csvData.length} contacts to a new list.`,
      });
      
      setIsUploadDialogOpen(false);
    } catch (error) {
      toast({
        title: "Upload failed",
        description: "There was an error uploading your contacts. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteContact = async (contactId: number, contactName: string) => {
    try {
      await apiRequest("DELETE", `/api/contacts/${contactId}`);
      queryClient.invalidateQueries({ queryKey: ['/api/contacts'] });
      
      toast({
        title: "Contact deleted",
        description: `${contactName} was deleted successfully.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete contact. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container mx-auto p-4 flex flex-col h-[calc(100vh-64px)]">
      {/* Page header */}
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Contacts</h1>
          <p className="mt-1 text-sm text-gray-600">Manage your contact lists for campaigns</p>
        </div>
        <div className="flex gap-2">
          {/* Add Contact Button */}
          <AddContactModal />
          
          {/* Upload Contacts Button */}
          <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center">
                <Upload className="mr-2 h-4 w-4" />
                Upload Contacts
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Upload contacts</DialogTitle>
                <DialogDescription>
                  Upload a CSV or Excel (XLSX/XLS) file with your contacts. The file must include columns for Industry, First Name, Email, and Company.
                  The file can also include a Type/Niche column to categorize contacts.
                  You can drag and drop your file directly onto the upload area below.
                </DialogDescription>
              </DialogHeader>
              <CSVUploader onUploadComplete={handleCsvUpload} />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Contacts and Lists Tabs */}
      <Tabs defaultValue="contacts" className="w-full flex-1 flex flex-col">
        <TabsList className="mb-4">
          <TabsTrigger value="contacts">All Contacts</TabsTrigger>
          <TabsTrigger value="lists">Contact Lists</TabsTrigger>
        </TabsList>
        
        <TabsContent value="contacts" className="flex-1 flex flex-col">
          <Card className="flex-1 flex flex-col">
            <CardHeader className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0 pb-4">
              <CardTitle>All Contacts</CardTitle>
              
              <div className="flex flex-col md:flex-row items-start md:items-center gap-2">
                {/* Search Box */}
                <div className="relative flex items-center gap-2 w-full md:w-auto">
                  <Input
                    type="text"
                    placeholder="Search contacts..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full md:w-64"
                  />
                  {searchTerm && (
                    <X
                      className="absolute right-3 h-4 w-4 cursor-pointer text-gray-500 hover:text-gray-700"
                      onClick={() => setSearchTerm('')}
                    />
                  )}
                </div>
                
                {/* Type Filter Dropdown */}
                <div className="w-full md:w-40">
                  <Select 
                    value={typeFilter || 'all'} 
                    onValueChange={(value) => setTypeFilter(value === 'all' ? null : value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Filter by type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      {uniqueTypes.map(type => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Industry Filter Dropdown */}
                <div className="w-full md:w-48">
                  <Select 
                    value={industryFilter || 'all'} 
                    onValueChange={(value) => setIndustryFilter(value === 'all' ? null : value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Filter by industry" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Industries</SelectItem>
                      {uniqueIndustries.map(industry => (
                        <SelectItem key={industry} value={industry}>{industry}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Reset Filters */}
                {(searchTerm || industryFilter || typeFilter) && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => {
                      setSearchTerm('');
                      setIndustryFilter(null);
                      setTypeFilter(null);
                    }}
                  >
                    Reset
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col p-0">
              {/* Active Filters Display */}
              {((industryFilter && industryFilter !== 'all') || (typeFilter && typeFilter !== 'all')) && (
                <div className="flex items-center gap-2 mb-4 px-6">
                  <span className="text-sm text-gray-500">Active filters:</span>
                  
                  {typeFilter && typeFilter !== 'all' && (
                    <Badge className="bg-primary-DEFAULT text-white">
                      Type: {typeFilter}
                      <X 
                        className="ml-1 h-3 w-3 cursor-pointer"
                        onClick={() => setTypeFilter(null)}
                      />
                    </Badge>
                  )}
                  
                  {industryFilter && industryFilter !== 'all' && (
                    <Badge className="bg-primary-DEFAULT text-white">
                      Industry: {industryFilter}
                      <X 
                        className="ml-1 h-3 w-3 cursor-pointer"
                        onClick={() => setIndustryFilter(null)}
                      />
                    </Badge>
                  )}
                </div>
              )}
            
              {isLoadingContacts ? (
                <div className="flex-1 flex justify-center items-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (
                <div className="flex-1 overflow-auto border-t">
                  <Table>
                    <TableHeader className="sticky top-0 bg-white z-10">
                      <TableRow>
                        <TableHead className="w-[120px]">Niche</TableHead>
                        <TableHead className="w-[120px]">Industry</TableHead>
                        <TableHead className="w-[150px]">Company</TableHead>
                        <TableHead className="w-[120px]">Country</TableHead>
                        <TableHead className="w-[120px]">Website</TableHead>
                        <TableHead className="w-[150px]">Business Email</TableHead>
                        <TableHead className="w-[120px]">First Name</TableHead>
                        <TableHead className="w-[120px]">Last Name</TableHead>
                        <TableHead className="w-[120px]">Role</TableHead>
                        <TableHead className="w-[150px]">Email</TableHead>
                        <TableHead className="w-[120px]">LinkedIn</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredContacts && filteredContacts.length > 0 ? (
                        filteredContacts.map((contact) => (
                          <TableRow key={contact.id}>
                            <TableCell>{contact.niche || '-'}</TableCell>
                            <TableCell>{contact.industry || '-'}</TableCell>
                            <TableCell>{contact.company || '-'}</TableCell>
                            <TableCell>{contact.country || '-'}</TableCell>
                            <TableCell>
                              {contact.website ? (
                                <a 
                                  href={contact.website.startsWith('http') ? contact.website : `https://${contact.website}`} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-primary-DEFAULT hover:underline text-sm truncate max-w-[100px] inline-block"
                                >
                                  {contact.website}
                                </a>
                              ) : '-'}
                            </TableCell>
                            <TableCell>
                              {contact.businessEmail ? (
                                <a 
                                  href={`mailto:${contact.businessEmail}`} 
                                  className="text-primary-DEFAULT hover:underline flex items-center gap-1"
                                >
                                  <Mail className="h-3 w-3" />
                                  <span className="text-sm truncate max-w-[120px]">{contact.businessEmail}</span>
                                </a>
                              ) : '-'}
                            </TableCell>
                            <TableCell className="font-medium">
                              <ContactDetailModal 
                                contact={contact} 
                                trigger={
                                  <Button variant="link" className="p-0 h-auto">
                                    {contact.firstName || '-'}
                                  </Button>
                                } 
                              />
                            </TableCell>
                            <TableCell>{contact.lastName || '-'}</TableCell>
                            <TableCell>{contact.role || '-'}</TableCell>
                            <TableCell>
                              <a 
                                href={`mailto:${contact.email}`} 
                                className="text-primary-DEFAULT hover:underline flex items-center gap-1"
                              >
                                <Mail className="h-3 w-3" />
                                <span className="text-sm truncate max-w-[120px]">{contact.email || '-'}</span>
                              </a>
                            </TableCell>
                            <TableCell>
                              {contact.linkedin ? (
                                <a 
                                  href={contact.linkedin.startsWith('http') ? contact.linkedin : `https://${contact.linkedin}`} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-primary-DEFAULT hover:text-primary-DEFAULT/80 bg-primary-DEFAULT/10 p-1 rounded"
                                >
                                  <ExternalLink className="h-4 w-4" />
                                </a>
                              ) : '-'}
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                            No contacts found. Upload a CSV or Excel file to add contacts.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="lists" className="flex-1">
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Contact Lists</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingLists ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {contactLists && contactLists.length > 0 ? (
                    contactLists.map((list) => (
                      <Card key={list.id}>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base">{list.name}</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-gray-500">{list.description || 'No description'}</p>
                          <div className="mt-2 text-xs text-primary font-medium">
                            Created: {new Date(list.createdAt!).toLocaleDateString()}
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  ) : (
                    <div className="col-span-3 text-center py-8 text-muted-foreground">
                      No contact lists found. Upload a CSV or Excel file to create a list.
                    </div>
                  )}
                  <div 
                    onClick={() => setIsUploadDialogOpen(true)}
                    className="border border-dashed rounded-lg p-4 flex flex-col items-center justify-center text-gray-500 cursor-pointer hover:text-primary-DEFAULT hover:border-primary-DEFAULT"
                  >
                    <span className="material-icons text-3xl mb-2">add_circle_outline</span>
                    <span className="text-sm font-medium">Create New List</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
