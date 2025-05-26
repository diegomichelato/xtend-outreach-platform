import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Edit, Trash } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

type EmailTemplate = {
  id: number;
  name: string;
  subject: string;
  description?: string;
  content: string;
  creatorId?: number;
  isSystem: boolean;
  category?: string;
  createdAt: string;
  updatedAt: string;
};

export default function Templates() {
  const { toast } = useToast();
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // Fetch all templates
  const { data: allTemplates, isLoading } = useQuery({
    queryKey: ['/api/email-templates'],
    queryFn: async () => {
      const response = await fetch('/api/email-templates');
      if (!response.ok) {
        throw new Error('Failed to fetch email templates');
      }
      return response.json() as Promise<EmailTemplate[]>;
    }
  });

  // Fetch system templates
  const { data: systemTemplates } = useQuery({
    queryKey: ['/api/email-templates', 'system'],
    queryFn: async () => {
      const response = await fetch('/api/email-templates?isSystem=true');
      if (!response.ok) {
        throw new Error('Failed to fetch system templates');
      }
      return response.json() as Promise<EmailTemplate[]>;
    }
  });

  const deleteTemplate = async (id: number) => {
    try {
      const response = await fetch(`/api/email-templates/${id}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete template');
      }
      
      // Invalidate the templates cache
      queryClient.invalidateQueries({ queryKey: ['/api/email-templates'] });
      
      toast({
        title: "Template deleted",
        description: "The email template has been successfully deleted."
      });
      
      setIsDeleteDialogOpen(false);
    } catch (error) {
      console.error('Error deleting template:', error);
      toast({
        title: "Error",
        description: "Failed to delete the email template.",
        variant: "destructive"
      });
    }
  };

  const openEditBuilder = (template: EmailTemplate) => {
    setSelectedTemplate(template);
    // Navigate to the builder page with the template ID
    window.location.href = `/templates/builder/${template.id}`;
  };

  const renderTemplateCards = (templates: EmailTemplate[] | undefined, isSystemTab = false) => {
    if (!templates || templates.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center p-8 text-center">
          <p className="text-muted-foreground mb-4">
            {isSystemTab 
              ? "No system templates available." 
              : "You haven't created any email templates yet."}
          </p>
          {!isSystemTab && (
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Template
            </Button>
          )}
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates.map((template) => (
          <Card key={template.id} className="overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">{template.name}</CardTitle>
              <CardDescription className="line-clamp-1">
                {template.description || template.subject}
              </CardDescription>
            </CardHeader>
            <CardContent className="pb-2">
              <div 
                className="h-32 bg-slate-50 rounded border border-slate-200 overflow-hidden mb-2"
                style={{ position: 'relative' }}
              >
                {/* Template preview - this would be replaced with actual template preview */}
                <div className="absolute inset-0 flex items-center justify-center text-slate-400">
                  <span>Email Preview</span>
                </div>
              </div>
              <div className="flex items-center text-xs text-muted-foreground">
                <span className="mr-2">Created:</span>
                <span>{new Date(template.createdAt).toLocaleDateString()}</span>
                {template.category && (
                  <>
                    <span className="mx-2">•</span>
                    <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-800">
                      {template.category}
                    </span>
                  </>
                )}
              </div>
            </CardContent>
            <CardFooter className="pt-2 flex justify-between">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  setSelectedTemplate(template);
                  setIsDeleteDialogOpen(true);
                }}
                disabled={template.isSystem}
              >
                <Trash className="h-4 w-4 text-destructive" />
              </Button>
              <Button onClick={() => openEditBuilder(template)}>
                <Edit className="mr-2 h-4 w-4" />
                {template.isSystem ? "Use Template" : "Edit Template"}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    );
  };

  return (
    <div className="container mx-auto py-4">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Email Templates</h1>
          <p className="text-muted-foreground">
            Create and manage your email templates for campaigns
          </p>
        </div>
        <div>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create Template
          </Button>
        </div>
      </div>

      <Tabs defaultValue="my-templates" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="my-templates">My Templates</TabsTrigger>
          <TabsTrigger value="system-templates">System Templates</TabsTrigger>
        </TabsList>
        
        <TabsContent value="my-templates" className="pt-2">
          {isLoading ? (
            <div className="flex justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-DEFAULT"></div>
            </div>
          ) : (
            renderTemplateCards(allTemplates?.filter(t => !t.isSystem))
          )}
        </TabsContent>
        
        <TabsContent value="system-templates" className="pt-2">
          {isLoading ? (
            <div className="flex justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-DEFAULT"></div>
            </div>
          ) : (
            renderTemplateCards(systemTemplates, true)
          )}
        </TabsContent>
      </Tabs>

      {/* Create Template Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Email Template</DialogTitle>
            <DialogDescription>
              Create a new template from scratch or use our template builder.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-1 gap-4 py-4">
            <Button 
              onClick={() => {
                setIsCreateDialogOpen(false);
                window.location.href = "/templates/builder/new";
              }}
              className="w-full h-24 flex flex-col items-center justify-center gap-2"
            >
              <Plus className="h-6 w-6" />
              <span>Start from Scratch</span>
            </Button>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Template Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Template</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this template? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => selectedTemplate && deleteTemplate(selectedTemplate.id)}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}