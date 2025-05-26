import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Wand2,
  Send,
  Clock,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface EmailAccount {
  id: number;
  email: string;
  name: string;
}

export function EmailComposer() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [emailData, setEmailData] = useState({
    fromAccount: "",
    subject: "",
    body: "",
    scheduledTime: "",
  });

  // Mock data - replace with real API call
  const emailAccounts: EmailAccount[] = [
    { id: 1, email: "sales@company.com", name: "Sales Team" },
    { id: 2, email: "support@company.com", name: "Support Team" },
  ];

  const handleAIAssist = async (type: "improve" | "shorten" | "tone") => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/ai/improve-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          subject: emailData.subject,
          body: emailData.body,
        }),
      });

      if (!response.ok) throw new Error("Failed to get AI suggestions");

      const data = await response.json();
      setEmailData({
        ...emailData,
        subject: data.subject || emailData.subject,
        body: data.body || emailData.body,
      });

      toast({
        title: "AI Suggestions Applied",
        description: "Your email has been improved with AI assistance.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to get AI suggestions. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = async (schedule = false) => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/outreach/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...emailData,
          scheduled: schedule,
        }),
      });

      if (!response.ok) throw new Error("Failed to send email");

      toast({
        title: schedule ? "Email Scheduled" : "Email Sent",
        description: schedule
          ? "Your email has been scheduled successfully."
          : "Your email has been sent successfully.",
      });

      // Clear form after successful send
      setEmailData({
        fromAccount: "",
        subject: "",
        body: "",
        scheduledTime: "",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send email. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="p-6">
      <div className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="fromAccount">From</Label>
          <Select
            value={emailData.fromAccount}
            onValueChange={(value) =>
              setEmailData({ ...emailData, fromAccount: value })
            }
          >
            <SelectTrigger id="fromAccount">
              <SelectValue placeholder="Select sending account" />
            </SelectTrigger>
            <SelectContent>
              {emailAccounts.map((account) => (
                <SelectItem key={account.id} value={account.id.toString()}>
                  {account.name} ({account.email})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="subject">Subject</Label>
          <div className="flex gap-2">
            <Input
              id="subject"
              value={emailData.subject}
              onChange={(e) =>
                setEmailData({ ...emailData, subject: e.target.value })
              }
              placeholder="Enter email subject"
            />
            <Button
              variant="outline"
              size="icon"
              onClick={() => handleAIAssist("improve")}
              disabled={isLoading}
            >
              <Wand2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="body">Message</Label>
          <div className="space-y-2">
            <Textarea
              id="body"
              value={emailData.body}
              onChange={(e) =>
                setEmailData({ ...emailData, body: e.target.value })
              }
              placeholder="Write your message here..."
              className="min-h-[200px]"
            />
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => handleAIAssist("improve")}
                disabled={isLoading}
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Improve
              </Button>
              <Button
                variant="outline"
                onClick={() => handleAIAssist("shorten")}
                disabled={isLoading}
              >
                <Wand2 className="h-4 w-4 mr-2" />
                Make Concise
              </Button>
              <Button
                variant="outline"
                onClick={() => handleAIAssist("tone")}
                disabled={isLoading}
              >
                <Wand2 className="h-4 w-4 mr-2" />
                Adjust Tone
              </Button>
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center pt-4 border-t">
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => handleSend(true)}
              disabled={isLoading}
            >
              <Clock className="h-4 w-4 mr-2" />
              Schedule
            </Button>
            <Button
              variant="default"
              onClick={() => handleSend(false)}
              disabled={isLoading}
            >
              <Send className="h-4 w-4 mr-2" />
              Send Now
            </Button>
          </div>

          <div className="flex items-center text-sm text-muted-foreground">
            <AlertCircle className="h-4 w-4 mr-2" />
            AI-powered spam check in progress...
          </div>
        </div>
      </div>
    </Card>
  );
} 