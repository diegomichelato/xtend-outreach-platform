import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Loader2, Plus, Save, Share, Users, ArrowLeft } from 'lucide-react';
import { WhiteboardCanvas } from '@/components/whiteboard/whiteboard-canvas';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Badge } from '@/components/ui/badge';
import { Campaign, Creator } from '@shared/schema';

// Define types for whiteboards
interface Whiteboard {
  id: number;
  name: string;
  campaignId?: number | null;
  createdAt: Date;
  lastModified: Date;
  createdBy: string;
  elements: any[];
  collaborators: { id: number; name: string }[];
}

export default function WhiteboardPage() {
  const [location, setLocation] = useLocation();
  const [activeWhiteboardId, setActiveWhiteboardId] = useState<number | null>(null);
  const [newWhiteboardName, setNewWhiteboardName] = useState('');
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>('');
  const { toast } = useToast();

  // Fetch whiteboards
  const { data: whiteboards, isLoading: isLoadingWhiteboards } = useQuery<Whiteboard[]>({
    queryKey: ['/api/whiteboards'],
    enabled: true,
  });

  // Fetch campaigns for dropdown
  const { data: campaigns, isLoading: isLoadingCampaigns } = useQuery<Campaign[]>({
    queryKey: ['/api/campaigns'],
    enabled: true,
  });

  // Fetch creators for collaborator selection
  const { data: creators, isLoading: isLoadingCreators } = useQuery<Creator[]>({
    queryKey: ['/api/creators'],
    enabled: true,
  });

  // Create a new whiteboard
  const createWhiteboardMutation = useMutation({
    mutationFn: async (whiteboard: { name: string; campaignId?: number }) => {
      const response = await apiRequest('POST', '/api/whiteboards', whiteboard);
      return await response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/whiteboards'] });
      setActiveWhiteboardId(data.id);
      toast({
        title: 'Whiteboard created',
        description: 'New whiteboard has been created successfully.',
      });
      setNewWhiteboardName('');
      setSelectedCampaignId('');
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to create whiteboard. Please try again.',
        variant: 'destructive',
      });
    },
  });

  // Update whiteboard elements
  const updateWhiteboardMutation = useMutation({
    mutationFn: async ({
      id,
      elements,
    }: {
      id: number;
      elements: any[];
    }) => {
      const response = await apiRequest('PATCH', `/api/whiteboards/${id}`, { elements });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/whiteboards'] });
    },
  });

  // Add collaborator to whiteboard
  const addCollaboratorMutation = useMutation({
    mutationFn: async ({
      whiteboardId,
      creatorId,
    }: {
      whiteboardId: number;
      creatorId: number;
    }) => {
      const response = await apiRequest('POST', `/api/whiteboards/${whiteboardId}/collaborators`, {
        creatorId,
      });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/whiteboards'] });
      toast({
        title: 'Collaborator added',
        description: 'Collaborator has been added to the whiteboard.',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to add collaborator. Please try again.',
        variant: 'destructive',
      });
    },
  });

  // Handle saving whiteboard elements
  const handleSaveElements = (elements: any[]) => {
    if (activeWhiteboardId) {
      updateWhiteboardMutation.mutate({
        id: activeWhiteboardId,
        elements,
      });
    }
  };

  // Handle creating a new whiteboard
  const handleCreateWhiteboard = () => {
    if (!newWhiteboardName.trim()) {
      toast({
        title: 'Name required',
        description: 'Please enter a name for the new whiteboard.',
        variant: 'destructive',
      });
      return;
    }

    createWhiteboardMutation.mutate({
      name: newWhiteboardName,
      campaignId: selectedCampaignId && selectedCampaignId !== "none" ? parseInt(selectedCampaignId) : undefined,
    });
  };

  // Find active whiteboard
  const activeWhiteboard = whiteboards?.find((wb) => wb.id === activeWhiteboardId);

  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Email Campaign Brainstorming</h1>
          <p className="text-gray-500">
            Collaborate on email campaign ideas using the interactive whiteboard
          </p>
        </div>
        {activeWhiteboardId && (
          <Button
            variant="ghost"
            onClick={() => setActiveWhiteboardId(null)}
            className="flex items-center"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Whiteboards
          </Button>
        )}
      </div>

      {!activeWhiteboardId ? (
        <>
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Create New Whiteboard</CardTitle>
              <CardDescription>
                Start a new brainstorming session for your email campaign
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label htmlFor="whiteboard-name" className="text-sm font-medium">
                    Whiteboard Name
                  </label>
                  <Input
                    id="whiteboard-name"
                    placeholder="Enter a name for your whiteboard"
                    value={newWhiteboardName}
                    onChange={(e) => setNewWhiteboardName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="campaign" className="text-sm font-medium">
                    Associated Campaign (Optional)
                  </label>
                  <Select
                    value={selectedCampaignId}
                    onValueChange={setSelectedCampaignId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a campaign" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {campaigns?.map((campaign) => (
                        <SelectItem key={campaign.id} value={campaign.id.toString()}>
                          {campaign.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button
                onClick={handleCreateWhiteboard}
                disabled={createWhiteboardMutation.isPending}
                className="ml-auto"
              >
                {createWhiteboardMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Whiteboard
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Your Whiteboards</CardTitle>
              <CardDescription>
                Access your existing brainstorming sessions
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingWhiteboards ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                </div>
              ) : !whiteboards?.length ? (
                <div className="text-center py-8 text-gray-500">
                  <p>You haven't created any whiteboards yet.</p>
                  <p className="mt-2">Create your first whiteboard to get started.</p>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {whiteboards.map((whiteboard) => (
                    <Card
                      key={whiteboard.id}
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => setActiveWhiteboardId(whiteboard.id)}
                    >
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg">{whiteboard.name}</CardTitle>
                        <div className="flex items-center text-sm text-gray-500">
                          <span>Last edited: {new Date(whiteboard.lastModified).toLocaleDateString()}</span>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {whiteboard.campaignId && campaigns?.find(c => c.id === whiteboard.campaignId) && (
                          <Badge variant="outline" className="mb-2">
                            Campaign: {campaigns.find(c => c.id === whiteboard.campaignId)?.name}
                          </Badge>
                        )}
                        <div className="flex items-center mt-2">
                          <Users className="h-4 w-4 mr-1 text-gray-400" />
                          <span className="text-sm text-gray-500">
                            {whiteboard.collaborators.length} collaborator(s)
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      ) : (
        <div>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold">{activeWhiteboard?.name}</h2>
              <p className="text-gray-500 text-sm">
                Created on {new Date(activeWhiteboard?.createdAt || '').toLocaleDateString()} by {activeWhiteboard?.createdBy}
              </p>
            </div>
            <div className="flex space-x-2">
              {creators && activeWhiteboard && (
                <Select
                  onValueChange={(value) => {
                    const creatorId = parseInt(value);
                    if (creatorId && activeWhiteboardId) {
                      addCollaboratorMutation.mutate({
                        whiteboardId: activeWhiteboardId,
                        creatorId,
                      });
                    }
                  }}
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Add collaborator" />
                  </SelectTrigger>
                  <SelectContent>
                    {creators
                      .filter(
                        (creator) =>
                          !activeWhiteboard.collaborators.some((c) => c.id === creator.id)
                      )
                      .map((creator) => (
                        <SelectItem key={creator.id} value={creator.id.toString()}>
                          {creator.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              )}
              <Button variant="outline" className="flex items-center">
                <Share className="h-4 w-4 mr-2" />
                Share
              </Button>
              <Button
                className="flex items-center"
                onClick={() => {
                  toast({
                    title: 'Whiteboard saved',
                    description: 'All changes have been saved.',
                  });
                }}
              >
                <Save className="h-4 w-4 mr-2" />
                Save
              </Button>
            </div>
          </div>

          <Card className="mb-6">
            <CardContent className="p-0">
              <WhiteboardCanvas
                initialElements={activeWhiteboard?.elements || []}
                onSave={handleSaveElements}
                campaignId={activeWhiteboard?.campaignId || undefined}
                collaborators={activeWhiteboard?.collaborators || []}
              />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}