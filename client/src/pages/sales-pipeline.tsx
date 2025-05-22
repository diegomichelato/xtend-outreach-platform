import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, DollarSign, User, Building, FileEdit, Check, X, Plus, MoveHorizontal, ArrowRight, Globe, Mail, ExternalLink } from "lucide-react";
import { PipelineCardDialog } from "@/components/pipeline/pipeline-card-dialog";
import { toast } from "@/hooks/use-toast";
import { apiRequest } from '@/lib/queryClient';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Pipeline card type
interface PipelineCard {
  id: number;
  companyName: string;
  contactName?: string;
  contactEmail?: string;
  description?: string;
  value?: number;
  currentStage: string;
  vertical: string;
  creatorName?: string;
  followUpDate?: string;
  notes?: string;
}

// Pipeline stage type
interface PipelineStage {
  id: string;
  name: string;
}

export default function SalesPipeline() {
  const queryClient = useQueryClient();
  const [isAddCardDialogOpen, setIsAddCardDialogOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<PipelineCard | null>(null);
  const [activeVertical, setActiveVertical] = useState<string>("brands");
  
  // Fetch pipeline cards
  const { data: pipelineCards = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['/api/pipeline/cards'],
    select: (data: PipelineCard[]) => data.sort((a, b) => {
      // Sort by date (newest first) or fallback to id
      return a.id > b.id ? -1 : 1;
    }),
  });

  // Fetch pipeline stages
  const { data: pipelineStages = [] } = useQuery({
    queryKey: ['/api/pipeline-stages'],
    select: (data: PipelineStage[]) => data,
  });

  // Mutation for updating card stage
  const updateCardStageMutation = useMutation({
    mutationFn: async ({ cardId, newStageId }: { cardId: number, newStageId: string }) => {
      return apiRequest(
        'PATCH',
        `/api/pipeline/cards/${cardId}/stage`, 
        { stageId: newStageId }
      );
    },
    onSuccess: (data, variables) => {
      const card = pipelineCards.find(c => c.id === variables.cardId);
      if (card) {
        const previousStage = pipelineStages.find(s => s.id === card.currentStage)?.name;
        
        // Log stage change to AI CRM Agent
        logStageChangeMutation.mutate({
          cardId: variables.cardId,
          newStageId: variables.newStageId,
          cardInfo: card,
          previousStage
        });
      }
      
      // Update local cache
      queryClient.invalidateQueries({ queryKey: ['/api/pipeline/cards'] });
      
      toast({
        title: "Card moved",
        description: `Card successfully moved to ${pipelineStages.find(s => s.id === variables.newStageId)?.name}.`,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update card stage. Please try again.",
        variant: "destructive"
      });
    }
  });
  
  // Log stage change to AI CRM Agent
  const logStageChangeMutation = useMutation({
    mutationFn: async ({ 
      cardId, newStageId, cardInfo, previousStage 
    }: { 
      cardId: number, 
      newStageId: string, 
      cardInfo: PipelineCard,
      previousStage?: string
    }) => {
      return apiRequest(
        'POST',
        '/api/ai/log-pipeline-change', 
        {
          cardId,
          companyName: cardInfo.companyName,
          contactName: cardInfo.contactName,
          contactEmail: cardInfo.contactEmail,
          previousStage,
          newStage: pipelineStages.find(s => s.id === newStageId)?.name || newStageId,
          vertical: cardInfo.vertical,
          notes: `Card moved from ${previousStage || 'unknown'} to ${pipelineStages.find(s => s.id === newStageId)?.name || newStageId}`,
          timestamp: new Date().toISOString()
        }
      );
    },
    onError: (error) => {
      console.error("Failed to log pipeline change:", error);
      // We don't show an error toast here since this is a background operation
    }
  });

  // Filter cards by vertical and stage
  const cardsByStage = pipelineStages.reduce((acc: Record<string, PipelineCard[]>, stage) => {
    acc[stage.id] = pipelineCards.filter(card => 
      card.currentStage === stage.id && 
      card.vertical.toLowerCase() === activeVertical.toLowerCase()
    );
    return acc;
  }, {});
  
  const handleMoveCard = (cardId: number, targetStageId: string) => {
    const card = pipelineCards.find(card => card.id === cardId);
    if (card && card.currentStage !== targetStageId) {
      updateCardStageMutation.mutate({ cardId, newStageId: targetStageId });
    }
  };

  const handleEditCard = (card: PipelineCard) => {
    setEditingCard(card);
    setIsAddCardDialogOpen(true);
  };

  const handleOnDialogClose = () => {
    refetch();
    setIsAddCardDialogOpen(false);
    setEditingCard(null);
  };

  const PipelineCardItem = ({ card }: { card: PipelineCard }) => {
    // Find matching contact data
    const { data: contacts = [] } = useQuery<any[]>({
      queryKey: ['/api/contacts'],
      enabled: false,
    });
    
    const contactData = contacts.find(contact => 
      contact.email === card.contactEmail || 
      (contact.firstName && card.contactName?.includes(contact.firstName))
    );
    
    return (
      <Card className="mb-3 shadow-sm hover:shadow-md transition-shadow duration-200 border-t-2 border-t-slate-200">
        <CardHeader className="p-4 pb-2">
          <div className="flex justify-between items-start">
            <CardTitle className="text-lg font-bold text-slate-800">{card.companyName}</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => handleEditCard(card)} className="h-7 w-7 p-0">
              <FileEdit className="h-4 w-4" />
            </Button>
          </div>
          <CardDescription className="line-clamp-2 mt-1 text-sm text-slate-500">
            {card.description || "No description provided"}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 pt-0 pb-2">
          {card.contactName && (
            <div className="flex items-center gap-2 text-sm mb-1.5">
              <User className="h-3.5 w-3.5 text-gray-400" />
              <span className="font-medium">{card.contactName}</span>
            </div>
          )}
          {card.value && (
            <div className="flex items-center gap-2 text-sm mb-1.5">
              <DollarSign className="h-3.5 w-3.5 text-emerald-500" />
              <span className="font-medium">${card.value.toLocaleString()}</span>
            </div>
          )}
          {card.creatorName && (
            <div className="flex items-center gap-2 text-sm mb-1.5">
              <Building className="h-3.5 w-3.5 text-indigo-500" />
              <span className="font-medium">{card.creatorName}</span>
            </div>
          )}
        </CardContent>
        <CardFooter className="p-4 pt-2">
          <div className="flex flex-wrap gap-2 w-full">
            {contactData?.email && (
              <Button variant="outline" size="sm" className="h-6 w-6 p-0 border border-slate-200" 
                onClick={() => window.open(`mailto:${contactData.email}`, '_blank')}>
                <span className="text-xs font-normal">✉</span>
              </Button>
            )}
            
            {contactData?.website && (
              <Button variant="outline" size="sm" className="h-6 w-6 p-0 border border-slate-200"
                onClick={() => window.open(contactData.website.startsWith('http') ? contactData.website : `https://${contactData.website}`, '_blank')}>
                <span className="text-xs font-normal">🌐</span>
              </Button>
            )}
            
            {contactData?.linkedin && (
              <Button variant="outline" size="sm" className="h-6 w-6 p-0 border border-slate-200"
                onClick={() => window.open(contactData.linkedin, '_blank')}>
                <span className="text-sm text-blue-600 font-semibold">in</span>
              </Button>
            )}
            
            {(!contactData?.email && !contactData?.website && !contactData?.linkedin) && (
              <Badge 
                variant={card.vertical === "brands" ? "default" : card.vertical === "agencies" ? "secondary" : "outline"}
                className="capitalize font-normal text-xs px-2 py-0 h-5"
              >
                {card.vertical}
              </Badge>
            )}
            
            {card.notes && (
              <span className="text-xs text-gray-500 flex items-center ml-auto">
                <Clock className="h-3 w-3 mr-1" />
                Has notes
              </span>
            )}
          </div>
        </CardFooter>
      </Card>
    );
  };

  const StageColumn = ({ stage, cards }: { stage: PipelineStage, cards: PipelineCard[] }) => {
    return (
      <div className="flex flex-col min-w-[280px] rounded-none">
        <div className="flex justify-between items-center mb-3 mx-1">
          <h3 className="font-medium text-sm">{stage.name}</h3>
          <Badge variant="outline" className="text-xs font-normal rounded-full h-5 w-5 flex items-center justify-center p-0">{cards.length}</Badge>
        </div>
        <div className="flex-1 overflow-y-auto min-h-[200px]">
          {cards.map(card => (
            <div key={card.id}>
              <PipelineCardItem card={card} />
            </div>
          ))}
          {cards.length === 0 && (
            <div className="text-center py-8 px-4 text-gray-400 text-sm border border-dashed border-gray-200 rounded-md bg-white mx-1">
              No cards in this stage
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Sales Pipeline</h1>
        <Button variant="default" onClick={() => {
          setEditingCard(null);
          setIsAddCardDialogOpen(true);
        }}>
          <Plus className="mr-2 h-4 w-4" />
          Add Card
        </Button>
      </div>
      
      <Tabs defaultValue="brands" className="mb-8" onValueChange={setActiveVertical}>
        <TabsList>
          <TabsTrigger value="brands">Brands</TabsTrigger>
          <TabsTrigger value="agencies">Agencies</TabsTrigger>
          <TabsTrigger value="partners">Partners</TabsTrigger>
        </TabsList>
      </Tabs>

      {isLoading ? (
        <div className="flex justify-center items-center py-12">
          <div className="text-center">
            <h3 className="text-lg mb-2">Loading pipeline...</h3>
            <p className="text-gray-500">Please wait while we fetch your pipeline data.</p>
          </div>
        </div>
      ) : isError ? (
        <div className="flex justify-center items-center py-12">
          <div className="text-center">
            <h3 className="text-lg mb-2 text-red-500">Error loading pipeline</h3>
            <p className="text-gray-500">There was an error loading your pipeline. Please try again.</p>
            <Button onClick={() => refetch()} variant="outline" className="mt-4">
              Retry
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex space-x-4 overflow-x-auto pb-6">
          {pipelineStages.map(stage => (
            <div key={stage.id} className="border-t border-slate-200 bg-gray-50/50 first:border-l last:border-r border-b">
              <StageColumn stage={stage} cards={cardsByStage[stage.id] || []} />
            </div>
          ))}
        </div>
      )}

      <PipelineCardDialog
        open={isAddCardDialogOpen}
        onOpenChange={setIsAddCardDialogOpen}
        existingCard={editingCard}
        onSave={handleOnDialogClose}
      />
    </div>
  );
}