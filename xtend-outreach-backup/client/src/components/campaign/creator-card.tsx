import { Creator } from "@shared/schema";
import { getInitials } from "@/lib/utils";
import { useLocation } from "wouter";
import { Pencil, Trash2 } from "lucide-react";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

interface CreatorCardProps {
  creator: Creator;
  selected?: boolean;
  selectable?: boolean;
  onSelect?: () => void;
  onEdit?: (creator: Creator) => void;
  onDelete?: (id: number) => void;
}

export function CreatorCard({ 
  creator, 
  selected = false, 
  selectable = true, 
  onSelect, 
  onEdit, 
  onDelete 
}: CreatorCardProps) {
  const [, navigate] = useLocation();
  const initials = creator.initials || getInitials(creator.name);
  const formattedDate = creator.lastUpdated 
    ? new Date(creator.lastUpdated).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : 'Not updated';
  
  const handleClick = () => {
    if (selectable && onSelect) {
      onSelect();
    } else if (!selectable) {
      navigate(`/creators/${creator.id}`);
    }
  };
  
  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onEdit) {
      onEdit(creator);
    }
  };
  
  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete) {
      onDelete(creator.id);
    }
  };
  
  return (
    <div 
      className={`border rounded-lg p-5 transition-all group cursor-pointer hover:shadow-md ${
        selected ? 'border-primary ring-2 ring-primary/20 bg-primary/5' : selectable ? 'hover:border-primary/50' : 'hover:border-primary/50'
      }`}
      onClick={handleClick}
    >
      {/* Header Section */}
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0">
          <div 
            className={`w-12 h-12 rounded-full text-white flex items-center justify-center shadow-sm`}
            style={{ backgroundColor: creator.profileColor || '#4F46E5' }}
          >
            <span className="font-medium text-base">{initials}</span>
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-lg font-medium tracking-tight ${
            selected ? 'text-primary-DEFAULT' : 'text-gray-900 group-hover:text-primary-DEFAULT'
          }`}>
            {creator.name}
          </p>
          <div className="flex items-center">
            <span className="text-sm text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full">
              {creator.role}
            </span>
            <span className="text-xs text-gray-500 ml-2">
              Updated {formattedDate}
            </span>
          </div>
        </div>
        
        {/* Action Buttons */}
        {!selectable && onEdit && onDelete && (
          <div className="flex-shrink-0 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handleEdit}
              title="Edit creator"
            >
              <Pencil className="h-4 w-4" />
            </Button>
            
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                  title="Delete creator"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete the creator <strong>{creator.name}</strong> and cannot be undone.
                    All email accounts associated with this creator will remain in the system.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} className="bg-red-500 hover:bg-red-600">
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
        
        {selectable && (
          <div className="flex-shrink-0">
            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
              selected 
                ? 'border-primary bg-primary text-white scale-110' 
                : 'border-gray-300 group-hover:border-primary/70 group-hover:bg-primary/10'
            }`}>
              {selected && (
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              )}
            </div>
          </div>
        )}
      </div>
      
      {/* Bio Preview */}
      {creator.bio && (
        <div className="mt-3 p-3 bg-gray-50 rounded-md text-sm text-gray-700 overflow-hidden text-ellipsis">
          {creator.bio.length > 100 ? `${creator.bio.substring(0, 100)}...` : creator.bio}
        </div>
      )}
      
      {/* Links Section */}
      <div className="mt-3 space-y-2">
        {creator.pillarUrl && (
          <div className="flex items-center group/link">
            <span className="text-xs font-semibold uppercase text-gray-500 mr-2">PILLAR</span>
            <a 
              href={creator.pillarUrl} 
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-600 group-hover/link:text-blue-800 hover:underline truncate flex items-center"
              onClick={(e) => e.stopPropagation()}
            >
              <span className="material-icons text-xs mr-1">open_in_new</span>
              View Content
            </a>
          </div>
        )}
        
        {creator.demographicsUrl && (
          <div className="flex items-center group/link">
            <span className="text-xs font-semibold uppercase text-gray-500 mr-2">DEMOGRAPHICS</span>
            <a 
              href={creator.demographicsUrl} 
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-600 group-hover/link:text-blue-800 hover:underline truncate flex items-center"
              onClick={(e) => e.stopPropagation()}
            >
              <span className="material-icons text-xs mr-1">open_in_new</span>
              View Data
            </a>
          </div>
        )}
      </div>
      
      {/* Brand Voice Preview */}
      {creator.brandVoice && (
        <div className="mt-3">
          <div className="flex items-center mb-1">
            <span className="text-xs font-semibold uppercase text-gray-500">Brand Voice</span>
          </div>
          <div className="text-xs text-gray-700 italic px-3 py-2 bg-gray-50 rounded border-l-2 border-primary-DEFAULT">
            "{creator.brandVoice.length > 80 ? `${creator.brandVoice.substring(0, 80)}...` : creator.brandVoice}"
          </div>
        </div>
      )}
      
      {/* Metrics Preview - This would be enhanced with real metrics data when available */}
      <div className="mt-4 pt-3 border-t border-gray-100 grid grid-cols-4 gap-2">
        <div className="text-center">
          <div className="text-sm font-medium text-gray-900">0</div>
          <div className="text-xs text-gray-500">Campaigns</div>
        </div>
        <div className="text-center">
          <div className="text-sm font-medium text-gray-900">0</div>
          <div className="text-xs text-gray-500">Sent Emails</div>
        </div>
        <div className="text-center">
          <div className="text-sm font-medium text-gray-900">0</div>
          <div className="text-xs text-gray-500">Proposals</div>
        </div>
        <div className="text-center">
          <div className="text-sm font-medium text-gray-900">0</div>
          <div className="text-xs text-gray-500">Inventory</div>
        </div>
      </div>
    </div>
  );
}
