import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface Creator {
  id: number;
  name: string;
}

interface BulkConnectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedVideoIds: string[];
  onConnect: (videoIds: string[], creatorId: number) => Promise<void>;
}

export default function BulkConnectModal({
  open,
  onOpenChange,
  selectedVideoIds,
  onConnect
}: BulkConnectModalProps) {
  const { toast } = useToast();
  const [creators, setCreators] = useState<Creator[]>([]);
  const [selectedCreatorId, setSelectedCreatorId] = useState<string>("");
  const [isConnecting, setIsConnecting] = useState(false);

  // Fetch available creators when dialog opens
  useEffect(() => {
    if (open) {
      fetchCreators();
    } else {
      // Reset state when modal closes
      setSelectedCreatorId("");
    }
  }, [open]);

  const fetchCreators = async () => {
    try {
      const response = await fetch('/api/creators');
      if (!response.ok) {
        throw new Error('Failed to fetch creators');
      }
      const data = await response.json();
      console.log('Fetched creators for bulk connect:', data);
      setCreators(data);
    } catch (error) {
      console.error('Error fetching creators:', error);
      toast({
        title: "Error",
        description: "Failed to load available creators",
        variant: "destructive"
      });
    }
  };

  const handleBulkConnect = async () => {
    if (!selectedCreatorId || selectedVideoIds.length === 0) {
      toast({
        title: "Error",
        description: "Please select a creator and ensure videos are selected",
        variant: "destructive"
      });
      return;
    }

    setIsConnecting(true);
    try {
      await onConnect(selectedVideoIds, parseInt(selectedCreatorId));
      
      // Dialog will be closed by the parent component after connection completes
    } catch (error) {
      console.error('Error in bulk connect:', error);
      toast({
        title: "Error",
        description: "Failed to connect videos to creator profile",
        variant: "destructive"
      });
      setIsConnecting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Connect Videos to Creator</DialogTitle>
          <DialogDescription>
            Link {selectedVideoIds.length} selected videos to a creator profile.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <div className="space-y-4">
            <div>
              <Label>Selected Videos</Label>
              <div className="mt-2 p-2 bg-muted rounded-md text-sm">
                {selectedVideoIds.length} videos selected
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="bulk-creator">Select Creator</Label>
              <Select 
                value={selectedCreatorId}
                onValueChange={setSelectedCreatorId}
              >
                <SelectTrigger id="bulk-creator">
                  <SelectValue placeholder="Select Creator" />
                </SelectTrigger>
                <SelectContent>
                  {creators.map((creator) => (
                    <SelectItem key={creator.id} value={creator.id.toString()}>
                      {creator.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            disabled={isConnecting}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleBulkConnect}
            disabled={!selectedCreatorId || isConnecting || selectedVideoIds.length === 0}
          >
            {isConnecting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Connecting...
              </>
            ) : (
              `Connect ${selectedVideoIds.length} Videos`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}