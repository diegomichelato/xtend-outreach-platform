import React, { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  PlusCircle,
  Trash,
  MoveHorizontal,
  PenLine,
  StickyNote,
  Mail,
  Target,
  SquareUser,
} from 'lucide-react';

// Define types for whiteboard elements
type Position = {
  x: number;
  y: number;
};

type ElementType = 'note' | 'emailOutline' | 'audience' | 'persona';

interface WhiteboardElement {
  id: string;
  type: ElementType;
  position: Position;
  content: string;
  color?: string;
  title?: string;
  createdBy?: string;
  createdAt: Date;
}

// Props for the WhiteboardCanvas component
interface WhiteboardCanvasProps {
  campaignId?: number;
  onSave?: (elements: WhiteboardElement[]) => void;
  initialElements?: WhiteboardElement[];
  collaborators?: { id: number; name: string }[];
  readonly?: boolean;
}

// Available colors for notes
const COLORS = [
  'bg-yellow-100 border-yellow-300',
  'bg-blue-100 border-blue-300',
  'bg-green-100 border-green-300',
  'bg-pink-100 border-pink-300',
  'bg-purple-100 border-purple-300',
  'bg-orange-100 border-orange-300',
];

export function WhiteboardCanvas({
  campaignId,
  onSave,
  initialElements = [],
  collaborators = [],
  readonly = false,
}: WhiteboardCanvasProps) {
  const [elements, setElements] = useState<WhiteboardElement[]>(initialElements);
  const [activeElement, setActiveElement] = useState<string | null>(null);
  const [newNoteContent, setNewNoteContent] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState<Position>({ x: 0, y: 0 });
  const [dragStartPos, setDragStartPos] = useState<Position>({ x: 0, y: 0 });
  const [tool, setTool] = useState<ElementType>('note');
  
  const canvasRef = useRef<HTMLDivElement>(null);

  // Generate a unique ID for new elements
  const generateId = () => `element-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  // Add a new element to the whiteboard
  const addElement = (type: ElementType, position: Position) => {
    const newElement: WhiteboardElement = {
      id: generateId(),
      type,
      position,
      content: '',
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      createdAt: new Date(),
      createdBy: 'Me', // In a real app, this would be the current user's name
    };

    switch (type) {
      case 'note':
        newElement.title = 'New Note';
        break;
      case 'emailOutline':
        newElement.title = 'Email Outline';
        newElement.content = 'Subject:\n\nIntroduction:\n\nMain Points:\n\nCall to Action:';
        break;
      case 'audience':
        newElement.title = 'Target Audience';
        newElement.content = 'Industry:\nRole:\nCompany Size:\nPain Points:';
        break;
      case 'persona':
        newElement.title = 'Buyer Persona';
        newElement.content = 'Name:\nRole:\nGoals:\nChallenges:';
        break;
    }

    setElements([...elements, newElement]);
    setActiveElement(newElement.id);
  };

  // Handle mouse down event on an element
  const handleMouseDown = (e: React.MouseEvent, elementId: string) => {
    if (readonly) return;
    
    const element = elements.find(el => el.id === elementId);
    if (!element) return;
    
    setActiveElement(elementId);
    setIsDragging(true);
    
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
    
    setDragStartPos({
      x: element.position.x,
      y: element.position.y,
    });
    
    e.preventDefault();
  };

  // Handle mouse move event for dragging elements
  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging || !activeElement || readonly) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left - dragOffset.x;
    const y = e.clientY - rect.top - dragOffset.y;
    
    setElements(elements.map(el => 
      el.id === activeElement
        ? { ...el, position: { x: Math.max(0, x), y: Math.max(0, y) } }
        : el
    ));
  };

  // Handle mouse up event to end dragging
  const handleMouseUp = () => {
    if (isDragging && onSave) {
      onSave(elements);
    }
    setIsDragging(false);
  };

  // Update element content
  const updateElementContent = (id: string, content: string) => {
    setElements(elements.map(el => 
      el.id === id ? { ...el, content } : el
    ));
  };

  // Update element title
  const updateElementTitle = (id: string, title: string) => {
    setElements(elements.map(el => 
      el.id === id ? { ...el, title } : el
    ));
  };

  // Delete an element
  const deleteElement = (id: string) => {
    setElements(elements.filter(el => el.id !== id));
    if (activeElement === id) {
      setActiveElement(null);
    }
    if (onSave) {
      onSave(elements.filter(el => el.id !== id));
    }
  };

  // Set up event listeners for mouse move and up
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Save changes when elements are updated
  useEffect(() => {
    if (onSave) {
      const saveTimeout = setTimeout(() => {
        onSave(elements);
      }, 1000); // Debounce save to avoid too many requests
      
      return () => clearTimeout(saveTimeout);
    }
  }, [elements, onSave]);

  // Handle adding a new element at a specific position
  const handleCanvasClick = (e: React.MouseEvent) => {
    if (readonly) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // Only add element on direct canvas click, not when clicking on existing elements
    if ((e.target as HTMLElement).classList.contains('whiteboard-canvas')) {
      const rect = canvas.getBoundingClientRect();
      const position = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
      
      addElement(tool, position);
    }
  };

  return (
    <div className="whiteboard-container h-full flex flex-col">
      <div className="whiteboard-toolbar flex items-center justify-between p-2 bg-gray-100 rounded-t-md border-b">
        <div className="flex space-x-2">
          <Button 
            variant={tool === 'note' ? 'secondary' : 'outline'} 
            size="sm" 
            onClick={() => setTool('note')}
            className="flex items-center"
            disabled={readonly}
          >
            <StickyNote className="h-4 w-4 mr-1" />
            Note
          </Button>
          <Button 
            variant={tool === 'emailOutline' ? 'secondary' : 'outline'} 
            size="sm" 
            onClick={() => setTool('emailOutline')}
            className="flex items-center"
            disabled={readonly}
          >
            <Mail className="h-4 w-4 mr-1" />
            Email Outline
          </Button>
          <Button 
            variant={tool === 'audience' ? 'secondary' : 'outline'} 
            size="sm" 
            onClick={() => setTool('audience')}
            className="flex items-center"
            disabled={readonly}
          >
            <Target className="h-4 w-4 mr-1" />
            Audience
          </Button>
          <Button 
            variant={tool === 'persona' ? 'secondary' : 'outline'} 
            size="sm" 
            onClick={() => setTool('persona')}
            className="flex items-center"
            disabled={readonly}
          >
            <SquareUser className="h-4 w-4 mr-1" />
            Persona
          </Button>
        </div>
        
        <div className="flex items-center">
          {collaborators.map(collaborator => (
            <Badge key={collaborator.id} variant="outline" className="ml-1">
              {collaborator.name}
            </Badge>
          ))}
        </div>
      </div>
      
      <div 
        ref={canvasRef}
        className="whiteboard-canvas relative flex-grow bg-white border rounded-b-md overflow-auto h-[600px] p-4"
        onClick={handleCanvasClick}
      >
        {elements.map((element) => (
          <div
            key={element.id}
            className={`absolute p-3 rounded shadow-md cursor-move ${element.color} border-2`}
            style={{
              left: `${element.position.x}px`,
              top: `${element.position.y}px`,
              zIndex: activeElement === element.id ? 10 : 1,
              minWidth: '200px',
              maxWidth: '300px',
            }}
            onMouseDown={(e) => handleMouseDown(e, element.id)}
          >
            <div className="flex justify-between items-center mb-2">
              <Input
                value={element.title || ''}
                onChange={(e) => updateElementTitle(element.id, e.target.value)}
                className="bg-transparent border-none p-0 text-sm font-medium focus:ring-0"
                readOnly={readonly}
              />
              {!readonly && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => deleteElement(element.id)}
                >
                  <Trash className="h-4 w-4 text-gray-500 hover:text-red-500" />
                </Button>
              )}
            </div>
            
            <textarea
              value={element.content}
              onChange={(e) => updateElementContent(element.id, e.target.value)}
              className="w-full bg-transparent border-none resize-none focus:ring-0 min-h-[100px]"
              readOnly={readonly}
            />
            
            <div className="text-xs text-gray-500 mt-2 flex justify-between items-center">
              <span>{element.createdBy}</span>
              <span>{new Date(element.createdAt).toLocaleTimeString()}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}