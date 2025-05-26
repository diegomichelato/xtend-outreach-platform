import { DollarSign, Mail } from "lucide-react";
import Link from "next/link";

export const navigationItems = [
  {
    title: "Pipeline",
    href: "/pipeline",
    icon: DollarSign,
  },
];

export function Navigation() {
  return (
    <nav className="flex items-center space-x-4 lg:space-x-6">
      {/* ... existing navigation items ... */}
      <Link
        href="/outreach"
        className="text-sm font-medium transition-colors hover:text-primary"
      >
        <div className="flex items-center gap-2">
          <Mail className="h-4 w-4" />
          Outreach
        </div>
      </Link>
      {/* ... rest of the navigation ... */}
    </nav>
  );
} 