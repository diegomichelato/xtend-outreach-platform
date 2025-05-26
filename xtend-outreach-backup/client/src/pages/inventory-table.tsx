import { useState, useEffect, useMemo, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger 
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import ConnectCreatorModal from "@/components/inventory/connect-creator-modal";
import ConnectDialog from "@/components/inventory/connect-dialog";
import BulkConnectModal from "@/components/inventory/bulk-connect-modal";

type Creator = {
  id: string;
  name: string;
  title: string;
  platform: string;
  publishDate: string;
  status: string;
  email: string;
  phone: string;
  audience: string;
  description: string;
  tags: string[];
  videoFormat: string;
  mediaKit?: string;
  brandLikeness?: string;
  contentInfo?: string;
  postDate?: string;
  sectionId?: string;
  creatorId?: number;
  hasMatchingProfile?: boolean;
  creatorProfileUrl?: string;
};

export default function InventoryTable() {
  const { toast } = useToast();
  const [creatorData, setCreatorData] = useState<Creator[]>([]);
  const [filteredData, setFilteredData] = useState<Creator[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [platformFilter, setPlatformFilter] = useState("all");
  const [formatFilter, setFormatFilter] = useState("all");
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  
  // Connect creator modal state
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [connectVideoId, setConnectVideoId] = useState<string>("");
  const [connectVideoName, setConnectVideoName] = useState<string>("");
  const [selectedCreatorId, setSelectedCreatorId] = useState<number | null>(null);
  const [availableCreators, setAvailableCreators] = useState<Array<{id: number, name: string}>>([]);
  const [isConnecting, setIsConnecting] = useState(false);
  
  // Bulk connect modal state
  const [showBulkConnectModal, setShowBulkConnectModal] = useState(false);
  const [bulkSelectedCreatorId, setBulkSelectedCreatorId] = useState<number | null>(null);
  const [isBulkConnecting, setIsBulkConnecting] = useState(false);
  
  // Function to handle connecting a video to a creator profile
  const handleConnectCreator = async (videoId: string, creatorId: number) => {
    console.log(`Connecting video ${videoId} to creator ${creatorId}...`);
    setIsConnecting(true);
    
    try {
      const response = await fetch('/api/connect-video', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ videoId, creatorId }),
      });
      
      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('Connection successful:', result);
      
      // Update the local state to show the connection
      setCreatorData(prevData => prevData.map(video => {
        if (video.id === videoId) {
          return {
            ...video,
            creatorId,
            hasMatchingProfile: true,
            creatorProfileUrl: `/creators/${creatorId}`
          };
        }
        return video;
      }));
      
      // Also update filtered data
      setFilteredData(prevData => prevData.map(video => {
        if (video.id === videoId) {
          return {
            ...video,
            creatorId,
            hasMatchingProfile: true,
            creatorProfileUrl: `/creators/${creatorId}`
          };
        }
        return video;
      }));
      
      toast({
        title: "Success",
        description: "Video successfully connected to creator profile",
      });
      
      // Close the modal
      setShowConnectModal(false);
    } catch (error) {
      console.error('Error connecting video to creator:', error);
      toast({
        title: "Error",
        description: "Failed to connect video to creator profile",
        variant: "destructive",
      });
    } finally {
      setIsConnecting(false);
    }
  };
  
  // Function to handle connecting multiple videos to a creator profile
  const handleBulkConnectCreator = async (videoIds: string[], creatorId: number) => {
    console.log(`Bulk connecting ${videoIds.length} videos to creator ${creatorId}...`);
    setIsBulkConnecting(true);
    
    try {
      // Use the bulk connect API endpoint
      const response = await fetch('/api/bulk-connect-videos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ videoIds, creatorId }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to process bulk connection');
      }
      
      const result = await response.json();
      const successCount = result.results.successful.length;
      const failCount = result.results.failed.length;
      
      // Update local state for the successfully connected videos
      if (successCount > 0) {
        const successfulIds = result.results.successful;
        
        // Update creator data
        setCreatorData(prevData => prevData.map(video => {
          if (successfulIds.includes(video.id)) {
            return {
              ...video,
              creatorId,
              hasMatchingProfile: true,
              creatorProfileUrl: `/creators/${creatorId}`
            };
          }
          return video;
        }));
        
        // Also update filtered data
        setFilteredData(prevData => prevData.map(video => {
          if (successfulIds.includes(video.id)) {
            return {
              ...video,
              creatorId,
              hasMatchingProfile: true,
              creatorProfileUrl: `/creators/${creatorId}`
            };
          }
          return video;
        }));
      }
      
      // Show summary toast
      if (failCount === 0) {
        toast({
          title: "Success",
          description: `${successCount} videos successfully connected to creator profile`,
        });
      } else {
        toast({
          title: "Partial Success",
          description: `${successCount} videos connected, ${failCount} failed`,
          variant: "destructive",
        });
      }
      
      // Reset selection
      setSelectedProjects([]);
      setSelectAll(false);
      
      // Close the modal
      setShowBulkConnectModal(false);
    } catch (error) {
      console.error('Error bulk connecting videos:', error);
      toast({
        title: "Error",
        description: "Failed to connect videos to creator profile",
        variant: "destructive",
      });
    } finally {
      setIsBulkConnecting(false);
    }
  };

  // Function to fetch creator data from Asana API
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

  // Connect a single video to a creator from the modal
  const handleSingleVideoConnect = async () => {
    if (!connectVideoId || !selectedCreatorId) return;
    
    setIsConnecting(true);
    try {
      console.log(`Connecting video ${connectVideoId} to creator ${selectedCreatorId}`);
      
      const response = await fetch('/api/connect-video', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          videoId: connectVideoId,
          creatorId: selectedCreatorId
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to connect video to creator');
      }
      
      const result = await response.json();
      console.log('Connection result:', result);
      
      toast({
        title: "Success!",
        description: `Video successfully connected to ${result.creatorName}'s profile`,
      });
      
      // Update the local data to reflect the connection without a full refresh
      const updatedData = creatorData.map(video => {
        if (video.id === connectVideoId) {
          return {
            ...video,
            creatorId: selectedCreatorId,
            creatorProfileUrl: result.creatorProfileUrl,
            creatorImageUrl: result.creatorImageUrl
          };
        }
        return video;
      });
      
      setCreatorData(updatedData);
      setFilteredData(updatedData);
      
      // Close the modal
      setShowConnectModal(false);
      setConnectVideoId('');
      setConnectVideoName('');
      setSelectedCreatorId(null);
    } catch (error) {
      console.error('Error connecting video to creator:', error);
      toast({
        title: "Error",
        description: "Failed to connect video to creator",
        variant: "destructive"
      });
    } finally {
      setIsConnecting(false);
    }
  };
  
  const fetchCreatorData = () => {
    setIsLoading(true);
    setIsRefreshing(true);
    
    fetch('/api/creator-videos')
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        console.log('Fetched creator videos:', data);
        setCreatorData(data);
        setFilteredData(data);
        setIsLoading(false);
        setIsRefreshing(false);
        // Show toast notification
        toast({
          title: "Data refreshed",
          description: `Successfully loaded ${data.length} creator videos.`,
        });
      })
      .catch(error => {
        console.error('Error fetching creator data from Asana:', error);
        // Fallback to local sample data if API fails
        console.log('Falling back to sample data...');
        fetch('/data/sample-asana-data.json')
          .then(response => response.json())
          .then(sampleData => {
            setCreatorData(sampleData);
            setFilteredData(sampleData);
            setIsLoading(false);
            setIsRefreshing(false);
            // Show toast notification for fallback
            toast({
              title: "Using sample data",
              description: "Could not connect to Asana. Using sample data instead.",
              variant: "destructive",
            });
          })
          .catch(fallbackError => {
            console.error('Error fetching sample data:', fallbackError);
            setIsLoading(false);
            setIsRefreshing(false);
            // Show error toast
            toast({
              title: "Error",
              description: "Failed to load data. Please try again.",
              variant: "destructive",
            });
          });
      });
  };
  
  // Initial data fetch on component mount
  useEffect(() => {
    fetchCreatorData();
    // Also fetch available creators for the connect feature
    fetchAvailableCreators();
  }, []);

  // Apply filters
  useEffect(() => {
    let results = creatorData;
    
    // Search filter
    if (searchTerm) {
      const lowerSearchTerm = searchTerm.toLowerCase();
      results = results.filter(item => 
        item.name.toLowerCase().includes(lowerSearchTerm) || 
        item.title.toLowerCase().includes(lowerSearchTerm)
      );
    }
    
    // Status filter
    if (statusFilter !== "all") {
      results = results.filter(item => item.status === statusFilter);
    }
    
    // Platform filter
    if (platformFilter !== "all") {
      results = results.filter(item => item.platform === platformFilter);
    }
    
    // Video Format filter
    if (formatFilter !== "all") {
      results = results.filter(item => 
        (item.videoFormat || "Standard") === formatFilter
      );
    }
    
    setFilteredData(results);
  }, [searchTerm, statusFilter, platformFilter, formatFilter, creatorData]);

  // Group videos by creator
  const creatorGroups = useMemo(() => {
    const groups: Record<string, Creator[]> = {};
    
    filteredData.forEach(creator => {
      if (!groups[creator.name]) {
        groups[creator.name] = [];
      }
      groups[creator.name].push(creator);
    });
    
    return groups;
  }, [filteredData]);
  
  // Get unique values for filters
  const platforms = ["all", ...Array.from(new Set(creatorData.map(item => item.platform)))];
  const statuses = ["all", ...Array.from(new Set(creatorData.map(item => item.status)))];
  const formats = ["all", ...Array.from(new Set(creatorData.map(item => item.videoFormat || "Standard")))];
  
  // Get unique creator names
  const creatorNames = useMemo(() => {
    return Object.keys(creatorGroups).sort();
  }, [creatorGroups]);

  // Function to create mailto link
  const createMailtoLink = (creator: Creator) => {
    const subject = encodeURIComponent(`Negotiation Request: ${creator.title}`);
    const body = encodeURIComponent(
      `Hi ${creator.name},\n\nI'd like to discuss the upcoming video: "${creator.title}"\n\nCould we schedule a call to discuss the details?\n\nBest regards,\nYour Name`
    );
    return `mailto:${creator.email}?subject=${subject}&body=${body}`;
  };

  // WhatsApp function removed as requested

  // Status badge color mapping
  const getStatusColor = (status: string) => {
    switch (status) {
      case "Complete": return "bg-green-100 text-green-800";
      case "In Progress": return "bg-blue-100 text-blue-800";
      case "Scheduled": return "bg-purple-100 text-purple-800";
      case "Pending Approval": return "bg-amber-100 text-amber-800";
      case "Upcoming": return "bg-indigo-100 text-indigo-800";
      case "Overdue": return "bg-red-100 text-red-800";
      case "Ready": return "bg-teal-100 text-teal-800";
      case "Review": return "bg-sky-100 text-sky-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  // Open the connect creator modal
  const openConnectModal = (videoId: string, videoName: string) => {
    setConnectVideoId(videoId);
    setConnectVideoName(videoName);
    setShowConnectModal(true);
  };

  return (
    <div className="space-y-6">
      {/* Connect Creator Modal */}
      <ConnectCreatorModal
        isOpen={showConnectModal}
        onClose={() => setShowConnectModal(false)}
        videoId={connectVideoId}
        videoName={connectVideoName}
        onConnect={handleConnectCreator}
      />
      
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Creator Video Inventory</h1>
          <p className="text-muted-foreground">
            Browse upcoming creator videos and negotiate collaborations
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="outline"
            onClick={() => {
              // Show the share entire list modal
              const modal = document.getElementById('shareEntireListModal');
              if (modal instanceof HTMLDialogElement) {
                modal.showModal();
              }
            }}
            className="flex items-center gap-2"
          >
            <span className="material-icons text-sm">share</span>
            Share Creator List
          </Button>
          <Button 
            variant="outline"
            onClick={() => {
              // Show the share selected projects modal
              if (selectedProjects.length === 0) {
                toast({
                  title: "No projects selected",
                  description: "Please select at least one project to share.",
                  variant: "destructive",
                });
                return;
              }
              
              const modal = document.getElementById('shareSelectedProjectsModal');
              if (modal instanceof HTMLDialogElement) {
                modal.showModal();
              }
            }}
            className="flex items-center gap-2"
            disabled={selectedProjects.length === 0}
          >
            <span className="material-icons text-sm">filter_list</span>
            Share Selected Projects
            {selectedProjects.length > 0 && (
              <span className="ml-1 bg-indigo-100 text-indigo-800 text-xs font-medium px-2 py-0.5 rounded-full">
                {selectedProjects.length}
              </span>
            )}
          </Button>
          <Button 
            onClick={fetchCreatorData}
            disabled={isRefreshing}
            className="flex items-center gap-2"
          >
            {isRefreshing ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-current"></div>
                Refreshing...
              </>
            ) : (
              <>
                <span className="material-icons text-sm">refresh</span>
                Refresh Data
              </>
            )}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Filter creator videos by various criteria</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="space-y-2">
              <Label htmlFor="search">Search</Label>
              <Input
                id="search"
                placeholder="Search by name or title"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger id="status">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {statuses.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status === "all" ? "All Statuses" : status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="platform">Platform</Label>
              <Select value={platformFilter} onValueChange={setPlatformFilter}>
                <SelectTrigger id="platform">
                  <SelectValue placeholder="Select platform" />
                </SelectTrigger>
                <SelectContent>
                  {platforms.map((platform) => (
                    <SelectItem key={platform} value={platform}>
                      {platform === "all" ? "All Platforms" : platform}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="format">Video Format</Label>
              <Select value={formatFilter} onValueChange={setFormatFilter}>
                <SelectTrigger id="format">
                  <SelectValue placeholder="Select format" />
                </SelectTrigger>
                <SelectContent>
                  {formats.map((format) => (
                    <SelectItem key={format} value={format}>
                      {format === "all" ? "All Formats" : format}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Creator Videos</CardTitle>
          <CardDescription>
            {filteredData.length} videos found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-DEFAULT"></div>
            </div>
          ) : filteredData.length === 0 ? (
            <div className="text-center py-10">
              <span className="material-icons text-gray-400 text-5xl mb-4">search_off</span>
              <h3 className="text-lg font-medium">No videos found</h3>
              <p className="text-gray-500">Try adjusting your search filters</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Actions bar */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={selectAll}
                    onCheckedChange={(checked) => {
                      setSelectAll(!!checked);
                      if (checked) {
                        setSelectedProjects(filteredData.map(item => item.id));
                      } else {
                        setSelectedProjects([]);
                      }
                    }}
                  />
                  <span>Select All</span>
                </div>
                {selectedProjects.length > 0 && (
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={async () => {
                      try {
                        // Show loading state
                        const loadingToast = toast({
                          title: "Loading creators...",
                          description: "Fetching available creator profiles",
                        });
                        
                        // Fetch available creators before showing the modal
                        await fetchAvailableCreators();
                        
                        // Close the loading toast
                        loadingToast.dismiss();
                        
                        // Only show the modal if we have creators available
                        if (availableCreators.length > 0) {
                          setShowBulkConnectModal(true);
                        } else {
                          toast({
                            title: "No creators available",
                            description: "Please add creator profiles first before connecting videos",
                            variant: "destructive"
                          });
                        }
                      } catch (error) {
                        console.error("Error preparing bulk connect:", error);
                        toast({
                          title: "Error",
                          description: "Failed to prepare connection dialog",
                          variant: "destructive"
                        });
                      }
                    }}
                  >
                    Connect Selected Videos ({selectedProjects.length})
                  </Button>
                )}
              </div>

              {/* Table */}
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <div className="flex items-center">
                        <span className="sr-only">Select</span>
                      </div>
                    </TableHead>
                    <TableHead>Creator</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Platform</TableHead>
                    <TableHead>Video Format</TableHead>
                    <TableHead>Publish Date</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredData.map((creator) => (
                    <TableRow key={creator.id}>
                      <TableCell className="w-10">
                        <div className="flex items-center">
                          <Checkbox
                            checked={selectedProjects.includes(creator.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedProjects([...selectedProjects, creator.id]);
                              } else {
                                setSelectedProjects(selectedProjects.filter(id => id !== creator.id));
                              }
                              
                              // Update selectAll state based on all items being selected
                              if (!checked) {
                                setSelectAll(false);
                              } else if (selectedProjects.length + 1 === filteredData.length) {
                                setSelectAll(true);
                              }
                            }}
                          />
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        <div className="flex items-center">
                          {creator.hasMatchingProfile ? (
                            <a 
                              href={creator.creatorProfileUrl} 
                              className="text-primary hover:underline flex items-center gap-2"
                            >
                              <span>{creator.name}</span>
                              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">
                                Profile
                              </Badge>
                            </a>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span>{creator.name}</span>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-6 w-6"
                                onClick={() => {
                                  // Open the connect creator modal and set the current video
                                  setConnectVideoId(creator.id);
                                  setConnectVideoName(creator.name);
                                  // Fetch available creators before showing the modal
                                  fetchAvailableCreators().then(() => {
                                    setShowConnectModal(true);
                                  });
                                }}
                              >
                                <span className="material-icons text-blue-600 text-sm">
                                  link
                                </span>
                              </Button>
                            </div>
                          )}
                          {creator.mediaKit && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <a 
                                    href={creator.mediaKit} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="ml-2"
                                  >
                                    <span className="material-icons text-blue-600 text-base cursor-pointer hover:scale-110 transition-transform duration-200">
                                      menu_book
                                    </span>
                                  </a>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="font-medium">View Media Kit</p>
                                  <p className="text-xs text-gray-500 mt-1">Access creator's branding resources and media assets</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="max-w-[200px] truncate">
                                {creator.title}
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{creator.title}</p>
                              <p className="text-xs text-gray-500 mt-1">{creator.description}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>
                      <TableCell>{creator.platform}</TableCell>
                      <TableCell>{creator.videoFormat || "Standard"}</TableCell>
                      <TableCell>{new Date(creator.publishDate).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={getStatusColor(creator.status)}>
                            {creator.status}
                          </Badge>
                          
                          {!creator.hasMatchingProfile && (
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="ml-2 text-xs"
                              onClick={(e) => {
                                e.stopPropagation();
                                // Open the connect modal with the video's ID and title
                                setConnectVideoId(creator.id);
                                setConnectVideoName(creator.title);
                                setShowConnectModal(true);
                              }}
                            >
                              Connect Creator
                            </Button>
                          )}
                          
                          {creator.hasMatchingProfile && creator.creatorProfileUrl && (
                            <a 
                              href={creator.creatorProfileUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-xs text-blue-600 hover:underline"
                              onClick={(e) => e.stopPropagation()}
                            >
                              View Creator Profile
                            </a>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Share Entire Creator List Modal */}
      <dialog
        id="shareEntireListModal"
        className="modal rounded-lg shadow-lg p-0 w-full max-w-lg mx-auto"
      >
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium">Share Creator List</h3>
            <button 
              className="text-gray-500 hover:text-gray-700"
              onClick={() => {
                const modal = document.getElementById('shareEntireListModal');
                if (modal instanceof HTMLDialogElement) {
                  modal.close();
                }
              }}
            >
              <span className="material-icons">close</span>
            </button>
          </div>
          
          <form
            onSubmit={(e) => {
              e.preventDefault();
              
              const formData = new FormData(e.currentTarget);
              const title = formData.get('title') as string;
              const description = formData.get('description') as string;
              const password = formData.get('password') as string;
              const expirationDays = parseInt(formData.get('expirationDays') as string) || null;
              
              // Create the content object with all the creators
              const content = {
                creators: filteredData.map(creator => ({
                  id: creator.id,
                  name: creator.name,
                  title: creator.title,
                  platform: creator.platform,
                  publishDate: creator.publishDate,
                  status: creator.status,
                  videoFormat: creator.videoFormat || 'Standard',
                  tags: creator.tags || [],
                  description: creator.description,
                  mediaKit: creator.mediaKit || null
                })),
                filters: {
                  platforms: platformFilter !== 'all' ? [platformFilter] : [],
                  statuses: statusFilter !== 'all' ? [statusFilter] : [],
                  formats: formatFilter !== 'all' ? [formatFilter] : [],
                  searchTerm: searchTerm || null
                },
                totalCount: filteredData.length
              };
              
              // Create metadata with additional info
              const metadata = {
                createdAt: new Date().toISOString(),
                creator: 'System',
                filterApplied: platformFilter !== 'all' || statusFilter !== 'all' || formatFilter !== 'all' || !!searchTerm,
                queryParams: {
                  platform: platformFilter,
                  status: statusFilter,
                  format: formatFilter,
                  search: searchTerm
                }
              };
              
              // Contact info
              const contactInfo = {
                email: 'contact@stemmediagroup.com',
                phone: '+1-555-123-4567'
              };
              
              // Calculate expiration date if provided
              let expiresAt = null;
              if (expirationDays) {
                const date = new Date();
                date.setDate(date.getDate() + expirationDays);
                expiresAt = date.toISOString();
              }
              
              // Send post request to create the landing page
              fetch('/api/shareable-landing-pages', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  title,
                  description,
                  password: password || null,
                  isPasswordProtected: !!password,
                  content,
                  metadata,
                  contactInfo,
                  status: 'active',
                  expiresAt,
                  viewCount: 0,
                  type: 'creator-list'
                }),
              })
              .then(response => {
                if (!response.ok) {
                  throw new Error(`HTTP error! Status: ${response.status}`);
                }
                return response.json();
              })
              .then(data => {
                // Close the modal
                const modal = document.getElementById('shareEntireListModal');
                if (modal instanceof HTMLDialogElement) {
                  modal.close();
                }
                
                // Show success toast
                toast({
                  title: "Success!",
                  description: "Shareable creator list created successfully.",
                });
                
                // Show the generated shareable link
                const shareUrl = `${window.location.origin}/share/${data.uniqueId}`;
                
                // Create a modal to display and copy the link
                const linkModal = document.createElement('dialog');
                linkModal.className = 'modal rounded-lg shadow-lg p-0 w-full max-w-lg mx-auto';
                linkModal.innerHTML = `
                  <div class="p-6">
                    <div class="flex justify-between items-center mb-4">
                      <h3 class="text-lg font-medium">Your Shareable Link</h3>
                      <button 
                        class="text-gray-500 hover:text-gray-700"
                        onclick="this.closest('dialog').close();"
                      >
                        <span class="material-icons">close</span>
                      </button>
                    </div>
                    <div class="mb-4">
                      <p class="text-sm text-gray-500 mb-2">Share this link with your partners:</p>
                      <div class="flex">
                        <input 
                          type="text" 
                          value="${shareUrl}" 
                          class="flex-1 px-3 py-2 border rounded-l-md" 
                          readonly
                          id="shareUrlInput"
                        />
                        <button 
                          class="bg-blue-500 text-white px-3 py-2 rounded-r-md"
                          onclick="const input = document.getElementById('shareUrlInput'); input.select(); document.execCommand('copy'); this.innerText = 'Copied!'; setTimeout(() => { this.innerText = 'Copy'; }, 2000);"
                        >
                          Copy
                        </button>
                      </div>
                    </div>
                    <div class="flex justify-end">
                      <button 
                        class="bg-primary text-white px-4 py-2 rounded"
                        onclick="window.open('${shareUrl}', '_blank'); this.closest('dialog').close();"
                      >
                        Open Link
                      </button>
                    </div>
                  </div>
                `;
                document.body.appendChild(linkModal);
                linkModal.showModal();
              })
              .catch(error => {
                console.error('Error creating shareable creator list:', error);
                toast({
                  title: "Error",
                  description: "Failed to create shareable creator list.",
                  variant: "destructive",
                });
              });
            }}
            className="space-y-4"
          >
            <div>
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                name="title"
                defaultValue="Creator Video Lineup"
                required
              />
            </div>
            
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                defaultValue="A curated list of our upcoming creator videos for potential collaborations and partnerships."
                className="min-h-[100px]"
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="password">Password Protection (Optional)</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="Leave empty for public access"
                />
              </div>
              
              <div>
                <Label htmlFor="expirationDays">Expiration (Days)</Label>
                <Input
                  id="expirationDays"
                  name="expirationDays"
                  type="number"
                  min="1"
                  max="365"
                  placeholder="Never expires if empty"
                />
              </div>
            </div>
            
            <div className="pt-4 flex justify-end gap-2">
              <Button 
                type="button" 
                variant="outline"
                onClick={() => {
                  const modal = document.getElementById('shareEntireListModal');
                  if (modal instanceof HTMLDialogElement) {
                    modal.close();
                  }
                }}
              >
                Cancel
              </Button>
              <Button type="submit">Create Shareable List</Button>
            </div>
          </form>
        </div>
      </dialog>

      {/* Share Selected Projects Modal */}
      <dialog
        id="shareSelectedProjectsModal"
        className="modal rounded-lg shadow-lg p-0 w-full max-w-lg mx-auto"
      >
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium">Share Selected Projects</h3>
            <button 
              className="text-gray-500 hover:text-gray-700"
              onClick={() => {
                const modal = document.getElementById('shareSelectedProjectsModal');
                if (modal instanceof HTMLDialogElement) {
                  modal.close();
                }
              }}
            >
              <span className="material-icons">close</span>
            </button>
          </div>
          
          <div className="mb-4">
            <p className="text-sm text-gray-600">
              You've selected {selectedProjects.length} projects to share.
            </p>
            <div className="mt-3 p-2 bg-gray-50 rounded-md max-h-32 overflow-y-auto">
              <ul className="text-sm">
                {selectedProjects.map(id => {
                  const creator = creatorData.find(c => c.id === id);
                  return creator && (
                    <li key={id} className="mb-1 flex items-center justify-between">
                      <span className="truncate">
                        <span className="font-medium">{creator.name}</span>
                        <span className="mx-2">—</span>
                        <span className="text-gray-600">{creator.title}</span>
                      </span>
                      <Badge variant="outline" className={getStatusColor(creator.status)}>
                        {creator.status}
                      </Badge>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
          
          <form
            onSubmit={(e) => {
              e.preventDefault();
              
              const formData = new FormData(e.currentTarget);
              const title = formData.get('title') as string;
              const description = formData.get('description') as string;
              const password = formData.get('password') as string;
              const expirationDays = parseInt(formData.get('expirationDays') as string) || null;
              
              // Find selected creators
              const selectedCreators = creatorData.filter(creator => 
                selectedProjects.includes(creator.id)
              );
              
              // Create the content object with selected creators
              const content = {
                creators: selectedCreators.map(creator => ({
                  id: creator.id,
                  name: creator.name,
                  email: creator.email || 'contact@stemmediagroup.com',
                  phone: creator.phone || '+15555555555',
                  title: creator.title,
                  platform: creator.platform,
                  publishDate: creator.publishDate,
                  status: creator.status,
                  videoFormat: creator.videoFormat || 'Standard',
                  tags: creator.tags || [],
                  description: creator.description,
                  mediaKit: creator.mediaKit || null,
                  audience: creator.audience || ''
                })),
                filters: {
                  custom: true,
                  selectionCount: selectedProjects.length
                },
                totalCount: selectedProjects.length
              };
              
              // Create metadata with additional info
              const metadata = {
                createdAt: new Date().toISOString(),
                creator: 'System',
                selectionMethod: 'manual',
                selectionCount: selectedProjects.length
              };
              
              // Contact info
              const contactInfo = {
                email: 'contact@stemmediagroup.com',
                phone: '+1-555-123-4567'
              };
              
              // Calculate expiration date if provided
              let expiresAt = null;
              if (expirationDays) {
                const date = new Date();
                date.setDate(date.getDate() + expirationDays);
                expiresAt = date.toISOString();
              }
              
              // Send post request to create the landing page
              fetch('/api/shareable-landing-pages', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  title,
                  description,
                  password: password || null,
                  isPasswordProtected: !!password,
                  content,
                  metadata,
                  contactInfo,
                  status: 'active',
                  expiresAt,
                  viewCount: 0,
                  type: 'selected-creators'
                }),
              })
              .then(response => {
                if (!response.ok) {
                  throw new Error(`HTTP error! Status: ${response.status}`);
                }
                return response.json();
              })
              .then(data => {
                // Close the modal
                const modal = document.getElementById('shareSelectedProjectsModal');
                if (modal instanceof HTMLDialogElement) {
                  modal.close();
                }
                
                // Create a temporary dialog to show the generated link
                const linkModal = document.createElement('dialog');
                linkModal.className = "modal rounded-lg shadow-lg p-6 w-full max-w-md mx-auto";
                
                const shareUrl = `${window.location.origin}/share/${data.uniqueId}`;
                
                linkModal.innerHTML = `
                  <div>
                    <div class="flex justify-between items-center mb-4">
                      <h3 class="text-lg font-medium">Shareable Link Created</h3>
                      <button 
                        class="text-gray-500 hover:text-gray-700"
                        onclick="this.closest('dialog').close();"
                      >
                        <span class="material-icons">close</span>
                      </button>
                    </div>
                    
                    <p class="mb-2 text-sm text-gray-600">
                      Your shareable link for selected creator projects has been created:
                    </p>
                    
                    <div class="flex mt-4 mb-6">
                      <input 
                        type="text" 
                        value="${shareUrl}" 
                        class="flex-1 p-2 border rounded-l-md bg-gray-50" 
                        readonly
                        id="share-url-input"
                      />
                      <button
                        type="button"
                        class="bg-indigo-600 text-white px-3 py-2 rounded-r-md"
                        onclick="
                          const input = document.getElementById('share-url-input');
                          input.select();
                          document.execCommand('copy');
                          this.textContent = 'Copied!';
                          setTimeout(() => { this.textContent = 'Copy' }, 2000);
                        "
                      >
                        Copy
                      </button>
                    </div>
                    
                    <div class="flex justify-end mt-4">
                      <button
                        type="button"
                        class="mr-2 px-4 py-2 border border-gray-300 rounded-md text-sm hover:bg-gray-50"
                        onclick="this.closest('dialog').close();"
                      >
                        Close
                      </button>
                      <button
                        type="button"
                        class="px-4 py-2 bg-blue-500 text-white rounded-md text-sm"
                        onclick="window.open('${shareUrl}', '_blank'); this.closest('dialog').close();"
                      >
                        View Page
                      </button>
                    </div>
                  </div>
                `;
                
                document.body.appendChild(linkModal);
                linkModal.showModal();
                
                // Add toast notification
                toast({
                  title: "Selected projects shared!",
                  description: `Created a shareable page with ${selectedProjects.length} selected creator projects.`,
                });
              })
              .catch(error => {
                console.error('Error creating shareable link:', error);
                
                // Add error toast
                toast({
                  title: "Error",
                  description: "Failed to create shareable link. Please try again.",
                  variant: "destructive",
                });
                
                // Close the modal
                const modal = document.getElementById('shareSelectedProjectsModal');
                if (modal instanceof HTMLDialogElement) {
                  modal.close();
                }
              });
            }}
          >
            <div className="space-y-4">
              <div>
                <Label htmlFor="title-selected" className="block text-sm font-medium text-gray-700 mb-1">
                  Title
                </Label>
                <Input
                  id="title-selected"
                  name="title"
                  placeholder="Enter a title for your shared list"
                  defaultValue={`Selected Creator Projects (${new Date().toLocaleDateString()})`}
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="description-selected" className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </Label>
                <Textarea
                  id="description-selected"
                  name="description"
                  placeholder="Enter a description (optional)"
                  defaultValue={`A curated selection of ${selectedProjects.length} creator projects.`}
                  rows={3}
                />
              </div>
              
              <div>
                <Label htmlFor="password-selected" className="block text-sm font-medium text-gray-700 mb-1">
                  Password Protection
                </Label>
                <Input
                  id="password-selected"
                  name="password"
                  type="password"
                  placeholder="Set a password (optional)"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Leave blank for public access
                </p>
              </div>
              
              <div>
                <Label htmlFor="expiration-selected" className="block text-sm font-medium text-gray-700 mb-1">
                  Expiration
                </Label>
                <Select name="expirationDays" defaultValue="7">
                  <SelectTrigger id="expiration-selected">
                    <SelectValue placeholder="Select expiration" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3">3 days</SelectItem>
                    <SelectItem value="7">7 days</SelectItem>
                    <SelectItem value="14">14 days</SelectItem>
                    <SelectItem value="30">30 days</SelectItem>
                    <SelectItem value="0">No expiration</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="mt-6 flex justify-end space-x-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  const modal = document.getElementById('shareSelectedProjectsModal');
                  if (modal instanceof HTMLDialogElement) {
                    modal.close();
                  }
                }}
              >
                Cancel
              </Button>
              <Button type="submit">
                Create Shareable Link
              </Button>
            </div>
          </form>
        </div>
      </dialog>
      {/* Connect Creator Modal for single video */}
      <ConnectDialog
        open={showConnectModal}
        onOpenChange={(open) => {
          setShowConnectModal(open);
          if (!open) {
            setConnectVideoId('');
            setConnectVideoName('');
            setSelectedCreatorId(null);
          }
        }}
        videoId={connectVideoId}
        videoName={connectVideoName}
        onRefresh={fetchCreatorData}
      />
      
      {/* Bulk Connect Creator Modal */}
      <BulkConnectModal
        open={showBulkConnectModal}
        onOpenChange={setShowBulkConnectModal}
        selectedVideoIds={selectedProjects}
        onConnect={handleBulkConnectCreator}
      />
    </div>
  );
}