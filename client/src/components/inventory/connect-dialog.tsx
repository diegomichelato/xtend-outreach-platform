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

interface Creator {
  id: number;
  name: string;
}

interface ConnectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  videoId: string;
  videoName: string;
  onRefresh: () => void;
}

export default function ConnectDialog({ 
  open, 
  onOpenChange, 
  videoId, 
  videoName,
  onRefresh
}: ConnectDialogProps) {
  const { toast } = useToast();
  const [creators, setCreators] = useState<Creator[]>([]);
  const [selectedCreatorId, setSelectedCreatorId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);

  // Fetch available creators when dialog opens
  useEffect(() => {
    if (open) {
      fetchCreators();
    }
  }, [open]);

  const fetchCreators = async () => {
    try {
      const response = await fetch('/api/creators');
      if (!response.ok) {
        throw new Error('Failed to fetch creators');
      }
      const data = await response.json();
      console.log('Fetched creators:', data);
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

  const handleConnect = async () => {
    if (!selectedCreatorId) {
      toast({
        title: "Error",
        description: "Please select a creator",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/connect-video', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          videoId,
          creatorId: parseInt(selectedCreatorId)
        })
      });

      if (!response.ok) {
        throw new Error('Failed to connect video to creator');
      }

      toast({
        title: "Success",
        description: "Video successfully connected to creator profile"
      });
      
      // Close dialog and trigger refresh
      onOpenChange(false);
      onRefresh();
    } catch (error) {
      console.error('Error connecting video to creator:', error);
      toast({
        title: "Error",
        description: "Failed to connect video to creator profile",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Connect Video to Creator Profile</DialogTitle>
          <DialogDescription>
            Link "{videoName}" to an existing creator profile to enhance video information and analytics.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 mb-4">
          <Label htmlFor="creator-select">Select Creator</Label>
          <Select value={selectedCreatorId} onValueChange={setSelectedCreatorId}>
            <SelectTrigger id="creator-select">
              <SelectValue placeholder="Choose a creator" />
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

        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleConnect} 
            disabled={isLoading || !selectedCreatorId}
          >
            {isLoading ? (
              <>
                <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-b-transparent"></span>
                Connecting...
              </>
            ) : (
              "Connect Video"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}