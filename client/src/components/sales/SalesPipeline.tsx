import { useState } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import {
  DollarSign,
  Users,
  Calendar,
  MoreHorizontal,
  Plus,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Card } from "@/components/ui/card";
import { pipelineStages } from "@/config/pipeline-stages";
import { PipelineInsightsPanel } from "./PipelineInsightsPanel";
import { NewDealDialog } from "./NewDealDialog";
import { PipelineFilters } from "./PipelineFilters";

interface Deal {
  id: string;
  companyName: string;
  contactName: string;
  value: number;
  currency: string;
  stage: string;
  assignedTo: {
    id: string;
    name: string;
    avatar?: string;
  };
  probability: number;
  lastActivity?: {
    type: string;
    description: string;
    timestamp: string;
  };
  nextStep?: string;
}

export function SalesPipeline() {
  const [isNewDealOpen, setIsNewDealOpen] = useState(false);
  const [filters, setFilters] = useState({
    assignedTo: "",
    product: "",
    source: "",
    status: "",
  });
  const [sortBy, setSortBy] = useState<"value" | "date" | "probability">("value");

  const queryClient = useQueryClient();

  // Fetch pipeline data
  const { data: deals = [], isLoading } = useQuery<Deal[]>({
    queryKey: ["pipeline-deals", filters, sortBy],
    queryFn: async () => {
      const response = await fetch("/api/pipeline/deals");
      return response.json();
    },
  });

  // Update deal stage
  const updateDealStage = useMutation({
    mutationFn: async ({
      dealId,
      newStage,
      index,
    }: {
      dealId: string;
      newStage: string;
      index: number;
    }) => {
      await fetch(`/api/pipeline/deals/${dealId}/stage`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage: newStage, index }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pipeline-deals"] });
    },
  });

  // Handle drag end
  const onDragEnd = (result: any) => {
    if (!result.destination) return;

    const { draggableId, source, destination } = result;

    if (source.droppableId !== destination.droppableId) {
      updateDealStage.mutate({
        dealId: draggableId,
        newStage: destination.droppableId,
        index: destination.index,
      });
    }
  };

  // Group deals by stage
  const dealsByStage = pipelineStages.reduce((acc, stage) => {
    acc[stage.id] = deals.filter((deal) => deal.stage === stage.id);
    return acc;
  }, {} as Record<string, Deal[]>);

  if (isLoading) {
    return <div>Loading pipeline...</div>;
  }

  return (
    <div className="flex h-full gap-4">
      {/* Main Pipeline Board */}
      <div className="flex-1 overflow-hidden">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold">Sales Pipeline</h1>
          <div className="flex items-center gap-4">
            <PipelineFilters
              filters={filters}
              onFilterChange={setFilters}
              sortBy={sortBy}
              onSortChange={setSortBy}
            />
            <Button onClick={() => setIsNewDealOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Deal
            </Button>
          </div>
        </div>

        <DragDropContext onDragEnd={onDragEnd}>
          <div className="flex gap-4 overflow-x-auto pb-4">
            {pipelineStages.map((stage) => (
              <div
                key={stage.id}
                className="flex h-full w-80 flex-none flex-col rounded-lg bg-gray-50 p-4"
              >
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`h-3 w-3 rounded-full ${stage.color}`} />
                    <h3 className="font-medium">{stage.name}</h3>
                    <span className="text-sm text-gray-500">
                      {dealsByStage[stage.id]?.length || 0}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setIsNewDealOpen(true);
                      // TODO: Set initial stage
                    }}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                <Droppable droppableId={stage.id}>
                  {(provided) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className="flex flex-col gap-3 overflow-y-auto"
                    >
                      {dealsByStage[stage.id]?.map((deal, index) => (
                        <Draggable
                          key={deal.id}
                          draggableId={deal.id}
                          index={index}
                        >
                          {(provided) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                            >
                              <Card className="bg-white p-4 hover:shadow-md">
                                <div className="mb-2 flex items-start justify-between">
                                  <div>
                                    <h4 className="font-medium">
                                      {deal.companyName}
                                    </h4>
                                    <p className="text-sm text-gray-500">
                                      {deal.contactName}
                                    </p>
                                  </div>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 w-8 p-0"
                                      >
                                        <MoreHorizontal className="h-4 w-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem>Edit Deal</DropdownMenuItem>
                                      <DropdownMenuItem>View Details</DropdownMenuItem>
                                      <DropdownMenuItem>Add Note</DropdownMenuItem>
                                      <DropdownMenuItem>
                                        Schedule Meeting
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>

                                <div className="mb-3 flex items-center gap-2 text-sm text-gray-600">
                                  <DollarSign className="h-4 w-4" />
                                  <span>
                                    {deal.currency} {deal.value.toLocaleString()} •{" "}
                                    {deal.probability}%
                                  </span>
                                </div>

                                <div className="mb-2 flex items-center gap-2 text-sm text-gray-600">
                                  <Users className="h-4 w-4" />
                                  <span>{deal.assignedTo.name}</span>
                                </div>

                                {deal.lastActivity && (
                                  <div className="mb-2 flex items-center gap-2 text-sm text-gray-600">
                                    <Calendar className="h-4 w-4" />
                                    <span>
                                      {formatDistanceToNow(
                                        new Date(deal.lastActivity.timestamp),
                                        { addSuffix: true }
                                      )}
                                      : {deal.lastActivity.description}
                                    </span>
                                  </div>
                                )}

                                {deal.nextStep && (
                                  <div className="mt-3 flex items-center gap-2 text-sm text-blue-600">
                                    <ArrowRight className="h-4 w-4" />
                                    <span>{deal.nextStep}</span>
                                  </div>
                                )}
                              </Card>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            ))}
          </div>
        </DragDropContext>
      </div>

      {/* Insights Panel */}
      <PipelineInsightsPanel deals={deals} />

      {/* New Deal Dialog */}
      <NewDealDialog
        isOpen={isNewDealOpen}
        onClose={() => setIsNewDealOpen(false)}
      />
    </div>
  );
} 