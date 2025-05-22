import React, { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MoreHorizontal,
  Search,
  ChevronDown,
  Mail,
  Phone,
  ExternalLink,
  Edit,
  Trash2,
  Building,
  Briefcase,
  Tag,
  MapPin,
} from "lucide-react";

interface Contact {
  id: number;
  firstName: string;
  lastName?: string | null;
  company: string;
  email: string;
  industry: string;
  role?: string | null;
  phone?: string | null;
  linkedin?: string | null;
  status?: string | null;
  country?: string | null;
  website?: string | null;
  niche?: string | null;
  createdAt?: Date | null;
}

interface ContactTableProps {
  contacts: Contact[];
  onSelect?: (contact: Contact) => void;
  selectedId?: number;
  hideActions?: boolean;
  onEdit?: (contact: Contact) => void;
  onDelete?: (contact: Contact) => void;
}

export function ContactTable({
  contacts,
  onSelect,
  selectedId,
  hideActions = false,
  onEdit,
  onDelete,
}: ContactTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [displayedColumns, setDisplayedColumns] = useState<string[]>([
    "company",
    "firstName",
    "email",
    "industry",
    "niche",
  ]);

  const allColumns = [
    { key: "company", label: "Company", icon: <Building className="w-4 h-4 mr-2" /> },
    { key: "firstName", label: "Name", icon: <Briefcase className="w-4 h-4 mr-2" /> },
    { key: "email", label: "Email", icon: <Mail className="w-4 h-4 mr-2" /> },
    { key: "industry", label: "Industry", icon: <Tag className="w-4 h-4 mr-2" /> },
    { key: "niche", label: "Niche", icon: <Tag className="w-4 h-4 mr-2" /> },
    { key: "role", label: "Role", icon: <Briefcase className="w-4 h-4 mr-2" /> },
    { key: "country", label: "Country", icon: <MapPin className="w-4 h-4 mr-2" /> },
    { key: "phone", label: "Phone", icon: <Phone className="w-4 h-4 mr-2" /> },
    { key: "linkedin", label: "LinkedIn", icon: <ExternalLink className="w-4 h-4 mr-2" /> },
  ];

  // Filter contacts based on search term
  const filteredContacts = contacts.filter((contact) => {
    const searchFields = [
      contact.firstName,
      contact.lastName,
      contact.company,
      contact.email,
      contact.industry,
      contact.role,
      contact.niche,
      contact.country,
    ];

    return searchFields.some(
      (field) => field && field.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const toggleColumn = (columnKey: string) => {
    if (displayedColumns.includes(columnKey)) {
      setDisplayedColumns(displayedColumns.filter((col) => col !== columnKey));
    } else {
      setDisplayedColumns([...displayedColumns, columnKey]);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search contacts..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="ml-auto">
              Columns <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {allColumns.map((column) => (
              <DropdownMenuItem
                key={column.key}
                onClick={() => toggleColumn(column.key)}
                className="flex items-center"
              >
                <div className="flex items-center">
                  {column.icon}
                  {column.label}
                </div>
                {displayedColumns.includes(column.key) && (
                  <Badge variant="outline" className="ml-auto">
                    Visible
                  </Badge>
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {displayedColumns.includes("company") && (
                <TableHead>Company</TableHead>
              )}
              {displayedColumns.includes("firstName") && (
                <TableHead>Name</TableHead>
              )}
              {displayedColumns.includes("email") && (
                <TableHead>Email</TableHead>
              )}
              {displayedColumns.includes("industry") && (
                <TableHead>Industry</TableHead>
              )}
              {displayedColumns.includes("niche") && (
                <TableHead>Niche</TableHead>
              )}
              {displayedColumns.includes("role") && (
                <TableHead>Role</TableHead>
              )}
              {displayedColumns.includes("country") && (
                <TableHead>Country</TableHead>
              )}
              {displayedColumns.includes("phone") && (
                <TableHead>Phone</TableHead>
              )}
              {displayedColumns.includes("linkedin") && (
                <TableHead>LinkedIn</TableHead>
              )}
              {!hideActions && <TableHead className="text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredContacts.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={displayedColumns.length + (hideActions ? 0 : 1)}
                  className="h-24 text-center"
                >
                  No contacts found.
                </TableCell>
              </TableRow>
            ) : (
              filteredContacts.map((contact) => (
                <TableRow
                  key={contact.id}
                  className={`
                    ${onSelect ? "cursor-pointer hover:bg-muted/50" : ""}
                    ${selectedId === contact.id ? "bg-muted" : ""}
                  `}
                  onClick={onSelect ? () => onSelect(contact) : undefined}
                >
                  {displayedColumns.includes("company") && (
                    <TableCell className="font-medium">{contact.company}</TableCell>
                  )}
                  {displayedColumns.includes("firstName") && (
                    <TableCell>
                      {contact.firstName} {contact.lastName}
                    </TableCell>
                  )}
                  {displayedColumns.includes("email") && (
                    <TableCell>{contact.email}</TableCell>
                  )}
                  {displayedColumns.includes("industry") && (
                    <TableCell>{contact.industry}</TableCell>
                  )}
                  {displayedColumns.includes("niche") && (
                    <TableCell>{contact.niche}</TableCell>
                  )}
                  {displayedColumns.includes("role") && (
                    <TableCell>{contact.role}</TableCell>
                  )}
                  {displayedColumns.includes("country") && (
                    <TableCell>{contact.country}</TableCell>
                  )}
                  {displayedColumns.includes("phone") && (
                    <TableCell>{contact.phone}</TableCell>
                  )}
                  {displayedColumns.includes("linkedin") && (
                    <TableCell>
                      {contact.linkedin && (
                        <a
                          href={contact.linkedin}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline flex items-center"
                          onClick={(e) => e.stopPropagation()}
                        >
                          Profile <ExternalLink className="ml-1 h-3 w-3" />
                        </a>
                      )}
                    </TableCell>
                  )}
                  {!hideActions && (
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            className="h-8 w-8 p-0"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          {onEdit && (
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                onEdit(contact);
                              }}
                              className="cursor-pointer"
                            >
                              <Edit className="mr-2 h-4 w-4" /> Edit Contact
                            </DropdownMenuItem>
                          )}
                          {onDelete && (
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                onDelete(contact);
                              }}
                              className="cursor-pointer text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" /> Delete Contact
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}