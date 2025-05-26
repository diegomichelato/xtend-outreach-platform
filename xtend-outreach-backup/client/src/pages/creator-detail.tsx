import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Users, BarChart2, Calendar, Mail, Briefcase, Award, Share2, ExternalLink, Edit, Plus, X, Save, Pencil, DollarSign, FileText, Package } from "lucide-react";
import { getInitials } from "@/lib/utils";
import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

export default function CreatorDetail() {
  const { id } = useParams();
  const { toast } = useToast();
  
  // State for profile editing
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editedProfile, setEditedProfile] = useState({
    name: '',
    role: '',
    bio: '',
    profileImageUrl: '',
    profileColor: '',
    brandVoice: ''
  });
  
  // State for pricing management
  const [isEditingPricing, setIsEditingPricing] = useState(false);
  const [isAddingPackage, setIsAddingPackage] = useState(false);
  const [newPackage, setNewPackage] = useState({
    platform: 'Custom',
    service: '',
    price: '',
    details: [''],
    color: 'purple'
  });
  
  // Default pricing packages if none exists in the database
  const defaultPricingPackages = {
    youtube: [
      {
        service: 'Long Form Video',
        price: 25000,
        details: [
          '10-15 minute dedicated video',
          'Full creative direction',
          '30-day usage rights',
          'Includes script approval',
          '2 rounds of revisions'
        ]
      },
      {
        service: 'Integration',
        price: 15000,
        details: [
          '60-90 second mention in video',
          'Natural integration',
          '30-day usage rights',
          '1 round of revisions'
        ]
      }
    ],
    instagram: [
      {
        service: 'Reel',
        price: 12000,
        details: [
          '30-60 second vertical video',
          'Dedicated content',
          '30-day usage rights',
          '1 round of revisions'
        ]
      },
      {
        service: 'Post + Story',
        price: 8000,
        details: [
          '1 static post',
          '3 story frames',
          '30-day usage rights',
          'Brand provided assets'
        ]
      }
    ],
    tiktok: [
      {
        service: 'Native Video',
        price: 10000,
        details: [
          '30-60 second trending style',
          'Full creative direction',
          '30-day usage rights',
          '1 round of revisions'
        ]
      }
    ],
    addons: [
      {
        service: 'Extended Usage',
        price: 5000,
        details: [
          'Extends usage to 90 days',
          'Additional platform rights',
          'Internal use permitted'
        ]
      },
      {
        service: 'Exclusivity',
        price: 8000,
        details: [
          '30-day category exclusivity',
          'No competitive brands',
          'Prior approval on future sponsors'
        ]
      }
    ],
    custom: []
  };
  
  // Fetch creator data
  const { data: creator, isLoading: creatorLoading } = useQuery({
    queryKey: [`/api/creators/${id}`],
    enabled: !!id,
  });
  
  // Fetch associated email accounts
  const { data: emailAccounts, isLoading: emailsLoading } = useQuery({
    queryKey: [`/api/creators/${id}/email-accounts`],
    enabled: !!id,
  });
  
  // Fetch associated campaigns
  const { data: campaigns, isLoading: campaignsLoading } = useQuery({
    queryKey: [`/api/creators/${id}/campaigns`],
    enabled: !!id,
  });
  
  const isLoading = creatorLoading || emailsLoading || campaignsLoading;
  
  // State for editable pricing packages
  const [pricingPackages, setPricingPackages] = useState(defaultPricingPackages);
  
  // Update pricing packages and profile data when creator data is loaded
  React.useEffect(() => {
    if (creator) {
      if (creator.pricingPackages) {
        setPricingPackages(creator.pricingPackages);
      }
      
      // Set initial values for profile editing
      setEditedProfile({
        name: creator.name || '',
        role: creator.role || '',
        bio: creator.bio || '',
        profileImageUrl: creator.profileImageUrl || '',
        profileColor: creator.profileColor || '#00a99d',
        brandVoice: creator.brandVoice || ''
      });
    }
  }, [creator]);
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  if (!creator) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <h1 className="text-2xl font-bold">Creator not found</h1>
        <p className="text-muted-foreground">The creator you are looking for does not exist.</p>
        <Button asChild>
          <Link href="/creators">Back to Creators</Link>
        </Button>
      </div>
    );
  }
  
  const initials = creator.initials || getInitials(creator.name);
  
  // Helper function to render JSON data as a list
  const renderJsonList = (data: any, defaultMessage: string = "No information available") => {
    if (!data || Object.keys(data || {}).length === 0) {
      return <p className="text-muted-foreground">{defaultMessage}</p>;
    }
    
    return (
      <ul className="space-y-2">
        {Object.entries(data).map(([key, value]) => (
          <li key={key} className="flex items-start">
            <span className="font-medium mr-2">{key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}:</span>
            <span>{String(value)}</span>
          </li>
        ))}
      </ul>
    );
  };
  
  // Helper function to render social links
  const renderSocialLinks = (socialLinks: any) => {
    if (!socialLinks || Object.keys(socialLinks || {}).length === 0) {
      return <p className="text-muted-foreground">No social links available</p>;
    }
    
    return (
      <div className="flex flex-wrap gap-2">
        {Object.entries(socialLinks).map(([platform, url]) => (
          <a 
            key={platform}
            href={String(url)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-sm rounded-full bg-primary/10 hover:bg-primary/20 px-3 py-1 transition-colors">
            <ExternalLink className="h-3 w-3" />
            {platform.charAt(0).toUpperCase() + platform.slice(1)}
          </a>
        ))}
      </div>
    );
  };
  
  return (
    <div className="container mx-auto py-8 max-w-7xl">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Button variant="outline" asChild>
            <Link href="/creators">
              &larr; Back
            </Link>
          </Button>
          <h1 className="text-3xl font-bold">{creator.name}</h1>
          <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-sm">
            {creator.role}
          </span>
        </div>
        <Button>Edit Profile</Button>
      </div>
      
      {/* Creator Profile Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Profile</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center text-center">
            <div className="relative group">
              <Avatar className="h-32 w-32 mb-4">
                {isEditingProfile ? (
                  <>
                    <AvatarImage src={editedProfile.profileImageUrl || creator.profileImageUrl || ""} alt={editedProfile.name || creator.name} />
                    <AvatarFallback 
                      className="text-2xl" 
                      style={{ backgroundColor: editedProfile.profileColor || creator.profileColor || "#4F46E5" }}>
                      {getInitials(editedProfile.name || creator.name)}
                    </AvatarFallback>
                    <label className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            const file = e.target.files[0];
                            
                            // Check file size, limit to 500KB for better performance
                            if (file.size > 500 * 1024) {
                              toast({
                                title: "File too large",
                                description: "Profile image must be less than 500KB",
                                variant: "destructive"
                              });
                              return;
                            }
                            
                            const reader = new FileReader();
                            reader.onload = (event) => {
                              if (event.target?.result) {
                                const imageData = event.target.result as string;
                                console.log("Image loaded successfully, size:", imageData.length);
                                
                                setEditedProfile({
                                  ...editedProfile,
                                  profileImageUrl: imageData
                                });
                                
                                // Show preview confirmation
                                toast({
                                  title: "Image uploaded",
                                  description: "Image will be saved when you click Save",
                                });
                              }
                            };
                            reader.onerror = () => {
                              toast({
                                title: "Image upload failed",
                                description: "There was a problem loading the image",
                                variant: "destructive"
                              });
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                      <Edit className="h-8 w-8 text-white" />
                    </label>
                  </>
                ) : (
                  <>
                    <AvatarImage src={creator.profileImageUrl || ""} alt={creator.name} />
                    <AvatarFallback 
                      className="text-2xl" 
                      style={{ backgroundColor: creator.profileColor || "#4F46E5" }}>
                      {initials}
                    </AvatarFallback>
                  </>
                )}
              </Avatar>
              
              {/* Color Picker (visible in edit mode) */}
              {isEditingProfile && (
                <div className="mb-4 flex gap-1 justify-center">
                  {['#4F46E5', '#00a99d', '#ff6b6b', '#4dabf7', '#9775fa', '#f06595', '#fd7e14', '#40c057'].map(color => (
                    <button
                      key={color}
                      className={`w-6 h-6 rounded-full ${editedProfile.profileColor === color ? 'ring-2 ring-offset-1 ring-gray-500' : ''}`}
                      style={{ backgroundColor: color }}
                      onClick={() => setEditedProfile({...editedProfile, profileColor: color})}
                      aria-label={`Select ${color} color`}
                    />
                  ))}
                </div>
              )}
            </div>
            
            {isEditingProfile ? (
              <>
                <Input 
                  value={editedProfile.name}
                  onChange={(e) => setEditedProfile({...editedProfile, name: e.target.value})}
                  className="text-xl font-bold mb-2 text-center"
                  placeholder="Creator Name"
                />
                <Input 
                  value={editedProfile.role}
                  onChange={(e) => setEditedProfile({...editedProfile, role: e.target.value})}
                  className="text-center mb-4"
                  placeholder="Role (e.g., Fitness Creator)"
                />
                <div className="flex gap-2 mb-4">
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => setIsEditingProfile(false)}
                  >
                    <X className="h-4 w-4 mr-1" /> Cancel
                  </Button>
                  <Button 
                    size="sm" 
                    variant="default"
                    onClick={async () => {
                      try {
                        // Check if we have changes to save
                        const hasChanges = editedProfile.name !== creator.name ||
                                         editedProfile.role !== creator.role ||
                                         editedProfile.bio !== creator.bio ||
                                         editedProfile.profileImageUrl !== creator.profileImageUrl ||
                                         editedProfile.profileColor !== creator.profileColor;
                        
                        if (!hasChanges) {
                          setIsEditingProfile(false);
                          return;
                        }
                        
                        // Save the profile to the backend
                        const response = await fetch(`/api/creators/${id}`, {
                          method: 'PATCH',
                          headers: {
                            'Content-Type': 'application/json',
                          },
                          body: JSON.stringify({
                            name: editedProfile.name,
                            role: editedProfile.role,
                            bio: editedProfile.bio,
                            profileImageUrl: editedProfile.profileImageUrl,
                            profileColor: editedProfile.profileColor,
                            brandVoice: editedProfile.brandVoice,
                          }),
                        });
                        
                        if (!response.ok) {
                          throw new Error(`Failed to update profile: ${response.status}`);
                        }
                        
                        // Invalidate the query to refresh the data
                        queryClient.invalidateQueries({ queryKey: [`/api/creators/${id}`] });
                        
                        // Turn off edit mode
                        setIsEditingProfile(false);
                        
                        toast({
                          title: "Profile updated",
                          description: "Your changes have been saved successfully.",
                        });
                      } catch (error) {
                        console.error("Error updating profile:", error);
                        toast({
                          title: "Error updating profile",
                          description: "There was a problem saving your changes.",
                          variant: "destructive",
                        });
                      }
                    }}
                  >
                    <Save className="h-4 w-4 mr-1" /> Save
                  </Button>
                </div>
              </>
            ) : (
              <>
                <h2 className="text-xl font-bold">{creator.name}</h2>
                <p className="text-muted-foreground mb-4">{creator.role}</p>
                <Button 
                  size="sm" 
                  variant="outline"
                  className="mb-4"
                  onClick={() => setIsEditingProfile(true)}
                >
                  <Pencil className="h-4 w-4 mr-1" /> Edit Profile
                </Button>
              </>
            )}
            
            {creator.socialLinks && (
              <div className="w-full">
                <h3 className="font-medium mb-2">Social Profiles</h3>
                {renderSocialLinks(creator.socialLinks)}
              </div>
            )}
            
            <Separator className="my-4" />
            
            <div className="w-full grid grid-cols-2 gap-4 text-center">
              <div>
                <h3 className="font-medium text-lg">{emailAccounts?.length || 0}</h3>
                <p className="text-xs text-muted-foreground">Email Accounts</p>
              </div>
              <div>
                <h3 className="font-medium text-lg">{campaigns?.length || 0}</h3>
                <p className="text-xs text-muted-foreground">Campaigns</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="lg:col-span-3">
          <Tabs defaultValue="about">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Creator Information</CardTitle>
                <TabsList>
                  <TabsTrigger value="about">About</TabsTrigger>
                  <TabsTrigger value="audience">Audience & Reach</TabsTrigger>
                  <TabsTrigger value="performance">Performance</TabsTrigger>
                  <TabsTrigger value="pricing">Pricing</TabsTrigger>
                  <TabsTrigger value="collaboration">Collaboration</TabsTrigger>
                </TabsList>
              </div>
              <CardDescription>
                Comprehensive information about {creator.name}'s profile, audience, and performance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TabsContent value="about" className="space-y-4">
                <div>
                  <h3 className="text-lg font-medium mb-2 flex items-center">
                    <Users className="mr-2 h-5 w-5" /> 
                    Bio
                  </h3>
                  <p>{creator.bio || "No bio available"}</p>
                </div>
                
                <div>
                  <h3 className="text-lg font-medium mb-2 flex items-center">
                    <Award className="mr-2 h-5 w-5" /> 
                    Expertise & Niche
                  </h3>
                  {renderJsonList(creator.expertiseAndNiche, "No expertise information available")}
                </div>
                
                <div>
                  <h3 className="text-lg font-medium mb-2 flex items-center">
                    <Mail className="mr-2 h-5 w-5" /> 
                    Brand Voice
                  </h3>
                  <p>{creator.brandVoice || "No brand voice information available"}</p>
                </div>
              </TabsContent>
              
              <TabsContent value="audience" className="space-y-4">
                <div>
                  <h3 className="text-lg font-medium mb-2 flex items-center">
                    <Users className="mr-2 h-5 w-5" /> 
                    Audience Demographics
                  </h3>
                  {creator.audienceData ? (
                    <div className="space-y-4">
                      {/* Age Demographics */}
                      {creator.audienceData.demographics?.ageRanges && (
                        <div className="mt-2">
                          <h4 className="text-sm font-medium mb-1">Age Breakdown</h4>
                          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                            {Object.entries(creator.audienceData.demographics.ageRanges).map(([range, percentage]) => (
                              <div key={range} className="bg-secondary/50 rounded-md p-2 text-center">
                                <div className="text-lg font-bold">{percentage}%</div>
                                <div className="text-xs text-muted-foreground">{range}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* Gender Split */}
                      {creator.audienceData.demographics?.genderSplit && (
                        <div className="mt-2">
                          <h4 className="text-sm font-medium mb-1">Gender Split</h4>
                          <div className="flex gap-2">
                            {Object.entries(creator.audienceData.demographics.genderSplit).map(([gender, percentage]) => (
                              <div key={gender} className="bg-secondary/50 rounded-md px-3 py-2 flex items-center gap-2">
                                <div className="h-3 w-3 rounded-full" style={{ 
                                  backgroundColor: gender.toLowerCase() === 'male' ? '#3b82f6' : 
                                                  gender.toLowerCase() === 'female' ? '#ec4899' : '#a855f7' 
                                }}></div>
                                <span className="capitalize font-medium">{gender}:</span>
                                <span>{percentage}%</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* Top Locations */}
                      {creator.audienceData.demographics?.topLocations && (
                        <div className="mt-2">
                          <h4 className="text-sm font-medium mb-1">Top Locations</h4>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                            {Object.entries(creator.audienceData.demographics.topLocations).map(([location, percentage]) => (
                              <div key={location} className="bg-secondary/50 rounded-md p-2 flex justify-between items-center">
                                <span>{location}</span>
                                <span className="font-medium">{percentage}%</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* Audience Interests */}
                      {creator.audienceData.interests && creator.audienceData.interests.length > 0 && (
                        <div className="mt-2">
                          <h4 className="text-sm font-medium mb-1">Audience Interests</h4>
                          <div className="flex flex-wrap gap-2">
                            {creator.audienceData.interests.map((interest, index) => (
                              <span key={index} className="bg-primary/10 text-primary px-3 py-1 rounded-full text-sm">
                                {interest}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No audience demographic data available</p>
                  )}
                </div>
                
                {/* Platform Stats */}
                <div>
                  <h3 className="text-lg font-medium mb-2 flex items-center">
                    <BarChart2 className="mr-2 h-5 w-5" /> 
                    Platform Performance
                  </h3>
                  {creator.platformStats ? (
                    <div className="space-y-4">
                      {/* Instagram Stats */}
                      {creator.platformStats.instagram && (
                        <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-100 rounded-lg p-4">
                          <h4 className="text-md font-semibold mb-2 flex items-center">
                            <span className="bg-gradient-to-r from-purple-600 to-pink-600 text-white p-1 rounded mr-2">
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
                            </span>
                            Instagram
                          </h4>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                            <div className="bg-white rounded p-2 text-center shadow-sm">
                              <div className="text-xl font-bold">{(creator.platformStats.instagram.followers / 1000).toFixed(1)}K</div>
                              <div className="text-xs text-muted-foreground">Followers</div>
                            </div>
                            <div className="bg-white rounded p-2 text-center shadow-sm">
                              <div className="text-xl font-bold">{creator.platformStats.instagram.engagement}%</div>
                              <div className="text-xs text-muted-foreground">Engagement Rate</div>
                            </div>
                            <div className="bg-white rounded p-2 text-center shadow-sm">
                              <div className="text-xl font-bold">{(creator.platformStats.instagram.averageLikes / 1000).toFixed(1)}K</div>
                              <div className="text-xs text-muted-foreground">Avg. Likes</div>
                            </div>
                            <div className="bg-white rounded p-2 text-center shadow-sm">
                              <div className="text-xl font-bold">{creator.platformStats.instagram.posts}</div>
                              <div className="text-xs text-muted-foreground">Posts</div>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {/* YouTube Stats */}
                      {creator.platformStats.youtube && (
                        <div className="bg-gradient-to-r from-red-50 to-orange-50 border border-red-100 rounded-lg p-4">
                          <h4 className="text-md font-semibold mb-2 flex items-center">
                            <span className="bg-gradient-to-r from-red-600 to-red-700 text-white p-1 rounded mr-2">
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z"></path><polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"></polygon></svg>
                            </span>
                            YouTube
                          </h4>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                            <div className="bg-white rounded p-2 text-center shadow-sm">
                              <div className="text-xl font-bold">{(creator.platformStats.youtube.subscribers / 1000000).toFixed(1)}M</div>
                              <div className="text-xs text-muted-foreground">Subscribers</div>
                            </div>
                            <div className="bg-white rounded p-2 text-center shadow-sm">
                              <div className="text-xl font-bold">{(creator.platformStats.youtube.views / 1000000).toFixed(1)}M</div>
                              <div className="text-xs text-muted-foreground">Views</div>
                            </div>
                            <div className="bg-white rounded p-2 text-center shadow-sm">
                              <div className="text-xl font-bold">{creator.platformStats.youtube.videos}</div>
                              <div className="text-xs text-muted-foreground">Videos</div>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {/* TikTok Stats */}
                      {creator.platformStats.tiktok && (
                        <div className="bg-gradient-to-r from-gray-50 to-blue-50 border border-blue-100 rounded-lg p-4">
                          <h4 className="text-md font-semibold mb-2 flex items-center">
                            <span className="bg-black text-white p-1 rounded mr-2">
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M16.6 5.82s.51.5 0 0A4.278 4.278 0 0 1 15.54 3h-3.09v12.4a2.592 2.592 0 0 1-2.59 2.5c-1.42 0-2.6-1.16-2.6-2.6 0-1.72 1.66-3.01 3.37-2.48V9.66c-3.45-.46-6.47 2.22-6.47 5.64 0 3.33 2.76 5.7 5.69 5.7 3.14 0 5.69-2.55 5.69-5.7V9.01a7.35 7.35 0 0 0 4.3 1.38V7.3s-1.88.09-3.24-1.48z"></path></svg>
                            </span>
                            TikTok
                          </h4>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                            <div className="bg-white rounded p-2 text-center shadow-sm">
                              <div className="text-xl font-bold">{(creator.platformStats.tiktok.followers / 1000).toFixed(1)}K</div>
                              <div className="text-xs text-muted-foreground">Followers</div>
                            </div>
                            <div className="bg-white rounded p-2 text-center shadow-sm">
                              <div className="text-xl font-bold">{(creator.platformStats.tiktok.likes / 1000000).toFixed(1)}M</div>
                              <div className="text-xs text-muted-foreground">Likes</div>
                            </div>
                            <div className="bg-white rounded p-2 text-center shadow-sm">
                              <div className="text-xl font-bold">{creator.platformStats.tiktok.videos}</div>
                              <div className="text-xs text-muted-foreground">Videos</div>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {/* Facebook Stats */}
                      {creator.platformStats.facebook && (
                        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-lg p-4">
                          <h4 className="text-md font-semibold mb-2 flex items-center">
                            <span className="bg-blue-600 text-white p-1 rounded mr-2">
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path></svg>
                            </span>
                            Facebook
                          </h4>
                          <div className="grid grid-cols-1 gap-2">
                            <div className="bg-white rounded p-2 text-center shadow-sm">
                              <div className="text-xl font-bold">{(creator.platformStats.facebook.followers / 1000).toFixed(1)}K</div>
                              <div className="text-xs text-muted-foreground">Followers</div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No platform performance data available</p>
                  )}
                </div>
              </TabsContent>
              
              <TabsContent value="performance" className="space-y-4">
                <div>
                  <h3 className="text-lg font-medium mb-2 flex items-center">
                    <BarChart2 className="mr-2 h-5 w-5" /> 
                    Content Performance
                  </h3>
                  {renderJsonList(creator.platformStats?.performance || {}, "No performance metrics available")}
                </div>
                
                <div>
                  <h3 className="text-lg font-medium mb-2 flex items-center">
                    <Calendar className="mr-2 h-5 w-5" /> 
                    Content Calendar
                  </h3>
                  <p className="text-muted-foreground">Content calendar information not available</p>
                </div>
              </TabsContent>
              
              <TabsContent value="pricing" className="space-y-4">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold flex items-center">
                    <DollarSign className="mr-2 h-5 w-5" />
                    Creator Pricing
                  </h2>
                  {isEditingPricing ? (
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => setIsEditingPricing(false)}
                      >
                        <X className="h-4 w-4 mr-1" /> Cancel
                      </Button>
                      <Button 
                        size="sm" 
                        variant="default"
                        onClick={() => {
                          // Here we would save to the backend
                          setIsEditingPricing(false);
                        }}
                      >
                        <Save className="h-4 w-4 mr-1" /> Save
                      </Button>
                    </div>
                  ) : (
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => setIsEditingPricing(true)}
                    >
                      <Pencil className="h-4 w-4 mr-1" /> Edit Pricing
                    </Button>
                  )}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* YouTube Pricing */}
                  <div className="bg-gradient-to-r from-red-50 to-red-100 rounded-lg p-6 border border-red-200">
                    <h3 className="text-lg font-semibold mb-4 flex items-center justify-between text-red-800">
                      <div className="flex items-center">
                        <span className="bg-gradient-to-r from-red-600 to-red-700 text-white p-1 rounded mr-2">
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z"></path><polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"></polygon></svg>
                        </span>
                        YouTube Rates
                      </div>
                      {isEditingPricing && (
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="h-7 w-7 p-0"
                          onClick={() => {
                            setIsAddingPackage(true);
                            setNewPackage({
                              platform: 'youtube',
                              service: '',
                              price: '',
                              details: [''],
                              color: 'red'
                            });
                          }}
                        >
                          <Plus className="h-4 w-4 text-red-600" />
                        </Button>
                      )}
                    </h3>
                    <div className="space-y-4">
                      {pricingPackages.youtube.map((pkg, index) => (
                        <div key={`youtube-${index}`} className="bg-white rounded-md p-4 shadow-sm">
                          {isEditingPricing ? (
                            <>
                              <div className="flex justify-between items-center mb-2">
                                <Input 
                                  value={pkg.service} 
                                  onChange={(e) => {
                                    const newPackages = {...pricingPackages};
                                    newPackages.youtube[index].service = e.target.value;
                                    setPricingPackages(newPackages);
                                  }}
                                  className="font-medium w-1/2"
                                />
                                <div className="flex items-center">
                                  <span className="text-lg font-bold text-red-600">$</span>
                                  <Input 
                                    value={pkg.price} 
                                    onChange={(e) => {
                                      const newPackages = {...pricingPackages};
                                      newPackages.youtube[index].price = parseFloat(e.target.value) || 0;
                                      setPricingPackages(newPackages);
                                    }}
                                    className="font-bold w-24 text-red-600"
                                    type="number"
                                  />
                                  <Button 
                                    size="sm" 
                                    variant="ghost" 
                                    className="h-7 w-7 p-0 ml-1 text-red-600"
                                    onClick={() => {
                                      const newPackages = {...pricingPackages};
                                      newPackages.youtube.splice(index, 1);
                                      setPricingPackages(newPackages);
                                    }}
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                              <div className="text-sm text-gray-600 space-y-1">
                                {pkg.details.map((detail, detailIndex) => (
                                  <div key={`youtube-${index}-${detailIndex}`} className="flex items-center">
                                    <span className="mr-2">•</span>
                                    <Input 
                                      value={detail} 
                                      onChange={(e) => {
                                        const newPackages = {...pricingPackages};
                                        newPackages.youtube[index].details[detailIndex] = e.target.value;
                                        setPricingPackages(newPackages);
                                      }}
                                      className="text-sm"
                                    />
                                    {detailIndex === pkg.details.length - 1 ? (
                                      <Button 
                                        size="sm" 
                                        variant="ghost" 
                                        className="h-7 w-7 p-0 ml-1"
                                        onClick={() => {
                                          const newPackages = {...pricingPackages};
                                          newPackages.youtube[index].details.push('');
                                          setPricingPackages(newPackages);
                                        }}
                                      >
                                        <Plus className="h-3 w-3" />
                                      </Button>
                                    ) : (
                                      <Button 
                                        size="sm" 
                                        variant="ghost" 
                                        className="h-7 w-7 p-0 ml-1"
                                        onClick={() => {
                                          const newPackages = {...pricingPackages};
                                          newPackages.youtube[index].details.splice(detailIndex, 1);
                                          setPricingPackages(newPackages);
                                        }}
                                      >
                                        <X className="h-3 w-3" />
                                      </Button>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="flex justify-between items-center mb-2">
                                <h4 className="font-medium">{pkg.service}</h4>
                                <span className="text-lg font-bold text-red-600">${pkg.price.toLocaleString()}</span>
                              </div>
                              <div className="text-sm text-gray-600 space-y-1">
                                {pkg.details.map((detail, detailIndex) => (
                                  <p key={`youtube-${index}-${detailIndex}`}>• {detail}</p>
                                ))}
                              </div>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* Instagram Pricing */}
                  <div className="bg-gradient-to-r from-purple-50 to-pink-100 rounded-lg p-6 border border-pink-200">
                    <h3 className="text-lg font-semibold mb-4 flex items-center text-pink-800">
                      <span className="bg-gradient-to-r from-purple-600 to-pink-600 text-white p-1 rounded mr-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
                      </span>
                      Instagram Rates
                    </h3>
                    <div className="space-y-4">
                      <div className="bg-white rounded-md p-4 shadow-sm">
                        <div className="flex justify-between items-center mb-2">
                          <h4 className="font-medium">Reel</h4>
                          <span className="text-lg font-bold text-pink-600">$12,000</span>
                        </div>
                        <div className="text-sm text-gray-600 space-y-1">
                          <p>• 30-60 second vertical video</p>
                          <p>• Dedicated content</p>
                          <p>• 30-day usage rights</p>
                          <p>• 1 round of revisions</p>
                        </div>
                      </div>
                      
                      <div className="bg-white rounded-md p-4 shadow-sm">
                        <div className="flex justify-between items-center mb-2">
                          <h4 className="font-medium">Post + Story</h4>
                          <span className="text-lg font-bold text-pink-600">$8,000</span>
                        </div>
                        <div className="text-sm text-gray-600 space-y-1">
                          <p>• 1 static post</p>
                          <p>• 3 story frames</p>
                          <p>• 30-day usage rights</p>
                          <p>• Brand provided assets</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* TikTok Pricing */}
                  <div className="bg-gradient-to-r from-gray-50 to-blue-100 rounded-lg p-6 border border-blue-200">
                    <h3 className="text-lg font-semibold mb-4 flex items-center text-gray-800">
                      <span className="bg-black text-white p-1 rounded mr-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M16.6 5.82s.51.5 0 0A4.278 4.278 0 0 1 15.54 3h-3.09v12.4a2.592 2.592 0 0 1-2.59 2.5c-1.42 0-2.6-1.16-2.6-2.6 0-1.72 1.66-3.01 3.37-2.48V9.66c-3.45-.46-6.47 2.22-6.47 5.64 0 3.33 2.76 5.7 5.69 5.7 3.14 0 5.69-2.55 5.69-5.7V9.01a7.35 7.35 0 0 0 4.3 1.38V7.3s-1.88.09-3.24-1.48z"></path></svg>
                      </span>
                      TikTok Rates
                    </h3>
                    <div className="space-y-4">
                      <div className="bg-white rounded-md p-4 shadow-sm">
                        <div className="flex justify-between items-center mb-2">
                          <h4 className="font-medium">Native Video</h4>
                          <span className="text-lg font-bold text-blue-600">$10,000</span>
                        </div>
                        <div className="text-sm text-gray-600 space-y-1">
                          <p>• 30-60 second trending style</p>
                          <p>• Full creative direction</p>
                          <p>• 30-day usage rights</p>
                          <p>• 1 round of revisions</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Add-On Options */}
                  <div className="bg-gradient-to-r from-green-50 to-emerald-100 rounded-lg p-6 border border-green-200">
                    <h3 className="text-lg font-semibold mb-4 flex items-center text-emerald-800">
                      <span className="bg-emerald-600 text-white p-1 rounded mr-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path><line x1="3" y1="6" x2="21" y2="6"></line><path d="M16 10a4 4 0 0 1-8 0"></path></svg>
                      </span>
                      Additional Options
                    </h3>
                    <div className="space-y-4">
                      <div className="bg-white rounded-md p-4 shadow-sm">
                        <div className="flex justify-between items-center mb-2">
                          <h4 className="font-medium">Extended Usage</h4>
                          <span className="text-lg font-bold text-emerald-600">+$5,000</span>
                        </div>
                        <div className="text-sm text-gray-600 space-y-1">
                          <p>• Extends usage to 90 days</p>
                          <p>• Additional platform rights</p>
                          <p>• Internal use permitted</p>
                        </div>
                      </div>
                      
                      <div className="bg-white rounded-md p-4 shadow-sm">
                        <div className="flex justify-between items-center mb-2">
                          <h4 className="font-medium">Exclusivity</h4>
                          <span className="text-lg font-bold text-emerald-600">+$8,000</span>
                        </div>
                        <div className="text-sm text-gray-600 space-y-1">
                          <p>• 30-day category exclusivity</p>
                          <p>• No competitive brands</p>
                          <p>• Prior approval on future sponsors</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="mt-6 bg-amber-50 p-4 rounded-md border border-amber-200">
                  <h3 className="text-lg font-medium mb-2">Custom Packages</h3>
                  <p className="text-sm text-gray-700">
                    Contact us for custom campaign packages, multi-video discounts, and long-term partnerships. We can tailor a solution to meet your specific marketing objectives and budget requirements.
                  </p>
                </div>
              </TabsContent>
              
              <TabsContent value="collaboration" className="space-y-4">
                <div>
                  <h3 className="text-lg font-medium mb-2 flex items-center">
                    <Briefcase className="mr-2 h-5 w-5" /> 
                    Past Collaborations
                  </h3>
                  {renderJsonList(creator.collaborationInfo?.pastCollaborations || {}, "No past collaboration data available")}
                </div>
                
                <div>
                  <h3 className="text-lg font-medium mb-2 flex items-center">
                    <Share2 className="mr-2 h-5 w-5" /> 
                    Collaboration Opportunities
                  </h3>
                  {renderJsonList(creator.collaborationInfo?.opportunities || {}, "No collaboration opportunities available")}
                </div>
              </TabsContent>
              
              {/* Add New Package Dialog */}
              <Dialog open={isAddingPackage} onOpenChange={setIsAddingPackage}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New Pricing Package</DialogTitle>
                    <DialogDescription>
                      Create a new pricing package for {newPackage.platform === 'youtube' ? 'YouTube' : 
                      newPackage.platform === 'instagram' ? 'Instagram' : 
                      newPackage.platform === 'tiktok' ? 'TikTok' : 
                      newPackage.platform === 'addons' ? 'Add-ons' : 'Custom Services'}.
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Service Name</label>
                      <Input 
                        value={newPackage.service}
                        onChange={(e) => setNewPackage({...newPackage, service: e.target.value})}
                        placeholder="e.g., Long Form Video"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Price (USD)</label>
                      <Input 
                        value={newPackage.price}
                        onChange={(e) => setNewPackage({...newPackage, price: e.target.value})}
                        type="number"
                        placeholder="e.g., 25000"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Details</label>
                      {newPackage.details.map((detail, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <Input 
                            value={detail}
                            onChange={(e) => {
                              const newDetails = [...newPackage.details];
                              newDetails[index] = e.target.value;
                              setNewPackage({...newPackage, details: newDetails});
                            }}
                            placeholder={`Detail ${index + 1}`}
                          />
                          {index === newPackage.details.length - 1 ? (
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              onClick={() => setNewPackage({
                                ...newPackage, 
                                details: [...newPackage.details, '']
                              })}
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          ) : (
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              onClick={() => {
                                const newDetails = [...newPackage.details];
                                newDetails.splice(index, 1);
                                setNewPackage({...newPackage, details: newDetails});
                              }}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsAddingPackage(false)}>
                      Cancel
                    </Button>
                    <Button
                      onClick={() => {
                        const newPackages = {...pricingPackages};
                        newPackages[newPackage.platform].push({
                          service: newPackage.service,
                          price: parseFloat(newPackage.price) || 0,
                          details: newPackage.details
                        });
                        setPricingPackages(newPackages);
                        setIsAddingPackage(false);
                      }}
                    >
                      Add Package
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Tabs>
        </Card>
      </div>
      
      {/* Proposals and Inventory */}
      <div className="mt-8 mb-4">
        <h2 className="text-2xl font-bold mb-4">Proposals and Inventory</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Active Proposals */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="mr-2 h-5 w-5" />
                Active Proposals
              </CardTitle>
              <CardDescription>
                Active partnership proposals featuring this creator
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">No active proposals for this creator</p>
            </CardContent>
          </Card>
          
          {/* Content Inventory */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Package className="mr-2 h-5 w-5" />
                Content Inventory
              </CardTitle>
              <CardDescription>
                Content pieces associated with this creator
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">No content inventory items for this creator</p>
            </CardContent>
          </Card>
        </div>
      </div>
      
      {/* Associated Resources */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Email Accounts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Mail className="mr-2 h-5 w-5" />
              Email Accounts
            </CardTitle>
            <CardDescription>
              Email accounts associated with this creator
            </CardDescription>
          </CardHeader>
          <CardContent>
            {emailAccounts && emailAccounts.length > 0 ? (
              <div className="space-y-2">
                {emailAccounts.map((account: any) => (
                  <div key={account.id} className="flex items-center justify-between p-3 rounded-md bg-secondary/50">
                    <div>
                      <p className="font-medium">{account.name}</p>
                      <p className="text-sm text-muted-foreground">{account.email}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        account.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {account.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">No email accounts associated with this creator</p>
            )}
          </CardContent>
        </Card>
        
        {/* Campaigns */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <BarChart2 className="mr-2 h-5 w-5" />
              Campaigns
            </CardTitle>
            <CardDescription>
              Campaigns associated with this creator
            </CardDescription>
          </CardHeader>
          <CardContent>
            {campaigns && campaigns.length > 0 ? (
              <div className="space-y-2">
                {campaigns.map((campaign: any) => (
                  <div key={campaign.id} className="flex items-center justify-between p-3 rounded-md bg-secondary/50">
                    <div>
                      <p className="font-medium">{campaign.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {campaign.objective} • {campaign.sequenceCount} emails
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        campaign.status === 'active' ? 'bg-green-100 text-green-800' : 
                        campaign.status === 'draft' ? 'bg-slate-100 text-slate-800' : 
                        'bg-amber-100 text-amber-800'
                      }`}>
                        {campaign.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">No campaigns associated with this creator</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}