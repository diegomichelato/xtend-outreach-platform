import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Users,
  Target,
  Package,
  BarChart3,
  UserCheck,
  Building,
  MapPin,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface CompanyProfilePreviewProps {
  data: any;
  className?: string;
}

export function CompanyProfilePreview({ data, className }: CompanyProfilePreviewProps) {
  if (!data) return null;

  // Extract partnership potential rating
  const partnershipRating = data.partnershipPotential || "Medium";
  
  // Determine rating color
  const getRatingColor = (rating: string) => {
    switch (rating.toLowerCase()) {
      case "high":
        return "bg-green-100 text-green-800";
      case "medium":
        return "bg-yellow-100 text-yellow-800";
      case "low":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };
  
  // Determine rating percentage for progress bar
  const getRatingPercentage = (rating: string) => {
    switch (rating.toLowerCase()) {
      case "high":
        return 95;
      case "medium":
        return 60;
      case "low":
        return 30;
      default:
        return 50;
    }
  };

  const ratingColor = getRatingColor(partnershipRating);
  const ratingPercentage = getRatingPercentage(partnershipRating);

  return (
    <div className={cn("space-y-6", className)}>
      {/* Company Profile Card */}
      <Card className="w-full">
        <CardHeader className="pb-2">
          <div className="flex justify-between items-start">
            <CardTitle className="text-lg">Company Profile</CardTitle>
            <Badge variant="outline" className="flex items-center">
              <Building className="h-3 w-3 mr-1" />
              {data.companyInfo?.size || "Medium"}
            </Badge>
          </div>
          <CardDescription>
            {data.companyInfo?.industry || "Technology"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 pt-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center text-sm">
              <Building className="h-4 w-4 mr-2 text-muted-foreground" />
              <span>{data.companyInfo?.name || "Company Name"}</span>
            </div>
            <div className="flex items-center text-sm">
              <MapPin className="h-4 w-4 mr-2 text-muted-foreground" />
              <span>{data.companyInfo?.location || "United States"}</span>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Business Insights Card */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Business Insights</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="text-sm font-medium flex items-center">
              <Target className="h-4 w-4 mr-2 text-muted-foreground" />
              Target Audience
            </h3>
            <p className="text-sm mt-1 ml-6">
              {data.targetAudience || "Not specified"}
            </p>
          </div>
          
          <div>
            <h3 className="text-sm font-medium flex items-center">
              <Package className="h-4 w-4 mr-2 text-muted-foreground" />
              Key Products & Services
            </h3>
            <p className="text-sm mt-1 ml-6">
              {data.keyProducts || "Not specified"}
            </p>
          </div>
          
          <div>
            <h3 className="text-sm font-medium flex items-center">
              <BarChart3 className="h-4 w-4 mr-2 text-muted-foreground" />
              Business Model
            </h3>
            <p className="text-sm mt-1 ml-6">
              {data.businessModel || "Not specified"}
            </p>
          </div>
        </CardContent>
      </Card>
      
      {/* Brand Deals History Card */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Brand Deals History</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="text-sm font-medium flex items-center">
              <Users className="h-4 w-4 mr-2 text-muted-foreground" />
              Previous Partnerships
            </h3>
            <div className="mt-2 space-y-2">
              {data.previousPartnerships ? (
                Array.isArray(data.previousPartnerships) ? (
                  data.previousPartnerships.map((partnership: any, index: number) => (
                    <div key={index} className="p-3 border rounded-md hover:border-primary/30 hover:bg-muted/20 transition-colors">
                      <div className="flex justify-between items-start">
                        <span className="font-medium">{partnership.creator || "Creator"}</span>
                        <Badge 
                          variant="outline" 
                          className={cn(
                            "text-xs",
                            partnership.platform?.toLowerCase().includes("youtube") ? "bg-red-50 text-red-700 border-red-200" :
                            partnership.platform?.toLowerCase().includes("tiktok") ? "bg-black text-white" :
                            partnership.platform?.toLowerCase().includes("instagram") ? "bg-purple-50 text-purple-700 border-purple-200" :
                            "bg-blue-50 text-blue-700 border-blue-200"
                          )}
                        >
                          {partnership.platform || "YouTube"}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{partnership.description || "Sponsored content"}</p>
                      <div className="flex justify-between items-center mt-2">
                        <p className="text-xs">
                          {partnership.date || "Recent"}
                          {partnership.metrics && (
                            <span className="ml-2 text-muted-foreground">
                              • {partnership.metrics}
                            </span>
                          )}
                        </p>
                        {partnership.link && (
                          <a 
                            href={partnership.link} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-xs px-3 py-1 bg-primary/10 text-primary rounded-full hover:bg-primary/20 hover:underline transition-colors"
                          >
                            View Content
                          </a>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm ml-6 text-muted-foreground">
                    {data.previousPartnerships}
                  </p>
                )
              ) : (
                <div className="p-3 bg-muted/30 rounded-md">
                  <p className="text-sm text-muted-foreground">
                    No previous partnerships found. This may present an opportunity to be their first creator partnership in this space.
                  </p>
                </div>
              )}
            </div>
          </div>
          
          <div>
            <h3 className="text-sm font-medium flex items-center">
              <BarChart3 className="h-4 w-4 mr-2 text-muted-foreground" />
              Partnership Trends
            </h3>
            <p className="text-sm mt-1 ml-6">
              {data.partnershipTrends || "No clear pattern of creator partnerships identified. Consider researching their marketing strategy in more detail."}
            </p>
          </div>
          
          <div>
            <h3 className="text-sm font-medium flex items-center">
              <TrendingUp className="h-4 w-4 mr-2 text-muted-foreground" />
              Platform Focus
            </h3>
            <div className="mt-2 flex flex-wrap gap-2">
              {data.platformFocus ? (
                Array.isArray(data.platformFocus) ? (
                  data.platformFocus.map((platform: string, index: number) => (
                    <Badge key={index} variant="outline">
                      {platform}
                    </Badge>
                  ))
                ) : (
                  <p className="text-sm ml-6 text-muted-foreground">{data.platformFocus}</p>
                )
              ) : (
                <>
                  <Badge variant="secondary">YouTube</Badge>
                  <Badge variant="outline">TikTok</Badge>
                  <Badge variant="outline">Instagram</Badge>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Partnership Potential Card */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Partnership Assessment</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="mb-2 flex justify-between items-center">
              <h3 className="text-sm font-medium">Partnership Potential</h3>
              <Badge variant="secondary" className={cn("font-medium", ratingColor)}>
                {partnershipRating}
              </Badge>
            </div>
            <Progress value={ratingPercentage} className="h-2" />
          </div>
          
          <div>
            <h3 className="text-sm font-medium flex items-center">
              <UserCheck className="h-4 w-4 mr-2 text-muted-foreground" />
              Creator Match
            </h3>
            <p className="text-sm mt-1 ml-6">
              {data.suggestedCreatorMatch || "Not specified"}
            </p>
          </div>
          
          <div>
            <h3 className="text-sm font-medium flex items-center">
              <TrendingUp className="h-4 w-4 mr-2 text-muted-foreground" />
              Recommended Approach
            </h3>
            <p className="text-sm mt-1 ml-6">
              {data.recommendedApproach || "Not specified"}
            </p>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between bg-muted/30 px-6 py-3">
          <div className="flex items-center text-sm">
            <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
            <span>Analysis Date: {new Date().toLocaleDateString()}</span>
          </div>
          
          <div className="flex">
            {partnershipRating.toLowerCase() === "high" ? (
              <Badge className="bg-green-100 text-green-800 flex items-center">
                <CheckCircle className="h-3 w-3 mr-1" />
                Recommended
              </Badge>
            ) : (
              <Badge variant="outline" className="flex items-center">
                <AlertCircle className="h-3 w-3 mr-1" />
                {partnershipRating === "Medium" ? "Consider" : "Caution"}
              </Badge>
            )}
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}