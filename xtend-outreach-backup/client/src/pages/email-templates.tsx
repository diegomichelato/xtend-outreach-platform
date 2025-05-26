import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

import { 
  Pencil, 
  Trash2, 
  MoreVertical, 
  Copy, 
  Plus, 
  Search, 
  Filter, 
  Mail,
  Star,
  Folder
} from 'lucide-react';

interface EmailTemplate {
  id: number;
  name: string;
  subject: string;
  preheader?: string;
  content: string;
  creatorId?: number;
  userId?: number;
  isSystem: boolean;
  category?: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

export default function EmailTemplates() {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('all');
  const [templateToDelete, setTemplateToDelete] = useState<number | null>(null);
  
  // Fetch templates
  const { data: templates, isLoading, error } = useQuery({
    queryKey: ['/api/email-templates'],
    queryFn: async () => await apiRequest('/api/email-templates'),
  });
  
  // Delete template mutation
  const deleteTemplateMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`/api/email-templates/${id}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      toast({
        title: 'Template deleted',
        description: 'The email template was deleted successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/email-templates'] });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to delete the email template',
        variant: 'destructive',
      });
    },
  });
  
  const handleCreateTemplate = () => {
    navigate('/template-builder');
  };
  
  const handleEditTemplate = (id: number) => {
    navigate(`/template-builder/${id}`);
  };
  
  const handleDuplicateTemplate = async (template: EmailTemplate) => {
    try {
      // Create a copy without the id, and with a new name
      const { id, createdAt, updatedAt, ...rest } = template;
      const newTemplate = {
        ...rest,
        name: `${template.name} (Copy)`,
        isSystem: false,
      };
      
      // Parse content if it's a string
      if (typeof newTemplate.content === 'string') {
        newTemplate.content = JSON.parse(newTemplate.content);
      }
      
      // Stringify for API request
      const dataToSend = {
        ...newTemplate,
        content: JSON.stringify(newTemplate.content)
      };
      
      const response = await apiRequest('/api/email-templates', {
        method: 'POST',
        body: dataToSend,
      });
      
      toast({
        title: 'Template duplicated',
        description: 'The email template was duplicated successfully',
      });
      
      queryClient.invalidateQueries({ queryKey: ['/api/email-templates'] });
      
      // Navigate to the new template
      if (response?.id) {
        navigate(`/template-builder/${response.id}`);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to duplicate the email template',
        variant: 'destructive',
      });
    }
  };
  
  const handleDeleteTemplate = (id: number) => {
    setTemplateToDelete(id);
  };
  
  const confirmDeleteTemplate = () => {
    if (templateToDelete !== null) {
      deleteTemplateMutation.mutate(templateToDelete);
      setTemplateToDelete(null);
    }
  };
  
  const cancelDeleteTemplate = () => {
    setTemplateToDelete(null);
  };
  
  // Filter templates based on search query and category
  const filteredTemplates = templates
    ? templates.filter((template: EmailTemplate) => {
        // Filter by tab (all, custom, system)
        if (activeTab === 'custom' && template.isSystem) return false;
        if (activeTab === 'system' && !template.isSystem) return false;
        
        // Filter by search query
        if (
          searchQuery &&
          !template.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
          !template.subject.toLowerCase().includes(searchQuery.toLowerCase())
        ) {
          return false;
        }
        
        // Filter by category
        if (categoryFilter !== 'all' && template.category !== categoryFilter) {
          return false;
        }
        
        return true;
      })
    : [];
  
  // Get unique categories for filter dropdown
  const categories = templates
    ? Array.from(
        new Set(
          templates
            .map((template: EmailTemplate) => template.category)
            .filter(Boolean)
        )
      )
    : [];
    
  // Render template card
  const renderTemplateCard = (template: EmailTemplate) => {
    // Parse content if it's a string
    const content = typeof template.content === 'string' 
      ? JSON.parse(template.content) 
      : template.content;
      
    const firstComponent = content.components && content.components.length > 0
      ? content.components[0]
      : null;
      
    return (
      <Card key={template.id} className="overflow-hidden flex flex-col h-full">
        <CardHeader className="pb-2">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <CardTitle className="text-lg truncate" title={template.name}>
                {template.name}
              </CardTitle>
              <CardDescription className="truncate" title={template.subject}>
                {template.subject}
              </CardDescription>
            </div>
            
            <div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Options</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => handleEditTemplate(template.id)}>
                    <Pencil className="h-4 w-4 mr-2" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleDuplicateTemplate(template)}>
                    <Copy className="h-4 w-4 mr-2" />
                    Duplicate
                  </DropdownMenuItem>
                  {!template.isSystem && (
                    <DropdownMenuItem 
                      onClick={() => handleDeleteTemplate(template.id)}
                      className="text-red-600"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          
          {template.category && (
            <div className="mt-2">
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
                <Folder className="h-3 w-3 mr-1" />
                {template.category}
              </span>
              {template.isSystem && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-500 ml-2">
                  <Star className="h-3 w-3 mr-1" />
                  System
                </span>
              )}
            </div>
          )}
        </CardHeader>
        
        <CardContent className="flex-1 pt-0">
          <div className="mt-2 line-clamp-3 text-sm text-muted-foreground">
            {firstComponent?.content || 'No preview available'}
          </div>
        </CardContent>
        
        <CardFooter className="border-t pt-3">
          <div className="flex justify-between w-full">
            <span className="text-xs text-muted-foreground">
              Updated {new Date(template.updatedAt).toLocaleDateString()}
            </span>
            <Button
              variant="outline" 
              size="sm"
              onClick={() => handleEditTemplate(template.id)}
            >
              <Pencil className="h-3 w-3 mr-1" />
              Edit
            </Button>
          </div>
        </CardFooter>
      </Card>
    );
  };
  
  const renderLoading = () => {
    return Array(6)
      .fill(0)
      .map((_, i) => (
        <Card key={`skeleton-${i}`}>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32 mt-2" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-24 w-full" />
          </CardContent>
          <CardFooter>
            <Skeleton className="h-8 w-24" />
          </CardFooter>
        </Card>
      ));
  };
  
  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Email Templates</h1>
          <p className="text-muted-foreground">
            Create and manage email templates for your campaigns
          </p>
        </div>
        <Button onClick={handleCreateTemplate}>
          <Plus className="h-4 w-4 mr-2" />
          Create Template
        </Button>
      </div>
      
      <div className="mb-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="all">All Templates</TabsTrigger>
            <TabsTrigger value="custom">My Templates</TabsTrigger>
            <TabsTrigger value="system">System Templates</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search templates..."
            className="pl-9"
          />
        </div>
        
        <div className="sm:w-[200px]">
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger>
              <div className="flex items-center">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Category" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((category, index) => (
                <SelectItem key={index} value={category}>
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {renderLoading()}
        </div>
      ) : error ? (
        <Card className="bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-600">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p>There was an error loading the email templates.</p>
          </CardContent>
          <CardFooter>
            <Button 
              variant="outline" 
              onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/email-templates'] })}
            >
              Try Again
            </Button>
          </CardFooter>
        </Card>
      ) : filteredTemplates.length === 0 ? (
        <div className="text-center py-12">
          <Mail className="h-12 w-12 mx-auto text-muted-foreground" />
          <h2 className="mt-4 text-lg font-medium">No templates found</h2>
          <p className="mt-1 text-muted-foreground">
            {searchQuery || categoryFilter !== 'all'
              ? "No templates match your search criteria."
              : activeTab === 'custom'
              ? "You haven't created any custom templates yet."
              : "There are no templates available."}
          </p>
          <Button className="mt-4" onClick={handleCreateTemplate}>
            <Plus className="h-4 w-4 mr-2" />
            Create Template
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTemplates.map((template: EmailTemplate) => 
            renderTemplateCard(template)
          )}
        </div>
      )}
      
      <AlertDialog open={templateToDelete !== null} onOpenChange={cancelDeleteTemplate}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the email template.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              className="bg-red-600 hover:bg-red-700"
              onClick={confirmDeleteTemplate}
              disabled={deleteTemplateMutation.isPending}
            >
              {deleteTemplateMutation.isPending ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}