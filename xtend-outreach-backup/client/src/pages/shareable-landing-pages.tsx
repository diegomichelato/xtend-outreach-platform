import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Share, Plus, Search, RefreshCw, AlertCircle } from "lucide-react";
import { useState } from "react";
import { CreateLandingPageModal } from "@/components/shareable-landing-page/create-landing-page-modal";
import { LandingPageCard } from "@/components/shareable-landing-page/landing-page-card";
import { ShareableLandingPage } from "@shared/schema";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function ShareableLandingPagesPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [pageToDelete, setPageToDelete] = useState<number | null>(null);
  
  const { data: pages = [], isLoading, isError, refetch } = useQuery<ShareableLandingPage[]>({
    queryKey: ["/api/shareable-landing-pages"],
  });
  
  const deletePageMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/shareable-landing-pages/${id}`),
    onSuccess: () => {
      toast({
        title: "Page deleted",
        description: "The shareable landing page has been deleted.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/shareable-landing-pages"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete the landing page. Please try again.",
        variant: "destructive",
      });
    },
  });
  
  const handleDeletePage = (id: number) => {
    setPageToDelete(id);
    setDeleteDialogOpen(true);
  };
  
  const confirmDelete = () => {
    if (pageToDelete !== null) {
      deletePageMutation.mutate(pageToDelete);
    }
    setDeleteDialogOpen(false);
    setPageToDelete(null);
  };
  
  const cancelDelete = () => {
    setDeleteDialogOpen(false);
    setPageToDelete(null);
  };
  
  const filteredPages = pages.filter(page => 
    page.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (page.description && page.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );
  
  const activePages = filteredPages.filter(page => 
    page.status === "active" && 
    (!page.expiresAt || new Date(page.expiresAt) > new Date())
  );
  
  const draftPages = filteredPages.filter(page => page.status === "draft");
  
  const expiredPages = filteredPages.filter(page => 
    page.expiresAt && new Date(page.expiresAt) < new Date()
  );
  
  return (
    <div className="container mx-auto py-6 max-w-7xl">
      <PageHeader
        heading="Shareable Landing Pages"
        text="Create and manage shareable landing pages for your creator projects."
      >
        <CreateLandingPageModal 
          trigger={
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              New Landing Page
            </Button>
          }
        />
      </PageHeader>
      
      <div className="my-6 flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search landing pages..." 
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Button 
          variant="outline" 
          size="icon" 
          onClick={() => refetch()}
          disabled={isLoading}
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          <span className="sr-only">Refresh</span>
        </Button>
      </div>
      
      {isError ? (
        <div className="rounded-md bg-destructive/15 p-4 my-6">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-destructive" />
            <div className="text-destructive font-medium">
              There was an error loading the shareable landing pages.
            </div>
          </div>
        </div>
      ) : (
        <Tabs defaultValue="active" className="mt-6">
          <TabsList>
            <TabsTrigger value="active" className="flex gap-2">
              Active
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
                {activePages.length}
              </span>
            </TabsTrigger>
            <TabsTrigger value="drafts" className="flex gap-2">
              Drafts
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-muted text-[10px] text-muted-foreground">
                {draftPages.length}
              </span>
            </TabsTrigger>
            <TabsTrigger value="expired" className="flex gap-2">
              Expired
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-muted text-[10px] text-muted-foreground">
                {expiredPages.length}
              </span>
            </TabsTrigger>
            <TabsTrigger value="all">All</TabsTrigger>
          </TabsList>
          
          <TabsContent value="active" className="mt-6">
            {activePages.length > 0 ? (
              <div className="flex flex-wrap gap-6">
                {activePages.map(page => (
                  <div className="w-full" key={page.id}>
                    <LandingPageCard 
                      page={page} 
                      onDelete={handleDeletePage}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Share className="mx-auto h-12 w-12 text-muted-foreground opacity-50" />
                <h3 className="mt-4 text-lg font-medium">No active landing pages</h3>
                <p className="mt-2 text-muted-foreground">
                  Create a new landing page to share with your audience.
                </p>
                <CreateLandingPageModal 
                  trigger={
                    <Button className="mt-4">
                      Create Landing Page
                    </Button>
                  }
                />
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="drafts" className="mt-6">
            {draftPages.length > 0 ? (
              <div className="flex flex-wrap gap-6">
                {draftPages.map(page => (
                  <div className="w-full" key={page.id}>
                    <LandingPageCard 
                      page={page} 
                      onDelete={handleDeletePage}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Share className="mx-auto h-12 w-12 text-muted-foreground opacity-50" />
                <h3 className="mt-4 text-lg font-medium">No draft landing pages</h3>
                <p className="mt-2 text-muted-foreground">
                  Draft pages are not publicly accessible until activated.
                </p>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="expired" className="mt-6">
            {expiredPages.length > 0 ? (
              <div className="flex flex-wrap gap-6">
                {expiredPages.map(page => (
                  <div className="w-full" key={page.id}>
                    <LandingPageCard 
                      page={page} 
                      onDelete={handleDeletePage}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Share className="mx-auto h-12 w-12 text-muted-foreground opacity-50" />
                <h3 className="mt-4 text-lg font-medium">No expired landing pages</h3>
                <p className="mt-2 text-muted-foreground">
                  Expired pages are no longer accessible to the public.
                </p>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="all" className="mt-6">
            {filteredPages.length > 0 ? (
              <div className="flex flex-wrap gap-6">
                {filteredPages.map(page => (
                  <div className="w-full" key={page.id}>
                    <LandingPageCard 
                      page={page} 
                      onDelete={handleDeletePage}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Share className="mx-auto h-12 w-12 text-muted-foreground opacity-50" />
                <h3 className="mt-4 text-lg font-medium">No landing pages found</h3>
                <p className="mt-2 text-muted-foreground">
                  {searchQuery 
                    ? "No landing pages match your search query." 
                    : "Create your first landing page to get started."}
                </p>
                {!searchQuery && (
                  <CreateLandingPageModal 
                    trigger={
                      <Button className="mt-4">
                        Create Landing Page
                      </Button>
                    }
                  />
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}
      
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              landing page and remove it from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelDelete}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete} 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}