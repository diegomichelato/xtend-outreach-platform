import React, { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Check, Clock, Mail, Share, ExternalLink, ChevronRight } from 'lucide-react';

interface ProposalContent {
  id: number;
  contactName: string;
  contactCompany: string;
  contactIndustry: string;
  companyInfo: {
    name: string;
    description: string;
    industry: string;
    founded: string;
    website: string;
    headquarters: string;
    employeeCount: string;
    keyProducts: string[];
    competitors: string[];
    recentNews: string[];
  };
  partnershipAssessment: {
    audienceOverlap: string;
    contentFit: string;
    brandValues: string;
    marketingGoals: string;
    recommendations: string[];
  };
  brandDeals: {
    recentPartnerships: string[];
    successfulCampaigns: string[];
    competitorCollaborations: string[];
  };
  projectOverview: string;
  brandIntroduction: string;
  selectedCreators: Array<{
    id: number;
    name: string;
    role: string;
    bio: string;
    brandVoice: string;
    profileColor: string;
    initials: string;
    creatorFitExplanation: string;
    selectedPricing: Array<{
      id: number;
      contentType: string;
      format: string;
      basePrice: number;
      usageRights: string;
      revisionLimit: number;
      deliveryTimeframe: number;
      description: string;
    }>;
  }>;
  totalValue: number;
  status: string;
  contactInfo: {
    name: string;
    email: string;
    phone: string;
  };
}

interface LandingPageData {
  uniqueId: string;
  title: string;
  description: string;
  status: string;
  expiresAt: string;
  brandLogo?: string;
  brandPrimaryColor: string;
  brandSecondaryColor: string;
  content: ProposalContent;
}

interface ProposalLandingPageProps {
  printMode?: boolean;
}

