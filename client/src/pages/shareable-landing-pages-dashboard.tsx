import React, { useState, useEffect } from 'react';
import { Link as WouterLink } from 'wouter';
import { 
  Link as LinkIcon
} from 'lucide-react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertCircle,
  BarChart2,
  FileText,
  Eye,
  Share2,
  Calendar,
  Trash2,
  MousePointer2,
  ExternalLink,
  Activity,
  Layers
} from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export default function ShareableLandingPagesDashboard() {
  const [pages, setPages] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    // Fetch all pages
    fetch('/api/shareable-landing-pages')
      .then(response => response.json())
      .then(data => {
        setPages(data);
        setLoading(false);
      })
      .catch(error => {
        console.error('Error fetching landing pages:', error);
        setLoading(false);
      });
    
    // Fetch analytics
    fetch('/api/shareable-landing-pages/analytics')
      .then(response => response.json())
      .then(data => {
        setAnalytics(data);
      })
      .catch(error => {
        console.error('Error fetching analytics:', error);
      });
  }, []);

  // Format date for display
  const formatDate = (dateString: string | Date): string => {
    if (!dateString) return 'N/A';
    const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  // Get status badge color
  const getStatusBadge = (status: string, expiresAt: string | Date | null): React.ReactNode => {
    // Check if expired
    if (expiresAt && new Date(expiresAt) < new Date()) {
      return <Badge variant="outline" className="bg-red-50 text-red-800 border-red-200">Expired</Badge>;
    }
    
    // Otherwise use status
    switch (status) {
      case 'active':
        return <Badge variant="outline" className="bg-green-50 text-green-800 border-green-200">Active</Badge>;
      case 'deleted':
        return <Badge variant="outline" className="bg-gray-50 text-gray-800 border-gray-200">Deleted</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Format view count
  const formatViewCount = (count: number): string => {
    if (!count) return '0';
    return count.toLocaleString();
  };

  // Get page type label
  const getPageTypeLabel = (type: string): React.ReactNode => {
    switch (type) {
      case 'creator-project':
        return <Badge variant="outline" className="bg-blue-50 text-blue-800 border-blue-200">Creator Project</Badge>;
      case 'creator-list':
        return <Badge variant="outline" className="bg-purple-50 text-purple-800 border-purple-200">Creator List</Badge>;
      case 'selected-creators':
        return <Badge variant="outline" className="bg-indigo-50 text-indigo-800 border-indigo-200">Selected Creators</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  // Prepare data for pie chart
  const pageTypeData = analytics ? [
    { name: 'Creator Projects', value: analytics.pageTypeCount['creator-project'] || 0 },
    { name: 'Creator Lists', value: analytics.pageTypeCount['creator-list'] || 0 },
    { name: 'Selected Creators', value: analytics.pageTypeCount['selected-creators'] || 0 }
  ] : [];

  // Prepare data for bar chart (top pages)
  const topPagesData = analytics?.topPages || [];

  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * Math.PI / 180);
    const y = cy + radius * Math.sin(-midAngle * Math.PI / 180);
  
    return (
      <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central">
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6">Shareable Links Dashboard</h1>
        <div className="grid gap-6 md:grid-cols-3">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
        <div className="mt-6">
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Shareable Links Dashboard</h1>
        <Button className="bg-gradient-to-r from-blue-600 to-indigo-600">
          <FileText className="mr-2 h-4 w-4" />
          Create New Link
        </Button>
      </div>

      <Tabs defaultValue="overview" className="w-full" onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="overview">
            <BarChart2 className="mr-2 h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="all-links">
            <LinkIcon className="mr-2 h-4 w-4" />
            All Links
          </TabsTrigger>
          <TabsTrigger value="settings">
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-6">
          {/* Stats Cards */}
          <div className="grid gap-6 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">Total Views</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {analytics ? formatViewCount(analytics.totalViews) : '0'}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Across {analytics ? analytics.totalPages : 0} pages
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">Active Links</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {analytics ? analytics.statusCount.active : 0}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {analytics && analytics.statusCount.expired > 0 ? 
                    `${analytics.statusCount.expired} expired links` : 
                    'No expired links'}
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">Recent Views</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {analytics ? formatViewCount(analytics.recentViews) : '0'}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Last 7 days
                </p>
              </CardContent>
            </Card>
          </div>
          
          {/* Charts Section */}
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Popular Links</CardTitle>
                <CardDescription>Top 5 most viewed pages</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  {analytics && (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={topPagesData}
                        margin={{ top: 20, right: 30, left: 20, bottom: 70 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="title" 
                          angle={-45} 
                          textAnchor="end" 
                          height={70} 
                          tick={{ fontSize: 12 }}
                        />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar 
                          dataKey="viewCount" 
                          fill="#3b82f6" 
                          name="Views" 
                          radius={[4, 4, 0, 0]} 
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Links by Type</CardTitle>
                <CardDescription>Distribution of link types</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  {analytics && (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pageTypeData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={renderCustomizedLabel}
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {pageTypeData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="all-links" className="space-y-6">
          <Card className="overflow-hidden">
            <CardHeader>
              <CardTitle>All Shareable Links</CardTitle>
              <CardDescription>
                Manage and monitor all your shareable links
              </CardDescription>
            </CardHeader>
            <CardContent>
              {pages.length > 0 ? (
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Title</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead className="text-right">Views</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pages.map((page) => (
                        <TableRow key={page.id}>
                          <TableCell className="font-medium">
                            <div>
                              <div>{page.title}</div>
                              <div className="text-sm text-gray-500 truncate max-w-xs">
                                {page.uniqueId}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{getPageTypeLabel(page.type)}</TableCell>
                          <TableCell>{getStatusBadge(page.status, page.expiresAt)}</TableCell>
                          <TableCell>{formatDate(page.createdAt)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end space-x-1">
                              <Eye className="h-4 w-4 text-gray-500" />
                              <span>{formatViewCount(page.viewCount)}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end space-x-2">
                              <Button variant="ghost" size="icon">
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon">
                                <Activity className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="text-red-500">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>No links found</AlertTitle>
                  <AlertDescription>
                    You haven't created any shareable links yet.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Default Settings</CardTitle>
              <CardDescription>
                Configure default settings for new shareable links
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="expiration">Default Expiration</Label>
                    <p className="text-sm text-gray-500">
                      Set how long links remain active by default
                    </p>
                  </div>
                  <select 
                    id="expiration" 
                    className="border rounded-md p-2"
                    defaultValue="7"
                  >
                    <option value="3">3 days</option>
                    <option value="7">7 days</option>
                    <option value="14">14 days</option>
                    <option value="30">30 days</option>
                    <option value="0">No expiration</option>
                  </select>
                </div>
                
                <Separator />
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="branding">Custom Branding</Label>
                    <p className="text-sm text-gray-500">
                      Enable custom branding on shared pages
                    </p>
                  </div>
                  <Switch id="branding" />
                </div>
                
                <Separator />
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="analytics">Enhanced Analytics</Label>
                    <p className="text-sm text-gray-500">
                      Track detailed analytics for all shared pages
                    </p>
                  </div>
                  <Switch id="analytics" defaultChecked />
                </div>
                
                <Separator />
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="contactForm">Enable Contact Forms</Label>
                    <p className="text-sm text-gray-500">
                      Allow visitors to contact you from shared pages
                    </p>
                  </div>
                  <Switch id="contactForm" />
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline">Reset to Defaults</Button>
              <Button>Save Settings</Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Settings(props) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function Link(props) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}