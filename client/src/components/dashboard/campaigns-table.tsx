import { Campaign } from "@shared/schema";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Loader2, Edit, Trash2 } from "lucide-react";
import { getStatusColor } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { CampaignEditDialog } from "../campaign/campaign-edit-dialog";
import { CampaignDeleteDialog } from "../campaign/campaign-delete-dialog";

interface CampaignsTableProps {
  campaigns: Campaign[];
  isLoading: boolean;
  showPagination?: boolean;
}

export function CampaignsTable({ campaigns, isLoading, showPagination = false }: CampaignsTableProps) {
  const { toast } = useToast();
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [deletingCampaign, setDeletingCampaign] = useState<Campaign | null>(null);

  const toggleCampaignStatus = async (id: number, currentStatus: string) => {
    // Toggle between active and paused status
    const newStatus = currentStatus === 'active' ? 'paused' : 'active';
    
    try {
      await apiRequest("PATCH", `/api/campaigns/${id}/status`, { status: newStatus });
      queryClient.invalidateQueries({ queryKey: ['/api/campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['/api/campaigns/recent'] });
      
      toast({
        title: `Campaign ${newStatus}`,
        description: `Campaign has been ${newStatus === 'active' ? 'activated' : 'paused'} successfully.`,
      });
    } catch (error) {
      toast({
        title: "Action failed",
        description: `Failed to ${newStatus === 'active' ? 'activate' : 'pause'} the campaign.`,
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (campaigns.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No campaigns found. Create a new campaign to get started.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Campaign Name</TableHead>
            <TableHead>Creator</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Progress</TableHead>
            <TableHead>Performance</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {campaigns.map((campaign) => {
            const { bg, text } = getStatusColor(campaign.status);
            const toggleText = campaign.status === 'active' ? 'Pause' : 'Activate';
            
            return (
              <TableRow key={campaign.id}>
                <TableCell className="whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="text-sm font-medium text-gray-900">
                      {campaign.name}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  <div className="text-sm text-gray-900">{campaign.creatorName || "--"}</div>
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${bg} ${text}`}>
                    {campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
                  </span>
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`${campaign.status === 'scheduled' ? 'bg-amber-500' : 'bg-primary-DEFAULT'} h-2 rounded-full`} 
                      style={{ width: `${campaign.progress || 0}%` }}
                    ></div>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {campaign.status === 'scheduled' 
                      ? `Starts ${campaign.startDate ? new Date(campaign.startDate).toLocaleDateString() : 'soon'}`
                      : `${campaign.progress || 0}% Complete`
                    }
                  </div>
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {campaign.openRate ? `${campaign.openRate}% Open Rate` : '--'}
                  </div>
                  <div className="text-xs text-gray-500">
                    {campaign.responseRate ? `${campaign.responseRate}% Response Rate` : ''}
                  </div>
                </TableCell>
                <TableCell className="whitespace-nowrap text-sm font-medium">
                  <div className="flex space-x-2">
                    <Button variant="link" className="text-primary-DEFAULT hover:text-primary-dark p-0" asChild>
                      <a href={`/campaigns/${campaign.id}`}>View</a>
                    </Button>
                    
                    {['active', 'paused', 'scheduled'].includes(campaign.status) && (
                      <Button 
                        variant="link" 
                        className="text-gray-600 hover:text-gray-900 p-0"
                        onClick={() => toggleCampaignStatus(campaign.id, campaign.status)}
                      >
                        {toggleText}
                      </Button>
                    )}
                    
                    <Button 
                      variant="link" 
                      className="text-blue-600 hover:text-blue-800 p-0 flex items-center"
                      onClick={() => setEditingCampaign(campaign)}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    
                    <Button 
                      variant="link" 
                      className="text-red-600 hover:text-red-800 p-0 flex items-center"
                      onClick={() => setDeletingCampaign(campaign)}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      
      {showPagination && campaigns.length > 0 && (
        <div className="flex items-center justify-between px-6 py-4 border-t">
          <div className="text-sm text-gray-500">
            Showing <span className="font-medium">1</span> to <span className="font-medium">{campaigns.length}</span> of{" "}
            <span className="font-medium">{campaigns.length}</span> results
          </div>
          <div className="flex-1 flex justify-end">
            <Button variant="outline" size="sm" className="ml-3" disabled>
              Previous
            </Button>
            <Button variant="outline" size="sm" className="ml-3" disabled>
              Next
            </Button>
          </div>
        </div>
      )}
      
      {/* Edit Dialog */}
      {editingCampaign && (
        <CampaignEditDialog 
          campaign={editingCampaign}
          isOpen={!!editingCampaign}
          onClose={() => setEditingCampaign(null)}
        />
      )}
      
      {/* Delete Dialog */}
      {deletingCampaign && (
        <CampaignDeleteDialog
          campaignId={deletingCampaign.id}
          campaignName={deletingCampaign.name}
          isOpen={!!deletingCampaign}
          onClose={() => setDeletingCampaign(null)}
        />
      )}
    </div>
  );
}
