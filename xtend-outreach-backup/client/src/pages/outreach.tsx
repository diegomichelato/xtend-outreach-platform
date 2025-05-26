import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { queryClient, apiRequest } from '@/lib/queryClient';
import {
  Calendar,
  Clock,
  Edit,
  Loader2,
  Mail,
  MoreHorizontal,
  Phone,
  Plus,
  Send,
  Tag,
  Trash,
  User
} from 'lucide-react';
import { format } from 'date-fns';

type Contact = {
  id: number;
  firstName: string;
  lastName: string | null;
  email: string;
  company: string;
  role: string | null;
  industry: string;
  tags: string[];
  status: string;
  lastContacted: string | null;
  updatedAt: string;
  createdAt: string;
  notes: string | null;
  phone: string | null;
};

type EmailAccount = {
  id: number;
  name: string;
  email: string;
  status: string;
};

type OutreachLog = {
  id: number;
  contactId: number;
  userId: number | null;
  sentAt: string;
  channel: string;
  emailSubject: string | null;
  emailBody: string | null;
  outcome: string | null;
};

type ContactNote = {
  id: number;
  contactId: number;
  userId: number | null;
  noteText: string;
  createdAt: string;
};

type ActivityItem = {
  type: 'log' | 'note';
  date: Date;
  data: OutreachLog | ContactNote;
};

type ContactWithSelected = Contact & { selected: boolean };

