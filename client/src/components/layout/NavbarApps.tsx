import React from 'react';
import { Link } from 'wouter';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { ExternalLink, Grid2X2 } from "lucide-react";

const NavbarApps = () => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9 relative">
          <Grid2X2 className="h-5 w-5" />
          <span className="sr-only">Applications</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <h3 className="px-2 py-1.5 text-sm font-semibold">Applications</h3>
        
        <DropdownMenuItem asChild>
          <Link to="/" className="flex items-center cursor-pointer">
            <div className="flex-1">Xtend Creators</div>
            <div className="text-muted-foreground">
              <ExternalLink className="h-4 w-4" />
            </div>
          </Link>
        </DropdownMenuItem>
        
        <DropdownMenuItem asChild>
          <a 
            href="/inventory" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="flex items-center cursor-pointer"
          >
            <div className="flex-1">Inventory</div>
            <div className="text-muted-foreground">
              <ExternalLink className="h-4 w-4" />
            </div>
          </a>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default NavbarApps;