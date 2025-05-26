import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { CSVUploader } from "./csv-uploader";
import { apiRequest } from "@/lib/queryClient";
import { useCampaign } from "@/hooks/use-campaign";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { useQuery } from "@tanstack/react-query";
import { ContactList } from "@shared/schema";
import { Loader2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";

interface UploadContactsStepProps {
  onNext: () => void;
}

export function UploadContactsStep({ onNext }: UploadContactsStepProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [selectedListId, setSelectedListId] = useState<string>("");
  const { updateCampaign, campaign } = useCampaign();
  const { toast } = useToast();
  const [debugInfo, setDebugInfo] = useState<{lastAction: string, timestamp: Date, success: boolean}>({
    lastAction: '',
    timestamp: new Date(),
    success: false
  });
  
  // If we already have a contact list ID, set it as selected
  useEffect(() => {
    if (campaign.contactListId) {
      setSelectedListId(campaign.contactListId.toString());
      console.log("Restored contact list ID from campaign state:", campaign.contactListId);
    }
  }, [campaign.contactListId]);
  
  const { data: contactLists, isLoading } = useQuery<ContactList[]>({
    queryKey: ['/api/contact-lists'],
  });

  const handleCsvUpload = async (csvData: any[], listName: string) => {
    setIsUploading(true);
    setDebugInfo({
      lastAction: 'Starting CSV upload',
      timestamp: new Date(),
      success: false
    });
    
    try {
      console.log("Uploading CSV data with", csvData.length, "contacts");
      
      const response = await apiRequest("POST", "/api/contacts/batch", {
        contacts: csvData,
        listName
      });
      
      const responseData = await response.json();
      const { contactListId } = responseData;
      
      console.log("Contact upload successful, received contactListId:", contactListId);
      
      if (!contactListId) {
        throw new Error("No contactListId returned from server");
      }
      
      // Use a direct number, not an object to avoid issues with type confusion
      const listIdNumber = parseInt(contactListId.toString());
      console.log("Parsed contact list ID:", listIdNumber);
      
      // Update campaign with the contact list ID
      updateCampaign({ contactListId: listIdNumber });
      
      setDebugInfo({
        lastAction: `CSV upload successful, list ID: ${listIdNumber}`,
        timestamp: new Date(),
        success: true
      });
      
      // Refresh the contact lists
      queryClient.invalidateQueries({ queryKey: ['/api/contact-lists'] });
      
      toast({
        title: "Contacts uploaded",
        description: `Successfully uploaded ${csvData.length} contacts to a new list (ID: ${listIdNumber}).`,
      });
      
      // Small delay to ensure state is updated before navigating
      setTimeout(() => {
        onNext();
      }, 100);
    } catch (error) {
      console.error("Error uploading contacts:", error);
      
      setDebugInfo({
        lastAction: `Upload failed: ${error instanceof Error ? error.message : String(error)}`,
        timestamp: new Date(),
        success: false
      });
      
      toast({
        title: "Upload failed",
        description: "There was an error uploading your contacts. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleExistingListSelect = () => {
    if (!selectedListId) {
      toast({
        title: "No list selected",
        description: "Please select a contact list to continue.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      const listIdNumber = parseInt(selectedListId);
      console.log("Selected existing contact list ID:", listIdNumber);
      
      // Update the campaign with the selected list ID
      updateCampaign({ contactListId: listIdNumber });
      
      setDebugInfo({
        lastAction: `Selected existing list with ID: ${listIdNumber}`,
        timestamp: new Date(),
        success: true
      });
      
      // Log the campaign state after update
      setTimeout(() => {
        console.log("Campaign state after setting contact list:", campaign);
      }, 0);
      
      toast({
        title: "Contact list selected",
        description: "Selected contact list has been set for the campaign.",
      });
      
      // Small delay to ensure state is updated before navigating
      setTimeout(() => {
        onNext();
      }, 100);
    } catch (error) {
      console.error("Error selecting contact list:", error);
      
      setDebugInfo({
        lastAction: `List selection failed: ${error instanceof Error ? error.message : String(error)}`,
        timestamp: new Date(),
        success: false
      });
      
      toast({
        title: "Selection failed",
        description: "There was an error selecting the contact list. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Debug information banner */}
      {debugInfo.lastAction && (
        <Alert variant={debugInfo.success ? "default" : "destructive"} className="mb-4">
          <AlertTitle>
            {debugInfo.success ? "Action Completed" : "Action Failed"}
          </AlertTitle>
          <AlertDescription className="flex flex-col gap-1 text-xs">
            <span>Action: {debugInfo.lastAction}</span>
            <span>Time: {debugInfo.timestamp.toLocaleTimeString()}</span>
            {campaign.contactListId && (
              <span className="font-semibold">Current Contact List ID: {campaign.contactListId}</span>
            )}
          </AlertDescription>
        </Alert>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Upload new contacts</CardTitle>
          </CardHeader>
          <CardContent>
            <CSVUploader 
              onUploadComplete={handleCsvUpload} 
              isLoading={isUploading}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Use existing list</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : contactLists && contactLists.length > 0 ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="contact-list">Select a contact list</Label>
                  <Select onValueChange={setSelectedListId} value={selectedListId}>
                    <SelectTrigger id="contact-list">
                      <SelectValue placeholder="Select a list" />
                    </SelectTrigger>
                    <SelectContent>
                      {contactLists.map((list) => (
                        <SelectItem key={list.id} value={list.id.toString()}>
                          {list.name} ({list.description || 'No description'})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <Button 
                  onClick={handleExistingListSelect}
                  disabled={!selectedListId}
                  className="w-full"
                >
                  Use Selected List
                </Button>
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                No contact lists found. Upload a CSV to create one.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* Current campaign state information */}
      <Card className="mt-4 bg-slate-50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Campaign Debug Information</CardTitle>
        </CardHeader>
        <CardContent className="text-xs">
          <div className="space-y-1">
            <p><strong>Contact List ID:</strong> {campaign.contactListId || 'Not set'}</p>
            <p><strong>Creator ID:</strong> {campaign.creatorId || 'Not set'}</p>
            <p><strong>Email Account ID:</strong> {campaign.emailAccountId || 'Not set'}</p>
            <p><strong>Selected List ID:</strong> {selectedListId || 'None selected'}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
