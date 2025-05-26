import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from "date-fns";

interface Activity {
  id: string;
  type: 'campaign' | 'email' | 'contact' | 'proposal';
  action: string;
  description: string;
  timestamp: Date;
  icon?: string;
  status?: 'success' | 'warning' | 'error';
}

interface ActivityFeedProps {
  activities: Activity[];
  maxHeight?: number;
}

export function ActivityFeed({ activities, maxHeight = 400 }: ActivityFeedProps) {
  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'success':
        return 'bg-green-100 text-green-600';
      case 'warning':
        return 'bg-yellow-100 text-yellow-600';
      case 'error':
        return 'bg-red-100 text-red-600';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'campaign':
        return 'campaign';
      case 'email':
        return 'email';
      case 'contact':
        return 'person';
      case 'proposal':
        return 'description';
      default:
        return 'info';
    }
  };

  return (
    <Card className="p-6">
      <h3 className="text-lg font-medium mb-4">Recent Activity</h3>
      <ScrollArea className="pr-4" style={{ maxHeight }}>
        <div className="space-y-4">
          {activities.map((activity) => (
            <div key={activity.id} className="flex items-start space-x-4">
              <div className={`p-2 rounded-full ${getStatusColor(activity.status)}`}>
                <span className="material-icons text-lg">
                  {activity.icon || getIcon(activity.type)}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">
                  {activity.action}
                </p>
                <p className="text-sm text-gray-500">
                  {activity.description}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {formatDistanceToNow(activity.timestamp, { addSuffix: true })}
                </p>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </Card>
  );
} 