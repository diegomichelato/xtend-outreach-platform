import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { EmailComponent } from '@/pages/template-builder';
import {
  Heading,
  Type,
  Image,
  Square,
  Divide,
  ArrowUpDown,
  Share2,
  User,
  ScrollText,
  Sparkles,
  GripVertical,
  X,
} from 'lucide-react';

interface CanvasAreaProps {
  components: EmailComponent[];
  selectedIndex: number | null;
  onSelectComponent: (index: number) => void;
  styles: {
    fontFamily: string;
    fontSize: string;
    color: string;
    backgroundColor: string;
  };
}

interface SortableComponentProps {
  component: EmailComponent;
  index: number;
  isSelected: boolean;
  onClick: () => void;
  styles: {
    fontFamily: string;
    fontSize: string;
    color: string;
    backgroundColor: string;
  };
}

function getComponentIcon(type: string) {
  switch (type) {
    case 'header':
      return <Heading size={16} />;
    case 'text':
      return <Type size={16} />;
    case 'image':
      return <Image size={16} />;
    case 'button':
      return <Square size={16} />;
    case 'divider':
      return <Divide size={16} />;
    case 'spacer':
      return <ArrowUpDown size={16} />;
    case 'social':
      return <Share2 size={16} />;
    case 'personalization':
      return <User size={16} />;
    case 'signature':
      return <ScrollText size={16} />;
    case 'callToAction':
      return <Sparkles size={16} />;
    default:
      return <Type size={16} />;
  }
}

function SortableComponent({ component, index, isSelected, onClick, styles }: SortableComponentProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({
    id: `existing-${index}`,
  });

  const sortableStyle = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const renderComponentPreview = () => {
    const commonStyles = {
      fontFamily: styles.fontFamily,
      color: styles.color,
    };

    switch (component.type) {
      case 'header':
        return (
          <h2 style={{...commonStyles, fontWeight: 'bold', fontSize: '1.5em'}}>
            {component.content}
          </h2>
        );
      case 'text':
        return (
          <p style={commonStyles}>
            {component.content}
          </p>
        );
      case 'image':
        return (
          <div className="text-center">
            <img 
              src={component.content} 
              alt="Email content"
              className="max-w-full h-auto max-h-[200px] mx-auto border rounded-md"
            />
          </div>
        );
      case 'button':
        return (
          <div className="text-center my-2">
            <button
              className="bg-primary text-white px-4 py-2 rounded-md"
            >
              {component.content}
            </button>
          </div>
        );
      case 'divider':
        return <hr className="my-4 border-t" />;
      case 'spacer':
        return <div className="h-8" />;
      case 'social':
        return (
          <div className="flex justify-center space-x-4 my-2">
            {component.content.split(',').map((social, i) => (
              <span key={i} className="text-primary">
                {social.trim()}
              </span>
            ))}
          </div>
        );
      case 'personalization':
      case 'callToAction':
        return (
          <p style={commonStyles} className="font-medium">
            {component.content}
          </p>
        );
      case 'signature':
        return (
          <div style={commonStyles} className="whitespace-pre-line">
            {component.content}
          </div>
        );
      default:
        return <p>{component.content}</p>;
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={sortableStyle}
      className={`relative border rounded-md p-3 mb-2 ${isSelected ? 'border-primary-500 ring-2 ring-primary-200' : 'border-gray-200'} bg-white`}
      onClick={onClick}
    >
      <div className="flex items-center mb-1">
        <div
          className="p-1 cursor-move"
          {...attributes}
          {...listeners}
        >
          <GripVertical size={16} className="text-muted-foreground" />
        </div>
        <span className="flex items-center text-xs font-medium text-muted-foreground bg-muted px-2 py-1 rounded ml-1">
          {getComponentIcon(component.type)}
          <span className="ml-1">{component.type}</span>
        </span>
      </div>
      
      <div className="px-2">
        {renderComponentPreview()}
      </div>
    </div>
  );
}

export function CanvasArea({ components, selectedIndex, onSelectComponent, styles }: CanvasAreaProps) {
  const { setNodeRef } = useDroppable({
    id: 'canvas',
  });

  const itemIds = components.map((_, index) => `existing-${index}`);

  return (
    <div ref={setNodeRef} className="h-full flex flex-col">
      <div 
        className="flex-1 overflow-y-auto p-4 rounded-md"
        style={{
          fontFamily: styles.fontFamily,
          fontSize: styles.fontSize,
          color: styles.color,
          backgroundColor: styles.backgroundColor,
        }}
      >
        {components.length === 0 ? (
          <div className="h-full flex items-center justify-center border-2 border-dashed rounded-md p-8">
            <div className="text-center text-muted-foreground">
              <p>Drag components here to build your email</p>
              <p className="text-sm mt-1">Start with a header or text component</p>
            </div>
          </div>
        ) : (
          <SortableContext items={itemIds}>
            {components.map((component, index) => (
              <SortableComponent
                key={`${component.id}-${index}`}
                component={component}
                index={index}
                isSelected={selectedIndex === index}
                onClick={() => onSelectComponent(index)}
                styles={styles}
              />
            ))}
          </SortableContext>
        )}
      </div>
    </div>
  );
}