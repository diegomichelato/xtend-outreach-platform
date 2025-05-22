import { useQuery, useMutation } from "@tanstack/react-query";
import { Creator, InsertCreator } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

export function useCreators() {
  const [selectedCreatorId, setSelectedCreatorId] = useState<number | null>(null);
  const { toast } = useToast();
  
  // Query to fetch all creators
  const { 
    data: creators, 
    isLoading, 
    error 
  } = useQuery<Creator[]>({
    queryKey: ['/api/creators'],
  });
  
  // Get a specific creator if one is selected
  const selectedCreator = selectedCreatorId 
    ? creators?.find(c => c.id === selectedCreatorId) 
    : null;
  
  // Mutation to create a new creator
  const createCreatorMutation = useMutation({
    mutationFn: async (creatorData: InsertCreator) => {
      const response = await apiRequest("POST", "/api/creators", creatorData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/creators'] });
      toast({
        title: "Creator added",
        description: "The creator was successfully added.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add creator. Please try again.",
        variant: "destructive",
      });
    }
  });
  
  // Mutation to update an existing creator
  const updateCreatorMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<Creator> }) => {
      const response = await apiRequest("PATCH", `/api/creators/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/creators'] });
      toast({
        title: "Creator updated",
        description: "The creator was successfully updated.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update creator. Please try again.",
        variant: "destructive",
      });
    }
  });
  
  // Mutation to delete a creator
  const deleteCreatorMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/creators/${id}`, undefined);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/creators'] });
      toast({
        title: "Creator deleted",
        description: "The creator was successfully deleted.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete creator. Please try again.",
        variant: "destructive",
      });
    }
  });

  return {
    creators,
    isLoading,
    error,
    selectedCreator,
    setSelectedCreator: setSelectedCreatorId,
    createCreator: createCreatorMutation.mutate,
    isCreating: createCreatorMutation.isPending,
    updateCreator: updateCreatorMutation.mutate,
    isUpdating: updateCreatorMutation.isPending,
    deleteCreator: deleteCreatorMutation.mutate,
    isDeleting: deleteCreatorMutation.isPending,
  };
}
