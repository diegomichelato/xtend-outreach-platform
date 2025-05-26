import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { pipelineStages } from "@/config/pipeline-stages";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Scale,
  ChartOptions,
} from "chart.js";
import { Bar } from "react-chartjs-2";
import { DollarSign, TrendingUp, AlertCircle } from "lucide-react";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface Deal {
  id: string;
  companyName: string;
  value: number;
  stage: string;
  probability: number;
  lastActivity?: {
    timestamp: string;
  };
}

interface PipelineInsightsPanelProps {
  deals: Deal[];
}

export function PipelineInsightsPanel({ deals }: PipelineInsightsPanelProps) {
  // Calculate total pipeline value
  const totalValue = useMemo(
    () => deals.reduce((sum, deal) => sum + deal.value, 0),
    [deals]
  );

  // Calculate weighted pipeline value
  const weightedValue = useMemo(
    () =>
      deals.reduce(
        (sum, deal) => sum + deal.value * (deal.probability / 100),
        0
      ),
    [deals]
  );

  // Calculate stage-wise values
  const stageValues = useMemo(() => {
    const values: Record<string, number> = {};
    pipelineStages.forEach((stage) => {
      values[stage.id] = deals
        .filter((deal) => deal.stage === stage.id)
        .reduce((sum, deal) => sum + deal.value, 0);
    });
    return values;
  }, [deals]);

  // Identify stagnant deals (no activity in last 30 days)
  const stagnantDeals = useMemo(() => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    return deals.filter((deal) => {
      if (!deal.lastActivity) return true;
      return new Date(deal.lastActivity.timestamp) < thirtyDaysAgo;
    });
  }, [deals]);

  // Chart data
  const chartData = {
    labels: pipelineStages.map((stage) => stage.name),
    datasets: [
      {
        label: "Pipeline Value by Stage",
        data: pipelineStages.map((stage) => stageValues[stage.id]),
        backgroundColor: pipelineStages.map((stage) =>
          stage.color.replace("bg-", "rgb(")
            .replace("-500", ", 0.5)")
            .replace("gray", "156, 163, 175")
            .replace("blue", "59, 130, 246")
            .replace("yellow", "234, 179, 8")
            .replace("orange", "249, 115, 22")
            .replace("green", "34, 197, 94")
            .replace("red", "239, 68, 68")
        ),
        borderColor: pipelineStages.map((stage) =>
          stage.color.replace("bg-", "rgb(")
            .replace("-500", ")")
            .replace("gray", "156, 163, 175")
            .replace("blue", "59, 130, 246")
            .replace("yellow", "234, 179, 8")
            .replace("orange", "249, 115, 22")
            .replace("green", "34, 197, 94")
            .replace("red", "239, 68, 68")
        ),
        borderWidth: 1,
      },
    ],
  };

  const chartOptions: ChartOptions<"bar"> = {
    responsive: true,
    plugins: {
      legend: {
        display: false,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function (value) {
            if (typeof value !== "number") return value;
            return new Intl.NumberFormat("en-US", {
              style: "currency",
              currency: "USD",
              notation: "compact",
            }).format(value);
          },
        },
      },
    },
  };

  return (
    <div className="w-80 space-y-4 border-l border-gray-200 p-4">
      <h2 className="text-lg font-semibold">Pipeline Insights</h2>

      {/* Total Value */}
      <Card className="p-4">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <DollarSign className="h-4 w-4" />
          <span>Total Pipeline Value</span>
        </div>
        <p className="mt-1 text-2xl font-bold">
          {new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
            notation: "compact",
            maximumFractionDigits: 1,
          }).format(totalValue)}
        </p>
        <p className="mt-1 text-sm text-gray-500">
          Weighted:{" "}
          {new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
            notation: "compact",
            maximumFractionDigits: 1,
          }).format(weightedValue)}
        </p>
      </Card>

      {/* Stage Distribution */}
      <Card className="p-4">
        <div className="mb-4 flex items-center gap-2 text-sm text-gray-500">
          <TrendingUp className="h-4 w-4" />
          <span>Value by Stage</span>
        </div>
        <div className="h-40">
          <Bar data={chartData} options={chartOptions} />
        </div>
      </Card>

      {/* Stagnant Deals */}
      {stagnantDeals.length > 0 && (
        <Card className="p-4">
          <div className="mb-2 flex items-center gap-2 text-sm text-amber-600">
            <AlertCircle className="h-4 w-4" />
            <span>Needs Attention</span>
          </div>
          <div className="space-y-2">
            {stagnantDeals.slice(0, 3).map((deal) => (
              <div
                key={deal.id}
                className="rounded-md bg-amber-50 p-2 text-sm"
              >
                <p className="font-medium">{deal.companyName}</p>
                <p className="text-amber-600">No activity in 30+ days</p>
              </div>
            ))}
            {stagnantDeals.length > 3 && (
              <p className="text-sm text-gray-500">
                +{stagnantDeals.length - 3} more need attention
              </p>
            )}
          </div>
        </Card>
      )}
    </div>
  );
} 