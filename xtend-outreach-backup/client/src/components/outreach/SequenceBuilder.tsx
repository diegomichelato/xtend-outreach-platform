import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Trash2,
  MoveUp,
  MoveDown,
  Calendar,
  Users,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Textarea } from "@/components/ui/textarea";

interface SequenceStep {
  id: string;
  subject: string;
  body: string;
  delay: number;
  delayUnit: "hours" | "days";
}

export function SequenceBuilder() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [sequenceName, setSequenceName] = useState("");
  const [steps, setSteps] = useState<SequenceStep[]>([
    {
      id: "1",
      subject: "",
      body: "",
      delay: 0,
      delayUnit: "days",
    },
  ]);

  const addStep = () => {
    setSteps([
      ...steps,
      {
        id: Date.now().toString(),
        subject: "",
        body: "",
        delay: 1,
        delayUnit: "days",
      },
    ]);
  };

  const removeStep = (id: string) => {
    if (steps.length === 1) return;
    setSteps(steps.filter((step) => step.id !== id));
  };

  const moveStep = (id: string, direction: "up" | "down") => {
    const index = steps.findIndex((step) => step.id === id);
    if (
      (direction === "up" && index === 0) ||
      (direction === "down" && index === steps.length - 1)
    )
      return;

    const newSteps = [...steps];
    const step = newSteps[index];
    newSteps[index] = newSteps[index + (direction === "up" ? -1 : 1)];
    newSteps[index + (direction === "up" ? -1 : 1)] = step;
    setSteps(newSteps);
  };

  const updateStep = (id: string, updates: Partial<SequenceStep>) => {
    setSteps(
      steps.map((step) =>
        step.id === id ? { ...step, ...updates } : step
      )
    );
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/outreach/sequences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: sequenceName,
          steps,
        }),
      });

      if (!response.ok) throw new Error("Failed to save sequence");

      toast({
        title: "Sequence Saved",
        description: "Your email sequence has been saved successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save sequence. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="sequence-name">Sequence Name</Label>
              <Input
                id="sequence-name"
                value={sequenceName}
                onChange={(e) => setSequenceName(e.target.value)}
                placeholder="Enter sequence name"
              />
            </div>
            <Button onClick={handleSave} disabled={isLoading}>
              Save Sequence
            </Button>
          </div>

          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center">
              <Calendar className="h-4 w-4 mr-2" />
              Total Duration: {steps.reduce((acc, step) => acc + step.delay, 0)}{" "}
              days
            </div>
            <div className="flex items-center">
              <Users className="h-4 w-4 mr-2" />
              {steps.length} steps
            </div>
          </div>
        </div>
      </Card>

      <div className="space-y-4">
        {steps.map((step, index) => (
          <Card key={step.id} className="p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">
                  Step {index + 1}
                  {index === 0 && " (Initial Email)"}
                </h3>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => moveStep(step.id, "up")}
                    disabled={index === 0}
                  >
                    <MoveUp className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => moveStep(step.id, "down")}
                    disabled={index === steps.length - 1}
                  >
                    <MoveDown className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => removeStep(step.id)}
                    disabled={steps.length === 1}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {index > 0 && (
                <div className="flex items-center gap-4">
                  <Label htmlFor={`delay-${step.id}`}>Wait</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id={`delay-${step.id}`}
                      type="number"
                      value={step.delay}
                      onChange={(e) =>
                        updateStep(step.id, {
                          delay: parseInt(e.target.value) || 0,
                        })
                      }
                      className="w-20"
                    />
                    <Select
                      value={step.delayUnit}
                      onValueChange={(value: "hours" | "days") =>
                        updateStep(step.id, { delayUnit: value })
                      }
                    >
                      <SelectTrigger className="w-[100px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="hours">Hours</SelectItem>
                        <SelectItem value="days">Days</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor={`subject-${step.id}`}>Subject</Label>
                <Input
                  id={`subject-${step.id}`}
                  value={step.subject}
                  onChange={(e) =>
                    updateStep(step.id, { subject: e.target.value })
                  }
                  placeholder="Enter email subject"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor={`body-${step.id}`}>Message</Label>
                <Textarea
                  id={`body-${step.id}`}
                  value={step.body}
                  onChange={(e) =>
                    updateStep(step.id, { body: e.target.value })
                  }
                  placeholder="Write your message here..."
                  className="min-h-[200px]"
                />
              </div>
            </div>
          </Card>
        ))}

        <Button
          variant="outline"
          className="w-full"
          onClick={addStep}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Step
        </Button>
      </div>
    </div>
  );
} 