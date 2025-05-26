import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Send, Users, FileText } from "lucide-react";

interface QuickAction {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  onClick: () => void;
}

interface QuickActionsProps {
  actions?: QuickAction[];
}

export function QuickActions({ actions }: QuickActionsProps) {
  const defaultActions: QuickAction[] = [
    {
      id: 'new-campaign',
      label: 'New Campaign',
      description: 'Create a new email campaign',
      icon: <Plus className="h-5 w-5" />,
      onClick: () => window.location.href = '/campaigns/new'
    },
    {
      id: 'send-proposal',
      label: 'Send Proposal',
      description: 'Create and send a new proposal',
      icon: <FileText className="h-5 w-5" />,
      onClick: () => window.location.href = '/proposals/new'
    },
    {
      id: 'add-contacts',
      label: 'Add Contacts',
      description: 'Import or add new contacts',
      icon: <Users className="h-5 w-5" />,
      onClick: () => window.location.href = '/contacts/import'
    },
    {
      id: 'quick-email',
      label: 'Quick Email',
      description: 'Send a one-off email',
      icon: <Send className="h-5 w-5" />,
      onClick: () => window.location.href = '/email/compose'
    }
  ];

  const displayActions = actions || defaultActions;

  return (
    <Card className="p-6">
      <h3 className="text-lg font-medium mb-4">Quick Actions</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {displayActions.map((action) => (
          <Button
            key={action.id}
            variant="outline"
            className="h-auto p-4 flex flex-col items-center justify-center text-center space-y-2"
            onClick={action.onClick}
          >
            <div className="p-2 rounded-full bg-primary-light bg-opacity-10">
              {action.icon}
            </div>
            <span className="font-medium">{action.label}</span>
            <span className="text-sm text-gray-500">{action.description}</span>
          </Button>
        ))}
      </div>
    </Card>
  );
} 