import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { getInitials } from "@/lib/utils";
import NavbarApps from "./NavbarApps";

interface HeaderProps {
  onToggleSidebar: () => void;
}

export function Header({ onToggleSidebar }: HeaderProps) {
  const { data: user } = useQuery({
    queryKey: ['/api/users/me'],
  });

  const fullName = user?.fullName || "User";
  
  return (
    <header className="bg-white shadow-sm fixed top-0 left-0 right-0 z-10">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center space-x-2">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onToggleSidebar}
            id="sidebar-toggle" 
            className="p-1 rounded-md text-gray-500 hover:bg-gray-100 focus:outline-none"
          >
            <span className="material-icons">menu</span>
          </Button>
          <div className="text-2xl font-bold text-primary-DEFAULT">Xtend Creators</div>
        </div>
        <div className="flex items-center space-x-4">
          <NavbarApps />
          <div className="hidden sm:flex items-center p-2 text-sm text-gray-700 bg-gray-100 rounded-full cursor-pointer">
            <span className="material-icons text-xl mr-1">help_outline</span>
            <span>Help</span>
          </div>
          <div className="relative">
            <Button variant="ghost" size="icon" className="p-1 text-gray-500 hover:text-gray-700">
              <span className="material-icons">notifications</span>
              <span className="absolute top-0 right-0 h-2 w-2 bg-red-500 rounded-full"></span>
            </Button>
          </div>
          <div className="flex items-center space-x-2 cursor-pointer">
            <Avatar className="w-8 h-8 bg-primary-DEFAULT text-white">
              <AvatarFallback>{getInitials(fullName)}</AvatarFallback>
            </Avatar>
            <span className="hidden sm:inline font-medium text-sm">{fullName}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
