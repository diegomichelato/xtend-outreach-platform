import { useState } from "react";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Mail,
  Eye,
  MousePointerClick,
  Reply,
  AlertTriangle,
  Calendar,
} from "lucide-react";

interface MetricCard {
  title: string;
  value: string;
  change: number;
  icon: React.ReactNode;
}

const mockData = {
  overview: [
    {
      title: "Sent",
      value: "2,543",
      change: 12.5,
      icon: <Mail className="h-4 w-4" />,
    },
    {
      title: "Opens",
      value: "1,872",
      change: 8.2,
      icon: <Eye className="h-4 w-4" />,
    },
    {
      title: "Clicks",
      value: "432",
      change: -2.1,
      icon: <MousePointerClick className="h-4 w-4" />,
    },
    {
      title: "Replies",
      value: "187",
      change: 15.3,
      icon: <Reply className="h-4 w-4" />,
    },
    {
      title: "Bounces",
      value: "23",
      change: -5.4,
      icon: <AlertTriangle className="h-4 w-4" />,
    },
  ],
  timeData: [
    { date: "2024-01", sent: 450, opens: 380, replies: 42 },
    { date: "2024-02", sent: 520, opens: 425, replies: 55 },
    { date: "2024-03", sent: 610, opens: 490, replies: 48 },
    { date: "2024-04", sent: 680, opens: 545, replies: 62 },
  ],
};

export function OutreachMetrics() {
  const [timeRange, setTimeRange] = useState("30d");

  return (
    <div className="space-y-6">
      {/* Time Range Selector */}
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Performance Overview</h2>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-[180px]">
            <Calendar className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Select time range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
            <SelectItem value="90d">Last 90 days</SelectItem>
            <SelectItem value="1y">Last year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {mockData.overview.map((metric, index) => (
          <Card key={index} className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              {metric.icon}
              <span className="text-sm">{metric.title}</span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold">{metric.value}</span>
              <span
                className={`text-sm ${
                  metric.change > 0
                    ? "text-green-600"
                    : "text-red-600"
                }`}
              >
                {metric.change > 0 ? "+" : ""}
                {metric.change}%
              </span>
            </div>
          </Card>
        ))}
      </div>

      {/* Performance Chart */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Performance Trends</h3>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={mockData.timeData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="sent" fill="#94a3b8" name="Sent" />
              <Bar dataKey="opens" fill="#60a5fa" name="Opens" />
              <Bar dataKey="replies" fill="#34d399" name="Replies" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Detailed Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">
            Engagement by Time of Day
          </h3>
          <div className="space-y-4">
            {/* Add time-based engagement chart here */}
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">
            Performance by Email Type
          </h3>
          <div className="space-y-4">
            {/* Add email type performance chart here */}
          </div>
        </Card>
      </div>
    </div>
  );
} 