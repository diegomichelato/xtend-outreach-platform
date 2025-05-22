import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

type Creator = {
  id: number;
  name: string;
  role: string;
  profileColor?: string;
  initials?: string;
};

type CreatorFit = {
  creatorId: number;
  fitExplanation: string;
};

type Props = {
  selectedCreatorIds: number[];
  onNext: (creatorFits: CreatorFit[]) => void;
  onBack: () => void;
};

export const CreatorFitStep = ({ selectedCreatorIds, onNext, onBack }: Props) => {
  const { data: creators } = useQuery<Creator[]>({
    queryKey: ['/api/creators'],
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Only keep creators that were selected in the previous step
  const selectedCreators = creators?.filter(creator => 
    selectedCreatorIds.includes(creator.id)
  ) || [];

  // Initialize state for creator fit explanations
  const [creatorFits, setCreatorFits] = useState<CreatorFit[]>(
    selectedCreators.map(creator => ({
      creatorId: creator.id,
      fitExplanation: generateSampleFitExplanation(creator)
    }))
  );

  // Generate a sample explanation based on creator info (for convenience)
  function generateSampleFitExplanation(creator: Creator): string {
    return `${creator.name} is a perfect fit for this campaign because their expertise in ${creator.role} closely aligns with the brand's target audience and marketing objectives.`;
  }

  // Handle explanation change for a specific creator
  const handleExplanationChange = (creatorId: number, explanation: string) => {
    setCreatorFits(prev => 
      prev.map(fit => 
        fit.creatorId === creatorId ? { ...fit, fitExplanation: explanation } : fit
      )
    );
  };

  // Proceed to the next step
  const handleNext = () => {
    onNext(creatorFits);
  };

  return (
    <div className="space-y-6">
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-2">Why These Creators Are a Good Fit</h2>
        <p className="text-muted-foreground">
          Explain why each selected creator is particularly suited for this proposal. These explanations
          will be included in the proposal to help the client understand your recommendations.
        </p>
      </div>

      <div className="space-y-6">
        {selectedCreators && selectedCreators.map((creator: Creator) => (
          <Card key={creator.id} className="transition-all hover:shadow-md">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10" style={{ backgroundColor: creator.profileColor || '#4F46E5' }}>
                  <AvatarFallback>{creator.initials || creator.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle className="text-lg">{creator.name}</CardTitle>
                  <CardDescription>{creator.role}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Why this creator is a good fit:
                </label>
                <Textarea
                  placeholder="Explain why this creator is well-suited for this proposal..."
                  className="min-h-[100px]"
                  value={
                    creatorFits.find(fit => fit.creatorId === creator.id)?.fitExplanation || ''
                  }
                  onChange={(e) => handleExplanationChange(creator.id, e.target.value)}
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex justify-between pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          className="gap-1"
        >
          <ChevronLeft className="h-4 w-4" />
          Back
        </Button>
        <Button 
          type="button" 
          onClick={handleNext}
          className="gap-1"
        >
          Continue
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};