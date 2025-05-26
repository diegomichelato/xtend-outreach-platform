import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmailComposer } from "./EmailComposer";
import { SequenceBuilder } from "./SequenceBuilder";
import { OutreachMetrics } from "./OutreachMetrics";
import { DeliverabilityTools } from "./DeliverabilityTools";

export function OutreachDashboard() {
  const [activeTab, setActiveTab] = useState("compose");

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Outreach</h1>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="compose">Compose</TabsTrigger>
          <TabsTrigger value="sequences">Sequences</TabsTrigger>
          <TabsTrigger value="metrics">Metrics</TabsTrigger>
          <TabsTrigger value="deliverability">Deliverability</TabsTrigger>
        </TabsList>

        <TabsContent value="compose" className="space-y-4">
          <EmailComposer />
        </TabsContent>

        <TabsContent value="sequences" className="space-y-4">
          <SequenceBuilder />
        </TabsContent>

        <TabsContent value="metrics" className="space-y-4">
          <OutreachMetrics />
        </TabsContent>

        <TabsContent value="deliverability" className="space-y-4">
          <DeliverabilityTools />
        </TabsContent>
      </Tabs>
    </div>
  );
} 