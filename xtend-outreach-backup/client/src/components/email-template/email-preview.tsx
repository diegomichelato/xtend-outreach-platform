import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { EmailTemplateData } from '@/pages/template-builder';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

interface EmailPreviewProps {
  template: EmailTemplateData;
}

export function EmailPreview({ template }: EmailPreviewProps) {
  const [previewMode, setPreviewMode] = useState('desktop');
  const [previewVariables, setPreviewVariables] = useState<Record<string, string>>({
    firstName: 'Alex',
    lastName: 'Johnson',
    company: 'Acme Inc',
    industry: 'Technology',
    role: 'CTO',
    creatorName: 'Sarah Williams',
    creatorRole: 'Growth Specialist',
    painPoint: 'customer retention',
  });

  const replaceVariables = (content: string): string => {
    let result = content;
    
    Object.entries(previewVariables).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      result = result.replace(regex, value);
    });
    
    return result;
  };

  const renderComponentPreview = (component: any) => {
    const commonStyles = {
      fontFamily: template.content.styles.fontFamily,
      color: template.content.styles.color,
    };

    switch (component.type) {
      case 'header':
        return (
          <h2 
            style={{...commonStyles, fontWeight: 'bold', fontSize: '1.5em'}}
            className="my-3"
          >
            {replaceVariables(component.content)}
          </h2>
        );
      case 'text':
        return (
          <p 
            style={commonStyles}
            className="my-3"
          >
            {replaceVariables(component.content)}
          </p>
        );
      case 'image':
        return (
          <div className="text-center my-3">
            <img 
              src={component.content} 
              alt={component.settings?.alt || 'Email content'}
              className="max-w-full h-auto mx-auto rounded-md"
              style={{ maxHeight: '200px' }}
            />
          </div>
        );
      case 'button':
        return (
          <div className="text-center my-3">
            <a 
              href={component.settings?.url || '#'} 
              target="_blank" 
              style={{
                backgroundColor: component.settings?.color || '#00a99d',
                color: '#ffffff',
                paddingLeft: '16px',
                paddingRight: '16px',
                paddingTop: '8px',
                paddingBottom: '8px',
                borderRadius: '4px',
                textDecoration: 'none',
                display: 'inline-block',
                fontWeight: 'bold',
              }}
            >
              {replaceVariables(component.content)}
            </a>
          </div>
        );
      case 'divider':
        return (
          <hr 
            className="my-4" 
            style={{
              borderTop: `${component.settings?.thickness || 1}px solid ${component.settings?.color || '#e2e8f0'}`
            }}
          />
        );
      case 'spacer':
        return (
          <div style={{ height: `${component.settings?.height || 20}px` }} />
        );
      case 'social':
        return (
          <div className="flex justify-center space-x-4 my-3">
            {component.content.split(',').map((social: string, i: number) => (
              <a 
                key={i} 
                href="#" 
                style={{ color: '#00a99d', textDecoration: 'none' }}
                className="font-medium"
              >
                {social.trim()}
              </a>
            ))}
          </div>
        );
      case 'personalization':
      case 'callToAction':
        return (
          <p 
            style={commonStyles}
            className="my-3 font-medium"
          >
            {replaceVariables(component.content)}
          </p>
        );
      case 'signature':
        return (
          <div 
            style={commonStyles}
            className="my-3 whitespace-pre-line"
          >
            {replaceVariables(component.content)}
          </div>
        );
      default:
        return (
          <p>{replaceVariables(component.content)}</p>
        );
    }
  };

  return (
    <div>
      <div className="mb-4">
        <Label htmlFor="preview-mode">Preview Mode</Label>
        <Tabs value={previewMode} onValueChange={setPreviewMode} className="w-full mt-1">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="desktop">Desktop</TabsTrigger>
            <TabsTrigger value="tablet">Tablet</TabsTrigger>
            <TabsTrigger value="mobile">Mobile</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="md:col-span-3">
          <Card className="overflow-hidden">
            <CardHeader className="bg-muted px-4 py-3">
              <div className="flex items-center">
                <div className="flex-1">
                  <div className="flex items-center text-sm text-muted-foreground">
                    <span className="mr-2">From:</span>
                    <span className="font-medium">{previewVariables.creatorName} &lt;{previewVariables.creatorName.toLowerCase().replace(' ', '.')}@example.com&gt;</span>
                  </div>
                  <div className="flex items-center text-sm font-medium mt-1">
                    <span className="mr-2">Subject:</span>
                    <span>{replaceVariables(template.subject)}</span>
                  </div>
                  {template.preheader && (
                    <div className="text-xs text-muted-foreground mt-1 italic">
                      {replaceVariables(template.preheader)}
                    </div>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div 
                style={{
                  maxWidth: previewMode === 'desktop' ? '100%' : previewMode === 'tablet' ? '768px' : '375px',
                  fontFamily: template.content.styles.fontFamily,
                  fontSize: template.content.styles.fontSize,
                  color: template.content.styles.color,
                  backgroundColor: template.content.styles.backgroundColor,
                  margin: '0 auto',
                  padding: '20px',
                  overflowX: 'auto',
                }}
              >
                {template.content.components.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    <p>No content in this template</p>
                    <p className="text-sm mt-1">Add some components to see the preview</p>
                  </div>
                ) : (
                  template.content.components.map((component, index) => (
                    <div key={index}>
                      {renderComponentPreview(component)}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
        
        <div className="md:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-medium">Preview Variables</CardTitle>
              <CardDescription>Customize variables used in preview</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label htmlFor="preview-firstName">First Name</Label>
                <input
                  id="preview-firstName"
                  value={previewVariables.firstName}
                  onChange={(e) => setPreviewVariables({...previewVariables, firstName: e.target.value})}
                  className="w-full mt-1 border rounded-md p-2"
                />
              </div>
              
              <div>
                <Label htmlFor="preview-company">Company</Label>
                <input
                  id="preview-company"
                  value={previewVariables.company}
                  onChange={(e) => setPreviewVariables({...previewVariables, company: e.target.value})}
                  className="w-full mt-1 border rounded-md p-2"
                />
              </div>
              
              <div>
                <Label htmlFor="preview-industry">Industry</Label>
                <input
                  id="preview-industry"
                  value={previewVariables.industry}
                  onChange={(e) => setPreviewVariables({...previewVariables, industry: e.target.value})}
                  className="w-full mt-1 border rounded-md p-2"
                />
              </div>
              
              <div>
                <Label htmlFor="preview-role">Role</Label>
                <input
                  id="preview-role"
                  value={previewVariables.role}
                  onChange={(e) => setPreviewVariables({...previewVariables, role: e.target.value})}
                  className="w-full mt-1 border rounded-md p-2"
                />
              </div>
              
              <div>
                <Label htmlFor="preview-creatorName">Creator Name</Label>
                <input
                  id="preview-creatorName"
                  value={previewVariables.creatorName}
                  onChange={(e) => setPreviewVariables({...previewVariables, creatorName: e.target.value})}
                  className="w-full mt-1 border rounded-md p-2"
                />
              </div>
              
              <div>
                <Label htmlFor="preview-creatorRole">Creator Role</Label>
                <input
                  id="preview-creatorRole"
                  value={previewVariables.creatorRole}
                  onChange={(e) => setPreviewVariables({...previewVariables, creatorRole: e.target.value})}
                  className="w-full mt-1 border rounded-md p-2"
                />
              </div>
              
              <div>
                <Label htmlFor="preview-painPoint">Pain Point</Label>
                <input
                  id="preview-painPoint"
                  value={previewVariables.painPoint}
                  onChange={(e) => setPreviewVariables({...previewVariables, painPoint: e.target.value})}
                  className="w-full mt-1 border rounded-md p-2"
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}