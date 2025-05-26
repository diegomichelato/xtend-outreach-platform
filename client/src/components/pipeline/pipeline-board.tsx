import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Plus, MoreHorizontal, DollarSign, Calendar, Users } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface PipelineStage {
  id: string;
  name: string;
  color: string;
  cards: PipelineCard[];
}

interface PipelineCard {
  id: string;
  companyName: string;
  contactName: string;
  value: number;
  probability: number;
  expectedCloseDate: string;
  lastActivity: string;
  assignee: string;
  tags: string[];
}

const stages: PipelineStage[] = [
  { id: "lead", name: "Lead", color: "bg-gray-500", cards: [] },
  { id: "contact", name: "Contact Made", color: "bg-blue-500", cards: [] },
  { id: "proposal", name: "Proposal Sent", color: "bg-yellow-500", cards: [] },
  { id: "negotiation", name: "Negotiation", color: "bg-orange-500", cards: [] },
  { id: "closed", name: "Closed Won", color: "bg-green-500", cards: [] },
];

export function PipelineBoard() {
  const queryClient = useQueryClient();
  
  const { data: pipelineData, isLoading } = useQuery({
    queryKey: ["pipeline-data"],
    queryFn: async () => {
      const response = await fetch("/api/pipeline");
      return response.json();
    },
  });

  const updateCardStage = useMutation({
    mutationFn: async ({ cardId, sourceStage, destinationStage, index }: any) => {
      await fetch(`/api/pipeline/cards/${cardId}/move`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceStage, destinationStage, index }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pipeline-data"] });
    },
  });

  const handleDragEnd = (result: any) => {
    if (!result.destination) return;

    updateCardStage.mutate({
      cardId: result.draggableId,
      sourceStage: result.source.droppableId,
      destinationStage: result.destination.droppableId,
      index: result.destination.index,
    });
  };

  const renderCard = (card: PipelineCard, index: number) => (
    <Draggable key={card.id} draggableId={card.id} index={index}>
      {(provided) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className="mb-3"
        >
          <Card className="p-4 hover:shadow-lg transition-shadow">
            <div className="flex justify-between items-start mb-2">
              <h4 className="font-medium text-sm">{card.companyName}</h4>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>Edit Deal</DropdownMenuItem>
                  <DropdownMenuItem>View Details</DropdownMenuItem>
                  <DropdownMenuItem>Add Note</DropdownMenuItem>
                  <DropdownMenuItem>Schedule Meeting</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <p className="text-sm text-gray-500 mb-3">{card.contactName}</p>
            <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
              <DollarSign className="h-4 w-4" />
              <span>${card.value.toLocaleString()} • {card.probability}%</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
              <Calendar className="h-4 w-4" />
              <span>{new Date(card.expectedCloseDate).toLocaleDateString()}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Users className="h-4 w-4" />
              <span>{card.assignee}</span>
            </div>
            <div className="mt-3 flex flex-wrap gap-1">
              {card.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-600"
                >
                  {tag}
                </span>
              ))}
            </div>
          </Card>
        </div>
      )}
    </Draggable>
  );

  if (isLoading) {
    return <div>Loading pipeline...</div>;
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold">Sales Pipeline</h2>
          <p className="text-gray-600">Manage and track your deals</p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Deal
        </Button>
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-5 gap-4">
          {stages.map((stage) => (
            <div key={stage.id} className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${stage.color}`} />
                  <h3 className="font-medium">{stage.name}</h3>
                </div>
                <span className="text-sm text-gray-500">
                  {pipelineData?.[stage.id]?.length || 0}
                </span>
              </div>
              <Droppable droppableId={stage.id}>
                {(provided) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className="min-h-[500px]"
                  >
                    {pipelineData?.[stage.id]?.map((card: PipelineCard, index: number) =>
                      renderCard(card, index)
                    )}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          ))}
        </div>
      </DragDropContext>
    </div>
  );
} 