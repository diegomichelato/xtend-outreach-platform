import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Loader2,
  MoreVertical,
  Contact,
  Calendar,
  DollarSign,
  CheckCircle2,
  AlertCircle,
  Clock
} from "lucide-react";

// Mock data for initial UI development
const mockDeals = [
  {
    id: 1,
    title: "Creator Brand Partnership - Tech Series",
    company: "TechCorp Inc.",
    creator: "Patrick Israel",
    value: 25000,
    stage: "proposal",
    startDate: "2025-06-01",
    endDate: "2025-08-31",
    probability: 70,
    lastContacted: "2025-05-15",
    tags: ["Tech", "Series", "Video"],
    description: "A 3-month partnership featuring premium tech product reviews and demos"
  },
  {
    id: 2,
    title: "Sponsored Content Series",
    company: "Infinite App",
    creator: "Ana Zhang",
    value: 15000,
    stage: "negotiation",
    startDate: "2025-07-15",
    endDate: "2025-09-15",
    probability: 85,
    lastContacted: "2025-05-16",
    tags: ["App", "Software", "Tutorial"],
    description: "A series of in-depth tutorials showing how to use Infinite App's new features"
  },
  {
    id: 3,
    title: "Product Launch Campaign",
    company: "Found.com",
    creator: "Michael Smith",
    value: 35000,
    stage: "discovery",
    startDate: "2025-08-01",
    endDate: "2025-09-30",
    probability: 40,
    lastContacted: "2025-05-10",
    tags: ["Launch", "SaaS", "Marketing"],
    description: "Comprehensive marketing campaign for the launch of Found.com's new platform"
  },
  {
    id: 4,
    title: "Quarterly Brand Integration",
    company: "Tonic.ai",
    creator: "Sarah Johnson",
    value: 18000,
    stage: "closed_won",
    startDate: "2025-06-15",
    endDate: "2025-09-15",
    probability: 100,
    lastContacted: "2025-05-18",
    tags: ["AI", "Integration", "Content"],
    description: "Regular brand integrations in creator content over a 3-month period"
  },
  {
    id: 5,
    title: "Educational Workshop Series",
    company: "Northwood University",
    creator: "Patrick Israel",
    value: 12000,
    stage: "closed_lost",
    startDate: "2025-07-01",
    endDate: "2025-08-15",
    probability: 0,
    lastContacted: "2025-05-14",
    tags: ["Education", "Workshop", "Series"],
    description: "Workshop series focused on teaching students about digital marketing"
  }
];

