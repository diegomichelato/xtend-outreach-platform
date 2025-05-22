import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Share } from "lucide-react";
import { useState } from "react";
import { CreateLandingPageForm } from "./create-landing-page-form";

interface CreateLandingPageModalProps {
  creatorId?: number;
  projectId?: string;
  title?: string;
  description?: string;
  trigger?: React.ReactNode;
}

export function CreateLandingPageModal({
  creatorId,
  projectId,
  title,
  description,
  trigger,
}: CreateLandingPageModalProps) {
  const [open, setOpen] = useState(false);

  const handleSuccess = () => {
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button 
            variant="outline" 
            className="gap-2" 
            size="sm"
          >
            <Share className="h-4 w-4" />
            Create Shareable Page
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Shareable Landing Page</DialogTitle>
          <DialogDescription>
            Generate a shareable landing page from the selected creator project.
          </DialogDescription>
        </DialogHeader>
        <CreateLandingPageForm
          creatorId={creatorId}
          projectId={projectId}
          title={title}
          description={description}
          onSuccess={handleSuccess}
        />
      </DialogContent>
    </Dialog>
  );
}