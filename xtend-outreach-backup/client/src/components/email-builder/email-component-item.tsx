import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { CSSProperties } from "react";
import { GripVertical, X, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Component types - should match what's in template-builder.tsx
type ComponentType = "header" | "text" | "image" | "button" | "divider" | "spacer" | "social" | "personalization" | "signature" | "callToAction";

interface EmailComponent {
  id: string;
  type: ComponentType;
  content: string;
  settings?: Record<string, any>;
}

interface EmailComponentItemProps {
  component: EmailComponent;
  onSelect: () => void;
  onDelete: () => void;
  isSelected: boolean;
}

export function EmailComponentItem({ 
  component, 
  onSelect, 
  onDelete,
  isSelected 
}: EmailComponentItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: component.id });

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const renderPreview = () => {
    switch (component.type) {
      case "header":
        return <h3 className="text-lg font-bold">{component.content}</h3>;
      
      case "text":
        return <p>{component.content}</p>;
      
      case "button":
        return (
          <button 
            className="px-4 py-2 rounded bg-primary-DEFAULT text-white inline-block"
            style={{ 
              backgroundColor: component.settings?.color || "#00a99d",
            }}
          >
            {component.content}
          </button>
        );
      
      case "image":
        return (
          <div className="bg-gray-100 p-2 text-center">
            [Image: {component.content.substring(0, 30)}...]
          </div>
        );
      
      case "divider":
        return <hr className="my-2 border-t border-gray-200" />;
      
      case "spacer":
        return <div className="h-6 bg-gray-50"></div>;
      
      case "social":
        return (
          <div className="flex space-x-2">
            <span className="material-icons">share</span>
            <span>Social Links</span>
          </div>
        );
      
      case "personalization":
        return (
          <div className="font-medium text-primary-DEFAULT">
            {component.content}
          </div>
        );
      
      case "signature":
        return (
          <div className="font-italic text-gray-600">
            <pre className="font-sans whitespace-pre-wrap">{component.content}</pre>
          </div>
        );
      
      case "callToAction":
        return (
          <div className="font-bold text-primary-DEFAULT">
            {component.content}
          </div>
        );
      
      default:
        return <div>{component.content}</div>;
    }
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      className={cn(
        "relative p-3 border rounded my-2 bg-white cursor-pointer group",
        isSelected ? "border-primary-DEFAULT shadow-sm" : "border-gray-200"
      )}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
    >
      <div 
        className="absolute left-1 inset-y-0 flex items-center cursor-move opacity-30 group-hover:opacity-100" 
        {...attributes} 
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </div>
      
      <div className="pl-5 pr-14">
        {renderPreview()}
      </div>
      
      <div className="absolute right-1 inset-y-0 flex items-center">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0 mr-1 opacity-30 group-hover:opacity-100"
          onClick={(e) => {
            e.stopPropagation();
            onSelect();
          }}
        >
          <Settings className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0 text-destructive opacity-30 group-hover:opacity-100"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}