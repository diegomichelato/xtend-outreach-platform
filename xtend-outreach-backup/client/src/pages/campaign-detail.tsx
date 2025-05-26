import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRoute, Link } from 'wouter';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Loader2, ArrowLeft, Beaker, Edit, Play, Pause, BarChart4, TestTube } from 'lucide-react';
import { getStatusColor } from '@/lib/utils';
import { AbTestingPanel } from '@/components/ab-testing/AbTestingPanel';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export default function CampaignDetailPage() {
  const [_, params] = useRoute('/campaigns/:id');
  const campaignId = params?.id ? parseInt(params.id) : null;
  const [activeTab, setActiveTab] = useState('overview');
  const [showAbTesting, setShowAbTesting] = useState(false);
  
  // Fetch campaign details
  const { data: campaign, isLoading, error } = useQuery({
    queryKey: ['/api/campaigns', campaignId],
    queryFn: async () => {
      if (!campaignId) return null;
      const response = await apiRequest("GET", `/api/campaigns/${campaignId}`);
      return response.json();
    },
    enabled: !!campaignId
  });
  
  // Fetch campaign emails
  const { data: emails, isLoading: isLoadingEmails } = useQuery({
    queryKey: ['/api/campaigns', campaignId, 'emails'],
    queryFn: async () => {
      if (!campaignId) return [];
      const response = await apiRequest("GET", `/api/campaigns/${campaignId}/emails`);
      return response.json();
    },
    enabled: !!campaignId
  });
  
  // Fetch creator info
  const { data: creator } = useQuery({
    queryKey: ['/api/creators', campaign?.creatorId],
    queryFn: async () => {
      if (!campaign?.creatorId) return null;
      const response = await apiRequest("GET", `/api/creators/${campaign.creatorId}`);
      return response.json();
    },
    enabled: !!campaign?.creatorId
  });
  
  // Fetch contact list info
  const { data: contactList } = useQuery({
    queryKey: ['/api/contact-lists', campaign?.contactListId],
    queryFn: async () => {
      if (!campaign?.contactListId) return null;
      const response = await apiRequest("GET", `/api/contact-lists/${campaign.contactListId}`);
      return response.json();
    },
    enabled: !!campaign?.contactListId
  });
  
  // Check if campaign has A/B testing
  const { data: abTestConfig, isLoading: isLoadingAbTest } = useQuery({
    queryKey: ['/api/ab-tests', campaignId],
    queryFn: async () => {
      if (!campaignId) return null;
      try {
        const response = await apiRequest("GET", `/api/ab-tests/${campaignId}`);
        const data = await response.json();
        return data.success ? data.data : null;
      } catch (error) {
        // If the campaign doesn't have an A/B test, this is expected to fail
        return null;
      }
    },
    enabled: !!campaignId
  });
  
  if (isLoading) {
    return (
      <div className="container max-w-7xl mx-auto py-8">
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }
  
  if (error || !campaign) {
    return (
      <div className="container max-w-7xl mx-auto py-8">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <h2 className="text-lg font-medium text-red-800">Campaign not found</h2>
          <p className="text-red-600 mt-1">Unable to load campaign details.</p>
          <Button variant="outline" className="mt-4" asChild>
            <Link href="/campaigns">Back to Campaigns</Link>
          </Button>
        </div>
      </div>
    );
  }
  
  const { bg, text } = getStatusColor(campaign.status);
  
  return (
    <div className="container max-w-7xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <Button variant="outline" size="sm" asChild>
            <Link href="/campaigns">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{campaign.name}</h1>
            <div className="flex items-center mt-1">
              <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${bg} ${text}`}>
                {campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
              </span>
              {abTestConfig && (
                <span className="ml-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                  A/B Testing
                </span>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex space-x-2">
          {!abTestConfig && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowAbTesting(true)}
              className="flex items-center"
            >
              <TestTube className="h-4 w-4 mr-1" />
              Create A/B Test
            </Button>
          )}
          {abTestConfig && (
            <Button 
              variant="outline"
              size="sm"
              onClick={() => setShowAbTesting(true)}
              className="flex items-center"
            >
              <Beaker className="h-4 w-4 mr-1" />
              View A/B Test
            </Button>
          )}
          <Button 
            variant="outline" 
            size="sm"
            className="flex items-center"
          >
            <Edit className="h-4 w-4 mr-1" />
            Edit
          </Button>
          <Button 
            variant={campaign.status === 'active' ? 'outline' : 'default'} 
            size="sm"
            className="flex items-center"
          >
            {campaign.status === 'active' ? (
              <>
                <Pause className="h-4 w-4 mr-1" />
                Pause
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-1" />
                Activate
              </>
            )}
          </Button>
        </div>
      </div>
      
      {/* Content */}
      <div className="space-y-6">
        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">Campaign Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{campaign.progress || 0}%</div>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                <div 
                  className="bg-primary h-2 rounded-full" 
                  style={{ width: `${campaign.progress || 0}%` }}
                ></div>
              </div>
              {campaign.status === 'scheduled' && campaign.startDate && (
                <p className="text-xs text-gray-500 mt-2">
                  Starts on {new Date(campaign.startDate).toLocaleDateString()} at {new Date(campaign.startDate).toLocaleTimeString()}
                </p>
              )}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-2xl font-bold">{campaign.openRate || 0}%</div>
                  <div className="text-xs text-gray-500">Open Rate</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">{campaign.responseRate || 0}%</div>
                  <div className="text-xs text-gray-500">Response Rate</div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">Campaign Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Creator:</span>
                  <span className="text-sm font-medium">{creator?.name || 'Unknown'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Contact List:</span>
                  <span className="text-sm font-medium">{contactList?.name || 'Unknown'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Emails in Sequence:</span>
                  <span className="text-sm font-medium">{campaign.sequenceCount}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Tabs */}
        <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-3 md:grid-cols-5 mb-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="emails">Emails</TabsTrigger>
            <TabsTrigger value="contacts">Contacts</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            {abTestConfig && (
              <TabsTrigger value="ab-testing">A/B Testing</TabsTrigger>
            )}
          </TabsList>
          
          <TabsContent value="overview">
            <div className="bg-white rounded-lg border p-6">
              <h2 className="text-lg font-medium mb-4">Campaign Overview</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Campaign Settings</h3>
                  <div className="space-y-4">
                    <div>
                      <div className="text-xs text-gray-500">Objective</div>
                      <div className="text-sm font-medium mt-1">{campaign.objective}</div>
                    </div>
                    
                    {campaign.customObjective && (
                      <div>
                        <div className="text-xs text-gray-500">Custom Objective</div>
                        <div className="text-sm font-medium mt-1">{campaign.customObjective}</div>
                      </div>
                    )}
                    
                    <div>
                      <div className="text-xs text-gray-500">Tone</div>
                      <div className="text-sm font-medium mt-1">{campaign.tone}</div>
                    </div>
                    
                    <div>
                      <div className="text-xs text-gray-500">Email Interval</div>
                      <div className="text-sm font-medium mt-1">{campaign.interval} days</div>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Campaign Info</h3>
                  <div className="space-y-4">
                    <div>
                      <div className="text-xs text-gray-500">Created</div>
                      <div className="text-sm font-medium mt-1">
                        {campaign.createdAt ? new Date(campaign.createdAt).toLocaleDateString() : 'Unknown'}
                      </div>
                    </div>
                    
                    <div>
                      <div className="text-xs text-gray-500">Creator</div>
                      <div className="text-sm font-medium mt-1">{creator?.name || 'Unknown'}</div>
                    </div>
                    
                    <div>
                      <div className="text-xs text-gray-500">Total Recipients</div>
                      <div className="text-sm font-medium mt-1">{contactList?.contactCount || 'Unknown'}</div>
                    </div>
                    
                    {abTestConfig && (
                      <div>
                        <div className="text-xs text-gray-500">A/B Testing</div>
                        <div className="text-sm font-medium mt-1">
                          {abTestConfig.testType.charAt(0).toUpperCase() + abTestConfig.testType.slice(1)} test with {abTestConfig.variantCount} variants
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              {campaign.emailSequence && (
                <div className="mt-8">
                  <h3 className="text-sm font-medium text-gray-500 mb-4">Email Sequence</h3>
                  <div className="space-y-4">
                    {Array.isArray(campaign.emailSequence) && campaign.emailSequence.map((email: any, index: number) => (
                      <div key={index} className="border rounded-md p-4">
                        <div className="flex justify-between items-center mb-2">
                          <div className="font-medium">Email {index + 1}: {email.title || 'Untitled'}</div>
                          <div className="text-xs text-gray-500">
                            {index === 0 ? 'Immediate' : `+${index * campaign.interval} days`}
                          </div>
                        </div>
                        {email.description && (
                          <p className="text-sm text-gray-600">{email.description}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="emails">
            <div className="bg-white rounded-lg border p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-medium">Campaign Emails</h2>
                <div className="text-sm text-gray-500">
                  {isLoadingEmails ? 'Loading...' : `${emails?.length || 0} emails`}
                </div>
              </div>
              
              {isLoadingEmails ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : emails?.length > 0 ? (
                <div className="space-y-4">
                  {emails.map((email: any) => (
                    <div key={email.id} className="border rounded-md p-4">
                      <div className="flex justify-between items-center mb-2">
                        <div className="font-medium">
                          {email.subject}
                          {email.abTestVariantId && (
                            <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-800">
                              Variant {email.abTestVariantId}
                            </span>
                          )}
                        </div>
                        <div className="text-xs px-2 py-1 rounded-full bg-gray-100">
                          {email.status.charAt(0).toUpperCase() + email.status.slice(1)}
                        </div>
                      </div>
                      <div className="text-sm text-gray-500 mb-2">
                        To: {email.contactEmail || 'Unknown'} 
                        {email.scheduledAt && (
                          <span className="ml-2">
                            | Scheduled for: {new Date(email.scheduledAt).toLocaleString()}
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-800 max-h-20 overflow-y-auto">
                        {email.body ? email.body.substring(0, 150) + '...' : 'No content available'}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-gray-50 border rounded-md p-8 text-center">
                  <p className="text-gray-500">No emails have been created for this campaign yet.</p>
                </div>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="contacts">
            <div className="bg-white rounded-lg border p-6">
              <h2 className="text-lg font-medium mb-4">Campaign Contacts</h2>
              <div className="flex items-center space-x-2 mb-6">
                <div className="text-sm font-medium">Contact List:</div>
                <div className="text-sm">{contactList?.name || 'Unknown'}</div>
              </div>
              
              {/* Contact list summary can go here */}
              <div className="bg-gray-50 rounded-md p-4">
                <div className="text-sm">Contact list details coming soon...</div>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="analytics">
            <div className="bg-white rounded-lg border p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-medium">Campaign Analytics</h2>
                <Button variant="outline" size="sm" className="flex items-center">
                  <BarChart4 className="h-4 w-4 mr-1" />
                  View Detailed Report
                </Button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-3xl font-bold text-center">{campaign.openRate || 0}%</div>
                    <div className="text-sm text-center text-gray-500 mt-1">Open Rate</div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-3xl font-bold text-center">{campaign.responseRate || 0}%</div>
                    <div className="text-sm text-center text-gray-500 mt-1">Response Rate</div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-3xl font-bold text-center">0%</div>
                    <div className="text-sm text-center text-gray-500 mt-1">Bounce Rate</div>
                  </CardContent>
                </Card>
              </div>
              
              {/* Placeholder for charts */}
              <div className="h-64 bg-gray-50 rounded-md flex items-center justify-center">
                <p className="text-gray-500">Detailed analytics charts coming soon</p>
              </div>
            </div>
          </TabsContent>
          
          {abTestConfig && (
            <TabsContent value="ab-testing">
              <div className="bg-white rounded-lg border p-6">
                <h2 className="text-lg font-medium mb-4">A/B Testing</h2>
                
                <Button
                  variant="outline"
                  className="mb-4"
                  onClick={() => setShowAbTesting(true)}
                >
                  View A/B Test Details
                </Button>
                
                <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                  <h3 className="text-md font-medium text-blue-800 mb-2">A/B Test Configuration</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <div className="text-xs text-blue-600">Test Type</div>
                      <div className="text-sm font-medium">{abTestConfig.testType.charAt(0).toUpperCase() + abTestConfig.testType.slice(1)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-blue-600">Variants</div>
                      <div className="text-sm font-medium">{abTestConfig.variantCount}</div>
                    </div>
                    <div>
                      <div className="text-xs text-blue-600">Winning Metric</div>
                      <div className="text-sm font-medium">{abTestConfig.winnerMetric}</div>
                    </div>
                    <div>
                      <div className="text-xs text-blue-600">Status</div>
                      <div className="text-sm font-medium">{abTestConfig.status.charAt(0).toUpperCase() + abTestConfig.status.slice(1)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-blue-600">Sample Size</div>
                      <div className="text-sm font-medium">{abTestConfig.sampleSize} contacts per variant</div>
                    </div>
                    {abTestConfig.winnerVariantId && (
                      <div>
                        <div className="text-xs text-blue-600">Winner</div>
                        <div className="text-sm font-medium">
                          Variant {abTestConfig.variants.find((v: any) => v.id === abTestConfig.winnerVariantId)?.name}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </TabsContent>
          )}
        </Tabs>
      </div>
      
      {/* A/B Testing Dialog */}
      <Dialog open={showAbTesting} onOpenChange={setShowAbTesting}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <AbTestingPanel
            campaignId={campaignId || 0}
            onClose={() => setShowAbTesting(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}