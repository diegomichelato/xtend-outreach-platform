import { Card } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

interface RealTimeMetrics {
  todayStats: {
    emailsSent: number;
    emailsOpened: number;
    emailsReplied: number;
    successRate: number;
  };
  comparisonStats: {
    emailsSentChange: number;
    openRateChange: number;
    replyRateChange: number;
  };
}

export function RealTimeMetrics() {
  const { data: metrics, isLoading } = useQuery<RealTimeMetrics>({
    queryKey: ['/api/dashboard/real-time-metrics'],
  });

  const renderTrendIndicator = (change: number) => {
    const color = change >= 0 ? 'text-green-600' : 'text-red-600';
    const arrow = change >= 0 ? '↑' : '↓';
    return (
      <span className={`${color} text-sm font-medium`}>
        {arrow} {Math.abs(change)}%
      </span>
    );
  };

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex justify-center items-center h-32">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <h3 className="text-lg font-medium mb-4">Today's Performance</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="space-y-2">
          <p className="text-sm text-gray-500">Emails Sent</p>
          <p className="text-2xl font-semibold">{metrics?.todayStats.emailsSent}</p>
          {metrics?.comparisonStats.emailsSentChange && (
            <div>{renderTrendIndicator(metrics.comparisonStats.emailsSentChange)}</div>
          )}
        </div>
        <div className="space-y-2">
          <p className="text-sm text-gray-500">Opens</p>
          <p className="text-2xl font-semibold">{metrics?.todayStats.emailsOpened}</p>
          {metrics?.comparisonStats.openRateChange && (
            <div>{renderTrendIndicator(metrics.comparisonStats.openRateChange)}</div>
          )}
        </div>
        <div className="space-y-2">
          <p className="text-sm text-gray-500">Replies</p>
          <p className="text-2xl font-semibold">{metrics?.todayStats.emailsReplied}</p>
          {metrics?.comparisonStats.replyRateChange && (
            <div>{renderTrendIndicator(metrics.comparisonStats.replyRateChange)}</div>
          )}
        </div>
        <div className="space-y-2">
          <p className="text-sm text-gray-500">Success Rate</p>
          <p className="text-2xl font-semibold">{metrics?.todayStats.successRate}%</p>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary" 
              style={{ width: `${metrics?.todayStats.successRate || 0}%` }}
            />
          </div>
        </div>
      </div>
    </Card>
  );
} 