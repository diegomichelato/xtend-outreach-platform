import { useQuery } from "@tanstack/react-query";
import { OverviewCard } from "@/components/dashboard/overview-card";
import { CampaignsTable } from "@/components/dashboard/campaigns-table";
import { CampaignWizard } from "@/components/campaign/campaign-wizard";
import { Campaign } from "@/components/ui/chart";
import { Loader2 } from "lucide-react";

export default function Dashboard() {
  const { data: stats, isLoading: isLoadingStats } = useQuery({
    queryKey: ['/api/stats'],
  });

  const { data: campaigns, isLoading: isLoadingCampaigns } = useQuery({
    queryKey: ['/api/campaigns/recent'],
  });

  return (
    <div>
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-2 text-sm text-gray-600">Manage your email outreach campaigns</p>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {isLoadingStats ? (
          <div className="col-span-4 flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <OverviewCard 
              title="Active Campaigns"
              value={stats?.activeCampaigns || 0}
              change={stats?.campaignsChange || 0}
              icon="campaign"
              iconColor="bg-primary-light bg-opacity-10 text-primary-DEFAULT"
            />
            <OverviewCard 
              title="Emails Sent"
              value={stats?.emailsSent || 0}
              change={stats?.emailsChange || 0}
              icon="send"
              iconColor="bg-secondary-light bg-opacity-10 text-secondary-DEFAULT"
            />
            <OverviewCard 
              title="Open Rate"
              value={`${stats?.openRate || 0}%`}
              change={stats?.openRateChange || 0}
              icon="visibility"
              iconColor="bg-accent-light bg-opacity-10 text-accent-DEFAULT"
            />
            <OverviewCard 
              title="Response Rate"
              value={`${stats?.responseRate || 0}%`}
              change={stats?.responseRateChange || 0}
              icon="reply"
              iconColor="bg-red-100 text-red-600"
            />
          </>
        )}
      </div>

      {/* Recent Campaigns Table */}
      <div className="bg-white rounded-lg shadow mb-8">
        <div className="px-6 py-5 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-medium text-gray-900">Recent Campaigns</h2>
            <a href="/campaigns" className="text-primary-DEFAULT hover:text-primary-dark font-medium text-sm flex items-center">
              View all
              <span className="material-icons text-sm ml-1">chevron_right</span>
            </a>
          </div>
        </div>
        <CampaignsTable campaigns={campaigns || []} isLoading={isLoadingCampaigns} />
      </div>

      {/* Campaign Builder Section */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-5 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Create New Campaign</h2>
          <p className="mt-1 text-sm text-gray-500">Set up your next outreach campaign in a few simple steps</p>
        </div>
        <CampaignWizard />
      </div>
    </div>
  );
}
