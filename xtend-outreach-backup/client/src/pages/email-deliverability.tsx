import React, { useState, useEffect } from 'react';
import { 
  DollarSign, 
  Users, 
  Target, 
  Mail, 
  AlertTriangle, 
  CheckCircle, 
  Zap, 
  Brain, 
  BarChart, 
  ListChecks, 
  Search, 
  FileText,
  ChevronRight
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from '@/components/ui/tabs';
import { 
  Table, 
  TableBody, 
  TableCaption, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

type EmailAccount = {
  id: number;
  email: string;
  name: string;
  status: string;
  provider: string;
  dailyLimit: number;
  hourlyLimit: number;
  bounceRate: number | null;
  complaintRate: number | null;
  openRate: number | null;
  clickRate: number | null;
  replyRate: number | null;
  domainAuthenticated: boolean;
  healthScore?: number;
  healthStatus?: 'good' | 'fair' | 'poor' | 'critical';
  totalSent?: number;
  isExternal?: boolean;
  notes?: string | null;
};

type DomainVerification = {
  id: number;
  domain: string;
  spfStatus: string;
  dkimStatus: string;
  dmarcStatus: string;
  spfRecord: string | null;
  recommendedSpfRecord: string | null;
  dkimRecord: string | null;
  recommendedDkimRecord: string | null;
  dmarcRecord: string | null;
  recommendedDmarcRecord: string | null;
  lastChecked: string | null;
  errors: string[];
};

const EmailDeliverabilityPage: React.FC = () => {
  const { toast } = useToast();
  const [accounts, setAccounts] = useState<EmailAccount[]>([]);
  const [domains, setDomains] = useState<DomainVerification[]>([]);
  const [metrics, setMetrics] = useState<any>({
    accounts: { total: 0, active: 0, paused: 0, suspended: 0, healthScore: 0 },
    domains: { total: 0, verified: 0, partiallyVerified: 0, issues: 0 }
  });
  const [loading, setLoading] = useState(true);
  const [selectedDomain, setSelectedDomain] = useState<DomainVerification | null>(null);
  const [testEmail, setTestEmail] = useState({ to: '', subject: '', html: '', from: '' });
  const [testResult, setTestResult] = useState<any>(null);
  const [testDialogOpen, setTestDialogOpen] = useState(false);
  const [verifyDialogOpen, setVerifyDialogOpen] = useState(false);
  const [domainToVerify, setDomainToVerify] = useState('');
  
  // AI Monitoring states
  const [contentToAnalyze, setContentToAnalyze] = useState({ subject: '', content: '' });
  const [contentAnalysisResult, setContentAnalysisResult] = useState<any>(null);
  const [accountToAnalyze, setAccountToAnalyze] = useState<number | null>(null);
  const [accountAnalysisResult, setAccountAnalysisResult] = useState<any>(null);
  const [inboxPlacementResult, setInboxPlacementResult] = useState<any>(null);
  const [analyzing, setAnalyzing] = useState(false);
  
  useEffect(() => {
    fetchDeliverySettings();
  }, []);
  
  const fetchDeliverySettings = async () => {
    try {
      setLoading(true);
      const response = await apiRequest("GET", '/api/email-delivery/delivery-settings');
      const data = await response.json();
      setAccounts(data.accounts || []);
      setDomains(data.domains || []);
      setMetrics(data.overallMetrics || metrics);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to load email deliverability settings',
        variant: 'destructive'
      });
      setLoading(false);
    }
  };
  
  const handleVerifyDomain = async () => {
    if (!domainToVerify) {
      toast({
        title: 'Validation Error',
        description: 'Please enter a domain to verify',
        variant: 'destructive'
      });
      return;
    }
    
    try {
      const response = await apiRequest("POST", '/api/email-delivery/verify-domain', { domain: domainToVerify });
      const data = await response.json();
      
      toast({
        title: 'Domain Verified',
        description: `Verification completed for ${domainToVerify}`,
      });
      
      setVerifyDialogOpen(false);
      fetchDeliverySettings();
    } catch (error) {
      console.error('Error verifying domain:', error);
      toast({
        title: 'Verification Error',
        description: 'Failed to verify domain. Please try again.',
        variant: 'destructive'
      });
    }
  };
  
  const handleTestEmail = async () => {
    if (!testEmail.to || !testEmail.subject || !testEmail.html) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields',
        variant: 'destructive'
      });
      return;
    }
    
    try {
      const response = await apiRequest("POST", '/api/email-delivery/test-send', testEmail);
      const result = await response.json();
      
      setTestResult(result);
      toast({
        title: result.success ? 'Email Sent' : 'Sending Failed',
        description: result.success 
          ? 'Test email was sent successfully' 
          : `Failed to send email: ${result.error}`,
        variant: result.success ? 'default' : 'destructive'
      });
    } catch (error) {
      console.error('Error sending test email:', error);
      toast({
        title: 'Sending Error',
        description: 'Failed to send test email. Please try again.',
        variant: 'destructive'
      });
    }
  };
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'valid': return 'text-green-500';
      case 'invalid': return 'text-red-500';
      case 'not_checked': return 'text-gray-500';
      case 'pending': return 'text-amber-500';
      case 'failed': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };
  
  const getHealthColor = (score: number | undefined) => {
    if (!score) return 'bg-gray-200';
    if (score > 80) return 'bg-green-500';
    if (score > 50) return 'bg-amber-500';
    if (score > 30) return 'bg-orange-500';
    return 'bg-red-500';
  };
  
  const getHealthStatus = (status: string | undefined) => {
    if (!status) return 'Unknown';
    switch (status) {
      case 'good': return 'Good';
      case 'fair': return 'Fair';
      case 'poor': return 'Poor';
      case 'critical': return 'Critical';
      default: return 'Unknown';
    }
  };
  
  const getHealthStatusColor = (status: string | undefined) => {
    if (!status) return 'text-gray-500';
    switch (status) {
      case 'good': return 'text-green-500';
      case 'fair': return 'text-amber-500';
      case 'poor': return 'text-orange-500';
      case 'critical': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };
  
  const handleAnalyzeContent = async () => {
    if (!contentToAnalyze.subject || !contentToAnalyze.content) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in both subject and content fields',
        variant: 'destructive'
      });
      return;
    }
    
    try {
      setAnalyzing(true);
      // Use the new AI monitoring endpoint for enhanced analysis
      const response = await apiRequest("POST", '/api/ai-monitoring/content-analysis', contentToAnalyze);
      const result = await response.json();
      
      setContentAnalysisResult(result);
      setAnalyzing(false);
      
      toast({
        title: 'AI Analysis Complete',
        description: 'Email content has been analyzed with advanced AI for deliverability',
      });
    } catch (error) {
      console.error('Error analyzing content:', error);
      setAnalyzing(false);
      toast({
        title: 'Analysis Error',
        description: 'Failed to analyze email content. Please try again.',
        variant: 'destructive'
      });
    }
  };
  
  const handleAnalyzeAccount = async (accountId: number) => {
    if (!accountId) {
      toast({
        title: 'Selection Error',
        description: 'Please select an email account to analyze',
        variant: 'destructive'
      });
      return;
    }
    
    try {
      setAnalyzing(true);
      setAccountToAnalyze(accountId);
      
      // Use the new AI monitoring endpoint for enhanced account analysis
      const response = await apiRequest("POST", '/api/ai-monitoring/account-health', { accountId });
      const result = await response.json();
      
      setAccountAnalysisResult(result);
      setAnalyzing(false);
      
      toast({
        title: 'AI Account Analysis Complete',
        description: 'Email account health has been analyzed with advanced AI',
      });
    } catch (error) {
      console.error('Error analyzing account:', error);
      setAnalyzing(false);
      toast({
        title: 'Analysis Error',
        description: 'Failed to analyze account health. Please try again.',
        variant: 'destructive'
      });
    }
  };
  
  // New function to handle inbox placement prediction
  const handlePredictInboxPlacement = async (accountId: number) => {
    if (!accountId || !contentToAnalyze.subject || !contentToAnalyze.content) {
      toast({
        title: 'Validation Error',
        description: 'Please provide email subject, content, and select a sending account',
        variant: 'destructive'
      });
      return;
    }
    
    try {
      setAnalyzing(true);
      
      // Use the inbox placement prediction endpoint
      const response = await apiRequest("POST", '/api/ai-monitoring/inbox-placement', {
        emailAccountId: accountId,
        subject: contentToAnalyze.subject,
        content: contentToAnalyze.content,
        recipientDomains: ['gmail.com', 'outlook.com', 'yahoo.com']
      });
      
      const result = await response.json();
      setInboxPlacementResult(result);
      
      setAnalyzing(false);
      
      toast({
        title: 'Prediction Complete',
        description: 'Inbox placement prediction has been generated with AI analysis',
      });
    } catch (error) {
      console.error('Error predicting inbox placement:', error);
      setAnalyzing(false);
      toast({
        title: 'Prediction Error',
        description: 'Failed to predict inbox placement. Please try again.',
        variant: 'destructive'
      });
    }
  };
  
  const getRatingColor = (rating: string) => {
    switch (rating) {
      case 'excellent': return 'text-green-600';
      case 'good': return 'text-green-500';
      case 'fair': return 'text-amber-500';
      case 'poor': return 'text-orange-500';
      case 'critical': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };
  
  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Email Deliverability Dashboard</h1>
        <p className="text-gray-500">
          Monitor and improve your email sending capabilities and reputation
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Total Accounts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">{metrics.accounts.total}</div>
              <Mail className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Active Accounts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">{metrics.accounts.active}</div>
              <CheckCircle className="h-5 w-5 text-green-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Domains with Issues
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">{metrics.domains.issues}</div>
              <AlertTriangle className="h-5 w-5 text-amber-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Average Health Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-2xl font-bold">{metrics.accounts.healthScore}%</div>
              <Progress value={metrics.accounts.healthScore} className={getHealthColor(metrics.accounts.healthScore)} />
            </div>
          </CardContent>
        </Card>
      </div>
      
      <div className="mb-4 flex justify-end space-x-4">
        <Button 
          variant="outline" 
          onClick={() => setVerifyDialogOpen(true)}
        >
          Verify Domain
        </Button>
        <Button 
          variant="outline" 
          onClick={() => setTestDialogOpen(true)}
        >
          Test Email
        </Button>
        <Button 
          onClick={fetchDeliverySettings}
          disabled={loading}
        >
          {loading ? 'Refreshing...' : 'Refresh Data'}
        </Button>
      </div>
      
      <Tabs defaultValue="accounts">
        <TabsList className="mb-4">
          <TabsTrigger value="accounts">Email Accounts</TabsTrigger>
          <TabsTrigger value="domains">Domain Authentication</TabsTrigger>
          <TabsTrigger value="ai-monitoring">AI Monitoring</TabsTrigger>
          <TabsTrigger value="tips">Deliverability Tips</TabsTrigger>
        </TabsList>
        
        <TabsContent value="accounts">
          <Card>
            <CardHeader>
              <CardTitle>Email Accounts</CardTitle>
              <CardDescription>
                Review the health and status of your sending accounts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Provider</TableHead>
                    <TableHead>Daily Limit</TableHead>
                    <TableHead>Open Rate</TableHead>
                    <TableHead>Bounce Rate</TableHead>
                    <TableHead>Health</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {accounts.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                        No email accounts found. Add an email account to get started.
                      </TableCell>
                    </TableRow>
                  )}
                  {accounts.map((account) => (
                    <TableRow key={account.id} className={account.isExternal ? 'bg-slate-50' : ''}>
                      <TableCell className="font-medium">
                        <div className="flex items-center">
                          {account.email}
                          {account.isExternal && (
                            <Badge variant="outline" className="ml-2 text-xs bg-blue-50 hover:bg-blue-50">
                              External
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={
                          account.status === 'active' ? 'text-green-500' :
                          account.status === 'paused' ? 'text-amber-500' :
                          'text-red-500'
                        }>
                          {account.status}
                        </span>
                      </TableCell>
                      <TableCell>{account.provider || 'Unknown'}</TableCell>
                      <TableCell>{account.dailyLimit || 'N/A'}</TableCell>
                      <TableCell>{account.openRate !== null ? `${account.openRate}%` : 'N/A'}</TableCell>
                      <TableCell>
                        <span className={
                          account.bounceRate === null ? '' :
                          account.bounceRate > 5 ? 'text-red-500' :
                          account.bounceRate > 2 ? 'text-amber-500' :
                          'text-green-500'
                        }>
                          {account.bounceRate !== null ? `${account.bounceRate}%` : 'N/A'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <div className={`w-2 h-2 rounded-full ${getHealthColor(account.healthScore)}`}></div>
                          <span className={getHealthStatusColor(account.healthStatus)}>
                            {getHealthStatus(account.healthStatus)}
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="domains">
          <Card>
            <CardHeader>
              <CardTitle>Domain Authentication</CardTitle>
              <CardDescription>
                Monitor SPF, DKIM, and DMARC status for your sending domains
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Domain</TableHead>
                    <TableHead>SPF Status</TableHead>
                    <TableHead>DKIM Status</TableHead>
                    <TableHead>DMARC Status</TableHead>
                    <TableHead>Last Checked</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {domains.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                        No domains verified yet. Verify a domain to get started.
                      </TableCell>
                    </TableRow>
                  )}
                  {domains.map((domain) => (
                    <TableRow key={domain.id}>
                      <TableCell className="font-medium">{domain.domain}</TableCell>
                      <TableCell>
                        <span className={getStatusColor(domain.spfStatus)}>
                          {domain.spfStatus}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className={getStatusColor(domain.dkimStatus)}>
                          {domain.dkimStatus}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className={getStatusColor(domain.dmarcStatus)}>
                          {domain.dmarcStatus}
                        </span>
                      </TableCell>
                      <TableCell>
                        {domain.lastChecked 
                          ? new Date(domain.lastChecked).toLocaleString() 
                          : 'Never'
                        }
                      </TableCell>
                      <TableCell>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setSelectedDomain(domain)}
                        >
                          View Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          
          {selectedDomain && (
            <Dialog open={!!selectedDomain} onOpenChange={() => setSelectedDomain(null)}>
              <DialogContent className="max-w-3xl">
                <DialogHeader>
                  <DialogTitle>Domain Details: {selectedDomain.domain}</DialogTitle>
                </DialogHeader>
                <div className="space-y-6">
                  <div>
                    <h3 className="font-medium mb-2">SPF Record</h3>
                    <div className="bg-gray-50 p-3 rounded text-sm font-mono overflow-x-auto">
                      {selectedDomain.spfRecord || 'No SPF record found'}
                    </div>
                    {selectedDomain.recommendedSpfRecord && (
                      <>
                        <h4 className="font-medium mt-4 mb-2 text-amber-600">Recommended SPF Record</h4>
                        <div className="bg-amber-50 p-3 rounded text-sm font-mono overflow-x-auto">
                          {selectedDomain.recommendedSpfRecord}
                        </div>
                      </>
                    )}
                  </div>
                  
                  <div>
                    <h3 className="font-medium mb-2">DKIM Record</h3>
                    <div className="bg-gray-50 p-3 rounded text-sm font-mono overflow-x-auto">
                      {selectedDomain.dkimRecord || 'No DKIM record found'}
                    </div>
                    {selectedDomain.recommendedDkimRecord && (
                      <>
                        <h4 className="font-medium mt-4 mb-2 text-amber-600">Recommended DKIM Record</h4>
                        <div className="bg-amber-50 p-3 rounded text-sm font-mono overflow-x-auto">
                          {selectedDomain.recommendedDkimRecord}
                        </div>
                      </>
                    )}
                  </div>
                  
                  <div>
                    <h3 className="font-medium mb-2">DMARC Record</h3>
                    <div className="bg-gray-50 p-3 rounded text-sm font-mono overflow-x-auto">
                      {selectedDomain.dmarcRecord || 'No DMARC record found'}
                    </div>
                    {selectedDomain.recommendedDmarcRecord && (
                      <>
                        <h4 className="font-medium mt-4 mb-2 text-amber-600">Recommended DMARC Record</h4>
                        <div className="bg-amber-50 p-3 rounded text-sm font-mono overflow-x-auto">
                          {selectedDomain.recommendedDmarcRecord}
                        </div>
                      </>
                    )}
                  </div>
                  
                  {selectedDomain.errors?.length > 0 && (
                    <div>
                      <h3 className="font-medium mb-2 text-red-600">Errors</h3>
                      <ul className="list-disc pl-5 space-y-1">
                        {selectedDomain.errors.map((error, i) => (
                          <li key={i} className="text-red-600">{error}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button 
                    onClick={() => setSelectedDomain(null)}
                  >
                    Close
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </TabsContent>
        
        <TabsContent value="ai-monitoring">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Email Content Analysis */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="h-5 w-5 text-primary" />
                  AI Content Analysis
                </CardTitle>
                <CardDescription>
                  Analyze email content for deliverability issues and spam triggers
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="subject">Email Subject</Label>
                    <Input
                      id="subject"
                      placeholder="Enter your email subject line"
                      value={contentToAnalyze.subject}
                      onChange={(e) => setContentToAnalyze({...contentToAnalyze, subject: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="content">Email Content</Label>
                    <Textarea
                      id="content"
                      placeholder="Paste your email content here..."
                      rows={8}
                      value={contentToAnalyze.content}
                      onChange={(e) => setContentToAnalyze({...contentToAnalyze, content: e.target.value})}
                    />
                  </div>
                  <Button 
                    className="w-full"
                    onClick={handleAnalyzeContent}
                    disabled={analyzing || !contentToAnalyze.subject || !contentToAnalyze.content}
                  >
                    {analyzing ? 'Analyzing...' : 'Analyze Content'}
                  </Button>
                </div>
                
                {contentAnalysisResult && (
                  <div className="mt-6 space-y-4">
                    <div className="p-4 rounded-lg bg-gray-50">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-lg">Analysis Results</h3>
                        <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                          contentAnalysisResult.deliverabilityRating === 'excellent' ? 'bg-green-100 text-green-800' :
                          contentAnalysisResult.deliverabilityRating === 'good' ? 'bg-green-100 text-green-800' :
                          contentAnalysisResult.deliverabilityRating === 'fair' ? 'bg-amber-100 text-amber-800' :
                          contentAnalysisResult.deliverabilityRating === 'poor' ? 'bg-orange-100 text-orange-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {contentAnalysisResult.deliverabilityRating.charAt(0).toUpperCase() + contentAnalysisResult.deliverabilityRating.slice(1)}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                          <p className="text-sm text-gray-500">Deliverability Score</p>
                          <p className="text-2xl font-bold">{contentAnalysisResult.score}/100</p>
                          <Progress value={contentAnalysisResult.score} className={
                            contentAnalysisResult.score > 80 ? 'bg-green-500' :
                            contentAnalysisResult.score > 60 ? 'bg-amber-500' :
                            contentAnalysisResult.score > 40 ? 'bg-orange-500' :
                            'bg-red-500'
                          } />
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Spam Risk</p>
                          <p className="text-2xl font-bold">{contentAnalysisResult.spamRisk}%</p>
                          <Progress value={contentAnalysisResult.spamRisk} className={
                            contentAnalysisResult.spamRisk < 20 ? 'bg-green-500' :
                            contentAnalysisResult.spamRisk < 40 ? 'bg-amber-500' :
                            contentAnalysisResult.spamRisk < 60 ? 'bg-orange-500' :
                            'bg-red-500'
                          } />
                        </div>
                      </div>
                      
                      {contentAnalysisResult.spamTriggers?.length > 0 && (
                        <div className="mt-4">
                          <h4 className="font-medium mb-2 text-red-600">Spam Triggers</h4>
                          <div className="flex flex-wrap gap-2">
                            {contentAnalysisResult.spamTriggers.map((trigger: string, i: number) => (
                              <Badge key={i} variant="outline" className="bg-red-50 text-red-700 hover:bg-red-50">
                                {trigger}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {contentAnalysisResult.improvementSuggestions?.length > 0 && (
                        <div className="mt-4">
                          <h4 className="font-medium mb-2 text-primary">Improvement Suggestions</h4>
                          <ul className="list-disc pl-5 space-y-1">
                            {contentAnalysisResult.improvementSuggestions.map((suggestion: string, i: number) => (
                              <li key={i} className="text-sm">{suggestion}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
            
            {/* Account Health Analysis */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5 text-primary" />
                  AI Account Health Analysis
                </CardTitle>
                <CardDescription>
                  Get intelligent recommendations to improve email account health
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="account">Select Email Account</Label>
                    <Select 
                      onValueChange={(value) => setAccountToAnalyze(Number(value))}
                      value={accountToAnalyze?.toString() || ''}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select an email account" />
                      </SelectTrigger>
                      <SelectContent>
                        {accounts.map((account) => (
                          <SelectItem key={account.id} value={account.id.toString()}>
                            {account.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button 
                    className="w-full"
                    onClick={() => accountToAnalyze && handleAnalyzeAccount(accountToAnalyze)}
                    disabled={analyzing || !accountToAnalyze}
                  >
                    {analyzing ? 'Analyzing...' : 'Analyze Account Health'}
                  </Button>
                </div>
                
                {accountAnalysisResult && (
                  <div className="mt-6 space-y-4">
                    <div className="p-4 rounded-lg bg-gray-50">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold text-lg">Health Analysis</h3>
                        <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                          accountAnalysisResult.overallRating === 'excellent' ? 'bg-green-100 text-green-800' :
                          accountAnalysisResult.overallRating === 'good' ? 'bg-green-100 text-green-800' :
                          accountAnalysisResult.overallRating === 'fair' ? 'bg-amber-100 text-amber-800' :
                          accountAnalysisResult.overallRating === 'poor' ? 'bg-orange-100 text-orange-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {accountAnalysisResult.overallRating.charAt(0).toUpperCase() + accountAnalysisResult.overallRating.slice(1)}
                        </div>
                      </div>
                      
                      <div className="mb-4">
                        <div className="mb-2 flex justify-between items-center">
                          <p className="text-sm text-gray-500">Health Score</p>
                          <p className="font-bold">{accountAnalysisResult.healthScore}/100</p>
                        </div>
                        <Progress value={accountAnalysisResult.healthScore} className={
                          accountAnalysisResult.healthScore > 80 ? 'bg-green-500' :
                          accountAnalysisResult.healthScore > 60 ? 'bg-amber-500' :
                          accountAnalysisResult.healthScore > 40 ? 'bg-orange-500' :
                          'bg-red-500'
                        } />
                      </div>
                      
                      {accountAnalysisResult.priorityActions?.length > 0 && (
                        <div className="bg-amber-50 border border-amber-200 rounded p-3 mb-4">
                          <h4 className="font-medium mb-2 text-amber-800 flex items-center gap-1">
                            <Zap className="h-4 w-4" />
                            Priority Actions
                          </h4>
                          <ul className="list-disc pl-5 space-y-1">
                            {accountAnalysisResult.priorityActions.map((action: string, i: number) => (
                              <li key={i} className="text-sm text-amber-800">{action}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {accountAnalysisResult.riskFactors?.length > 0 && (
                        <div className="mb-4">
                          <h4 className="font-medium mb-2 text-red-600 flex items-center gap-1">
                            <AlertTriangle className="h-4 w-4" />
                            Risk Factors
                          </h4>
                          <ul className="list-disc pl-5 space-y-1">
                            {accountAnalysisResult.riskFactors.map((risk: string, i: number) => (
                              <li key={i} className="text-sm">{risk}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {accountAnalysisResult.recommendations?.length > 0 && (
                        <div>
                          <h4 className="font-medium mb-2 text-primary flex items-center gap-1">
                            <ListChecks className="h-4 w-4" />
                            Recommendations
                          </h4>
                          <ul className="list-disc pl-5 space-y-1">
                            {accountAnalysisResult.recommendations.map((rec: string, i: number) => (
                              <li key={i} className="text-sm">{rec}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          
          {/* Inbox Placement Prediction */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                AI Inbox Placement Prediction
              </CardTitle>
              <CardDescription>
                Predict how likely your email is to land in the inbox across different email providers
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="predictSubject">Email Subject</Label>
                    <Input
                      id="predictSubject"
                      placeholder="Enter the subject line you plan to use"
                      value={contentToAnalyze.subject}
                      onChange={(e) => setContentToAnalyze({...contentToAnalyze, subject: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="predictContent">Email Content</Label>
                    <Textarea
                      id="predictContent"
                      placeholder="Enter the content of your email"
                      rows={6}
                      value={contentToAnalyze.content}
                      onChange={(e) => setContentToAnalyze({...contentToAnalyze, content: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="predictAccount">Sending Account</Label>
                    <Select 
                      onValueChange={(value) => setAccountToAnalyze(Number(value))}
                      value={accountToAnalyze?.toString() || ''}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select an email account" />
                      </SelectTrigger>
                      <SelectContent>
                        {accounts.map((account) => (
                          <SelectItem key={account.id} value={account.id.toString()}>
                            {account.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button 
                    className="w-full"
                    disabled={analyzing || !contentToAnalyze.subject || !contentToAnalyze.content || !accountToAnalyze}
                    onClick={() => {
                      if (accountToAnalyze) {
                        handlePredictInboxPlacement(accountToAnalyze);
                      }
                    }}
                  >
                    {analyzing ? 'Predicting...' : 'Predict Inbox Placement'}
                  </Button>
                </div>
                <div className="md:col-span-1 bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-medium text-lg mb-4">
                    {inboxPlacementResult ? 'Prediction Results' : 'No Results Yet'}
                  </h3>
                  
                  {!inboxPlacementResult && (
                    <div className="text-center py-8 text-gray-500">
                      <p>Fill in the details and click "Predict Inbox Placement" to get AI-powered predictions on where your email will land.</p>
                    </div>
                  )}
                  
                  {inboxPlacementResult && (
                    <div className="space-y-4">
                      <div>
                        <p className="text-sm text-gray-500 mb-1">Overall Inbox Placement</p>
                        <div className="flex items-center">
                          <Progress 
                            value={inboxPlacementResult.inboxPlacementScore} 
                            className={`
                              flex-1 mr-2
                              ${inboxPlacementResult.inboxPlacementScore > 80 ? 'bg-green-500' : 
                              inboxPlacementResult.inboxPlacementScore > 60 ? 'bg-amber-500' :
                              'bg-red-500'}
                            `} 
                          />
                          <span className="font-bold">{inboxPlacementResult.inboxPlacementScore}%</span>
                        </div>
                      </div>
                      
                      {inboxPlacementResult.gmailInboxProbability !== undefined && (
                        <div>
                          <p className="text-sm text-gray-500 mb-1">Gmail</p>
                          <div className="flex items-center">
                            <Progress 
                              value={inboxPlacementResult.gmailInboxProbability} 
                              className={`
                                flex-1 mr-2
                                ${inboxPlacementResult.gmailInboxProbability > 80 ? 'bg-green-500' : 
                                inboxPlacementResult.gmailInboxProbability > 60 ? 'bg-amber-500' :
                                'bg-red-500'}
                              `} 
                            />
                            <span className="font-medium">{inboxPlacementResult.gmailInboxProbability}%</span>
                          </div>
                        </div>
                      )}
                      
                      {inboxPlacementResult.outlookInboxProbability !== undefined && (
                        <div>
                          <p className="text-sm text-gray-500 mb-1">Outlook</p>
                          <div className="flex items-center">
                            <Progress 
                              value={inboxPlacementResult.outlookInboxProbability} 
                              className={`
                                flex-1 mr-2
                                ${inboxPlacementResult.outlookInboxProbability > 80 ? 'bg-green-500' : 
                                inboxPlacementResult.outlookInboxProbability > 60 ? 'bg-amber-500' :
                                'bg-red-500'}
                              `}
                            />
                            <span className="font-medium">{inboxPlacementResult.outlookInboxProbability}%</span>
                          </div>
                        </div>
                      )}
                      
                      {inboxPlacementResult.yahooInboxProbability !== undefined && (
                        <div>
                          <p className="text-sm text-gray-500 mb-1">Yahoo</p>
                          <div className="flex items-center">
                            <Progress 
                              value={inboxPlacementResult.yahooInboxProbability} 
                              className={`
                                flex-1 mr-2
                                ${inboxPlacementResult.yahooInboxProbability > 80 ? 'bg-green-500' : 
                                inboxPlacementResult.yahooInboxProbability > 60 ? 'bg-amber-500' :
                                'bg-red-500'}
                              `}
                            />
                            <span className="font-medium">{inboxPlacementResult.yahooInboxProbability}%</span>
                          </div>
                        </div>
                      )}
                      
                      {inboxPlacementResult.filteringFactors && inboxPlacementResult.filteringFactors.length > 0 && (
                        <div className="pt-2">
                          <h4 className="font-medium mb-2 text-red-600">Filtering Factors</h4>
                          <div className="flex flex-wrap gap-2">
                            {inboxPlacementResult.filteringFactors.map((factor: string, i: number) => (
                              <Badge key={i} variant="outline" className="bg-red-50 text-red-700">
                                {factor}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {inboxPlacementResult.blockingFactors && inboxPlacementResult.blockingFactors.length > 0 && (
                        <div className="pt-2">
                          <h4 className="font-medium mb-2 text-red-600">Blocking Factors</h4>
                          <div className="flex flex-wrap gap-2">
                            {inboxPlacementResult.blockingFactors.map((factor: string, i: number) => (
                              <Badge key={i} variant="outline" className="bg-red-50 text-red-700 border-red-300">
                                {factor}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {inboxPlacementResult.improvementSuggestions && inboxPlacementResult.improvementSuggestions.length > 0 && (
                        <div className="pt-3 mt-2 border-t border-gray-200">
                          <h4 className="font-medium mb-2 text-green-600">Suggestions</h4>
                          <ul className="list-disc pl-5 space-y-1 text-sm">
                            {inboxPlacementResult.improvementSuggestions.map((suggestion: string, i: number) => (
                              <li key={i} className="text-gray-700">{suggestion}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* A/B Testing for Deliverability */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart className="h-5 w-5 text-primary" />
                AI A/B Testing for Deliverability
              </CardTitle>
              <CardDescription>
                Test different variants of your email to optimize deliverability and performance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center p-8">
                <h3 className="text-xl font-medium text-gray-700 mb-2">Coming Soon</h3>
                <p className="text-gray-500 mb-4">
                  The A/B testing functionality for email deliverability is under development and will be available in the next update.
                </p>
                <Button variant="outline" disabled>Create A/B Test</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="tips">
          <Card>
            <CardHeader>
              <CardTitle>Email Deliverability Best Practices</CardTitle>
              <CardDescription>
                Follow these recommendations to improve your email deliverability
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium mb-2">Authentication</h3>
                  <p className="text-gray-600 mb-2">
                    Proper authentication is essential for email deliverability:
                  </p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Set up SPF to authorize sending servers</li>
                    <li>Implement DKIM to cryptographically sign your emails</li>
                    <li>Configure DMARC to protect against spoofing</li>
                    <li>Keep your authentication records up to date</li>
                  </ul>
                </div>
                
                <div>
                  <h3 className="text-lg font-medium mb-2">Content Best Practices</h3>
                  <p className="text-gray-600 mb-2">
                    Content quality affects your deliverability:
                  </p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Avoid excessive capitalization and exclamation marks</li>
                    <li>Minimize use of spam trigger words</li>
                    <li>Maintain a balanced text-to-image ratio</li>
                    <li>Personalize emails with recipient information</li>
                    <li>Include proper unsubscribe links and compliance footer</li>
                  </ul>
                </div>
                
                <div>
                  <h3 className="text-lg font-medium mb-2">Sending Practices</h3>
                  <p className="text-gray-600 mb-2">
                    How you send is as important as what you send:
                  </p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Warm up new sending domains and IP addresses</li>
                    <li>Maintain consistent sending volumes</li>
                    <li>Respect daily and hourly sending limits</li>
                    <li>Monitor bounce rates and complaint rates</li>
                    <li>Clean your contact lists regularly</li>
                    <li>Implement feedback loops to track complaints</li>
                  </ul>
                </div>
                
                <div>
                  <h3 className="text-lg font-medium mb-2">Compliance</h3>
                  <p className="text-gray-600 mb-2">
                    Stay compliant with email regulations:
                  </p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Include your physical mailing address</li>
                    <li>Provide clear unsubscribe options</li>
                    <li>Honor unsubscribe requests promptly</li>
                    <li>Obtain proper consent before sending</li>
                    <li>Clearly identify yourself as the sender</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Verify Domain Dialog */}
      <Dialog open={verifyDialogOpen} onOpenChange={setVerifyDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Verify Domain</DialogTitle>
            <DialogDescription>
              Check authentication for a domain to ensure emails will be delivered properly
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="domain">Domain</Label>
              <Input 
                id="domain" 
                placeholder="yourdomain.com" 
                value={domainToVerify} 
                onChange={(e) => setDomainToVerify(e.target.value)} 
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVerifyDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleVerifyDomain}>
              Verify Domain
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Test Email Dialog */}
      <Dialog open={testDialogOpen} onOpenChange={setTestDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Test Email</DialogTitle>
            <DialogDescription>
              Send a test email to check deliverability and content quality
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="to">To *</Label>
                <Input 
                  id="to" 
                  placeholder="recipient@example.com" 
                  value={testEmail.to} 
                  onChange={(e) => setTestEmail({...testEmail, to: e.target.value})} 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="from">From (optional)</Label>
                <Input 
                  id="from" 
                  placeholder="your@domain.com" 
                  value={testEmail.from} 
                  onChange={(e) => setTestEmail({...testEmail, from: e.target.value})} 
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="subject">Subject *</Label>
              <Input 
                id="subject" 
                placeholder="Your test email subject" 
                value={testEmail.subject} 
                onChange={(e) => setTestEmail({...testEmail, subject: e.target.value})} 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="content">Content *</Label>
              <Textarea 
                id="content" 
                placeholder="Enter your email content here..." 
                rows={8}
                value={testEmail.html} 
                onChange={(e) => setTestEmail({...testEmail, html: e.target.value})} 
              />
            </div>
            
            {testResult && (
              <div className="mt-4">
                <h4 className="font-medium mb-2">
                  {testResult.success ? (
                    <span className="text-green-600">Email sent successfully ✓</span>
                  ) : (
                    <span className="text-red-600">Email sending failed ✗</span>
                  )}
                </h4>
                
                {testResult.contentCheck && (
                  <div className="bg-gray-50 p-3 rounded mt-2">
                    <h5 className="font-medium mb-1">Content Quality Check</h5>
                    <div className="flex items-center space-x-2 mb-2">
                      <div className={`w-2 h-2 rounded-full ${
                        testResult.contentCheck.hasCriticalIssues ? 'bg-red-500' :
                        !testResult.contentCheck.isPassing ? 'bg-amber-500' :
                        'bg-green-500'
                      }`}></div>
                      <span className={
                        testResult.contentCheck.hasCriticalIssues ? 'text-red-600' : 
                        !testResult.contentCheck.isPassing ? 'text-amber-600' :
                        'text-green-600'
                      }>
                        Score: {testResult.contentCheck.score}/100
                        {testResult.contentCheck.hasCriticalIssues && ' (Critical issues found)'}
                      </span>
                    </div>
                    
                    {testResult.contentCheck.issues.length > 0 && (
                      <div>
                        <h6 className="font-medium mb-1 text-sm">Issues</h6>
                        <ul className="list-disc pl-5 space-y-1 text-sm">
                          {testResult.contentCheck.issues.map((issue: any, i: number) => (
                            <li key={i} className={
                              issue.severity === 'critical' ? 'text-red-600' :
                              issue.severity === 'high' ? 'text-orange-600' :
                              issue.severity === 'medium' ? 'text-amber-600' :
                              'text-gray-600'
                            }>
                              {issue.message} ({issue.severity})
                              <div className="text-xs text-gray-500 pl-2 mt-1">
                                Recommendation: {issue.recommendation}
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTestDialogOpen(false)}>
              Close
            </Button>
            <Button onClick={handleTestEmail}>
              Send Test Email
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EmailDeliverabilityPage;