export default function OutreachPage() {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // States
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [contacts, setContacts] = useState<ContactWithSelected[]>([]);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [emailData, setEmailData] = useState({
    subject: '',
    body: '',
    fromEmail: '',
  });
  const [newNote, setNewNote] = useState('');
  const [newTag, setNewTag] = useState('');
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [customPrompt, setCustomPrompt] = useState('');
  const [emailComposeTab, setEmailComposeTab] = useState('compose');
  
  // Fetch contacts
  const contactsQuery = useQuery({
    queryKey: ['/api/contacts'],
    queryFn: async () => {
      const response = await fetch('/api/contacts');
      if (!response.ok) throw new Error('Failed to fetch contacts');
      return response.json();
    }
  });
  
  // Fetch email accounts
  const emailAccountsQuery = useQuery({
    queryKey: ['/api/email-accounts'],
    queryFn: async () => {
      const response = await fetch('/api/email-accounts');
      if (!response.ok) throw new Error('Failed to fetch email accounts');
      return response.json();
    }
  });
  
  // Fetch activity for selected contact
  const activityQuery = useQuery({
    queryKey: ['/api/outreach/activity', selectedContact?.id],
    queryFn: async () => {
      if (!selectedContact) return { activity: [] };
      const response = await fetch(`/api/outreach/activity/${selectedContact.id}`);
      if (!response.ok) throw new Error('Failed to fetch activity');
      return response.json();
    },
    enabled: !!selectedContact,
  });
  
  // Outreach metrics query
  const metricsQuery = useQuery({
    queryKey: ['/api/outreach/metrics'],
    queryFn: async () => {
      const response = await fetch('/api/outreach/metrics');
      if (!response.ok) throw new Error('Failed to fetch metrics');
      return response.json();
    }
  });
  
  // Mutations
  const sendEmailMutation = useMutation({
    mutationFn: async (data: { 
      contactId: number; 
      fromEmail: string; 
      subject: string; 
      body: string; 
    }) => {
      const response = await apiRequest('POST', '/api/outreach/send-email', data);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to send email');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Email sent',
        description: 'Your email has been sent successfully.',
      });
      setEmailDialogOpen(false);
      setEmailData({ subject: '', body: '', fromEmail: '' });
      
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['/api/outreach/activity', selectedContact?.id] });
      queryClient.invalidateQueries({ queryKey: ['/api/outreach/metrics'] });
    },
    onError: (error) => {
      toast({
        title: 'Failed to send email',
        description: error.message,
        variant: 'destructive',
      });
    }
  });
  
  const addNoteMutation = useMutation({
    mutationFn: async (data: { contactId: number; noteText: string }) => {
      const response = await apiRequest('POST', '/api/outreach/add-note', data);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to add note');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Note added',
        description: 'Your note has been added successfully.',
      });
      setNewNote('');
      
      // Invalidate activity query
      queryClient.invalidateQueries({ queryKey: ['/api/outreach/activity', selectedContact?.id] });
    },
    onError: (error) => {
      toast({
        title: 'Failed to add note',
        description: error.message,
        variant: 'destructive',
      });
    }
  });
  
  const addTagMutation = useMutation({
    mutationFn: async (data: { contactId: number; tag: string }) => {
      const response = await apiRequest('POST', '/api/outreach/add-tag', data);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to add tag');
      }
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: 'Tag added',
        description: 'Tag has been added successfully.',
      });
      setNewTag('');
      
      // Update the local contact data
      if (selectedContact && data.contact) {
        setSelectedContact(data.contact);
        
        // Also update the contact in the contacts list
        setContacts(prevContacts => prevContacts.map(c => 
          c.id === data.contact.id 
            ? {...data.contact, selected: c.selected} 
            : c
        ));
      }
      
      // Invalidate activity query
      queryClient.invalidateQueries({ queryKey: ['/api/outreach/activity', selectedContact?.id] });
    },
    onError: (error) => {
      toast({
        title: 'Failed to add tag',
        description: error.message,
        variant: 'destructive',
      });
    }
  });
  
  const updateStatusMutation = useMutation({
    mutationFn: async (data: { contactId: number; status: string }) => {
      const response = await apiRequest('POST', '/api/outreach/update-status', data);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update status');
      }
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: 'Status updated',
        description: `Contact status updated to ${data.contact.status}.`,
      });
      
      // Update the local contact data
      if (selectedContact && data.contact) {
        setSelectedContact(data.contact);
        
        // Also update the contact in the contacts list
        setContacts(prevContacts => prevContacts.map(c => 
          c.id === data.contact.id 
            ? {...data.contact, selected: c.selected} 
            : c
        ));
      }
      
      // Invalidate activity query
      queryClient.invalidateQueries({ queryKey: ['/api/outreach/activity', selectedContact?.id] });
    },
    onError: (error) => {
      toast({
        title: 'Failed to update status',
        description: error.message,
        variant: 'destructive',
      });
    }
  });
  
  // Update contacts when data is loaded
  useEffect(() => {
    if (contactsQuery.data) {
      setContacts(contactsQuery.data.map((contact: Contact) => ({
        ...contact,
        selected: false
      })));
    }
  }, [contactsQuery.data]);
  
  // Filter contacts based on search query
  useEffect(() => {
    if (contactsQuery.data && searchQuery) {
      const filtered = contactsQuery.data.filter((contact: Contact) => {
        const searchLower = searchQuery.toLowerCase();
        return (
          contact.firstName.toLowerCase().includes(searchLower) ||
          (contact.lastName && contact.lastName.toLowerCase().includes(searchLower)) ||
          contact.email.toLowerCase().includes(searchLower) ||
          contact.company.toLowerCase().includes(searchLower) ||
          (contact.role && contact.role.toLowerCase().includes(searchLower))
        );
      }).map((contact: Contact) => ({
        ...contact,
        selected: contacts.find(c => c.id === contact.id)?.selected || false
      }));
      
      setContacts(filtered);
    } else if (contactsQuery.data) {
      setContacts(contactsQuery.data.map((contact: Contact) => ({
        ...contact,
        selected: contacts.find(c => c.id === contact.id)?.selected || false
      })));
    }
  }, [searchQuery, contactsQuery.data]);
  
  // Handlers
  const handleSelectContact = (contact: Contact) => {
    setSelectedContact(contact);
  };
  
  const handleSendEmail = () => {
    if (!selectedContact) return;
    
    sendEmailMutation.mutate({
      contactId: selectedContact.id,
      fromEmail: emailData.fromEmail,
      subject: emailData.subject,
      body: emailData.body
    });
  };
  
  const handleAddNote = () => {
    if (!selectedContact || !newNote) return;
    
    addNoteMutation.mutate({
      contactId: selectedContact.id,
      noteText: newNote
    });
  };
  
  const handleAddTag = () => {
    if (!selectedContact || !newTag) return;
    
    addTagMutation.mutate({
      contactId: selectedContact.id,
      tag: newTag
    });
  };
  
  const handleUpdateStatus = (status: string) => {
    if (!selectedContact) return;
    
    updateStatusMutation.mutate({
      contactId: selectedContact.id,
      status
    });
    
    setStatusMenuOpen(false);
  };
  
  // Generate email content with AI using standard templates
  const handleGenerateEmail = async () => {
    if (!selectedContact || !emailData.fromEmail) return;
    
    const emailAccount = emailAccountsQuery.data?.find(
      (account: EmailAccount) => account.email === emailData.fromEmail
    );
    
    if (!emailAccount) {
      toast({
        title: 'Error',
        description: 'Please select a valid sender email account',
        variant: 'destructive',
      });
      return;
    }
    
    setAiGenerating(true);
    
    try {
      const response = await apiRequest('POST', '/api/outreach/generate-email', {
        contactId: selectedContact.id,
        senderName: emailAccount.name,
        purpose: 'cold outreach',
        tone: 'professional',
        context: 'Looking to establish a business relationship and explore potential collaboration opportunities.'
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate email content');
      }
      
      const data = await response.json();
      
      if (data.success && data.emailContent) {
        setEmailData({
          ...emailData,
          subject: data.emailContent.subject,
          body: data.emailContent.body
        });
        
        toast({
          title: 'Email Generated',
          description: 'AI has created a personalized email for this contact',
        });
      } else {
        throw new Error('Invalid response format from AI service');
      }
    } catch (error) {
      toast({
        title: 'Failed to generate email',
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: 'destructive',
      });
    } finally {
      setAiGenerating(false);
    }
  };
  
  // Generate email content with AI using a custom prompt
  const handleGenerateCustomEmail = async () => {
    if (!selectedContact || !emailData.fromEmail || !customPrompt) return;
    
    const emailAccount = emailAccountsQuery.data?.find(
      (account: EmailAccount) => account.email === emailData.fromEmail
    );
    
    if (!emailAccount) {
      toast({
        title: 'Error',
        description: 'Please select a valid sender email account',
        variant: 'destructive',
      });
      return;
    }
    
    if (customPrompt.length < 10) {
      toast({
        title: 'Invalid Prompt',
        description: 'Please enter a more detailed prompt (at least 10 characters)',
        variant: 'destructive',
      });
      return;
    }
    
    setAiGenerating(true);
    
    try {
      const response = await apiRequest('POST', '/api/outreach/generate-custom', {
        contactId: selectedContact.id,
        customPrompt: customPrompt,
        temperature: 0.7
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate email content');
      }
      
      const data = await response.json();
      
      if (data.success && data.emailContent) {
        setEmailData({
          ...emailData,
          subject: data.emailContent.subject,
          body: data.emailContent.body
        });
        
        // Switch back to the compose tab to show the result
        setEmailComposeTab('compose');
        
        toast({
          title: 'Email Generated',
          description: 'AI has created a personalized email based on your prompt',
        });
      } else {
        throw new Error('Invalid response format from AI service');
      }
    } catch (error) {
      toast({
        title: 'Failed to generate email',
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: 'destructive',
      });
    } finally {
      setAiGenerating(false);
    }
  };
  
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'bg-green-500';
      case 'cold':
        return 'bg-blue-500';
      case 'warm':
        return 'bg-yellow-500';
      case 'hot':
        return 'bg-red-500';
      case 'closed':
        return 'bg-gray-500';
      case 'archived':
        return 'bg-gray-700';
      default:
        return 'bg-gray-400';
    }
  };
  
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    return format(new Date(dateString), 'MMM d, yyyy');
  };
  
  const formatDateTime = (dateString: string) => {
    return format(new Date(dateString), 'MMM d, yyyy h:mm a');
  };
  
  const getActivityIcon = (activity: ActivityItem) => {
    if (activity.type === 'note') return <Edit className="h-4 w-4" />;
    
    const log = activity.data as OutreachLog;
    switch (log.channel) {
      case 'email':
        return <Mail className="h-4 w-4" />;
      case 'status_change':
        return <User className="h-4 w-4" />;
      case 'tag_update':
        return <Tag className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };
  
  const getActivityContent = (activity: ActivityItem) => {
    if (activity.type === 'note') {
      const note = activity.data as ContactNote;
      return (
        <div>
          <div className="font-semibold">Note</div>
          <div>{note.noteText}</div>
        </div>
      );
    }
    
    const log = activity.data as OutreachLog;
    switch (log.channel) {
      case 'email':
        return (
          <div>
            <div className="font-semibold">{log.emailSubject}</div>
            <div className="text-sm text-gray-600 line-clamp-2">{log.emailBody}</div>
          </div>
        );
      case 'status_change':
        return (
          <div>
            <div className="font-semibold">Status changed</div>
            <div className="text-sm text-gray-600">{log.emailBody}</div>
          </div>
        );
      case 'tag_update':
        return (
          <div>
            <div className="font-semibold">Tag updated</div>
            <div className="text-sm text-gray-600">{log.emailBody}</div>
          </div>
        );
      default:
        return (
          <div>
            <div className="font-semibold">{log.channel}</div>
            <div className="text-sm text-gray-600">{log.emailBody}</div>
          </div>
        );
    }
  };
  
  if (contactsQuery.isLoading) {
    return <div className="flex items-center justify-center h-screen">Loading contacts...</div>;
  }
  
  if (contactsQuery.isError) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <div className="text-red-500 mb-4">Failed to load contacts</div>
        <Button onClick={() => contactsQuery.refetch()}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Manual Outreach CRM</h1>
      
      {/* Metrics cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="bg-gradient-to-r from-cyan-500 to-teal-400 text-white">
          <CardContent className="pt-6">
            <div className="text-3xl font-bold">
              {metricsQuery.data?.metrics?.totalEmails || 0}
            </div>
            <p className="text-sm font-medium">Total Emails Sent</p>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-r from-purple-500 to-pink-400 text-white">
          <CardContent className="pt-6">
            <div className="text-3xl font-bold">
              {metricsQuery.data?.metrics?.recentEmails || 0}
            </div>
            <p className="text-sm font-medium">Emails Last 7 Days</p>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-r from-blue-500 to-indigo-400 text-white">
          <CardContent className="pt-6">
            <div className="text-3xl font-bold">
              {contacts.filter(c => c.status.toLowerCase() === 'hot').length}
            </div>
            <p className="text-sm font-medium">Hot Leads</p>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-r from-orange-500 to-amber-400 text-white">
          <CardContent className="pt-6">
            <div className="text-3xl font-bold">
              {metricsQuery.data?.metrics?.totalActivities || 0}
            </div>
            <p className="text-sm font-medium">Total Activities</p>
          </CardContent>
        </Card>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left column - Contacts */}
        <div className="md:col-span-1">
          <Card className="h-full">
            <CardHeader className="pb-3">
              <CardTitle>Contacts</CardTitle>
              <CardDescription>Manage your outreach contacts</CardDescription>
              <div className="mt-2">
                <Input 
                  placeholder="Search contacts..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </CardHeader>
            <CardContent className="overflow-auto max-h-[calc(100vh-300px)]">
              {contacts.length === 0 ? (
                <div className="text-center py-4 text-gray-500">
                  No contacts found
                </div>
              ) : (
                <div className="space-y-3">
                  {contacts.map((contact) => (
                    <div 
                      key={contact.id}
                      className={`p-3 rounded-lg cursor-pointer transition-colors ${
                        selectedContact?.id === contact.id 
                          ? 'bg-teal-50 border-l-4 border-teal-500' 
                          : 'hover:bg-gray-50 border-l-4 border-transparent'
                      }`}
                      onClick={() => handleSelectContact(contact)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">{contact.firstName} {contact.lastName}</div>
                          <div className="text-sm text-gray-500">{contact.company}</div>
                        </div>
                        <div>
                          <Badge className={`${getStatusColor(contact.status)} text-white`}>
                            {contact.status}
                          </Badge>
                        </div>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        Last contacted: {formatDate(contact.lastContacted)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        
        {/* Right column - Contact Details and Activity */}
        <div className="md:col-span-2">
          {selectedContact ? (
            <Card className="h-full">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>{selectedContact.firstName} {selectedContact.lastName}</CardTitle>
                    <CardDescription>{selectedContact.company} • {selectedContact.role}</CardDescription>
                  </div>
                  <div className="flex space-x-2">
                    <DropdownMenu open={statusMenuOpen} onOpenChange={setStatusMenuOpen}>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Badge className={`${getStatusColor(selectedContact.status)} text-white mr-2`}>
                            {selectedContact.status}
                          </Badge>
                          Status
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuLabel>Update Status</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleUpdateStatus('Active')}>
                          <Badge className="bg-green-500 text-white mr-2">Active</Badge>
                          Active
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleUpdateStatus('Cold')}>
                          <Badge className="bg-blue-500 text-white mr-2">Cold</Badge>
                          Cold
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleUpdateStatus('Warm')}>
                          <Badge className="bg-yellow-500 text-white mr-2">Warm</Badge>
                          Warm
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleUpdateStatus('Hot')}>
                          <Badge className="bg-red-500 text-white mr-2">Hot</Badge>
                          Hot
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleUpdateStatus('Closed')}>
                          <Badge className="bg-gray-500 text-white mr-2">Closed</Badge>
                          Closed
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleUpdateStatus('Archived')}>
                          <Badge className="bg-gray-700 text-white mr-2">Archived</Badge>
                          Archived
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    
                    <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
                      <DialogTrigger asChild>
                        <Button size="sm">
                          <Send className="h-4 w-4 mr-2" /> Email
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-[700px]">
                        <DialogHeader>
                          <DialogTitle>Send Email</DialogTitle>
                          <DialogDescription>
                            Send an email to {selectedContact.firstName} at {selectedContact.email}
                          </DialogDescription>
                        </DialogHeader>
                        
                        <div className="grid gap-6 py-4">
                          {/* Header Section */}
                          <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="fromEmail" className="text-right">
                              From
                            </Label>
                            <Select
                              value={emailData.fromEmail}
                              onValueChange={(value) => setEmailData({...emailData, fromEmail: value})}
                            >
                              <SelectTrigger className="col-span-3">
                                <SelectValue placeholder="Select sender email" />
                              </SelectTrigger>
                              <SelectContent>
                                {emailAccountsQuery.data?.map((account: EmailAccount) => (
                                  <SelectItem key={account.id} value={account.email}>
                                    {account.email} ({account.name})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          
                          {/* Subject Line */}
                          <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="subject" className="text-right">
                              Subject
                            </Label>
                            <Input
                              id="subject"
                              value={emailData.subject}
                              onChange={(e) => setEmailData({...emailData, subject: e.target.value})}
                              className="col-span-3"
                            />
                          </div>
                          
                          {/* Tabbed interface for email composition */}
                          <div className="grid grid-cols-4 items-start gap-4">
                            <div className="text-right pt-2 flex flex-col items-end gap-2">
                              <Label htmlFor="body" className="mb-1">Message</Label>
                              <div className="flex flex-col gap-2 w-full items-end">
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  onClick={() => setEmailComposeTab('ai')}
                                  className="w-[120px] flex gap-2 items-center"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 32 32" fill="none" className="h-3 w-3">
                                    <path d="M29.4001 12.2998C30.0587 10.2181 29.9782 7.95975 29.1737 5.92987C28.3692 3.89999 26.8999 2.21073 25.0001 1.19981C23.1002 0.188839 20.8824 -0.0815381 18.7509 0.429821C16.6193 0.941181 14.7138 2.20566 13.4001 3.99981C11.6348 3.24228 9.66747 3.13495 7.83301 3.69571C5.99855 4.25647 4.42222 5.44922 3.38063 7.05776C2.33904 8.66631 1.89706 10.5866 2.13039 12.4862C2.36373 14.3857 3.25588 16.1439 4.65006 17.4498C3.91216 18.6495 3.49396 20.0231 3.43788 21.4338C3.3818 22.8446 3.68968 24.2467 4.32805 25.5005C4.96643 26.7543 5.91182 27.8169 7.07194 28.5834C8.23206 29.3499 9.56723 29.7939 10.95 29.8723C12.3328 29.9508 13.71 29.6608 14.95 29.0283C15.9741 29.8049 17.1699 30.3276 18.4345 30.5519C19.6991 30.7762 20.9972 30.6952 22.2259 30.3157C23.4546 29.9362 24.5804 29.2692 25.5138 28.3682C26.4471 27.4673 27.1612 26.3556 27.5964 25.1147C28.0317 23.8738 28.1753 22.539 28.0148 21.2216C27.8544 19.9041 27.3942 18.6404 26.673 17.5278C25.9519 16.4153 24.9876 15.4839 23.8536 14.8084C22.7195 14.1329 21.4481 13.7324 20.1417 13.6387C18.8353 13.5449 17.5226 13.7602 16.3001 14.2673" stroke="#00a99d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                    <path d="M16 11.9998C16 13.0607 16.4214 14.0782 17.1716 14.8284C17.9217 15.5785 18.9391 15.9998 20 15.9998C21.0609 15.9998 22.0783 15.5785 22.8284 14.8284C23.5786 14.0782 24 13.0607 24 11.9998C24 10.9389 23.5786 9.92154 22.8284 9.17139C22.0783 8.42125 21.0609 7.99982 20 7.99982C18.9391 7.99982 17.9217 8.42125 17.1716 9.17139C16.4214 9.92154 16 10.9389 16 11.9998Z" stroke="#00a99d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                    <path d="M8 19.9999C8 21.0607 8.42143 22.0782 9.17157 22.8284C9.92172 23.5785 10.9391 23.9999 12 23.9999C13.0609 23.9999 14.0783 23.5785 14.8284 22.8284C15.5786 22.0782 16 21.0607 16 19.9999C16 18.939 15.5786 17.9216 14.8284 17.1715C14.0783 16.4213 13.0609 15.9999 12 15.9999C10.9391 15.9999 9.92172 16.4213 9.17157 17.1715C8.42143 17.9216 8 18.939 8 19.9999Z" stroke="#00a99d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                  </svg>
                                  ChatGPT
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setEmailComposeTab('compose')}
                                  className={`text-xs ${emailComposeTab === 'compose' ? 'underline text-primary' : 'text-muted-foreground'}`}
                                >
                                  Compose
                                </Button>
                              </div>
                            </div>
                            
                            <div className="col-span-3">
                              {emailComposeTab === 'compose' ? (
                                <div className="flex flex-col gap-2">
                                  <Textarea
                                    id="body"
                                    value={emailData.body}
                                    onChange={(e) => setEmailData({...emailData, body: e.target.value})}
                                    className="min-h-[200px] text-base"
                                    placeholder="Write your email here or use ChatGPT to generate content..."
                                  />
                                  
                                  <div className="text-xs text-gray-500 mt-1">
                                    Personalization variables: <code>{"{{firstName}}"}</code>, <code>{"{{lastName}}"}</code>, <code>{"{{company}}"}</code>, <code>{"{{role}}"}</code>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex flex-col gap-3">
                                  <div className="flex items-center justify-between mb-1">
                                    <h4 className="text-sm font-medium">AI Email Generator</h4>
                                    <div className="flex items-center gap-2">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handleGenerateEmail}
                                        disabled={!emailData.fromEmail || aiGenerating}
                                        className="h-8"
                                      >
                                        {aiGenerating ? (
                                          <>
                                            <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                                            Quick Generate
                                          </>
                                        ) : (
                                          <>Quick Generate</>
                                        )}
                                      </Button>
                                    </div>
                                  </div>
                                  
                                  <div className="bg-gray-50 rounded-md border p-3">
                                    <p className="text-xs text-gray-600 mb-2">
                                      Write a custom prompt for the AI to generate your email. Be specific about tone, purpose, and key points.
                                    </p>
                                    <Textarea
                                      placeholder="Write a persuasive cold outreach email to a potential client in the tech industry. Mention our AI-powered email platform and suggest a 15-minute demo call."
                                      value={customPrompt}
                                      onChange={(e) => setCustomPrompt(e.target.value)}
                                      className="min-h-[150px] text-sm"
                                    />
                                    
                                    <div className="flex justify-between items-center mt-3">
                                      <div className="text-xs text-gray-500">
                                        <span className="font-medium">Contact:</span> {selectedContact?.firstName} {selectedContact?.lastName}, {selectedContact?.company}
                                      </div>
                                      <Button
                                        onClick={handleGenerateCustomEmail}
                                        disabled={!emailData.fromEmail || aiGenerating || customPrompt.length < 10}
                                        className="bg-gradient-to-r from-cyan-500 to-teal-400 hover:from-cyan-600 hover:to-teal-500"
                                        size="sm"
                                      >
                                        {aiGenerating ? (
                                          <>
                                            <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                                            Generating...
                                          </>
                                        ) : (
                                          <>Generate Custom Email</>
                                        )}
                                      </Button>
                                    </div>
                                  </div>
                                  
                                  <div className="bg-gray-100 rounded-md p-3 text-xs">
                                    <h5 className="font-medium mb-1">Prompt Examples:</h5>
                                    <ul className="space-y-2 text-gray-600">
                                      <li>• Write a friendly follow-up email checking in after our last conversation about partnership opportunities.</li>
                                      <li>• Create a cold outreach email highlighting our expertise in email marketing automation.</li>
                                      <li>• Draft a concise email asking for a referral to the marketing department.</li>
                                    </ul>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <DialogFooter className="flex items-center justify-between">
                          <div className="text-xs text-gray-500 italic">
                            Emails are sent directly from your account
                          </div>
                          <Button 
                            type="submit" 
                            onClick={handleSendEmail} 
                            disabled={!emailData.fromEmail || !emailData.subject || !emailData.body || sendEmailMutation.isPending}
                            className="bg-gradient-to-r from-cyan-500 to-teal-400 hover:from-cyan-600 hover:to-teal-500"
                          >
                            {sendEmailMutation.isPending ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Sending...
                              </>
                            ) : (
                              <>
                                <Send className="mr-2 h-4 w-4" />
                                Send Email
                              </>
                            )}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent>
                <Tabs defaultValue="details">
                  <TabsList className="mb-4">
                    <TabsTrigger value="details">Details</TabsTrigger>
                    <TabsTrigger value="activity">Activity</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="details">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h3 className="font-semibold mb-3">Contact Information</h3>
                        <div className="space-y-2">
                          <div className="flex items-center">
                            <Mail className="h-4 w-4 mr-2 text-gray-500" />
                            <span>{selectedContact.email}</span>
                          </div>
                          {selectedContact.phone && (
                            <div className="flex items-center">
                              <Phone className="h-4 w-4 mr-2 text-gray-500" />
                              <span>{selectedContact.phone}</span>
                            </div>
                          )}
                          <div className="flex items-center">
                            <Calendar className="h-4 w-4 mr-2 text-gray-500" />
                            <span>Added on {formatDate(selectedContact.createdAt)}</span>
                          </div>
                        </div>
                        
                        <h3 className="font-semibold mt-6 mb-3">Company Information</h3>
                        <div className="space-y-2">
                          <div className="flex items-start">
                            <span className="text-gray-500 min-w-[80px]">Company:</span>
                            <span>{selectedContact.company}</span>
                          </div>
                          <div className="flex items-start">
                            <span className="text-gray-500 min-w-[80px]">Role:</span>
                            <span>{selectedContact.role || 'Not specified'}</span>
                          </div>
                          <div className="flex items-start">
                            <span className="text-gray-500 min-w-[80px]">Industry:</span>
                            <span>{selectedContact.industry}</span>
                          </div>
                        </div>
                        
                        <h3 className="font-semibold mt-6 mb-3">Notes</h3>
                        <Textarea 
                          placeholder="Add a note about this contact..." 
                          value={newNote}
                          onChange={(e) => setNewNote(e.target.value)}
                          className="mb-2"
                        />
                        <Button 
                          onClick={handleAddNote} 
                          size="sm"
                          disabled={!newNote.trim() || addNoteMutation.isPending}
                        >
                          {addNoteMutation.isPending ? 'Adding...' : 'Add Note'}
                        </Button>
                      </div>
                      
                      <div>
                        <h3 className="font-semibold mb-3">Tags</h3>
                        <div className="flex flex-wrap gap-2 mb-4">
                          {selectedContact.tags && selectedContact.tags.length > 0 ? (
                            selectedContact.tags.map((tag, index) => (
                              <Badge key={index} variant="outline" className="text-gray-700">
                                {tag}
                              </Badge>
                            ))
                          ) : (
                            <div className="text-gray-500 text-sm">No tags yet</div>
                          )}
                        </div>
                        <div className="flex gap-2 mb-6">
                          <Input 
                            placeholder="Add a new tag..." 
                            value={newTag}
                            onChange={(e) => setNewTag(e.target.value)}
                            className="flex-1"
                          />
                          <Button 
                            onClick={handleAddTag} 
                            size="sm"
                            disabled={!newTag.trim() || addTagMutation.isPending}
                          >
                            {addTagMutation.isPending ? '...' : 'Add'}
                          </Button>
                        </div>
                        
                        <h3 className="font-semibold mt-6 mb-3">Recent Activity</h3>
                        {activityQuery.isLoading ? (
                          <div className="text-gray-500">Loading activity...</div>
                        ) : activityQuery.data?.activity && activityQuery.data.activity.length > 0 ? (
                          <div className="space-y-3">
                            {activityQuery.data.activity.slice(0, 3).map((activity: ActivityItem) => (
                              <div key={`${activity.type}-${activity.data.id}`} className="flex gap-2 p-2 border-l-2 border-teal-500">
                                <div className="text-teal-500 min-w-[20px]">
                                  {getActivityIcon(activity)}
                                </div>
                                <div className="flex-1">
                                  {getActivityContent(activity)}
                                  <div className="text-xs text-gray-500 mt-1">
                                    {formatDateTime(activity.type === 'note' 
                                      ? (activity.data as ContactNote).createdAt 
                                      : (activity.data as OutreachLog).sentAt)}
                                  </div>
                                </div>
                              </div>
                            ))}
                            <Button 
                              variant="link" 
                              className="text-teal-500 pl-0" 
                              onClick={() => {
                                // Switch to the activity tab programmatically
                                const activityTab = document.querySelector('[data-state="inactive"][data-value="activity"]');
                                if (activityTab instanceof HTMLElement) {
                                  activityTab.click();
                                }
                              }}
                            >
                              View all activity
                            </Button>
                          </div>
                        ) : (
                          <div className="text-gray-500">No activity recorded yet</div>
                        )}
                      </div>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="activity">
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <h3 className="font-semibold">Activity History</h3>
                        <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
                          <DialogTrigger asChild>
                            <Button size="sm">
                              <Send className="h-4 w-4 mr-2" /> New Email
                            </Button>
                          </DialogTrigger>
                        </Dialog>
                      </div>
                      
                      {activityQuery.isLoading ? (
                        <div className="text-center py-8 text-gray-500">
                          Loading activity...
                        </div>
                      ) : activityQuery.data?.activity && activityQuery.data.activity.length > 0 ? (
                        <div className="space-y-4">
                          {activityQuery.data.activity.map((activity: ActivityItem) => (
                            <div key={`${activity.type}-${activity.data.id}`} className="flex gap-3 p-3 border-l-2 border-teal-500 bg-gray-50 rounded-r-lg">
                              <div className="text-teal-500 mt-1">
                                {getActivityIcon(activity)}
                              </div>
                              <div className="flex-1">
                                {getActivityContent(activity)}
                                <div className="text-xs text-gray-500 mt-2">
                                  {formatDateTime(activity.type === 'note' 
                                    ? (activity.data as ContactNote).createdAt 
                                    : (activity.data as OutreachLog).sentAt)}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-gray-500">
                          No activity recorded yet for this contact
                        </div>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          ) : (
            <Card className="h-full flex items-center justify-center">
              <CardContent className="text-center py-10">
                <div className="mb-4 text-gray-400">
                  <User className="h-16 w-16 mx-auto" />
                </div>
                <h3 className="text-xl font-medium mb-2">No Contact Selected</h3>
                <p className="text-gray-500 mb-6 max-w-md">
                  Select a contact from the list to view their details and manage your outreach activities.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}