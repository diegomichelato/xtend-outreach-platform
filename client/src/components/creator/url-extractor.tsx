import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, Globe, AlertCircle, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface UrlExtractorProps {
  onExtractedData: (data: ExtractedCreatorData) => void;
}

interface ExtractedCreatorData {
  name?: string;
  role?: string;
  bio?: string;
  profileImageUrl?: string;
  socialLinks?: {
    twitter?: string;
    instagram?: string;
    youtube?: string;
    tiktok?: string;
    linkedin?: string;
    website?: string;
    [key: string]: string | undefined;
  };
  platformStats?: {
    followers?: number;
    subscribers?: number;
    likes?: number;
    [key: string]: number | undefined;
  };
  metaData?: {
    [key: string]: string | undefined;
  };
}

export function UrlExtractor({ onExtractedData }: UrlExtractorProps) {
  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const { toast } = useToast();

  const handleExtract = async () => {
    // Reset states
    setIsLoading(true);
    setError(null);
    setSuccess(false);

    try {
      // Validate URL format
      if (!url || !url.trim()) {
        throw new Error("Please enter a valid URL");
      }

      // Call the API to extract creator data
      const response = await fetch("/api/creator-extraction/extract", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url: url.trim() }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to extract creator data");
      }

      const { data } = await response.json();
      
      // Set success and pass data to parent component
      setSuccess(true);
      onExtractedData(data);
      
      toast({
        title: "Creator data extracted",
        description: "Creator information successfully extracted from URL",
      });
    } catch (err) {
      console.error("Error extracting creator data:", err);
      setError(err instanceof Error ? err.message : "Failed to extract creator data");
      toast({
        title: "Extraction failed",
        description: err instanceof Error ? err.message : "Failed to extract creator data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="h-5 w-5" />
          Creator URL Extraction
        </CardTitle>
        <CardDescription>
          Enter a creator's profile URL to automatically extract their information
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2">
          <Input
            placeholder="https://www.instagram.com/creator or other social profile URL"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={isLoading}
            className="flex-1"
          />
          <Button 
            onClick={handleExtract} 
            disabled={isLoading || !url.trim()}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Extracting...
              </>
            ) : (
              "Extract Data"
            )}
          </Button>
        </div>

        {error && (
          <Alert variant="destructive" className="mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="mt-4 bg-green-50 text-green-700 border-green-200">
            <Check className="h-4 w-4" />
            <AlertTitle>Success</AlertTitle>
            <AlertDescription>Creator data successfully extracted!</AlertDescription>
          </Alert>
        )}
      </CardContent>
      <CardFooter className="text-xs text-muted-foreground">
        Supports Instagram, YouTube, TikTok, Twitter, LinkedIn and other profile URLs
      </CardFooter>
    </Card>
  );
}