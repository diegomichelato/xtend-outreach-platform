import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye, Calendar, ExternalLink, Copy, Trash } from "lucide-react";
import { ShareableLandingPage } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface LandingPageCardProps {
  page: ShareableLandingPage;
  onDelete?: (id: number) => void;
}

export function LandingPageCard({ page, onDelete }: LandingPageCardProps) {
  const { toast } = useToast();
  const [copying, setCopying] = useState(false);
  
  // Make sure we have the "share_" prefix if it's not already there
  const uniqueId = page.uniqueId.startsWith('share_') ? page.uniqueId : `share_${page.uniqueId}`;
  const publicUrl = `${window.location.origin}/share/${uniqueId}`;
  
  const copyToClipboard = async () => {
    try {
      setCopying(true);
      await navigator.clipboard.writeText(publicUrl);
      toast({
        title: "Link copied!",
        description: "The shareable link has been copied to your clipboard.",
      });
    } catch (error) {
      toast({
        title: "Failed to copy",
        description: "Could not copy the link to your clipboard.",
        variant: "destructive",
      });
    } finally {
      setCopying(false);
    }
  };

  const handleDelete = () => {
    if (onDelete) {
      onDelete(page.id);
    }
  };
  
  const getStatusBadge = () => {
    if (page.expiresAt && new Date(page.expiresAt) < new Date()) {
      return <Badge variant="destructive">Expired</Badge>;
    }
    
    switch (page.status) {
      case "active":
        return <Badge variant="success">Active</Badge>;
      case "draft":
        return <Badge variant="secondary">Draft</Badge>;
      default:
        return <Badge>{page.status}</Badge>;
    }
  };
  
  return (
    <Card className="w-full">
      <div className="flex flex-col md:flex-row md:items-center">
        <div className="flex-grow">
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle>{page.title}</CardTitle>
                <CardDescription>
                  Created {page.createdAt ? formatDistanceToNow(new Date(page.createdAt), { addSuffix: true }) : 'recently'}
                </CardDescription>
              </div>
              <div className="md:hidden">{getStatusBadge()}</div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Eye className="h-4 w-4" />
                <span>{page.viewCount} views</span>
              </div>
              
              {page.expiresAt && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>
                    {page.expiresAt && new Date(page.expiresAt) > new Date() 
                      ? `Expires ${formatDistanceToNow(new Date(page.expiresAt), { addSuffix: true })}`
                      : `Expired ${formatDistanceToNow(new Date(page.expiresAt || new Date()), { addSuffix: true })}`
                    }
                  </span>
                </div>
              )}
            </div>
            
            {page.description && (
              <p className="text-sm mt-2">{page.description}</p>
            )}
          </CardContent>
        </div>
        
        <div className="hidden md:flex items-center px-6">
          {getStatusBadge()}
        </div>
        
        <CardFooter className="md:w-auto flex justify-end gap-2 p-4 md:pr-6">
          <Button 
            variant="outline" 
            size="sm" 
            className="gap-2"
            onClick={copyToClipboard}
            disabled={copying}
          >
            <Copy className="h-4 w-4" />
            Copy Link
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            asChild
          >
            <a href={publicUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2">
              <ExternalLink className="h-4 w-4" />
              View
            </a>
          </Button>
          
          {onDelete && (
            <Button 
              variant="destructive" 
              size="sm"
              onClick={handleDelete}
            >
              <Trash className="h-4 w-4" />
              <span className="sr-only">Delete</span>
            </Button>
          )}
        </CardFooter>
      </div>
    </Card>
  );
}