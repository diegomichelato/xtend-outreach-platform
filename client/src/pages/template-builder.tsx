import React, { useState, useEffect } from 'react';
import { useParams, useLocation } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, closestCenter } from '@dnd-kit/core';
import { SortableContext, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';

import { TemplateSidebar } from '@/components/email-template/template-sidebar';
import { CanvasArea } from '@/components/email-template/canvas-area';
import { ComponentProperties } from '@/components/email-template/component-properties';
import { EmailPreview } from '@/components/email-template/email-preview';
import { SaveTemplateDialog } from '@/components/email-template/save-template-dialog';

import { EmailComponentType } from '@/components/email-template/component-types';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

export type EmailComponent = {
  id: string;
  type: EmailComponentType;
  content: string;
  settings?: Record<string, any>;
};

export type EmailTemplateData = {
  id?: number;
  name: string;
  subject: string;
  preheader?: string;
  content: {
    components: EmailComponent[];
    styles: {
      fontFamily: string;
      fontSize: string;
      color: string;
      backgroundColor: string;
    };
  };
  creatorId?: number;
  userId?: number;
  isSystem?: boolean;
  category?: string;
  tags?: string[];
  thumbnail?: string;
};

export default function TemplateBuilder() {
  const [, setLocation] = useLocation();
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const [isNewTemplate, setIsNewTemplate] = useState(!id);
  const [selectedComponentIndex, setSelectedComponentIndex] = useState<number | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [activeTab, setActiveTab] = useState('edit');
  
  // Default empty template
  const [template, setTemplate] = useState<EmailTemplateData>({
    name: 'Untitled Template',
    subject: 'Subject Line',
    content: {
      components: [],
      styles: {
        fontFamily: 'Arial, sans-serif',
        fontSize: '14px',
        color: '#333333',
        backgroundColor: '#ffffff',
      },
    },
  });

  // Fetch template if editing an existing one
  const { isLoading, error } = useQuery({
    queryKey: ['/api/email-templates', id],
    queryFn: async () => {
      if (!id) return null;
      return apiRequest(`/api/email-templates/${id}`);
    },
    enabled: !!id,
    onSuccess: (data) => {
      if (data) {
        try {
          // Parse the content if it's a string
          const content = typeof data.content === 'string' 
            ? JSON.parse(data.content) 
            : data.content;
            
          setTemplate({
            ...data,
            content
          });
        } catch (err) {
          console.error('Error parsing template content:', err);
          toast({
            title: 'Error',
            description: 'Could not parse template data',
            variant: 'destructive',
          });
        }
      }
    },
  });

  // Save/update template mutation
  const saveMutation = useMutation({
    mutationFn: async (templateData: EmailTemplateData) => {
      const endpoint = isNewTemplate 
        ? '/api/email-templates' 
        : `/api/email-templates/${id}`;
      
      const method = isNewTemplate ? 'POST' : 'PATCH';
      
      // Stringify the content object before sending
      const dataToSend = {
        ...templateData,
        content: JSON.stringify(templateData.content)
      };
      
      return apiRequest(endpoint, {
        method,
        body: dataToSend,
      });
    },
    onSuccess: (data) => {
      toast({
        title: 'Success',
        description: isNewTemplate ? 'Template created successfully' : 'Template updated successfully',
      });
      
      queryClient.invalidateQueries({ queryKey: ['/api/email-templates'] });
      
      if (isNewTemplate && data?.id) {
        setLocation(`/template-builder/${data.id}`);
        setIsNewTemplate(false);
      }
    },
    onError: (error) => {
      console.error('Template save error:', error);
      toast({
        title: 'Error',
        description: 'Failed to save template',
        variant: 'destructive',
      });
    },
  });

  // Handle drag start
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  // Handle drag end
  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    
    const { active, over } = event;
    
    if (!over) return;
    
    // Handle reordering existing components
    if (active.id.toString().startsWith('existing-')) {
      if (over.id.toString().startsWith('existing-')) {
        const oldIndex = parseInt(active.id.toString().replace('existing-', ''));
        const newIndex = parseInt(over.id.toString().replace('existing-', ''));
        
        if (oldIndex !== newIndex) {
          setTemplate((prev) => {
            const newComponents = arrayMove(
              [...prev.content.components],
              oldIndex,
              newIndex
            );
            
            return {
              ...prev,
              content: {
                ...prev.content,
                components: newComponents,
              },
            };
          });
          
          // Update selected component index if necessary
          if (selectedComponentIndex === oldIndex) {
            setSelectedComponentIndex(newIndex);
          }
        }
      }
    } else {
      // Handle adding new component from sidebar
      const componentType = active.id as EmailComponentType;
      const dropIndex = over.id.toString().startsWith('existing-')
        ? parseInt(over.id.toString().replace('existing-', ''))
        : template.content.components.length;
      
      // Create new component
      const newComponent: EmailComponent = {
        id: `component-${Date.now()}`,
        type: componentType,
        content: getDefaultContentForType(componentType),
      };
      
      // Add component to template
      setTemplate((prev) => {
        const newComponents = [...prev.content.components];
        newComponents.splice(dropIndex, 0, newComponent);
        
        return {
          ...prev,
          content: {
            ...prev.content,
            components: newComponents,
          },
        };
      });
      
      // Select the new component
      setSelectedComponentIndex(dropIndex);
    }
  };

  // Get default content for each component type
  const getDefaultContentForType = (type: EmailComponentType): string => {
    switch (type) {
      case 'header':
        return 'Your Header Here';
      case 'text':
        return 'Enter your text content here. This can be a paragraph explaining your offer or message.';
      case 'image':
        return 'https://via.placeholder.com/600x200';
      case 'button':
        return 'Click Here';
      case 'divider':
        return '';
      case 'spacer':
        return '';
      case 'social':
        return 'facebook,twitter,linkedin';
      case 'personalization':
        return 'Hello {{firstName}},';
      case 'signature':
        return 'Best regards,\n{{creatorName}}\n{{creatorRole}}';
      default:
        return '';
    }
  };

  // Update component content
  const updateComponentContent = (index: number, content: string) => {
    setTemplate((prev) => {
      const newComponents = [...prev.content.components];
      newComponents[index] = {
        ...newComponents[index],
        content,
      };
      
      return {
        ...prev,
        content: {
          ...prev.content,
          components: newComponents,
        },
      };
    });
  };

  // Update component settings
  const updateComponentSettings = (index: number, settings: Record<string, any>) => {
    setTemplate((prev) => {
      const newComponents = [...prev.content.components];
      newComponents[index] = {
        ...newComponents[index],
        settings: {
          ...newComponents[index].settings,
          ...settings,
        },
      };
      
      return {
        ...prev,
        content: {
          ...prev.content,
          components: newComponents,
        },
      };
    });
  };

  // Delete a component
  const deleteComponent = (index: number) => {
    setTemplate((prev) => {
      const newComponents = [...prev.content.components];
      newComponents.splice(index, 1);
      
      return {
        ...prev,
        content: {
          ...prev.content,
          components: newComponents,
        },
      };
    });
    
    setSelectedComponentIndex(null);
  };

  // Handle template save
  const handleSaveTemplate = (name: string, category?: string) => {
    const templateToSave = {
      ...template,
      name,
      category: category || 'custom',
    };
    
    saveMutation.mutate(templateToSave);
    setShowSaveDialog(false);
  };

  // Update template styles
  const updateTemplateStyles = (styles: Partial<typeof template.content.styles>) => {
    setTemplate((prev) => ({
      ...prev,
      content: {
        ...prev.content,
        styles: {
          ...prev.content.styles,
          ...styles,
        },
      },
    }));
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-4">
        <Card className="w-full">
          <CardHeader>
            <Skeleton className="h-8 w-48" />
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-1">
                <Skeleton className="h-96 w-full" />
              </div>
              <div className="md:col-span-2">
                <Skeleton className="h-96 w-full" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-4">
        <Card className="w-full bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-600">Error Loading Template</CardTitle>
          </CardHeader>
          <CardContent>
            <p>There was an error loading the template. Please try again later.</p>
            <Button 
              variant="outline" 
              className="mt-4"
              onClick={() => setLocation('/email-templates')}
            >
              Back to Templates
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <Card className="w-full">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>{isNewTemplate ? 'Create New Template' : 'Edit Template'}</CardTitle>
              <CardDescription>{template.name}</CardDescription>
            </div>
            <div className="flex space-x-2">
              <Button 
                variant="outline" 
                onClick={() => setLocation('/email-templates')}
              >
                Cancel
              </Button>
              <Button 
                onClick={() => setShowSaveDialog(true)}
                disabled={saveMutation.isPending}
              >
                {saveMutation.isPending ? (
                  <>
                    <LoadingSpinner size="sm" />
                    <span className="ml-2">Saving...</span>
                  </>
                ) : (
                  'Save Template'
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="mb-4">
            <Label htmlFor="subject">Subject Line</Label>
            <Input
              id="subject"
              value={template.subject}
              onChange={(e) => setTemplate((prev) => ({ ...prev, subject: e.target.value }))}
              placeholder="Enter email subject line"
              className="mt-1"
            />
          </div>
          
          <div className="mb-4">
            <Label htmlFor="preheader">Preheader (Optional)</Label>
            <Input
              id="preheader"
              value={template.preheader || ''}
              onChange={(e) => setTemplate((prev) => ({ ...prev, preheader: e.target.value }))}
              placeholder="Brief summary that appears after the subject line in email clients"
              className="mt-1"
            />
          </div>
          
          <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="edit">Editor</TabsTrigger>
              <TabsTrigger value="preview">Preview</TabsTrigger>
            </TabsList>
            
            <TabsContent value="edit" className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Component Sidebar */}
                <div className="md:col-span-1">
                  <TemplateSidebar />
                </div>
                
                {/* DnD Context for drag and drop functionality */}
                <DndContext
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                  collisionDetection={closestCenter}
                >
                  {/* Canvas Area */}
                  <div className="md:col-span-2 border rounded-md min-h-[500px] p-4">
                    <CanvasArea
                      components={template.content.components}
                      selectedIndex={selectedComponentIndex}
                      onSelectComponent={setSelectedComponentIndex}
                      styles={template.content.styles}
                    />
                  </div>
                  
                  {/* DragOverlay for dragging components */}
                  <DragOverlay>
                    {activeId && (
                      <div className="p-4 border rounded-md bg-muted">
                        {activeId}
                      </div>
                    )}
                  </DragOverlay>
                </DndContext>
                
                {/* Properties Panel */}
                <div className="md:col-span-1">
                  {selectedComponentIndex !== null ? (
                    <ComponentProperties
                      component={template.content.components[selectedComponentIndex]}
                      updateContent={(content) => updateComponentContent(selectedComponentIndex, content)}
                      updateSettings={(settings) => updateComponentSettings(selectedComponentIndex, settings)}
                      deleteComponent={() => deleteComponent(selectedComponentIndex)}
                    />
                  ) : (
                    <Card>
                      <CardHeader>
                        <CardTitle>Template Styles</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="fontFamily">Font Family</Label>
                            <select
                              id="fontFamily"
                              value={template.content.styles.fontFamily}
                              onChange={(e) => updateTemplateStyles({ fontFamily: e.target.value })}
                              className="w-full mt-1 border rounded-md p-2"
                            >
                              <option value="Arial, sans-serif">Arial</option>
                              <option value="Helvetica, sans-serif">Helvetica</option>
                              <option value="Georgia, serif">Georgia</option>
                              <option value="Times New Roman, serif">Times New Roman</option>
                              <option value="Verdana, sans-serif">Verdana</option>
                              <option value="Courier New, monospace">Courier New</option>
                            </select>
                          </div>
                          
                          <div>
                            <Label htmlFor="fontSize">Font Size</Label>
                            <select
                              id="fontSize"
                              value={template.content.styles.fontSize}
                              onChange={(e) => updateTemplateStyles({ fontSize: e.target.value })}
                              className="w-full mt-1 border rounded-md p-2"
                            >
                              <option value="12px">12px</option>
                              <option value="14px">14px</option>
                              <option value="16px">16px</option>
                              <option value="18px">18px</option>
                              <option value="20px">20px</option>
                            </select>
                          </div>
                          
                          <div>
                            <Label htmlFor="textColor">Text Color</Label>
                            <div className="flex mt-1">
                              <input
                                type="color"
                                id="textColor"
                                value={template.content.styles.color}
                                onChange={(e) => updateTemplateStyles({ color: e.target.value })}
                                className="h-10 w-10"
                              />
                              <Input
                                value={template.content.styles.color}
                                onChange={(e) => updateTemplateStyles({ color: e.target.value })}
                                className="ml-2 flex-1"
                              />
                            </div>
                          </div>
                          
                          <div>
                            <Label htmlFor="bgColor">Background Color</Label>
                            <div className="flex mt-1">
                              <input
                                type="color"
                                id="bgColor"
                                value={template.content.styles.backgroundColor}
                                onChange={(e) => updateTemplateStyles({ backgroundColor: e.target.value })}
                                className="h-10 w-10"
                              />
                              <Input
                                value={template.content.styles.backgroundColor}
                                onChange={(e) => updateTemplateStyles({ backgroundColor: e.target.value })}
                                className="ml-2 flex-1"
                              />
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="preview">
              <EmailPreview template={template} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      
      {showSaveDialog && (
        <SaveTemplateDialog
          templateName={template.name}
          category={template.category}
          isOpen={showSaveDialog}
          onClose={() => setShowSaveDialog(false)}
          onSave={handleSaveTemplate}
        />
      )}
    </div>
  );
}