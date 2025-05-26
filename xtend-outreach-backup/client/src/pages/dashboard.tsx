import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RealTimeMetrics } from "@/components/dashboard/real-time-metrics";
import { OverviewCard } from "@/components/dashboard/overview-card";
import { OutreachMetrics } from "@/components/outreach/OutreachMetrics";
import { DeliverabilityTools } from "@/components/outreach/DeliverabilityTools";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  Mail,
  Users,
  Target,
  Activity,
  BarChart2,
  Shield,
  Settings,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import type { DashboardStats, OutreachMetrics as OutreachMetricsType, DeliverabilityMetrics, AIMonitoringMetrics } from "@/types/api";

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8"];

export default function Dashboard() {
  const { data: stats, isLoading: isLoadingStats } = useQuery<DashboardStats>({
    queryKey: ["/api/stats"],
  });

  const { data: outreachMetrics } = useQuery<OutreachMetricsType>({
    queryKey: ["/api/outreach/metrics"],
  });

  const { data: deliverabilityMetrics } = useQuery<DeliverabilityMetrics>({
    queryKey: ["/api/deliverability/metrics"],
  });

  const { data: aiMetrics } = useQuery<AIMonitoringMetrics>({
    queryKey: ["/api/ai-monitoring/dashboard"],
  });

  return (
    <div className="container mx-auto py-8 space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold">Platform Overview</h1>
        <p className="text-muted-foreground mt-2">
          Comprehensive view of your outreach and engagement metrics
        </p>
      </div>

      {/* Real-time Performance */}
      <RealTimeMetrics />

      {/* Main Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <OverviewCard
          title="Active Campaigns"
          value={stats?.activeCampaigns ?? 0}
          change={stats?.campaignsChange ?? 0}
          icon="campaign"
          iconColor="bg-primary-light bg-opacity-10 text-primary-DEFAULT"
        />
        <OverviewCard
          title="Total Contacts"
          value={stats?.totalContacts ?? 0}
          change={stats?.contactsChange ?? 0}
          icon="contacts"
          iconColor="bg-secondary-light bg-opacity-10 text-secondary-DEFAULT"
        />
        <OverviewCard
          title="Response Rate"
          value={`${stats?.responseRate ?? 0}%`}
          change={stats?.responseRateChange ?? 0}
          icon="reply"
          iconColor="bg-accent-light bg-opacity-10 text-accent-DEFAULT"
        />
        <OverviewCard
          title="Health Score"
          value={`${deliverabilityMetrics?.overallHealth ?? 0}%`}
          change={deliverabilityMetrics?.healthChange ?? 0}
          icon="health"
          iconColor="bg-green-100 text-green-600"
        />
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="outreach" className="space-y-6">
        <TabsList>
          <TabsTrigger value="outreach" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Outreach
          </TabsTrigger>
          <TabsTrigger value="deliverability" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Deliverability
          </TabsTrigger>
          <TabsTrigger value="ai-monitoring" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            AI Monitoring
          </TabsTrigger>
        </TabsList>

        {/* Outreach Tab */}
        <TabsContent value="outreach" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Campaign Performance */}
            <Card className="col-span-2 p-6">
              <h3 className="text-lg font-semibold mb-4">Campaign Performance</h3>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={outreachMetrics?.timeData ?? []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="sent" fill="#94a3b8" name="Sent" />
                    <Bar dataKey="opens" fill="#60a5fa" name="Opens" />
                    <Bar dataKey="replies" fill="#34d399" name="Replies" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Email Type Distribution */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Email Distribution</h3>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={outreachMetrics?.distribution ?? []}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      label
                    >
                      {(outreachMetrics?.distribution ?? []).map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>
        </TabsContent>

        {/* Deliverability Tab */}
        <TabsContent value="deliverability" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Domain Health */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Domain Health</h3>
              <div className="space-y-4">
                {deliverabilityMetrics?.domainHealth?.map((check, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-muted rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      {check.status === "success" ? (
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                      ) : (
                        <AlertTriangle className="h-5 w-5 text-yellow-500" />
                      )}
                      <div>
                        <p className="font-medium">{check.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {check.message}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Spam Score Analysis */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Spam Score Analysis</h3>
              <div className="space-y-4">
                {deliverabilityMetrics?.spamAnalysis?.map((item, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">{item.name}</span>
                      <span className="text-sm text-muted-foreground">
                        {item.score}/10
                      </span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary"
                        style={{ width: `${(item.score / 10) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </TabsContent>

        {/* AI Monitoring Tab */}
        <TabsContent value="ai-monitoring" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* AI Performance Metrics */}
            <Card className="col-span-2 p-6">
              <h3 className="text-lg font-semibold mb-4">AI Performance</h3>
              <div className="space-y-6">
                {aiMetrics?.recentAnalyses?.map((analysis, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-4 bg-muted rounded-lg"
                  >
                    <div>
                      <p className="font-medium">{analysis.type}</p>
                      <p className="text-sm text-muted-foreground">
                        Score: {analysis.score}/100
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">
                        {new Date(analysis.analysisDate).toLocaleDateString()}
                      </p>
                      <p
                        className={`text-sm ${
                          analysis.status === "success"
                            ? "text-green-600"
                            : "text-yellow-600"
                        }`}
                      >
                        {analysis.status}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Alert Summary */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Active Alerts</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-red-50 text-red-700 rounded-lg">
                  <span>Critical</span>
                  <span className="font-bold">{aiMetrics?.alerts?.critical ?? 0}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-yellow-50 text-yellow-700 rounded-lg">
                  <span>Warning</span>
                  <span className="font-bold">{aiMetrics?.alerts?.warning ?? 0}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-blue-50 text-blue-700 rounded-lg">
                  <span>Info</span>
                  <span className="font-bold">{aiMetrics?.alerts?.info ?? 0}</span>
                </div>
              </div>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
