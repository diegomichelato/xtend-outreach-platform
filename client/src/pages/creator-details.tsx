import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Creator } from "@shared/schema";
import { CreatorEmailAccount } from "@/components/email-accounts";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import { 
  H2,
  H4,
  Muted
} from "@/components/ui/typography";
import { Button } from "@/components/ui/button";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft, 
  Loader2, 
  AlertTriangle,
  Mail,
  Users,
  FileText,
  Settings,
  Handshake,
  Plus,
  Calendar,
  DollarSign,
  MoreVertical
} from "lucide-react";
import { getInitials } from "@/lib/utils";

export default function CreatorDetails() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("emails");
  
  const creatorId = parseInt(id);
  
  const { 
    data: creator, 
    isLoading, 
    isError 
  } = useQuery<Creator>({
    queryKey: [`/api/creators/${creatorId}`],
    enabled: !isNaN(creatorId),
  });
  
  useEffect(() => {
    if (isNaN(creatorId)) {
      setLocation("/creators");
    }
  }, [creatorId, setLocation]);
  
  const handleGoBack = () => {
    setLocation("/creators");
  };
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-200px)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  if (isError || !creator) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-200px)] space-y-4">
        <AlertTriangle className="h-12 w-12 text-destructive" />
        <h2 className="text-lg font-medium">Failed to load creator details</h2>
        <Button onClick={handleGoBack}>Back to Creators</Button>
      </div>
    );
  }
  
  const initials = creator.initials || getInitials(creator.name);
  
  return (
    <div className="space-y-6">
      <div className="flex items-center">
        <Button 
          variant="ghost" 
          onClick={handleGoBack}
          className="mr-2"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
      </div>
      
      <div className="flex items-center space-x-4">
        <div 
          className="h-16 w-16 rounded-full text-white flex items-center justify-center text-xl font-medium"
          style={{ backgroundColor: creator.profileColor || '#4F46E5' }}
        >
          {initials}
        </div>
        
        <div>
          <H2 className="mb-1">
            {creator.name}
          </H2>
          <Muted>
            {creator.role}
          </Muted>
        </div>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-5 w-full max-w-md">
          <TabsTrigger value="emails">
            <Mail className="h-4 w-4 mr-2" />
            Emails
          </TabsTrigger>
          <TabsTrigger value="campaigns">
            <FileText className="h-4 w-4 mr-2" />
            Campaigns
          </TabsTrigger>
          <TabsTrigger value="pricing">
            <DollarSign className="h-4 w-4 mr-2" />
            Pricing
          </TabsTrigger>
          <TabsTrigger value="contacts">
            <Users className="h-4 w-4 mr-2" />
            Contacts
          </TabsTrigger>
          <TabsTrigger value="settings">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="emails" className="space-y-6 mt-6">
          <CreatorEmailAccount 
            creatorId={creatorId}
            creatorName={creator.name}
          />
        </TabsContent>
        
        <TabsContent value="campaigns" className="mt-6">
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium mb-2">Campaigns</h3>
            <p>No campaigns found for this creator yet.</p>
          </div>
        </TabsContent>
        
        <TabsContent value="pricing" className="mt-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-xl font-bold">Creator Pricing</h3>
              <p className="text-muted-foreground">Content creation rates for {creator.name}</p>
            </div>
            <Button onClick={() => window.document.getElementById('add-pricing-dialog')?.showModal()}>
              <Plus className="h-4 w-4 mr-2" /> Add Pricing
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Long Form Content */}
            <Card className="overflow-hidden hover:shadow-md transition-shadow">
              <CardHeader className="pb-2 border-b">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg">Long Form Content</CardTitle>
                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">YouTube</Badge>
                </div>
              </CardHeader>
              
              <CardContent className="pt-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Base rate:</span>
                    <span className="font-semibold text-lg">$15,000</span>
                  </div>
                  
                  <div className="flex justify-between items-center text-sm">
                    <span className="font-medium">Usage rights:</span>
                    <span>1 year</span>
                  </div>
                  
                  <div className="flex justify-between items-center text-sm">
                    <span className="font-medium">Exclusivity fee:</span>
                    <span>+$5,000</span>
                  </div>
                  
                  <div className="flex justify-between items-center text-sm">
                    <span className="font-medium">Revisions:</span>
                    <span>2 included</span>
                  </div>
                </div>
                
                <div className="mt-4 pt-3 border-t">
                  <h4 className="text-sm font-medium mb-2">Notes</h4>
                  <p className="text-sm text-muted-foreground">
                    10-15 minute videos with full production quality. Dedicated sponsorship segment (90-120 seconds).
                  </p>
                </div>
              </CardContent>
            </Card>
            
            {/* Short Form Content */}
            <Card className="overflow-hidden hover:shadow-md transition-shadow">
              <CardHeader className="pb-2 border-b">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg">Short Form Content</CardTitle>
                  <Badge variant="outline" className="bg-pink-50 text-pink-700 border-pink-200">TikTok</Badge>
                </div>
              </CardHeader>
              
              <CardContent className="pt-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Base rate:</span>
                    <span className="font-semibold text-lg">$5,000</span>
                  </div>
                  
                  <div className="flex justify-between items-center text-sm">
                    <span className="font-medium">Usage rights:</span>
                    <span>6 months</span>
                  </div>
                  
                  <div className="flex justify-between items-center text-sm">
                    <span className="font-medium">Exclusivity fee:</span>
                    <span>+$2,500</span>
                  </div>
                  
                  <div className="flex justify-between items-center text-sm">
                    <span className="font-medium">Revisions:</span>
                    <span>1 included</span>
                  </div>
                </div>
                
                <div className="mt-4 pt-3 border-t">
                  <h4 className="text-sm font-medium mb-2">Notes</h4>
                  <p className="text-sm text-muted-foreground">
                    30-60 second native content format. Package includes 3 short-form videos.
                  </p>
                </div>
              </CardContent>
            </Card>
            
            {/* Instagram */}
            <Card className="overflow-hidden hover:shadow-md transition-shadow">
              <CardHeader className="pb-2 border-b">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg">Instagram</CardTitle>
                  <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">Social</Badge>
                </div>
              </CardHeader>
              
              <CardContent className="pt-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Base rate:</span>
                    <span className="font-semibold text-lg">$8,000</span>
                  </div>
                  
                  <div className="flex justify-between items-center text-sm">
                    <span className="font-medium">Usage rights:</span>
                    <span>3 months</span>
                  </div>
                  
                  <div className="flex justify-between items-center text-sm">
                    <span className="font-medium">Exclusivity fee:</span>
                    <span>+$3,000</span>
                  </div>
                  
                  <div className="flex justify-between items-center text-sm">
                    <span className="font-medium">Revisions:</span>
                    <span>2 included</span>
                  </div>
                </div>
                
                <div className="mt-4 pt-3 border-t">
                  <h4 className="text-sm font-medium mb-2">Notes</h4>
                  <p className="text-sm text-muted-foreground">
                    Package includes 1 feed post and 2 stories. Additional story slides available at $1,000 each.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Add Pricing Dialog */}
          <dialog id="add-pricing-dialog" className="p-0 rounded-lg shadow-lg backdrop:bg-black/50 w-full max-w-md">
            <div className="px-6 pt-6 pb-2">
              <h3 className="text-xl font-bold mb-1">Add Pricing Package</h3>
              <p className="text-muted-foreground mb-4">Add pricing options for {creator.name}</p>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Content Type</label>
                  <select className="w-full p-2 border rounded-md">
                    <option>Long Form</option>
                    <option>Short Form</option>
                    <option>Instagram</option>
                    <option>TikTok</option>
                    <option>Other</option>
                  </select>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Base Rate</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">$</span>
                    <input type="text" className="w-full p-2 pl-7 border rounded-md" placeholder="0.00" />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Usage Rights Duration</label>
                  <select className="w-full p-2 border rounded-md">
                    <option>3 months</option>
                    <option>6 months</option>
                    <option>1 year</option>
                    <option>2 years</option>
                    <option>Perpetual</option>
                  </select>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Exclusivity Fee</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">$</span>
                    <input type="text" className="w-full p-2 pl-7 border rounded-md" placeholder="0.00" />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Included Revisions</label>
                  <input type="number" className="w-full p-2 border rounded-md" min="0" defaultValue="1" />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Notes</label>
                  <textarea className="w-full p-2 border rounded-md" rows={3} placeholder="Additional details about this pricing..."></textarea>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end gap-2 p-4 bg-muted/20 mt-4">
              <Button variant="outline" onClick={() => window.document.getElementById('add-pricing-dialog')?.close()}>
                Cancel
              </Button>
              <Button>
                Save Pricing
              </Button>
            </div>
          </dialog>
        </TabsContent>
        
        <TabsContent value="contacts" className="mt-6">
          <div className="text-center py-8 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium mb-2">Contacts</h3>
            <p>No contacts assigned to this creator yet.</p>
          </div>
        </TabsContent>
        
        <TabsContent value="settings" className="mt-6">
          <div className="text-center py-8 text-muted-foreground">
            <Settings className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium mb-2">Settings</h3>
            <p>Creator settings will be available soon.</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}