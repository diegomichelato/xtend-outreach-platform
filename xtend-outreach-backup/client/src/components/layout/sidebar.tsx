import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";

interface SidebarProps {
  open: boolean;
}

type NavItem = {
  name: string;
  href: string;
  icon: string;
};

const mainNavItems: NavItem[] = [
  {
    name: "Dashboard",
    href: "/",
    icon: "dashboard"
  },
  {
    name: "Campaigns",
    href: "/campaigns",
    icon: "campaign"
  },
  {
    name: "Contacts",
    href: "/contacts",
    icon: "group"
  },
  {
    name: "Creators",
    href: "/creators",
    icon: "person"
  },
  {
    name: "Inventory",
    href: "/inventory-table",
    icon: "inventory_2"
  },
  // STEM contacts merged into main Contacts section
  {
    name: "Email Templates",
    href: "/email-templates",
    icon: "auto_awesome"
  },
  // Whiteboard removed
  {
    name: "Analytics",
    href: "/analytics",
    icon: "analytics"
  },
  {
    name: "Outreach",
    href: "/outreach",
    icon: "forward_to_inbox"
  },
  {
    name: "Proposals",
    href: "/proposals",
    icon: "description"
  },
  {
    name: "Sales Pipeline",
    href: "/sales-pipeline",
    icon: "trending_up"
  },
  {
    name: "Email Deliverability",
    href: "/email-deliverability",
    icon: "verified"
  },
  {
    name: "Shareable Links",
    href: "/shareable-landing-pages-dashboard",
    icon: "share"
  },
  {
    name: "AI CRM Agent",
    href: "/crm-agent",
    icon: "psychology"
  }
];

const settingsNavItems: NavItem[] = [
  {
    name: "Account",
    href: "/settings",
    icon: "account_circle"
  },
  {
    name: "Email Accounts",
    href: "/email-accounts",
    icon: "email"
  },
  {
    name: "General Settings",
    href: "/settings?tab=api-keys",
    icon: "settings"
  }
];

export function Sidebar({ open }: SidebarProps) {
  const [location] = useLocation();

  return (
    <aside 
      id="sidebar" 
      className={cn(
        "w-64 bg-white shadow-md fixed top-14 bottom-0 left-0 transform transition-transform duration-300 z-10 overflow-y-auto",
        open ? "md:translate-x-0" : "-translate-x-full md:translate-x-0 md:w-20"
      )}
    >
      <nav className="px-4 py-4">
        <div className="space-y-1">
          {mainNavItems.map((item) => (
            <Link 
              key={item.href} 
              href={item.href}
              className={cn(
                "flex items-center p-3 text-sm font-medium rounded-md",
                location === item.href 
                  ? "bg-primary-light bg-opacity-10 text-primary-DEFAULT" 
                  : "text-gray-700 hover:bg-gray-100"
              )}
            >
              <span className="material-icons mr-3">{item.icon}</span>
              <span className={cn(open ? "block" : "hidden md:hidden")}>{item.name}</span>
            </Link>
          ))}
        </div>
        
        <div className={cn("mt-8 pt-6 border-t border-gray-200", open ? "block" : "hidden md:block")}>
          <div className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Settings
          </div>
          <div className="mt-3 space-y-1">
            {settingsNavItems.map((item) => (
              <Link 
                key={item.href} 
                href={item.href}
                className={cn(
                  "flex items-center p-3 text-sm font-medium rounded-md",
                  location === item.href 
                    ? "bg-primary-light bg-opacity-10 text-primary-DEFAULT" 
                    : "text-gray-700 hover:bg-gray-100"
                )}
              >
                <span className="material-icons mr-3">{item.icon}</span>
                <span className={cn(open ? "block" : "hidden md:hidden")}>{item.name}</span>
              </Link>
            ))}
          </div>
        </div>
      </nav>
    </aside>
  );
}
