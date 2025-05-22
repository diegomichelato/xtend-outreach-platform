import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";

// Campaign edit schema
const campaignEditSchema = z.object({
  name: z.string().min(1, "Campaign name is required"),
  objective: z.string().min(1, "Objective is required"),
  tone: z.string().min(1, "Tone is required"),
  sequenceCount: z.coerce.number().int().min(1, "Must have at least 1 email").max(5, "Maximum 5 emails in sequence"),
  interval: z.coerce.number().int().min(1, "Interval must be at least 1 day").max(14, "Interval cannot exceed 14 days"),
});

type CampaignEditFormValues = z.infer<typeof campaignEditSchema>;

interface CampaignEditDialogProps {
  campaign?: {
    id: number;
    name: string;
    objective: string;
    tone: string;
    sequenceCount: number;
    interval: number;
    [key: string]: any;
  };
  isOpen: boolean;
  onClose: () => void;
}

export function CampaignEditDialog({ campaign, isOpen, onClose }: CampaignEditDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Initialize the form with campaign data or defaults
  const form = useForm<CampaignEditFormValues>({
    resolver: zodResolver(campaignEditSchema),
    defaultValues: campaign ? {
      name: campaign.name,
      objective: campaign.objective,
      tone: campaign.tone,
      sequenceCount: campaign.sequenceCount,
      interval: campaign.interval,
    } : {
      name: "",
      objective: "",
      tone: "Professional",
      sequenceCount: 3,
      interval: 3,
    }
  });

  // Update campaign mutation
  const { mutate: updateCampaign, isPending } = useMutation({
    mutationFn: async (data: CampaignEditFormValues) => {
      if (!campaign) return null;
      return apiRequest("PATCH", `/api/campaigns/${campaign.id}`, data);
    },
    onSuccess: () => {
      // Invalidate relevant queries to trigger a refetch
      queryClient.invalidateQueries({ queryKey: ['/api/campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['/api/campaigns/recent'] });
      
      toast({
        title: "Campaign updated",
        description: "Campaign has been updated successfully.",
      });
      
      onClose();
    },
    onError: (error) => {
      console.error("Failed to update campaign:", error);
      toast({
        title: "Failed to update campaign",
        description: "There was an error updating the campaign. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Form submission handler
  function onSubmit(data: CampaignEditFormValues) {
    updateCampaign(data);
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>Edit Campaign</DialogTitle>
          <DialogDescription>
            Update the details for your email outreach campaign.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Campaign Name</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="objective"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Campaign Objective</FormLabel>
                  <FormControl>
                    <Textarea {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="tone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tone</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a tone" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Professional">Professional</SelectItem>
                      <SelectItem value="Friendly">Friendly</SelectItem>
                      <SelectItem value="Persuasive">Persuasive</SelectItem>
                      <SelectItem value="Casual">Casual</SelectItem>
                      <SelectItem value="Formal">Formal</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="sequenceCount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Number of Emails</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min={1} 
                        max={5} 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="interval"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Days Between Emails</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min={1} 
                        max={14} 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={onClose} 
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}