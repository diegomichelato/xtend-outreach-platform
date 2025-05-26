import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
// Using inline spinner instead of imported component
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, CheckCircle, Info } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

type ContactList = {
  id: number;
  name: string;
  description: string | null;
  createdAt: string;
  count?: number;
};

// Updated Contact type to match the database column structure
type Contact = {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  business_email?: string;
  company: string;
  industry: string;
  niche?: string;
  role?: string;
  country?: string;
  website?: string;
  linkedin?: string;
  business_linkedin?: string;
  phone?: string;
  status?: string;
  tags?: string[];
  notes?: string;
  created_at?: string;
};

export function StemContactView() {
  // No need for selectedListId state since we're always showing STEM contacts

  // Directly fetch STEM contacts data
  const { data: stemContactsData, isLoading: contactsLoading, error: contactsError } = useQuery<{
    contacts: Contact[];
    count: number;
    listId: number;
    listName: string;
    listDescription: string | null;
  }>({
    queryKey: ["/api/stem-contacts"],
    refetchOnWindowFocus: false,
  });
  
  // Process the data
  const contacts: Contact[] = stemContactsData?.contacts || [];
  const contactsCount = stemContactsData?.count || 0;
  const listInfo = {
    name: stemContactsData?.listName || "STEM Contacts",
    description: stemContactsData?.listDescription || "Imported STEM list contacts"
  };
  
  const isLoading = contactsLoading;
  const error = contactsError;

  // No need for useEffect to select a list since we're directly loading STEM contacts

  if (error) {
    return (
      <Alert variant="destructive" className="mb-4">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          Failed to load contacts. Please try refreshing the page.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-2xl font-bold">STEM Contacts</CardTitle>
        <CardDescription>
          View and manage your imported STEM contacts for email outreach campaigns
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* STEM List information */}
        <div className="mb-6 bg-blue-50 p-4 rounded-md border border-blue-200">
          <h3 className="text-lg font-semibold text-blue-800">{listInfo.name}</h3>
          <p className="text-sm text-blue-700">{listInfo.description}</p>
          <p className="text-xs text-blue-600 mt-1">These are your imported STEM list contacts for email outreach campaigns</p>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center p-12">
            <div className="animate-spin h-8 w-8 rounded-full border-2 border-primary border-t-transparent" />
            <span className="ml-3">Loading contacts...</span>
          </div>
        ) : (
          <>
            {contacts.length === 0 ? (
              <Alert className="mb-4">
                <Info className="h-4 w-4" />
                <AlertTitle>No contacts found</AlertTitle>
                <AlertDescription>
                  This contact list does not contain any contacts.
                </AlertDescription>
              </Alert>
            ) : (
              <>
                <Alert variant="default" className="mb-4 bg-blue-50 border-blue-200">
                  <CheckCircle className="h-4 w-4 text-blue-500" />
                  <AlertTitle className="text-blue-700">Found {contactsCount} contacts</AlertTitle>
                  <AlertDescription className="text-blue-600">
                    Displaying contacts from STEM list
                  </AlertDescription>
                </Alert>

                <div className="overflow-x-auto rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Company</TableHead>
                        <TableHead>Industry</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Business Email</TableHead>
                        <TableHead>Country</TableHead>
                        <TableHead>Website</TableHead>
                        <TableHead>Niche</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {contacts.slice(0, 20).map((contact) => (
                        <TableRow key={contact.id}>
                          <TableCell>
                            {contact.first_name} {contact.last_name}
                          </TableCell>
                          <TableCell>{contact.company || "-"}</TableCell>
                          <TableCell>{contact.industry || "-"}</TableCell>
                          <TableCell>{contact.role || "-"}</TableCell>
                          <TableCell className="font-mono text-sm">{contact.email || "-"}</TableCell>
                          <TableCell className="font-mono text-sm">{contact.business_email || "-"}</TableCell>
                          <TableCell>{contact.country || "-"}</TableCell>
                          <TableCell>
                            {contact.website ? (
                              <a 
                                href={contact.website.startsWith('http') ? contact.website : `https://${contact.website}`} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline"
                              >
                                {contact.website}
                              </a>
                            ) : "-"}
                          </TableCell>
                          <TableCell>{contact.niche || "-"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {contacts.length > 20 && (
                  <div className="text-center text-sm text-muted-foreground mt-2">
                    Showing 20 of {contacts.length} contacts
                  </div>
                )}
              </>
            )}
          </>
        )}
      </CardContent>
      <CardFooter className="flex justify-end">
        <Button>Use in Campaign</Button>
      </CardFooter>
    </Card>
  );
}