export default function DealsPage() {
  const [activeTab, setActiveTab] = useState("all");
  const [isLoading, setIsLoading] = useState(false);
  const [isAddDealOpen, setIsAddDealOpen] = useState(false);

  // Filter deals based on active tab
  const getFilteredDeals = () => {
    if (activeTab === "all") return mockDeals;
    if (activeTab === "active") return mockDeals.filter(deal => !["closed_won", "closed_lost"].includes(deal.stage));
    if (activeTab === "won") return mockDeals.filter(deal => deal.stage === "closed_won");
    if (activeTab === "lost") return mockDeals.filter(deal => deal.stage === "closed_lost");
    return mockDeals;
  };

  const filteredDeals = getFilteredDeals();

  // Get stage badge
  const getStageBadge = (stage: string) => {
    switch (stage) {
      case "discovery":
        return <Badge variant="secondary" className="bg-purple-100 text-purple-800">Discovery</Badge>;
      case "proposal":
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800">Proposal</Badge>;
      case "negotiation":
        return <Badge variant="secondary" className="bg-amber-100 text-amber-800">Negotiation</Badge>;
      case "closed_won":
        return <Badge variant="secondary" className="bg-green-100 text-green-800">Won</Badge>;
      case "closed_lost":
        return <Badge variant="secondary" className="bg-red-100 text-red-800">Lost</Badge>;
      default:
        return <Badge variant="secondary">{stage}</Badge>;
    }
  };

  return (
    <div className="container py-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Deals</h1>
          <p className="mt-1 text-muted-foreground">
            Manage and track your brand partnership deals with creators
          </p>
        </div>
        
        <Dialog open={isAddDealOpen} onOpenChange={setIsAddDealOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center">
              <Plus className="mr-2 h-4 w-4" />
              Add Deal
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Create New Deal</DialogTitle>
              <DialogDescription>
                Enter the details of your new brand partnership deal
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <p className="text-center text-muted-foreground">
                Deal creation form will be implemented soon
              </p>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      
      {/* Stats Section */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Total Value</p>
                <h3 className="text-2xl font-bold">$105,000</h3>
              </div>
              <div className="w-10 h-10 bg-green-100 flex items-center justify-center rounded-full">
                <DollarSign className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Active Deals</p>
                <h3 className="text-2xl font-bold">3</h3>
              </div>
              <div className="w-10 h-10 bg-blue-100 flex items-center justify-center rounded-full">
                <Clock className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Won Deals</p>
                <h3 className="text-2xl font-bold">1</h3>
              </div>
              <div className="w-10 h-10 bg-green-100 flex items-center justify-center rounded-full">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Lost Deals</p>
                <h3 className="text-2xl font-bold">1</h3>
              </div>
              <div className="w-10 h-10 bg-red-100 flex items-center justify-center rounded-full">
                <AlertCircle className="h-5 w-5 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Tabs and Content */}
      <Tabs defaultValue="all" className="w-full" onValueChange={setActiveTab}>
        <div className="flex justify-between items-center mb-6">
          <TabsList>
            <TabsTrigger value="all">All Deals</TabsTrigger>
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="won">Won</TabsTrigger>
            <TabsTrigger value="lost">Lost</TabsTrigger>
          </TabsList>
          
          <div className="flex gap-2">
            {/* Additional filters can be added here */}
          </div>
        </div>
        
        <TabsContent value="all" className="space-y-4">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredDeals.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredDeals.map((deal) => (
                <Card key={deal.id} className="overflow-hidden hover:shadow-md transition-shadow">
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg truncate" title={deal.title}>
                        {deal.title}
                      </CardTitle>
                      {getStageBadge(deal.stage)}
                    </div>
                    <CardDescription className="flex items-center mt-1">
                      <Calendar className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
                      {new Date(deal.startDate).toLocaleDateString()} to {new Date(deal.endDate).toLocaleDateString()}
                    </CardDescription>
                  </CardHeader>
                  
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center text-sm">
                        <div className="w-5 h-5 mr-2 rounded-full bg-primary-50 flex items-center justify-center">
                          <span className="text-xs text-primary-600 font-medium">B</span>
                        </div>
                        <span className="font-medium">{deal.company}</span>
                      </div>
                      
                      <div className="flex items-center text-sm">
                        <div className="w-5 h-5 mr-2 rounded-full bg-violet-50 flex items-center justify-center">
                          <span className="text-xs text-violet-600 font-medium">C</span>
                        </div>
                        <span>{deal.creator}</span>
                      </div>
                      
                      <div className="flex items-center text-sm">
                        <DollarSign className="h-4 w-4 mr-2 text-green-600" />
                        <span className="font-medium">${deal.value.toLocaleString()}</span>
                        {deal.probability < 100 && (
                          <span className="ml-2 text-xs text-muted-foreground">
                            ({deal.probability}% probability)
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="mt-3 flex flex-wrap gap-1">
                      {deal.tags.map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                  
                  <CardFooter className="bg-muted/20 px-6 py-3 flex justify-between">
                    <Button variant="ghost" size="sm">View Details</Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem>Edit Deal</DropdownMenuItem>
                        <DropdownMenuItem>Change Stage</DropdownMenuItem>
                        <DropdownMenuItem>Contact Company</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-red-600">Delete Deal</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="border-dashed border-2 bg-background">
              <CardContent className="py-12 text-center">
                <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
                  <DollarSign className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium mb-2">No deals found</h3>
                <p className="text-muted-foreground max-w-sm mx-auto mb-6">
                  {activeTab === "all" 
                    ? "You haven't created any deals yet. Create your first deal to start tracking your brand partnerships."
                    : `No ${activeTab} deals found.`}
                </p>
                <Button onClick={() => setIsAddDealOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" /> Create Deal
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        {/* The other tab contents will show the same filtered content */}
        <TabsContent value="active" className="space-y-4">
          {/* Active deals content */}
          {/* Same structure as "all" tab but with filtered data */}
        </TabsContent>
        
        <TabsContent value="won" className="space-y-4">
          {/* Won deals content */}
          {/* Same structure as "all" tab but with filtered data */}
        </TabsContent>
        
        <TabsContent value="lost" className="space-y-4">
          {/* Lost deals content */}
          {/* Same structure as "all" tab but with filtered data */}
        </TabsContent>
      </Tabs>
    </div>
  );
}