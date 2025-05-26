import { Card } from "@/components/ui/card";

interface OverviewCardProps {
  title: string;
  value: string | number;
  change: number;
  icon: string;
  iconColor: string;
}

export function OverviewCard({ title, value, change, icon, iconColor }: OverviewCardProps) {
  const isPositive = change >= 0;
  
  return (
    <Card className="p-6">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="text-2xl font-bold mt-2">{value}</p>
        </div>
        <div className={`p-2 rounded-full ${iconColor}`}>
          <span className="material-icons">{icon}</span>
        </div>
      </div>
      <div className="mt-4 flex items-center text-sm">
        <span className={`flex items-center ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
          <span className="material-icons text-sm mr-1">
            {isPositive ? 'arrow_upward' : 'arrow_downward'}
          </span>
          <span>{Math.abs(change)}%</span>
        </span>
        <span className="text-gray-500 ml-2">from last month</span>
      </div>
    </Card>
  );
}
