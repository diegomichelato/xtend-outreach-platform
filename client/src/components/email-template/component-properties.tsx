import React from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { EmailComponent } from '@/pages/template-builder';
import { Trash2 } from 'lucide-react';

interface ComponentPropertiesProps {
  component: EmailComponent;
  updateContent: (content: string) => void;
  updateSettings: (settings: Record<string, any>) => void;
  deleteComponent: () => void;
}

export function ComponentProperties({
  component,
  updateContent,
  updateSettings,
  deleteComponent,
}: ComponentPropertiesProps) {
  const renderSpecificSettings = () => {
    switch (component.type) {
      case 'header':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="headerContent">Header Content</Label>
              <Textarea
                id="headerContent"
                value={component.content}
                onChange={(e) => updateContent(e.target.value)}
                className="mt-1 h-24"
                placeholder="Enter header text"
              />
              <p className="text-xs text-muted-foreground mt-1">
                You can use variables like {{firstName}} or {{company}}
              </p>
            </div>
          </div>
        );
      
      case 'text':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="textContent">Text Content</Label>
              <Textarea
                id="textContent"
                value={component.content}
                onChange={(e) => updateContent(e.target.value)}
                className="mt-1 h-32"
                placeholder="Enter text content"
              />
              <p className="text-xs text-muted-foreground mt-1">
                You can use variables like {{firstName}} or {{company}}
              </p>
            </div>
          </div>
        );
      
      case 'image':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="imageUrl">Image URL</Label>
              <Input
                id="imageUrl"
                type="url"
                value={component.content}
                onChange={(e) => updateContent(e.target.value)}
                className="mt-1"
                placeholder="https://example.com/image.jpg"
              />
            </div>
            <div>
              <Label htmlFor="imageAlt">Alt Text</Label>
              <Input
                id="imageAlt"
                type="text"
                value={component.settings?.alt || ''}
                onChange={(e) => updateSettings({ alt: e.target.value })}
                className="mt-1"
                placeholder="Image description for accessibility"
              />
            </div>
            <div className="pt-2">
              <img 
                src={component.content} 
                alt={component.settings?.alt || 'Email image'} 
                className="max-w-full h-auto border rounded-md"
                onError={(e) => {
                  e.currentTarget.src = 'https://via.placeholder.com/300x150?text=Invalid+Image+URL';
                }}
              />
            </div>
          </div>
        );
      
      case 'button':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="buttonText">Button Text</Label>
              <Input
                id="buttonText"
                type="text"
                value={component.content}
                onChange={(e) => updateContent(e.target.value)}
                className="mt-1"
                placeholder="Click Here"
              />
            </div>
            <div>
              <Label htmlFor="buttonUrl">Button URL</Label>
              <Input
                id="buttonUrl"
                type="url"
                value={component.settings?.url || ''}
                onChange={(e) => updateSettings({ url: e.target.value })}
                className="mt-1"
                placeholder="https://example.com"
              />
            </div>
            <div>
              <Label htmlFor="buttonColor">Button Color</Label>
              <div className="flex mt-1">
                <input
                  type="color"
                  id="buttonColor"
                  value={component.settings?.color || '#00a99d'}
                  onChange={(e) => updateSettings({ color: e.target.value })}
                  className="h-10 w-10"
                />
                <Input
                  value={component.settings?.color || '#00a99d'}
                  onChange={(e) => updateSettings({ color: e.target.value })}
                  className="ml-2 flex-1"
                />
              </div>
            </div>
          </div>
        );
      
      case 'divider':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="dividerColor">Divider Color</Label>
              <div className="flex mt-1">
                <input
                  type="color"
                  id="dividerColor"
                  value={component.settings?.color || '#e2e8f0'}
                  onChange={(e) => updateSettings({ color: e.target.value })}
                  className="h-10 w-10"
                />
                <Input
                  value={component.settings?.color || '#e2e8f0'}
                  onChange={(e) => updateSettings({ color: e.target.value })}
                  className="ml-2 flex-1"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="dividerThickness">Thickness (px)</Label>
              <Input
                id="dividerThickness"
                type="number"
                min="1"
                max="10"
                value={component.settings?.thickness || 1}
                onChange={(e) => updateSettings({ thickness: parseInt(e.target.value) })}
                className="mt-1"
              />
            </div>
          </div>
        );
      
      case 'spacer':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="spacerHeight">Height (px)</Label>
              <Input
                id="spacerHeight"
                type="number"
                min="5"
                max="100"
                value={component.settings?.height || 20}
                onChange={(e) => updateSettings({ height: parseInt(e.target.value) })}
                className="mt-1"
              />
            </div>
          </div>
        );
      
      case 'social':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="socialLinks">Social Networks</Label>
              <Input
                id="socialLinks"
                type="text"
                value={component.content}
                onChange={(e) => updateContent(e.target.value)}
                className="mt-1"
                placeholder="facebook,twitter,linkedin"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Comma-separated list of social networks
              </p>
            </div>
          </div>
        );
      
      case 'personalization':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="personalizationContent">Personalized Text</Label>
              <Textarea
                id="personalizationContent"
                value={component.content}
                onChange={(e) => updateContent(e.target.value)}
                className="mt-1 h-24"
                placeholder="Hello {{firstName}},"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Use variables like {{firstName}}, {{company}}, {{industry}}
              </p>
            </div>
          </div>
        );
      
      case 'signature':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="signatureContent">Signature Content</Label>
              <Textarea
                id="signatureContent"
                value={component.content}
                onChange={(e) => updateContent(e.target.value)}
                className="mt-1 h-40"
                placeholder="Best regards,\n{{creatorName}}\n{{creatorRole}}"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Use variables like {{creatorName}}, {{creatorRole}}
              </p>
            </div>
          </div>
        );
      
      case 'callToAction':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="ctaContent">Call to Action Text</Label>
              <Textarea
                id="ctaContent"
                value={component.content}
                onChange={(e) => updateContent(e.target.value)}
                className="mt-1 h-32"
                placeholder="Would you be available for a 15-minute call next week?"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Make your call to action clear and compelling
              </p>
            </div>
          </div>
        );
      
      default:
        return (
          <div>
            <Label htmlFor="genericContent">Content</Label>
            <Textarea
              id="genericContent"
              value={component.content}
              onChange={(e) => updateContent(e.target.value)}
              className="mt-1 h-32"
            />
          </div>
        );
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-medium">
          Edit {component.type.charAt(0).toUpperCase() + component.type.slice(1)}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {renderSpecificSettings()}
      </CardContent>
      <CardFooter className="flex justify-end">
        <Button
          variant="destructive"
          size="sm"
          onClick={deleteComponent}
          className="flex items-center"
        >
          <Trash2 className="h-4 w-4 mr-1" />
          Delete
        </Button>
      </CardFooter>
    </Card>
  );
}