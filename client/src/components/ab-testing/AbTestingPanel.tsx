import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { AlertCircle, CheckCircle2, PieChart, Beaker, BarChart, ArrowRight, RefreshCcw } from 'lucide-react';

// Types for component
interface AbTestVariant {
  id: number;
  name: string;
  description?: string;
  subjectLine?: string;
  emailBody?: string;
  senderId?: number;
  sendTime?: string;
  content?: any;
}

interface AbTestDistribution {
  type: 'equal' | 'percentage';
  values?: number[];
}

interface AbTestingPanelProps {
  campaignId: number;
  onClose: () => void;
}

export function AbTestingPanel({ campaignId, onClose }: AbTestingPanelProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('setup');
  const [testType, setTestType] = useState('subject');
  const [variantCount, setVariantCount] = useState(2);
  const [winnerMetric, setWinnerMetric] = useState('openRate');
  const [distribution, setDistribution] = useState<AbTestDistribution>({ type: 'equal' });
  const [variants, setVariants] = useState<AbTestVariant[]>([
    { id: 1, name: 'Variant A' },
    { id: 2, name: 'Variant B' }
  ]);
  const [sampleSize, setSampleSize] = useState(100);
  const [notes, setNotes] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  
  // Fetch campaign details
  const { data: campaign, isLoading: isLoadingCampaign } = useQuery({
    queryKey: ['/api/campaigns', campaignId],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/campaigns/${campaignId}`);
      return response.json();
    },
    enabled: !!campaignId
  });
  
  // Fetch A/B test configuration if exists
  const { data: abTestConfig, isLoading: isLoadingConfig } = useQuery({
    queryKey: ['/api/ab-tests', campaignId],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/ab-tests/${campaignId}`);
      const data = await response.json();
      return data.success ? data.data : null;
    },
    onError: () => {
      // If the campaign doesn't have an A/B test, this is expected to fail
      // No need to display an error
    },
    enabled: !!campaignId
  });
  
  // Fetch A/B test results if available
  const { data: abTestResults, isLoading: isLoadingResults, refetch: refetchResults } = useQuery({
    queryKey: ['/api/ab-tests/results', campaignId],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/ab-tests/${campaignId}/results`);
      const data = await response.json();
      return data.success ? data.data : null;
    },
    onError: () => {
      // If results aren't available yet, this is expected to fail
      // No need to display an error
    },
    enabled: !!abTestConfig && abTestConfig.status === 'running' || abTestConfig?.status === 'completed'
  });
  
  // Set up create A/B test mutation
  const createAbTestMutation = useMutation({
    mutationFn: async () => {
      setIsCreating(true);
      const response = await apiRequest("POST", '/api/ab-tests', {
        campaignId,
        testType,
        variantCount,
        variants: prepareVariantsForSubmission(),
        winnerMetric,
        distribution,
        sampleSize,
        notes
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to create A/B test');
      }
      
      return data;
    },
    onSuccess: () => {
      toast({
        title: 'A/B Test Created',
        description: 'Your A/B test has been successfully created.',
        variant: 'default',
      });
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/ab-tests', campaignId] });
      queryClient.invalidateQueries({ queryKey: ['/api/campaigns', campaignId] });
      
      // Move to results tab
      setActiveTab('results');
      setIsCreating(false);
    },
    onError: (error) => {
      toast({
        title: 'Error Creating A/B Test',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive',
      });
      setIsCreating(false);
    }
  });
  
  // Prepare variants based on test type
  const prepareVariantsForSubmission = () => {
    return variants.map(variant => {
      const preparedVariant: AbTestVariant = { ...variant };
      
      // Add specific properties based on test type
      if (testType === 'subject' && variant.subjectLine) {
        preparedVariant.subjectLine = variant.subjectLine;
      } else if (testType === 'body' && variant.emailBody) {
        preparedVariant.emailBody = variant.emailBody;
      } else if (testType === 'sender' && variant.senderId) {
        preparedVariant.senderId = variant.senderId;
      } else if (testType === 'time' && variant.sendTime) {
        preparedVariant.sendTime = variant.sendTime;
      }
      
      return preparedVariant;
    });
  };
  
  // Update variant count
  const handleVariantCountChange = (count: number) => {
    setVariantCount(count);
    
    // Add or remove variants as needed
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const newVariants = [...variants];
    
    if (count > variants.length) {
      // Add new variants
      for (let i = variants.length; i < count; i++) {
        newVariants.push({
          id: i + 1,
          name: `Variant ${letters[i]}`
        });
      }
    } else if (count < variants.length) {
      // Remove variants
      newVariants.splice(count);
    }
    
    setVariants(newVariants);
  };
  
  // Update variant field
  const updateVariant = (index: number, field: keyof AbTestVariant, value: any) => {
    const newVariants = [...variants];
    newVariants[index] = { ...newVariants[index], [field]: value };
    setVariants(newVariants);
  };
  
  // Handle form submission
  const handleCreateTest = () => {
    // Validate variants based on test type
    let isValid = true;
    
    if (testType === 'subject') {
      isValid = variants.every(v => v.subjectLine && v.subjectLine.trim() !== '');
    } else if (testType === 'body') {
      isValid = variants.every(v => v.emailBody && v.emailBody.trim() !== '');
    } else if (testType === 'sender') {
      isValid = variants.every(v => v.senderId);
    } else if (testType === 'time') {
      isValid = variants.every(v => v.sendTime && v.sendTime.trim() !== '');
    }
    
    if (!isValid) {
      toast({
        title: 'Validation Error',
        description: `Please complete all variant details for the ${testType} test.`,
        variant: 'destructive',
      });
      return;
    }
    
    createAbTestMutation.mutate();
  };
  
  // Format percentage for display
  const formatPercent = (value: number | null) => {
    if (value === null || isNaN(Number(value))) return 'N/A';
    return `${value.toFixed(1)}%`;
  };
  
  // Get status badge color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'setup': return 'bg-blue-100 text-blue-800';
      case 'running': return 'bg-yellow-100 text-yellow-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'analyzed': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };
  
  // Loading states
  if (isLoadingCampaign) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Loading A/B Testing Data...</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Progress value={50} className="w-1/2" />
          </div>
        </CardContent>
      </Card>
    );
  }
  
  // If A/B test exists, show configuration and results
  if (abTestConfig) {
    return (
      <Card className="w-full">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>A/B Test: {campaign?.name}</CardTitle>
              <CardDescription>Testing {abTestConfig.testType} variations</CardDescription>
            </div>
            <Badge className={getStatusColor(abTestConfig.status)}>
              {abTestConfig.status.charAt(0).toUpperCase() + abTestConfig.status.slice(1)}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid grid-cols-3 mb-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="variants">Variants</TabsTrigger>
              <TabsTrigger value="results">Results</TabsTrigger>
            </TabsList>
            
            <TabsContent value="overview">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Test Type</h3>
                    <p className="font-medium">{abTestConfig.testType.charAt(0).toUpperCase() + abTestConfig.testType.slice(1)}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Winner Metric</h3>
                    <p className="font-medium">{abTestConfig.winnerMetric.replace(/([A-Z])/g, ' $1').trim()}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Variant Count</h3>
                    <p className="font-medium">{abTestConfig.variantCount}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Distribution</h3>
                    <p className="font-medium">{abTestConfig.distribution.type.charAt(0).toUpperCase() + abTestConfig.distribution.type.slice(1)}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Sample Size</h3>
                    <p className="font-medium">{abTestConfig.sampleSize} contacts per variant</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Created</h3>
                    <p className="font-medium">{new Date(campaign?.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
                
                {abTestConfig.notes && (
                  <div className="mt-4">
                    <h3 className="text-sm font-medium text-gray-500">Notes</h3>
                    <p className="mt-1 text-sm text-gray-600">{abTestConfig.notes}</p>
                  </div>
                )}
                
                {abTestConfig.winnerVariantId && (
                  <Alert className="mt-4 bg-green-50 border-green-200">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <AlertTitle>Winner Determined</AlertTitle>
                    <AlertDescription>
                      Variant {abTestConfig.variants.find(v => v.id === abTestConfig.winnerVariantId)?.name} 
                      performed best with {abTestConfig.winnerMetric.replace(/([A-Z])/g, ' $1').trim()}.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="variants">
              <div className="space-y-4">
                {abTestConfig.variants.map((variant, index) => (
                  <Card key={variant.id} className={`${variant.id === abTestConfig.winnerVariantId ? 'border-green-300 bg-green-50' : ''}`}>
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-center">
                        <CardTitle className="text-lg">{variant.name}</CardTitle>
                        {variant.id === abTestConfig.winnerVariantId && (
                          <Badge className="bg-green-100 text-green-800">Winner</Badge>
                        )}
                      </div>
                      {variant.description && (
                        <CardDescription>{variant.description}</CardDescription>
                      )}
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {abTestConfig.testType === 'subject' && variant.subjectLine && (
                          <div>
                            <Label className="text-xs text-gray-500">Subject Line</Label>
                            <div className="p-2 bg-white border rounded-md mt-1">{variant.subjectLine}</div>
                          </div>
                        )}
                        
                        {abTestConfig.testType === 'body' && variant.emailBody && (
                          <div>
                            <Label className="text-xs text-gray-500">Email Body</Label>
                            <div className="p-2 bg-white border rounded-md mt-1 text-sm max-h-24 overflow-y-auto">{variant.emailBody}</div>
                          </div>
                        )}
                        
                        {abTestConfig.testType === 'sender' && variant.senderId && (
                          <div>
                            <Label className="text-xs text-gray-500">Sender</Label>
                            <div className="p-2 bg-white border rounded-md mt-1">ID: {variant.senderId}</div>
                          </div>
                        )}
                        
                        {abTestConfig.testType === 'time' && variant.sendTime && (
                          <div>
                            <Label className="text-xs text-gray-500">Send Time</Label>
                            <div className="p-2 bg-white border rounded-md mt-1">{variant.sendTime}</div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
            
            <TabsContent value="results">
              {isLoadingResults ? (
                <div className="flex items-center justify-center py-8">
                  <Progress value={75} className="w-1/2" />
                </div>
              ) : abTestResults ? (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-medium">Test Results</h3>
                    <Button variant="outline" size="sm" onClick={() => refetchResults()}>
                      <RefreshCcw className="h-4 w-4 mr-1" /> Refresh
                    </Button>
                  </div>
                  
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Variant</TableHead>
                        <TableHead>Delivery Rate</TableHead>
                        <TableHead>Open Rate</TableHead>
                        <TableHead>Click Rate</TableHead>
                        <TableHead>Reply Rate</TableHead>
                        <TableHead>Sample Size</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {abTestResults.variants.map((result) => (
                        <TableRow key={result.variantId} className={result.isWinner ? 'bg-green-50' : ''}>
                          <TableCell className="font-medium">
                            {result.variantName}
                            {result.isWinner && <span className="ml-1 text-green-600">★</span>}
                          </TableCell>
                          <TableCell>{formatPercent(result.deliveryRate)}</TableCell>
                          <TableCell>{formatPercent(result.openRate)}</TableCell>
                          <TableCell>{formatPercent(result.clickRate)}</TableCell>
                          <TableCell>{formatPercent(result.replyRate)}</TableCell>
                          <TableCell>{result.sampleSize}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  
                  <Alert className="mt-4">
                    <PieChart className="h-4 w-4" />
                    <AlertTitle>Analysis Details</AlertTitle>
                    <AlertDescription>
                      {abTestResults.winningVariantId ? (
                        <>
                          Variant {abTestResults.variants.find(v => v.variantId === abTestResults.winningVariantId)?.variantName} 
                          is the winner based on {abTestResults.winningMetric} with {abTestResults.confidenceLevel}% confidence.
                        </>
                      ) : (
                        <>
                          No clear winner has been determined yet. Continue running the test for more data.
                        </>
                      )}
                    </AlertDescription>
                  </Alert>
                </div>
              ) : (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>No Results Available</AlertTitle>
                  <AlertDescription>
                    Results will be available once the campaign has started sending emails.
                  </AlertDescription>
                </Alert>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
        <CardFooter className="flex justify-end space-x-2">
          <Button variant="outline" onClick={onClose}>Close</Button>
        </CardFooter>
      </Card>
    );
  }
  
  // Show setup form if no A/B test exists yet
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Create A/B Test</CardTitle>
        <CardDescription>Set up an A/B test for campaign: {campaign?.name}</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="setup" value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-3 mb-4">
            <TabsTrigger value="setup">Test Setup</TabsTrigger>
            <TabsTrigger value="variants">Configure Variants</TabsTrigger>
            <TabsTrigger value="preview">Preview</TabsTrigger>
          </TabsList>
          
          <TabsContent value="setup">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="testType">What would you like to test?</Label>
                <Select
                  value={testType}
                  onValueChange={(value) => setTestType(value)}
                >
                  <SelectTrigger id="testType">
                    <SelectValue placeholder="Select test type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="subject">Subject Line</SelectItem>
                    <SelectItem value="body">Email Body</SelectItem>
                    <SelectItem value="sender">Sender Account</SelectItem>
                    <SelectItem value="time">Send Time</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="variantCount">Number of Variants</Label>
                <Select
                  value={variantCount.toString()}
                  onValueChange={(value) => handleVariantCountChange(parseInt(value))}
                >
                  <SelectTrigger id="variantCount">
                    <SelectValue placeholder="Select variant count" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2">2 Variants</SelectItem>
                    <SelectItem value="3">3 Variants</SelectItem>
                    <SelectItem value="4">4 Variants</SelectItem>
                    <SelectItem value="5">5 Variants</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="winnerMetric">Choose a Winner Based On</Label>
                <Select
                  value={winnerMetric}
                  onValueChange={(value) => setWinnerMetric(value)}
                >
                  <SelectTrigger id="winnerMetric">
                    <SelectValue placeholder="Select metric" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="openRate">Open Rate</SelectItem>
                    <SelectItem value="clickRate">Click Rate</SelectItem>
                    <SelectItem value="replyRate">Reply Rate</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Distribution Method</Label>
                <RadioGroup
                  value={distribution.type}
                  onValueChange={(value) => setDistribution({ type: value as 'equal' | 'percentage' })}
                  className="flex flex-col space-y-1"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="equal" id="equal" />
                    <Label htmlFor="equal">Equal distribution among all variants</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="percentage" id="percentage" />
                    <Label htmlFor="percentage">Custom percentage (coming soon)</Label>
                  </div>
                </RadioGroup>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="sampleSize">Sample Size (per variant)</Label>
                <Input
                  id="sampleSize"
                  type="number"
                  min={10}
                  max={1000}
                  value={sampleSize}
                  onChange={(e) => setSampleSize(parseInt(e.target.value) || 100)}
                />
                <p className="text-xs text-gray-500">
                  Minimum 10 contacts per variant for meaningful results.
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="notes">Notes (optional)</Label>
                <Textarea
                  id="notes"
                  placeholder="Add any notes about this test"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
              
              <div className="pt-4 flex justify-end">
                <Button onClick={() => setActiveTab('variants')}>
                  Configure Variants <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="variants">
            <div className="space-y-6">
              {variants.map((variant, index) => (
                <div key={variant.id} className="border p-4 rounded-md">
                  <h3 className="text-lg font-medium mb-3">{variant.name}</h3>
                  
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label htmlFor={`variant-${index}-name`}>Variant Name</Label>
                      <Input
                        id={`variant-${index}-name`}
                        value={variant.name}
                        onChange={(e) => updateVariant(index, 'name', e.target.value)}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor={`variant-${index}-description`}>Description (optional)</Label>
                      <Input
                        id={`variant-${index}-description`}
                        value={variant.description || ''}
                        onChange={(e) => updateVariant(index, 'description', e.target.value)}
                      />
                    </div>
                    
                    {testType === 'subject' && (
                      <div className="space-y-2">
                        <Label htmlFor={`variant-${index}-subject`}>Subject Line</Label>
                        <Input
                          id={`variant-${index}-subject`}
                          value={variant.subjectLine || ''}
                          onChange={(e) => updateVariant(index, 'subjectLine', e.target.value)}
                        />
                      </div>
                    )}
                    
                    {testType === 'body' && (
                      <div className="space-y-2">
                        <Label htmlFor={`variant-${index}-body`}>Email Body</Label>
                        <Textarea
                          id={`variant-${index}-body`}
                          value={variant.emailBody || ''}
                          onChange={(e) => updateVariant(index, 'emailBody', e.target.value)}
                          rows={5}
                        />
                      </div>
                    )}
                    
                    {testType === 'sender' && (
                      <div className="space-y-2">
                        <Label htmlFor={`variant-${index}-sender`}>Sender Account ID</Label>
                        <Input
                          id={`variant-${index}-sender`}
                          type="number"
                          value={variant.senderId || ''}
                          onChange={(e) => updateVariant(index, 'senderId', parseInt(e.target.value) || null)}
                        />
                      </div>
                    )}
                    
                    {testType === 'time' && (
                      <div className="space-y-2">
                        <Label htmlFor={`variant-${index}-time`}>Send Time (HH:MM)</Label>
                        <Input
                          id={`variant-${index}-time`}
                          type="time"
                          value={variant.sendTime || ''}
                          onChange={(e) => updateVariant(index, 'sendTime', e.target.value)}
                        />
                      </div>
                    )}
                  </div>
                </div>
              ))}
              
              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={() => setActiveTab('setup')}>
                  Back to Setup
                </Button>
                <Button onClick={() => setActiveTab('preview')}>
                  Preview Test <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="preview">
            <div className="space-y-4">
              <Alert>
                <Beaker className="h-4 w-4" />
                <AlertTitle>A/B Test Preview</AlertTitle>
                <AlertDescription>
                  Review your test setup before creating it.
                </AlertDescription>
              </Alert>
              
              <div className="border rounded-md p-4 space-y-4">
                <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Test Type</h3>
                    <p className="font-medium">{testType.charAt(0).toUpperCase() + testType.slice(1)}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Variant Count</h3>
                    <p className="font-medium">{variantCount}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Winner Metric</h3>
                    <p className="font-medium">{winnerMetric.replace(/([A-Z])/g, ' $1').trim()}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Distribution</h3>
                    <p className="font-medium">{distribution.type.charAt(0).toUpperCase() + distribution.type.slice(1)}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Sample Size</h3>
                    <p className="font-medium">{sampleSize} contacts per variant</p>
                  </div>
                </div>
                
                <Separator className="my-4" />
                
                <h3 className="font-medium">Variants</h3>
                <div className="space-y-2">
                  {variants.map((variant) => (
                    <div key={variant.id} className="bg-gray-50 p-3 rounded-md">
                      <h4 className="font-medium">{variant.name}</h4>
                      
                      {variant.description && (
                        <p className="text-sm text-gray-600 mt-1">{variant.description}</p>
                      )}
                      
                      {testType === 'subject' && variant.subjectLine && (
                        <div className="mt-2">
                          <span className="text-xs font-medium text-gray-500">Subject: </span>
                          <span className="text-sm">{variant.subjectLine}</span>
                        </div>
                      )}
                      
                      {testType === 'body' && variant.emailBody && (
                        <div className="mt-2">
                          <span className="text-xs font-medium text-gray-500">Body: </span>
                          <span className="text-sm">{variant.emailBody.length > 50 ? `${variant.emailBody.substring(0, 50)}...` : variant.emailBody}</span>
                        </div>
                      )}
                      
                      {testType === 'sender' && variant.senderId && (
                        <div className="mt-2">
                          <span className="text-xs font-medium text-gray-500">Sender ID: </span>
                          <span className="text-sm">{variant.senderId}</span>
                        </div>
                      )}
                      
                      {testType === 'time' && variant.sendTime && (
                        <div className="mt-2">
                          <span className="text-xs font-medium text-gray-500">Send Time: </span>
                          <span className="text-sm">{variant.sendTime}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={() => setActiveTab('variants')}>
                  Back to Variants
                </Button>
                <Button onClick={handleCreateTest} disabled={isCreating}>
                  {isCreating ? 'Creating...' : 'Create A/B Test'}
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter className="flex justify-end">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
      </CardFooter>
    </Card>
  );
}