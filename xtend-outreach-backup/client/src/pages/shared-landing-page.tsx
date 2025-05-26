import { useQuery } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { useState } from "react";
import { apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import { ShareableLandingPage } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { format, parseISO } from "date-fns";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  Calendar, 
  Clock, 
  Globe, 
  Lock, 
  Youtube, 
  Instagram, 
  Twitter, 
  Twitch, 
  AlertCircle, 
  ExternalLink,
  User,
  Video,
  Tag,
  Mail,
  MessageSquare,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  FileText
} from "lucide-react";
import { 
  Accordion, 
  AccordionContent, 
  AccordionItem, 
  AccordionTrigger 
} from "@/components/ui/accordion";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

export default function SharedLandingPage() {
  const params = useParams();
  const [location, setLocation] = useLocation();
  const [password, setPassword] = useState("");
  const [isPasswordWrong, setIsPasswordWrong] = useState(false);
  const [passwordAttempted, setPasswordAttempted] = useState(false);
  
  const uniqueId = params.uniqueId;
  
  const { data: page, isLoading, isError } = useQuery<ShareableLandingPage>({
    queryKey: [`/api/landing-pages/${uniqueId}`],
    enabled: !!uniqueId,
    retry: false,
  });
  
  const isExpired = page?.expiresAt && new Date(page.expiresAt) < new Date();
  const isPasswordProtected = !!page?.password;
  const canAccess = !isPasswordProtected || (passwordAttempted && !isPasswordWrong);
  
  const checkPassword = () => {
    setPasswordAttempted(true);
    if (page?.password === password) {
      setIsPasswordWrong(false);
    } else {
      setIsPasswordWrong(true);
    }
  };
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      checkPassword();
    }
  };
  
  const getPlatformIcon = (platform: string) => {
    switch (platform?.toLowerCase()) {
      case "youtube":
        return <Youtube className="h-5 w-5 text-red-600" />;
      case "instagram":
        return <Instagram className="h-5 w-5 text-pink-600" />;
      case "twitter":
      case "x":
        return <Twitter className="h-5 w-5 text-blue-500" />;
      case "twitch":
        return <Twitch className="h-5 w-5 text-purple-600" />;
      default:
        return <Globe className="h-5 w-5" />;
    }
  };
  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto bg-white shadow-sm rounded-lg overflow-hidden">
          <div className="p-8">
            <Skeleton className="h-12 w-3/4 mb-4" />
            <Skeleton className="h-6 w-1/2 mb-8" />
            <div className="space-y-6">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  if (isError || !page) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md mx-auto text-center">
          <div className="bg-white p-8 rounded-lg shadow-sm">
            {/* STEM Group Banner */}
            <div className="flex justify-center mb-6">
              <img 
                src="/assets/Banner_LP.png" 
                alt="Creator's Upcoming Projects - STEM GROUP" 
                className="h-auto w-full max-w-[500px]"
              />
            </div>
            
            <AlertCircle className="mx-auto h-16 w-16 text-destructive" />
            <h1 className="mt-4 text-2xl font-bold tracking-tight text-gray-900">
              Page Not Found
            </h1>
            <p className="mt-2 text-base text-gray-500">
              The shareable landing page you're looking for doesn't exist or has been removed.
            </p>
            <div className="mt-6">
              <Button onClick={() => setLocation("/")}>
                Go to Home
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  if (isExpired) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md mx-auto text-center">
          <div className="bg-white p-8 rounded-lg shadow-sm">
            {/* STEM Group Banner */}
            <div className="flex justify-center mb-6">
              <img 
                src="/assets/Banner_LP.png" 
                alt="Creator's Upcoming Projects - STEM GROUP" 
                className="h-auto w-full max-w-[500px]"
              />
            </div>
            
            <Clock className="mx-auto h-16 w-16 text-orange-500" />
            <h1 className="mt-4 text-2xl font-bold tracking-tight text-gray-900">
              Page Expired
            </h1>
            <p className="mt-2 text-base text-gray-500">
              This shareable landing page has expired and is no longer available.
            </p>
            <div className="mt-6">
              <Button onClick={() => setLocation("/")}>
                Go to Home
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  if (isPasswordProtected && !canAccess) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md mx-auto">
          <div className="bg-white p-8 rounded-lg shadow-sm">
            <div className="text-center">
              {/* STEM Group Banner */}
              <div className="flex justify-center mb-6">
                <img 
                  src="/assets/Banner_LP.png" 
                  alt="Creator's Upcoming Projects - STEM GROUP" 
                  className="h-auto w-full max-w-[500px]"
                />
              </div>
              
              <Lock className="mx-auto h-12 w-12 text-gray-400" />
              <h2 className="mt-4 text-xl font-semibold text-gray-900">
                Password Protected
              </h2>
              <p className="mt-2 text-sm text-gray-500">
                This page is password protected. Please enter the password to continue.
              </p>
            </div>
            
            <div className="mt-6">
              <div className="space-y-2">
                <Input
                  type="password"
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className={isPasswordWrong ? "border-red-500" : ""}
                />
                {isPasswordWrong && (
                  <p className="text-sm text-red-500">
                    Incorrect password. Please try again.
                  </p>
                )}
              </div>
              <Button 
                className="w-full mt-4" 
                onClick={checkPassword}
              >
                Continue
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-gradient-to-r from-[#010440] to-[#e200b6] shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Creator's Inventory Banner */}
          <div className="flex justify-center mb-4">
            <img 
              src="/assets/Banner_LP.png" 
              alt="Creator's Inventory - STEM GROUP" 
              className="h-auto w-full max-w-[600px]"
            />
          </div>
          
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-white">
              {page.title}
            </h1>
            {page.expiresAt && (
              <Badge variant="outline" className="flex gap-1 items-center bg-white/10 text-white border-white/20">
                <Clock className="h-3 w-3" />
                Expires {format(parseISO(page.expiresAt.toString()), "MMM d, yyyy")}
              </Badge>
            )}
          </div>
        </div>
      </header>
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 bg-gray-50">
        {page.description && (
          <div className="mb-8">
            <p className="text-gray-600">{page.description}</p>
          </div>
        )}
        
        {/* Display individual creator project */}
        {page.content && typeof page.content === 'object' && 'creator' in page.content && (
          <Card className="mb-8">
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row gap-6">
                <div className="md:w-1/3">
                  <h3 className="text-lg font-medium mb-2 flex items-center gap-2">
                    <User className="h-5 w-5 text-gray-400" />
                    Creator Information
                  </h3>
                  <div className="space-y-2">
                    {page.content.creator?.name && (
                      <p className="text-sm">
                        <span className="font-semibold">Name:</span> {page.content.creator.name}
                      </p>
                    )}
                    {page.content.creator?.platform && (
                      <p className="text-sm flex items-center gap-1">
                        <span className="font-semibold">Platform:</span>
                        <span className="flex items-center gap-1">
                          {getPlatformIcon(page.content.creator.platform)}
                          {page.content.creator.platform}
                        </span>
                      </p>
                    )}
                    {page.content.creator?.audience && (
                      <p className="text-sm">
                        <span className="font-semibold">Audience:</span> {page.content.creator.audience}
                      </p>
                    )}
                  </div>
                </div>
                
                <div className="md:w-2/3">
                  <h3 className="text-lg font-medium mb-2 flex items-center gap-2">
                    <Video className="h-5 w-5 text-gray-400" />
                    Content Details
                  </h3>
                  <div className="space-y-2">
                    {page.content.title && (
                      <p className="text-sm">
                        <span className="font-semibold">Title:</span> {page.content.title}
                      </p>
                    )}
                    {page.content.videoFormat && (
                      <p className="text-sm">
                        <span className="font-semibold">Format:</span> {page.content.videoFormat}
                      </p>
                    )}
                    {/* Publish Date and Status have been removed as requested */}
                  </div>
                </div>
              </div>
              
              {page.content.description && (
                <div className="mt-6">
                  <h3 className="text-lg font-medium mb-2">Description</h3>
                  <p className="text-sm text-gray-600 whitespace-pre-line">{page.content.description}</p>
                </div>
              )}
              
              {page.content.tags && page.content.tags.length > 0 && (
                <div className="mt-4">
                  <div className="flex flex-wrap gap-2 items-center">
                    <Tag className="h-4 w-4 text-gray-400" />
                    {page.content.tags.map((tag, index) => (
                      <Badge key={index} variant="secondary">{tag}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
        
        {/* Display creator list */}
        {page.content && Array.isArray(page.content) && page.content.length > 0 && (
          <div className="space-y-6">
            <Alert className="bg-blue-50 border-blue-200">
              <AlertTitle className="text-blue-800 flex items-center gap-2">
                <Video className="h-5 w-5" />
                {page.content.length} Creator {page.content.length === 1 ? 'Video' : 'Videos'}
              </AlertTitle>
              <AlertDescription className="text-blue-700">
                A collection of upcoming creator videos shared with you.
              </AlertDescription>
            </Alert>
            
            <div className="space-y-6">
              {/* Group creators by name */}
              {(() => {
                // Step 1: Group videos by creator name
                const creatorGroups: Record<string, any[]> = {};
                page.content.forEach((creator: any) => {
                  if (!creatorGroups[creator.name]) {
                    creatorGroups[creator.name] = [];
                  }
                  creatorGroups[creator.name].push(creator);
                });
                
                // Log all creator names for debugging
                console.log("All creator names:", Object.keys(creatorGroups));
                
                // Step 2: Render each creator group
                return Object.entries(creatorGroups).map(([creatorName, creatorVideos]) => {
                  const videos = creatorVideos;
                  return (
                    <Accordion 
                      key={creatorName} 
                      type="single" 
                      collapsible 
                      className="border border-gray-200 rounded-md overflow-hidden shadow-sm bg-white"
                      defaultValue={creatorName}
                    >
                      <AccordionItem value={creatorName} className="border-0">
                        <AccordionTrigger className="bg-gradient-to-r from-[#010440]/5 to-[#e200b6]/5 px-4 py-4 hover:no-underline hover:from-[#010440]/10 hover:to-[#e200b6]/10">
                          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between w-full gap-2">
                            <h3 className="text-lg font-semibold text-[#010440]">{creatorName}</h3>
                            <div className="flex gap-2 flex-wrap z-10">
                              <button
                                type="button"
                                className="flex items-center justify-center gap-1 text-xs text-[#010440] border border-[#010440]/20 bg-white hover:bg-[#010440]/5 w-[90px] h-8 px-2 shadow-sm font-medium rounded-md transition-colors"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  // Use Patrick's email for all email buttons
                                  const email = 'patrick@stemgroup.io';
                                  const subject = encodeURIComponent(`Regarding ${creatorName}`);
                                  const body = encodeURIComponent(
                                    `Hi,\n\nI'd like to discuss collaboration possibilities with ${creatorName} for upcoming content.\n\nCould we schedule a call to discuss the details?\n\nBest regards,\nYour Name`
                                  );
                                  window.open(`mailto:${email}?subject=${subject}&body=${body}`);
                                  return false;
                                }}
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <rect width="20" height="16" x="2" y="4" rx="2" />
                                  <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                                </svg>
                                Mail
                              </button>
                              
                              <button
                                type="button"
                                className="flex items-center justify-center gap-1 text-xs text-[#010440] bg-[#010440]/10 border border-[#010440]/20 hover:bg-[#010440]/15 w-[90px] h-8 px-2 shadow-sm font-medium rounded-md transition-colors"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  window.open(`https://discord.com/channels/1139273754304843776/1371625070610354198`);
                                  return false;
                                }}
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M18 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
                                  <path d="M6 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
                                  <path d="M6 12v3a6 6 0 0 0 12 0v-3" />
                                </svg>
                                Discord
                              </button>
                              
                              <button
                                type="button"
                                className="flex items-center justify-center gap-1 text-xs text-[#e200b6] bg-[#e200b6]/10 border border-[#e200b6]/20 hover:bg-[#e200b6]/15 w-[90px] h-8 px-2 shadow-sm font-medium rounded-md transition-colors"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  
                                  // Log the exact creator name for debugging
                                  console.log("Clicked on creator:", creatorName);
                                  
                                  // Convert to lowercase for more reliable matching
                                  const lowerName = creatorName.toLowerCase().trim();
                                  console.log("Normalized name:", lowerName);
                                  
                                  // Direct URL mapping
                                  let url = "https://www.stemgroup.com/media-kit";
                                  
                                  // Exact, case-insensitive checks
                                  if (lowerName === "tyler blanchard") {
                                    url = "https://pillar.io/tylerblanchard/mediakit";
                                  } 
                                  else if (lowerName === "howieazy") {
                                    url = "https://pillar.io/howieazy/mediakit";
                                  }
                                  else if (lowerName === "john marc") {
                                    url = "https://pillar.io/johnmarcvanwyk/mediakit";
                                  }
                                  else if (lowerName === "andy morris") {
                                    url = "https://pillar.io/andy.morris/mediakit";
                                  }
                                  else if (lowerName === "mr.manny") {
                                    url = "https://pillar.io/themrmanny/mediakit";
                                  }
                                  else if (lowerName === "groovy gavin") {
                                    url = "https://pillar.io/groovygavin/mediakit";
                                  }
                                  else if (lowerName === "doremifajo") {
                                    url = "https://pillar.io/doremifajo/mediakit";
                                  }
                                  else if (lowerName === "pete gustin") {
                                    url = "https://pillar.io/realpetegustin/mediakit";
                                  }
                                  else if (lowerName === "aylex thunder") {
                                    url = "https://pillar.io/aylexthunder/mediakit";
                                  }
                                  else if (lowerName === "phillip a") {
                                    url = "https://pillar.io/phillip/mediakit";
                                  }
                                  
                                  // Fallback for partial matching if exact match fails
                                  if (url === "https://www.stemgroup.com/media-kit") {
                                    if (lowerName.includes("tyler")) {
                                      url = "https://pillar.io/tylerblanchard/mediakit";
                                    } 
                                    else if (lowerName.includes("howie")) {
                                      url = "https://pillar.io/howieazy/mediakit";
                                    }
                                    else if (lowerName.includes("john")) {
                                      url = "https://pillar.io/johnmarcvanwyk/mediakit";
                                    }
                                    else if (lowerName.includes("andy")) {
                                      url = "https://pillar.io/andy.morris/mediakit";
                                    }
                                    else if (lowerName.includes("manny")) {
                                      url = "https://pillar.io/themrmanny/mediakit";
                                    }
                                    else if (lowerName.includes("gavin")) {
                                      url = "https://pillar.io/groovygavin/mediakit";
                                    }
                                    else if (lowerName.includes("doremi")) {
                                      url = "https://pillar.io/doremifajo/mediakit";
                                    }
                                    else if (lowerName.includes("pete")) {
                                      url = "https://pillar.io/realpetegustin/mediakit";
                                    }
                                    else if (lowerName.includes("aylex")) {
                                      url = "https://pillar.io/aylexthunder/mediakit";
                                    }
                                    else if (lowerName.includes("phillip") || lowerName.includes("phil")) {
                                      url = "https://pillar.io/phillip/mediakit";
                                    }
                                  }
                                  
                                  console.log("Opening URL:", url);
                                  window.open(url, "_blank");
                                  return false;
                                }}
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
                                  <polyline points="14 2 14 8 20 8"/>
                                  <line x1="16" y1="13" x2="8" y2="13"/>
                                  <line x1="16" y1="17" x2="8" y2="17"/>
                                  <line x1="10" y1="9" x2="8" y2="9"/>
                                </svg>
                                Media Kit
                              </button>
                            </div>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="p-0 pt-0">
                          <table className="w-full border-collapse">
                            <thead className="bg-gray-50 sticky top-0 z-10">
                              <tr className="border-b border-gray-200 shadow-sm">
                                <th className="py-3 px-4 text-left text-sm font-medium text-gray-700 w-6/12">TITLE</th>
                                {/* Publish Date column removed */}
                                <th className="py-3 px-4 text-left text-sm font-medium text-gray-700 w-1/12">PLATFORM</th>
                                <th className="py-3 px-4 text-left text-sm font-medium text-gray-700 w-1/12">FORMAT</th>
                                <th className="py-3 px-4 text-left text-sm font-medium text-gray-700 w-2/12">BRAND LIKENESS</th>
                                <th className="py-3 px-4 text-left text-sm font-medium text-gray-700 w-2/12">TIMELINE</th>
                                {/* Status column removed */}
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {videos.map((video, idx) => (
                                <tr key={idx} className="hover:bg-gray-50 transition-colors">
                                  {/* Title & Content */}
                                  <td className="py-4 px-4">
                                    <div className="flex items-start gap-2">
                                      <div className="w-5 h-5 flex items-center justify-center mt-1">
                                        {video.status?.toLowerCase() === "scheduled" && <Clock className="h-4 w-4 text-green-600" />}
                                        {video.status?.toLowerCase() === "upcoming" && <Calendar className="h-4 w-4 text-blue-600" />}
                                        {video.status?.toLowerCase() === "live" && <AlertCircle className="h-4 w-4 text-red-600" />}
                                        {video.status?.toLowerCase() === "completed" && <CheckCircle className="h-4 w-4 text-gray-600" />}
                                      </div>
                                      <div>
                                        <h4 className="font-medium text-gray-900">{video.title}</h4>
                                        
                                        {/* Content summary always visible */}
                                        <div className="mt-1">
                                          <p className="text-sm text-gray-600 line-clamp-2">
                                            {video.content}
                                          </p>
                                          
                                          {/* Full content (expandable) */}
                                          <Collapsible>
                                            <CollapsibleTrigger asChild>
                                              <Button variant="ghost" size="sm" className="text-xs flex items-center gap-1 h-6 px-2 -ml-2">
                                                <ChevronRight className="h-3 w-3" />
                                                See full description
                                              </Button>
                                            </CollapsibleTrigger>
                                            <CollapsibleContent>
                                              <div className="p-3 bg-gray-50 mt-2 rounded-md">
                                                <p className="text-sm text-gray-600 whitespace-pre-line">
                                                  {video.content}
                                                </p>
                                                
                                                {video.description && (
                                                  <div className="mt-3 pt-3 border-t border-gray-200">
                                                    <p className="text-sm text-gray-600 whitespace-pre-line">
                                                      {video.description}
                                                    </p>
                                                  </div>
                                                )}
                                                
                                                {video.tags && video.tags.length > 0 && (
                                                  <div className="flex flex-wrap gap-2 mt-3">
                                                    {video.tags.map((tag, tagIdx) => (
                                                      <Badge key={tagIdx} variant="secondary">{tag}</Badge>
                                                    ))}
                                                  </div>
                                                )}
                                              </div>
                                            </CollapsibleContent>
                                          </Collapsible>
                                        </div>
                                      </div>
                                    </div>
                                  </td>
                                  
                                  {/* Due date - removed */}
                                  
                                  {/* Platform */}
                                  <td className="py-4 px-4">
                                    <div className="rounded-md bg-[#e200b6]/10 border border-[#e200b6]/20 px-3 py-2 text-xs font-medium text-[#e200b6] inline-flex items-center gap-1.5">
                                      {video.platform}
                                    </div>
                                  </td>
                                  
                                  {/* Video format */}
                                  <td className="py-4 px-4">
                                    <div className="rounded-md bg-[#e200b6] px-4 py-2 text-xs font-semibold text-white inline-flex items-center justify-center">
                                      {video.videoFormat === "Long Form" ? "Long Form" : ""}
                                      {video.videoFormat === "Short Form" ? "Short Form" : ""}
                                      {video.videoFormat !== "Long Form" && video.videoFormat !== "Short Form" ? video.videoFormat : ""}
                                    </div>
                                  </td>
                                  
                                  {/* Brand Likeness */}
                                  <td className="py-4 px-4">
                                    <div className="text-sm text-gray-700 font-medium">
                                      {video.brandLikeness ? (
                                        <div className="flex flex-wrap gap-1">
                                          {video.brandLikeness.split(',').map((brand, i) => (
                                            <span key={i} className="inline-block px-2 py-1 bg-[#010440]/5 rounded-md text-[#010440] text-xs">
                                              {brand.trim()}
                                            </span>
                                          ))}
                                        </div>
                                      ) : (
                                        "Not specified"
                                      )}
                                    </div>
                                  </td>
                                  
                                  {/* Timeline */}
                                  <td className="py-4 px-4">
                                    <div className="rounded-md bg-[#010440]/10 px-4 py-2 text-xs font-semibold text-[#010440] inline-block">
                                      {video.timeline || "Not specified"}
                                    </div>
                                  </td>
                                  
                                  {/* Status - removed */}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  );
                });
              })()}
            </div>
          </div>
        )}
        
        {/* Additional Information section removed as requested */}
        
        {page.contactInfo && typeof page.contactInfo === 'object' && (
          <div className="mt-6 sm:mt-8">
            <h3 className="text-lg font-medium mb-3 sm:mb-4">Contact Information</h3>
            <Card>
              <CardContent className="pt-5 sm:pt-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  {Object.entries(page.contactInfo).map(([key, value]) => 
                    value && (
                      <div key={key} className="flex flex-wrap sm:flex-nowrap items-start gap-2">
                        <p className="text-sm font-medium text-gray-500 capitalize sm:w-24">{key}:</p>
                        <p className="text-sm break-words">{String(value)}</p>
                      </div>
                    )
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
        
        {page.ctaText && page.ctaUrl && (
          <div className="mt-12 text-center">
            <Button asChild className="gap-2">
              <a 
                href={page.ctaUrl} 
                target="_blank" 
                rel="noopener noreferrer"
              >
                {page.ctaText}
                <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
          </div>
        )}
        
        {/* Company footer with website, banner and social media */}
        <div className="mt-16 border-t border-gray-200 pt-8 pb-10">
          <div className="flex flex-col items-center justify-center gap-6">
            <div className="text-center">
              <p className="text-sm text-gray-500 mb-3">Powered by</p>
              <div className="flex flex-col gap-4 items-center">
                <a 
                  href="https://www.stemgroup.io" 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#010440] hover:text-[#e200b6] font-medium text-lg transition-colors"
                >
                  www.stemgroup.io
                </a>
                <a 
                  href="https://creatorhublive.com" 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#010440] hover:text-[#e200b6] transition-colors flex flex-col items-center"
                >
                  <span className="font-semibold text-xl bg-clip-text text-transparent bg-gradient-to-r from-[#010440] to-[#e200b6] mb-3">
                    creatorhublive.com
                  </span>
                  <img 
                    src="/assets/creator-hub-banner.png" 
                    alt="Creator Hub" 
                    className="w-full max-w-[450px] h-auto rounded-md shadow-sm"
                  />
                </a>
              </div>
            </div>
            <div className="flex gap-4 items-center">
              <a 
                href="https://www.linkedin.com/company/stemgroup/" 
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-600 hover:text-[#0077b5] transition-colors"
                aria-label="LinkedIn"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                </svg>
              </a>
              <a 
                href="https://www.instagram.com/stemgroup.io/" 
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-600 hover:text-[#e1306c] transition-colors"
                aria-label="Instagram"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
                </svg>
              </a>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              © {new Date().getFullYear()} STEM GROUP. All rights reserved.
            </p>
          </div>
        </div>
      </main>
      
      <footer className="bg-white border-t border-gray-200 mt-8 sm:mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-36 bg-gradient-to-r from-purple-700 to-purple-500 p-1 rounded">
                <div className="px-2 py-1">
                  <div className="text-xs text-white font-semibold">Creator's</div>
                  <div className="text-xs text-white font-bold mt-[-2px]">Inventory</div>
                </div>
              </div>
              <p className="text-center text-sm text-gray-500">
                This page was created with Xtend Creators
              </p>
            </div>
            {/* Home button removed as requested */}
          </div>
        </div>
      </footer>
    </div>
  );
}