export function ProposalLandingPage({ printMode = false }: ProposalLandingPageProps) {
  const [, setLocation] = useLocation();
  const [pageId, setPageId] = useState<string>('');
  
  useEffect(() => {
    // Get page ID from URL
    const pathSegments = window.location.pathname.split('/');
    const id = pathSegments[pathSegments.length - 1];
    console.log("Extracted page ID from URL:", id);
    setPageId(id);
  }, []);
  
  const { data: landingPage, isLoading, error } = useQuery({
    queryKey: ['/api/landing-pages/shared', pageId],
    queryFn: async () => {
      console.log("Fetching landing page with ID:", pageId);
      const response = await fetch(`/api/landing-pages/shared/${pageId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch landing page');
      }
      
      return response.json();
    },
    enabled: !!pageId,
  });
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center space-y-4">
          <div className="h-12 w-12 border-4 border-t-blue-500 border-blue-200 rounded-full animate-spin"></div>
          <p className="text-xl font-medium">Loading proposal...</p>
        </div>
      </div>
    );
  }
  
  if (error || !landingPage) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-red-500">Proposal Not Found</CardTitle>
            <CardDescription>
              This proposal link may be expired or invalid.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button onClick={() => window.location.href = '/'}>
              Return to Home
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }
  
  const { content } = landingPage as LandingPageData;
  
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };
  
  const trackEmailClick = async () => {
    if (pageId) {
      try {
        await fetch(`/api/landing-pages/${pageId}/track-click`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'email' }),
        });
      } catch (error) {
        console.error('Error tracking click:', error);
      }
    }
  };
  
  return (
    <div 
      className="min-h-screen pb-12" 
      style={{ 
        backgroundColor: landingPage.brandPrimaryColor ? `${landingPage.brandPrimaryColor}10` : '#f8fafc',
        backgroundImage: 'radial-gradient(at 100% 0%, rgba(var(--primary-rgb), 0.05) 0px, transparent 50%), radial-gradient(at 0% 100%, rgba(var(--primary-rgb), 0.05) 0px, transparent 50%)'
      }}
    >
      {/* Header - Styled to match the inventory landing page */}
      <header className="bg-gradient-to-r from-[#010440] to-[#e200b6] shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Creator's Banner */}
          <div className="flex justify-center mb-4">
            <img 
              src="/assets/Banner_LP.png" 
              alt="Creator's Inventory - STEM GROUP" 
              className="h-auto w-full max-w-[600px]"
            />
          </div>
          
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-white">
              {landingPage.title}
            </h1>
            
            <Button 
              variant="outline"
              size="sm" 
              onClick={() => trackEmailClick()}
              className="bg-white/10 text-white border-white/20 hover:bg-white/20"
              asChild
            >
              <a 
                href={`mailto:${content.contactInfo.email}`} 
                className="flex items-center space-x-2"
              >
                <Mail className="h-4 w-4" />
                <span>Contact Us</span>
              </a>
            </Button>
          </div>
        </div>
      </header>
      
      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 bg-gray-50">
        {/* Intro section */}
        <section className="mb-12">
          <div className="max-w-4xl mx-auto">
            <div className="flex justify-between items-start mb-6">
              <div>
                <p className="text-gray-600 mb-6">{landingPage.description}</p>
              </div>
              <div>
                <Badge variant="outline" className="bg-green-100 text-green-800 py-1 px-3">
                  Active Proposal
                </Badge>
              </div>
            </div>
            
            <Card className="mb-8 border border-gray-200 rounded-md overflow-hidden shadow-sm">
              <CardHeader className="bg-gradient-to-r from-[#010440]/5 to-[#e200b6]/5 px-4 py-4 border-b border-gray-200">
                <CardTitle className="text-lg font-semibold text-[#010440]">
                  Partnership Opportunity with {content.contactCompany}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="prose max-w-none">                  
                  <div className="mb-6">
                    <h4 className="font-medium text-gray-900 mb-2">Project Overview</h4>
                    <p className="text-gray-700 whitespace-pre-line">{content.projectOverview}</p>
                  </div>
                  
                  <div className="mb-6">
                    <h4 className="font-medium text-gray-900 mb-2">Brand Introduction</h4>
                    <p className="text-gray-700 whitespace-pre-line">{content.brandIntroduction}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
        
        {/* Creator Proposals */}
        <section className="mb-12">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center mb-6">
              <h2 className="text-xl font-bold text-[#010440]">Creator Collaborations</h2>
            </div>
            
            <div className="space-y-6">
              {content.selectedCreators.map((creator, index) => (
                <Accordion 
                  key={creator.id} 
                  type="single" 
                  collapsible 
                  className="border border-gray-200 rounded-md overflow-hidden shadow-sm bg-white mb-6"
                  defaultValue={creator.name}
                >
                  <AccordionItem value={creator.name} className="border-0">
                    <AccordionTrigger className="bg-gradient-to-r from-[#010440]/5 to-[#e200b6]/5 px-4 py-4 hover:no-underline hover:from-[#010440]/10 hover:to-[#e200b6]/10">
                      <div className="flex items-center space-x-4">
                        <Avatar className="h-12 w-12">
                          <AvatarFallback 
                            style={{ backgroundColor: creator.profileColor || '#4F46E5' }}
                            className="text-white text-lg"
                          >
                            {creator.initials}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h3 className="font-semibold text-[#010440]">{creator.name}</h3>
                          <p className="text-sm text-gray-600">{creator.role}</p>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 py-4">
                      <Tabs defaultValue="about">
                        <TabsList className="mb-4">
                          <TabsTrigger value="about">About</TabsTrigger>
                          <TabsTrigger value="why-fit">Why This Creator</TabsTrigger>
                          <TabsTrigger value="deliverables">Deliverables</TabsTrigger>
                        </TabsList>
                        
                        <TabsContent value="about">
                          <div className="space-y-4">
                            <div className="border-l-4 border-[#010440]/20 pl-4 py-1">
                              <h4 className="text-md font-medium text-[#010440] mb-2">Creator Bio</h4>
                              <p className="text-gray-700 whitespace-pre-line">{creator.bio}</p>
                            </div>
                            <div className="border-l-4 border-[#e200b6]/20 pl-4 py-1">
                              <h4 className="text-md font-medium text-[#e200b6] mb-2">Brand Voice</h4>
                              <p className="text-gray-700">{creator.brandVoice}</p>
                            </div>
                          </div>
                        </TabsContent>
                        
                        <TabsContent value="why-fit">
                          <div className="space-y-4">
                            <div className="border-l-4 border-[#010440]/20 pl-4 py-1">
                              <h4 className="text-md font-medium text-[#010440] mb-2">Partnership Value</h4>
                              <p className="text-gray-700 whitespace-pre-line bg-white p-4 rounded-md border border-gray-100 shadow-sm">{creator.creatorFitExplanation}</p>
                            </div>
                          </div>
                        </TabsContent>
                        
                        <TabsContent value="deliverables">
                          <div className="space-y-4">
                            <div className="border-l-4 border-[#010440]/20 pl-4 py-1 mb-4">
                              <h4 className="text-md font-medium text-[#010440] mb-2">Content Deliverables</h4>
                              <p className="text-gray-700">Selected pricing options for this campaign</p>
                            </div>
                            
                            <div className="space-y-6">
                              {creator.selectedPricing.map(pricing => (
                                <div
                                  key={pricing.id}
                                  className="bg-white border border-gray-100 rounded-lg overflow-hidden shadow-sm"
                                >
                                  <div className="bg-gradient-to-r from-[#010440]/5 to-[#e200b6]/5 px-4 py-3 border-b border-gray-100">
                                    <div className="flex justify-between items-center">
                                      <h4 className="font-medium text-[#010440]">
                                        {pricing.contentType} - {pricing.format.replace('_', ' ')}
                                      </h4>
                                      <span className="text-lg font-bold bg-gradient-to-r from-[#010440] to-[#e200b6] bg-clip-text text-transparent">
                                        {formatPrice(pricing.basePrice)}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="p-4">
                                    <p className="text-gray-700 mb-4">{pricing.description}</p>
                                    
                                    <div className="grid grid-cols-2 gap-4 bg-gray-50 p-3 rounded-md">
                                      <div className="flex items-start">
                                        <Check className="h-4 w-4 text-green-500 mr-2 mt-0.5" />
                                        <div>
                                          <h5 className="text-sm font-medium text-gray-700 mb-1">Usage Rights</h5>
                                          <p className="text-gray-600 text-sm">{pricing.usageRights}</p>
                                        </div>
                                      </div>
                                      <div className="flex items-start">
                                        <Clock className="h-4 w-4 text-amber-500 mr-2 mt-0.5" />
                                        <div>
                                          <h5 className="text-sm font-medium text-gray-700 mb-1">Delivery Timeframe</h5>
                                          <p className="text-gray-600 text-sm">{pricing.deliveryTimeframe} days</p>
                                        </div>
                                      </div>
                                      <div className="flex items-start col-span-2">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-blue-500 mr-2 mt-0.5">
                                          <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
                                          <path d="M3 3v5h5"></path>
                                          <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"></path>
                                          <path d="M16 21h5v-5"></path>
                                        </svg>
                                        <div>
                                          <h5 className="text-sm font-medium text-gray-700 mb-1">Revisions</h5>
                                          <p className="text-gray-600 text-sm">{pricing.revisionLimit} revisions included</p>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </TabsContent>
                      </Tabs>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              ))}
            </div>
          </div>
        </section>
        
        {/* Company Information */}
        <section className="mb-12">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center mb-6">
              <h2 className="text-xl font-bold text-[#010440]">About {content.companyInfo.name}</h2>
            </div>
            
            <Card className="mb-8 border border-gray-200 rounded-md overflow-hidden shadow-sm">
              <CardHeader className="bg-gradient-to-r from-[#010440]/5 to-[#e200b6]/5 px-4 py-4 border-b border-gray-200">
                <CardTitle className="text-lg font-semibold text-[#010440]">Company Profile</CardTitle>
                <CardDescription>Company background and partnership fit</CardDescription>
              </CardHeader>
              
              <CardContent>
                <Tabs defaultValue="company-info">
                  <TabsList className="mb-4">
                    <TabsTrigger value="company-info">Company Information</TabsTrigger>
                    <TabsTrigger value="partnership-fit">Partnership Assessment</TabsTrigger>
                    <TabsTrigger value="brand-deals">Brand Collaborations</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="company-info">
                    <div className="space-y-6">
                      <div className="border-l-4 border-[#010440]/20 pl-4 py-1">
                        <h3 className="text-lg font-medium mb-2 text-[#010440]">Company Overview</h3>
                        <p className="text-gray-700">{content.companyInfo.description}</p>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-white p-4 rounded-md border border-gray-100 shadow-sm">
                          <h4 className="text-sm font-medium text-gray-500 mb-1">Industry</h4>
                          <p className="text-gray-700 font-medium">{content.companyInfo.industry}</p>
                        </div>
                        <div className="bg-white p-4 rounded-md border border-gray-100 shadow-sm">
                          <h4 className="text-sm font-medium text-gray-500 mb-1">Founded</h4>
                          <p className="text-gray-700 font-medium">{content.companyInfo.founded}</p>
                        </div>
                        <div className="bg-white p-4 rounded-md border border-gray-100 shadow-sm">
                          <h4 className="text-sm font-medium text-gray-500 mb-1">Headquarters</h4>
                          <p className="text-gray-700 font-medium">{content.companyInfo.headquarters}</p>
                        </div>
                        <div className="bg-white p-4 rounded-md border border-gray-100 shadow-sm">
                          <h4 className="text-sm font-medium text-gray-500 mb-1">Employee Count</h4>
                          <p className="text-gray-700 font-medium">{content.companyInfo.employeeCount}</p>
                        </div>
                      </div>
                      
                      <div className="border-l-4 border-[#e200b6]/20 pl-4 py-1 mb-6">
                        <h4 className="text-md font-medium text-[#e200b6] mb-2">Key Products & Services</h4>
                        <ul className="list-disc pl-5 text-gray-700 space-y-1">
                          {content.companyInfo.keyProducts.map((product, i) => (
                            <li key={i}>{product}</li>
                          ))}
                        </ul>
                      </div>
                      
                      <div className="border-l-4 border-[#010440]/20 pl-4 py-1 mb-6">
                        <h4 className="text-md font-medium text-[#010440] mb-2">Key Competitors</h4>
                        <ul className="list-disc pl-5 text-gray-700 space-y-1">
                          {content.companyInfo.competitors.map((competitor, i) => (
                            <li key={i}>{competitor}</li>
                          ))}
                        </ul>
                      </div>
                      
                      <div className="border-l-4 border-[#e200b6]/20 pl-4 py-1">
                        <h4 className="text-md font-medium text-[#e200b6] mb-2">Recent News & Developments</h4>
                        <ul className="list-disc pl-5 text-gray-700 space-y-1">
                          {content.companyInfo.recentNews.map((news, i) => (
                            <li key={i}>{news}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="partnership-fit">
                    <div className="space-y-6">
                      <div className="border-l-4 border-[#010440]/20 pl-4 py-1 mb-6">
                        <h3 className="text-lg font-medium mb-2 text-[#010440]">Partnership Assessment</h3>
                        <p className="text-gray-700">Analysis of how this brand partnership aligns with our creators</p>
                      </div>
                      
                      <div className="grid grid-cols-1 gap-6 mb-6">
                        <div className="bg-white p-4 rounded-md border border-gray-100 shadow-sm">
                          <h4 className="text-md font-medium text-[#010440] mb-2">Audience Overlap</h4>
                          <p className="text-gray-700">{content.partnershipAssessment.audienceOverlap}</p>
                        </div>
                        <div className="bg-white p-4 rounded-md border border-gray-100 shadow-sm">
                          <h4 className="text-md font-medium text-[#e200b6] mb-2">Content Fit</h4>
                          <p className="text-gray-700">{content.partnershipAssessment.contentFit}</p>
                        </div>
                        <div className="bg-white p-4 rounded-md border border-gray-100 shadow-sm">
                          <h4 className="text-md font-medium text-[#010440] mb-2">Brand Values</h4>
                          <p className="text-gray-700">{content.partnershipAssessment.brandValues}</p>
                        </div>
                        <div className="bg-white p-4 rounded-md border border-gray-100 shadow-sm">
                          <h4 className="text-md font-medium text-[#e200b6] mb-2">Marketing Goals</h4>
                          <p className="text-gray-700">{content.partnershipAssessment.marketingGoals}</p>
                        </div>
                      </div>
                      
                      <div className="border-l-4 border-[#e200b6]/20 pl-4 py-1">
                        <h4 className="text-md font-medium text-[#e200b6] mb-2">Strategic Recommendations</h4>
                        <ul className="space-y-3 mt-3">
                          {content.partnershipAssessment.recommendations.map((rec, i) => (
                            <li key={i} className="flex items-start bg-white p-3 rounded-md border border-gray-100 shadow-sm">
                              <Check className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                              <span className="text-gray-700">{rec}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="brand-deals">
                    <div className="space-y-6">
                      <div className="border-l-4 border-[#010440]/20 pl-4 py-1 mb-6">
                        <h3 className="text-lg font-medium mb-2 text-[#010440]">Brand Collaborations</h3>
                        <p className="text-gray-700">Overview of relevant brand partnerships and campaigns</p>
                      </div>
                    
                      <div className="border-l-4 border-[#e200b6]/20 pl-4 py-1 mb-6">
                        <h4 className="text-md font-medium text-[#e200b6] mb-2">Recent Partnerships</h4>
                        <ul className="list-disc pl-5 text-gray-700 space-y-1">
                          {content.brandDeals.recentPartnerships.map((partnership, i) => (
                            <li key={i}>{partnership}</li>
                          ))}
                        </ul>
                      </div>
                      
                      <div className="border-l-4 border-[#010440]/20 pl-4 py-1 mb-6">
                        <h4 className="text-md font-medium text-[#010440] mb-2">Successful Campaigns</h4>
                        <ul className="list-disc pl-5 text-gray-700 space-y-1">
                          {content.brandDeals.successfulCampaigns.map((campaign, i) => (
                            <li key={i}>{campaign}</li>
                          ))}
                        </ul>
                      </div>
                      
                      <div className="border-l-4 border-[#e200b6]/20 pl-4 py-1">
                        <h4 className="text-md font-medium text-[#e200b6] mb-2">Competitor Collaborations</h4>
                        <ul className="list-disc pl-5 text-gray-700 space-y-1">
                          {content.brandDeals.competitorCollaborations.map((collab, i) => (
                            <li key={i}>{collab}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        </section>
        
        {/* CTA Section */}
        <section>
          <div className="max-w-4xl mx-auto">
            <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-none overflow-hidden">
              <CardContent className="pt-6 pb-6">
                <div className="flex flex-col md:flex-row items-center justify-between">
                  <div className="mb-6 md:mb-0">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Ready to move forward?</h3>
                    <p className="text-gray-600 max-w-md">
                      Contact us to discuss this proposal or request modifications to the package.
                    </p>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button 
                      className="bg-blue-600 hover:bg-blue-700"
                      size="lg"
                      onClick={() => trackEmailClick()}
                      asChild
                    >
                      <a href={`mailto:${content.contactInfo.email}`}>
                        Contact Us
                      </a>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>
      
      {/* Footer */}
      <footer className="mt-16 py-6 bg-gray-50 border-t border-gray-200">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-center">
            <div className="mb-4 sm:mb-0">
              <p className="text-gray-500 text-sm">
                {landingPage.brandFooterText || 'This proposal is confidential and intended for the recipient only.'}
              </p>
            </div>
            
            <div className="flex items-center space-x-2">
              <span className="text-xs text-gray-400">Proposal expires: {new Date(landingPage.expiresAt).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default ProposalLandingPage;