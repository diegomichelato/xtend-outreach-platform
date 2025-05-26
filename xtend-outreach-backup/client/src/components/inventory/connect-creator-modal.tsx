import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { 
  Dialog, 
  DialogContent, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle,
  DialogDescription
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

interface ConnectCreatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  videoId: string;
  videoName: string;
  onConnect: (videoId: string, creatorId: number) => Promise<void>;
}

const ConnectCreatorModal: React.FC<ConnectCreatorModalProps> = ({
  isOpen,
  onClose,
  videoId,
  videoName,
  onConnect
}) => {
  const { toast } = useToast();
  const [availableCreators, setAvailableCreators] = useState<Array<{id: number, name: string}>>([]);
  const [selectedCreatorId, setSelectedCreatorId] = useState<number | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  // Fetch available creators when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchAvailableCreators();
    }
  }, [isOpen]);

  // Fetch available creators for connecting to videos
  const fetchAvailableCreators = async () => {
    try {
      console.log('Fetching available creators...');
      const response = await fetch('/api/creators');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      console.log('Available creators data:', data);
      
      if (Array.isArray(data) && data.length > 0) {
        setAvailableCreators(data.map((creator: any) => ({
          id: creator.id,
          name: creator.name
        })));
      } else {
        console.warn('No creators available or invalid data format', data);
        setAvailableCreators([]);
      }
    } catch (error) {
      console.error('Error fetching creators:', error);
      toast({
        title: "Error",
        description: "Failed to load available creators",
        variant: "destructive"
      });
    }
  };

  // Connect a video to a creator
  const handleConnectCreator = async () => {
    if (!videoId || !selectedCreatorId) return;
    
    setIsConnecting(true);
    try {
      await onConnect(videoId, selectedCreatorId);
      toast({
        title: "Success",
        description: `Video successfully connected to creator profile.`
      });
      handleClose();
    } catch (error) {
      console.error('Error connecting video to creator:', error);
      toast({
        title: "Error",
        description: "Failed to connect video to creator profile",
        variant: "destructive"
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const handleClose = () => {
    setSelectedCreatorId(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Connect Video to Creator Profile</DialogTitle>
          <DialogDescription>
            Link "{videoName}" to an existing creator profile to enhance video information and enable detailed analytics.
          </DialogDescription>
        </DialogHeader>
        
        <div className="my-4">
          <Label htmlFor="creatorSelect">Select Creator</Label>
          <Select 
            onValueChange={(value) => setSelectedCreatorId(Number(value))}
            value={selectedCreatorId?.toString()}
          >
            <SelectTrigger id="creatorSelect">
              <SelectValue placeholder="Select a creator" />
            </SelectTrigger>
            <SelectContent>
              {availableCreators.map((creator) => (
                <SelectItem key={creator.id} value={creator.id.toString()}>
                  {creator.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <DialogFooter className="flex justify-end gap-3 mt-6">
          <Button
            variant="outline"
            onClick={handleClose}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConnectCreator}
            disabled={!selectedCreatorId || isConnecting}
          >
            {isConnecting ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-current mr-2"></div>
                Connecting...
              </>
            ) : "Connect Video"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ConnectCreatorModal;