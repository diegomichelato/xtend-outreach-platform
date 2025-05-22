import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { EmailComponentType } from './component-types';
import {
  Type,
  Image,
  Square,
  Heading,
  Divide,
  ArrowUpDown,
  Share2,
  User,
  ScrollText,
  Sparkles,
} from 'lucide-react';

interface ComponentItemProps {
  type: EmailComponentType;
  name: string;
  icon: React.ReactNode;
}

function ComponentItem({ type, name, icon }: ComponentItemProps) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: type,
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: 1000,
      }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={style}
      className="flex items-center gap-2 p-2 border rounded-md mb-2 cursor-move bg-white hover:bg-slate-50 active:bg-slate-100"
    >
      <div className="text-muted-foreground">{icon}</div>
      <span>{name}</span>
    </div>
  );
}

export function TemplateSidebar() {
  const componentItems: ComponentItemProps[] = [
    { type: 'header', name: 'Header', icon: <Heading size={16} /> },
    { type: 'text', name: 'Text', icon: <Type size={16} /> },
    { type: 'image', name: 'Image', icon: <Image size={16} /> },
    { type: 'button', name: 'Button', icon: <Square size={16} /> },
    { type: 'divider', name: 'Divider', icon: <Divide size={16} /> },
    { type: 'spacer', name: 'Spacer', icon: <ArrowUpDown size={16} /> },
    { type: 'social', name: 'Social Links', icon: <Share2 size={16} /> },
    { type: 'personalization', name: 'Personalization', icon: <User size={16} /> },
    { type: 'signature', name: 'Signature', icon: <ScrollText size={16} /> },
    { type: 'callToAction', name: 'Call to Action', icon: <Sparkles size={16} /> },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-medium">Components</CardTitle>
      </CardHeader>
      <CardContent className="p-3">
        <p className="text-sm text-muted-foreground mb-3">
          Drag and drop components onto the canvas
        </p>
        <div className="space-y-1">
          {componentItems.map((item) => (
            <ComponentItem
              key={item.type}
              type={item.type}
              name={item.name}
              icon={item.icon}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}