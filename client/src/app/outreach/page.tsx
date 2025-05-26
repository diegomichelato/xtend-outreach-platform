import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmailComposer } from "@/components/outreach/EmailComposer";
import { SequenceBuilder } from "@/components/outreach/SequenceBuilder";
import { OutreachMetrics } from "@/components/outreach/OutreachMetrics";
import { DeliverabilityTools } from "@/components/outreach/DeliverabilityTools";
import { Mail, GitBranch, BarChart3, Shield } from "lucide-react";

export default function OutreachPage() {
  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Outreach</h1>
      </div>

      <Tabs defaultValue="compose" className="space-y-6">
        <TabsList>
          <TabsTrigger value="compose" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Compose
          </TabsTrigger>
          <TabsTrigger value="sequences" className="flex items-center gap-2">
            <GitBranch className="h-4 w-4" />
            Sequences
          </TabsTrigger>
          <TabsTrigger value="metrics" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Metrics
          </TabsTrigger>
          <TabsTrigger value="deliverability" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Deliverability
          </TabsTrigger>
        </TabsList>

        <TabsContent value="compose">
          <EmailComposer />
        </TabsContent>

        <TabsContent value="sequences">
          <SequenceBuilder />
        </TabsContent>

        <TabsContent value="metrics">
          <OutreachMetrics />
        </TabsContent>

        <TabsContent value="deliverability">
          <DeliverabilityTools />
        </TabsContent>
      </Tabs>
    </div>
  )
} 