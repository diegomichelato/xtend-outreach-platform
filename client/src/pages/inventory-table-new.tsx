import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import FlatVideoList from "@/components/inventory/flat-video-list";
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

type Creator = {
  id: string;
  name: string;
  title: string;
  creator: string;       // Added creator field
  content: string;       // Added content field
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
  timeline?: string;     // Changed from contentInfo to timeline
  postDate?: string;
  section?: string;      // Asana section name
  sectionId?: string;    // Asana section ID
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

  // Function to fetch creator data from Asana API
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

  // Group videos by section and then by creator
  const groupedBySection = useMemo(() => {
    const sections: Record<string, Creator[]> = {};
    
    // Group all videos by section
    filteredData.forEach(creator => {
      const sectionName = creator.section || 'Unsorted';
      if (!sections[sectionName]) {
        sections[sectionName] = [];
      }
      sections[sectionName].push(creator);
    });
    
    return sections;
  }, [filteredData]);
  
  // Group videos by title to match Asana layout
  const creatorGroups = useMemo(() => {
    const groups: Record<string, Creator[]> = {};
    
    // Process all videos regardless of section
    filteredData.forEach(creator => {
      // Use title as the grouping key to exactly match Asana layout
      // This ensures that each title (e.g., "UPenn", "Yale", etc.) is treated as a separate item
      const creatorKey = creator.title;
      if (!groups[creatorKey]) {
        groups[creatorKey] = [];
      }
      groups[creatorKey].push(creator);
    });
    
    return groups;
  }, [filteredData]);
  
  // Get unique values for filters
  const platforms = ["all", ...Array.from(new Set(creatorData.map(item => item.platform)))];
  const statuses = ["all", ...Array.from(new Set(creatorData.map(item => item.status)))];
  const formats = ["all", ...Array.from(new Set(creatorData.map(item => item.videoFormat || "Standard")))];
  
  // Get unique section names
  const sectionNames = useMemo(() => {
    return Object.keys(groupedBySection).sort();
  }, [groupedBySection]);
  
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

  return (
    <div className="space-y-6">
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
            {filteredData.length} videos found across {creatorNames.length} creators
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
              <div className="flex items-center mb-4">
                <input
                  type="checkbox"
                  className="rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 mr-2"
                  checked={selectAll}
                  onChange={(e) => {
                    setSelectAll(e.target.checked);
                    if (e.target.checked) {
                      setSelectedProjects(filteredData.map(c => c.id));
                    } else {
                      setSelectedProjects([]);
                    }
                  }}
                />
                <Label htmlFor="select-all">Select All</Label>
              </div>
              
              {/* Flat list view showing all creator videos in a single table */}
              <FlatVideoList
                creators={filteredData}
                selectedProjects={selectedProjects}
                setSelectedProjects={setSelectedProjects}
                setSelectAll={setSelectAll}
                filteredData={filteredData}
                getStatusColor={getStatusColor}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal for sharing entire list */}
      <dialog id="shareEntireListModal" className="modal">
        <div className="modal-box max-w-md bg-white p-0 rounded-lg shadow-lg">
          <div className="p-5">
            <h3 className="font-bold text-lg mb-4">Share Creator Video Inventory</h3>
            <form method="dialog" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="share-name">Share Name</Label>
                <Input
                  id="share-name"
                  placeholder="Enter a name for this shared list"
                  defaultValue="Creator Video Inventory"
                  className="w-full"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="share-description">Description (optional)</Label>
                <Textarea
                  id="share-description"
                  placeholder="Add a description for the recipients"
                  defaultValue={`A collection of ${filteredData.length} upcoming creator videos.`}
                  className="w-full resize-none h-24"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="share-email">Recipient Email</Label>
                <Input 
                  id="share-email" 
                  placeholder="Enter recipient email" 
                  className="w-full"
                />
              </div>
              
              <div className="flex items-center justify-between space-x-3 mt-6 pt-3 border-t border-gray-100">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    const dialog = document.getElementById('shareEntireListModal');
                    if (dialog instanceof HTMLDialogElement) {
                      dialog.close();
                    }
                  }}
                  className="px-4 py-2 h-10"
                >
                  Cancel
                </Button>
                <Button 
                  className="bg-teal-600 text-white hover:bg-teal-700 px-5 py-2 h-10"
                  onClick={() => {
                    // Get the share name
                    const shareName = (document.getElementById('share-name') as HTMLInputElement)?.value || 'Creator Video Inventory';
                    const shareDescription = (document.getElementById('share-description') as HTMLTextAreaElement)?.value || '';
                    const recipientEmail = (document.getElementById('share-email') as HTMLInputElement)?.value || '';
                    
                    // Create API payload with all creator data
                    const shareData = {
                      title: shareName,
                      description: shareDescription,
                      recipientEmail,
                      content: filteredData // Send the full filtered creator list
                    };
                    
                    // Make API call to create the share
                    fetch('/api/shareable-landing-pages/creator-videos', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(shareData)
                    })
                    .then(response => response.json())
                    .then(data => {
                      if (data.success) {
                        // Close the current dialog
                        const dialog = document.getElementById('shareEntireListModal');
                        if (dialog instanceof HTMLDialogElement) {
                          dialog.close();
                        }
                      } else {
                        throw new Error(data.message || 'Failed to create share link');
                      }
                    })
                    .catch(error => {
                      console.error('Error creating share:', error);
                      toast({
                        title: "Error",
                        description: "Failed to create share link. Please try again.",
                        variant: "destructive"
                      });
                    });
                    
                    // Close the current dialog
                    const dialog = document.getElementById('shareEntireListModal');
                    if (dialog instanceof HTMLDialogElement) {
                      dialog.close();
                    }
                    
                    // After successful API call, show success dialog
                    fetch('/api/shareable-landing-pages/creator-videos', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(shareData)
                    })
                    .then(response => response.json())
                    .then(data => {
                      console.log('Share response:', data);
                      // Create a success dialog with copy link functionality
                      const successDialog = document.createElement('dialog');
                      successDialog.className = "modal";
                      
                      const shareUrl = data.shareUrl || `${window.location.origin}/share/demo`;
                      
                      successDialog.innerHTML = `
                        <div class="modal-box max-w-md bg-white p-0 rounded-lg shadow-lg">
                          <div class="p-5">
                            <h3 class="font-bold text-lg mb-4">Shareable Link Created</h3>
                            
                            <p class="mb-2 text-sm text-gray-600">
                              Your shareable link for "${shareName}" has been created:
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
                                class="bg-teal-600 text-white px-3 py-2 rounded-r-md"
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
                            
                            <div class="flex justify-end mt-4 pt-3 border-t border-gray-100">
                              <button 
                                class="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-md"
                                onclick="this.closest('dialog').close();"
                              >
                                Close
                              </button>
                            </div>
                          </div>
                        </div>
                      `;
                      
                      document.body.appendChild(successDialog);
                      successDialog.addEventListener('close', () => {
                        document.body.removeChild(successDialog);
                      });
                      
                      successDialog.showModal();
                    })
                    .catch(error => {
                      console.error('Error creating share:', error);
                      toast({
                        title: "Error",
                        description: "Failed to create share link. Please try again.",
                        variant: "destructive"
                      });
                    });
                  }}
                >
                  Create Share Link
                </Button>
              </div>
            </form>
          </div>
        </div>
      </dialog>

      {/* Modal for sharing selected projects */}
      <dialog id="shareSelectedProjectsModal" className="modal">
        <div className="modal-box max-w-md bg-white p-0 rounded-lg shadow-lg">
          <div className="p-5">
            <h3 className="font-bold text-lg mb-4">Share Creator List</h3>
            <form method="dialog" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="share-selected-name">Share Name</Label>
                <Input
                  id="share-selected-name"
                  placeholder="Enter a name for this shared list"
                  defaultValue={`Selected Creator Videos (${selectedProjects.length})`}
                  className="w-full"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="share-selected-description">Description (optional)</Label>
                <Textarea
                  id="share-selected-description"
                  placeholder="Add a description for the recipients"
                  defaultValue={`A collection of ${selectedProjects.length} upcoming creator videos.`}
                  className="w-full resize-none h-24"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="share-selected-email">Recipient Email</Label>
                <Input 
                  id="share-selected-email" 
                  placeholder="Enter recipient email" 
                  className="w-full"
                />
              </div>
              
              <div className="mt-4 p-3 bg-gray-50 rounded-md">
                <h4 className="font-medium text-sm mb-2">Selected Videos ({selectedProjects.length})</h4>
                <div className="max-h-48 overflow-auto space-y-1">
                  {selectedProjects.map(id => {
                    const creator = filteredData.find(c => c.id === id);
                    return creator ? (
                      <div key={id} className="text-sm py-1 px-2 border-b border-gray-100 flex items-center justify-between">
                        <span className="font-medium">{creator.title}</span>
                        <span className="text-gray-500 text-xs">{creator.name}</span>
                      </div>
                    ) : null;
                  })}
                </div>
              </div>
              
              <div className="flex items-center justify-between space-x-3 mt-6 pt-3 border-t border-gray-100">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    const dialog = document.getElementById('shareSelectedProjectsModal');
                    if (dialog instanceof HTMLDialogElement) {
                      dialog.close();
                    }
                  }}
                  className="px-4 py-2 h-10"
                >
                  Cancel
                </Button>
                <Button 
                  className="bg-teal-600 text-white hover:bg-teal-700 px-5 py-2 h-10"
                  onClick={() => {
                    // Get the share name
                    const shareName = (document.getElementById('share-selected-name') as HTMLInputElement)?.value || `Selected Creator Videos (${selectedProjects.length})`;
                    const shareDescription = (document.getElementById('share-selected-description') as HTMLTextAreaElement)?.value || '';
                    const recipientEmail = (document.getElementById('share-selected-email') as HTMLInputElement)?.value || '';
                    
                    // Get the selected creator data only
                    const selectedCreatorData = filteredData.filter(creator => selectedProjects.includes(creator.id));
                    
                    // Create API payload with selected creator data
                    const shareData = {
                      title: shareName,
                      description: shareDescription,
                      recipientEmail,
                      content: selectedCreatorData // Send only the selected creators
                    };
                    
                    // Close the current dialog before API call
                    const dialog = document.getElementById('shareSelectedProjectsModal');
                    if (dialog instanceof HTMLDialogElement) {
                      dialog.close();
                    }
                    
                    // Make API call to create the share
                    fetch('/api/shareable-landing-pages/creator-videos', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(shareData)
                    })
                    .then(response => response.json())
                    .then(data => {
                      console.log('Share selected response:', data);
                      // Create a success dialog with copy link functionality
                      const successDialog = document.createElement('dialog');
                      successDialog.className = "modal";
                      
                      const shareUrl = data.shareUrl || `${window.location.origin}/share/demo`;
                      
                      successDialog.innerHTML = `
                        <div class="modal-box max-w-md bg-white p-0 rounded-lg shadow-lg">
                          <div class="p-5">
                            <h3 class="font-bold text-lg mb-4">Shareable Link Created</h3>
                            
                            <p class="mb-2 text-sm text-gray-600">
                              Your shareable link for ${selectedProjects.length} selected videos has been created:
                            </p>
                            
                            <div class="flex mt-4 mb-6">
                              <input 
                                type="text" 
                                value="${shareUrl}" 
                                class="flex-1 p-2 border rounded-l-md bg-gray-50" 
                                readonly
                                id="share-selected-url-input"
                              />
                              <button
                                type="button"
                                class="bg-teal-600 text-white px-3 py-2 rounded-r-md"
                                onclick="
                                  const input = document.getElementById('share-selected-url-input');
                                  input.select();
                                  document.execCommand('copy');
                                  this.textContent = 'Copied!';
                                  setTimeout(() => { this.textContent = 'Copy' }, 2000);
                                "
                              >
                                Copy
                              </button>
                            </div>
                            
                            <div class="flex justify-end mt-4 pt-3 border-t border-gray-100">
                              <button 
                                class="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-md"
                                onclick="this.closest('dialog').close();"
                              >
                                Close
                              </button>
                            </div>
                          </div>
                        </div>
                      `;
                      
                      document.body.appendChild(successDialog);
                      successDialog.addEventListener('close', () => {
                        document.body.removeChild(successDialog);
                      });
                      
                      successDialog.showModal();
                    })
                    .catch(error => {
                      console.error('Error creating share:', error);
                      toast({
                        title: "Error",
                        description: "Failed to create share link. Please try again.",
                        variant: "destructive"
                      });
                    });
                  }}
                >
                  Create Share Link
                </Button>
              </div>
            </form>
          </div>
        </div>
      </dialog>
    </div>
  );
}