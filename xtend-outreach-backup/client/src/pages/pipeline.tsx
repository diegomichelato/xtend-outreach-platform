import { useState } from "react";
import { PipelineBoard } from "@/components/pipeline/pipeline-board";
import { PipelineCardDialog } from "@/components/pipeline/pipeline-card-dialog";

export default function PipelinePage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editCard, setEditCard] = useState<any>(null);

  const handleAddCard = () => {
    setEditCard(null);
    setIsDialogOpen(true);
  };

  const handleEditCard = (card: any) => {
    setEditCard(card);
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditCard(null);
  };

  return (
    <div>
      <PipelineBoard onAddCard={handleAddCard} onEditCard={handleEditCard} />
      <PipelineCardDialog
        isOpen={isDialogOpen}
        onClose={handleCloseDialog}
        editCard={editCard}
      />
    </div>
  );
} 