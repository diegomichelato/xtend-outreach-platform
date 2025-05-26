import { useState } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger 
} from "@/components/ui/tooltip";

type Creator = {
  id: string;
  name: string;
  title: string;
  platform: string;
  publishDate: string;
  status: string;
  email: string;
  phone: string;
  audience: string;
  description: string;
  tags: string[];
  videoFormat: string;
  mediaKit?: string;
  brandLikeness?: string;
  contentInfo?: string;
  postDate?: string;
  section?: string;
  sectionId?: string;
};

type SectionAccordionProps = {
  sectionNames: string[];
  groupedBySection: Record<string, Creator[]>;
  selectedProjects: string[];
  setSelectedProjects: React.Dispatch<React.SetStateAction<string[]>>;
  setSelectAll: React.Dispatch<React.SetStateAction<boolean>>;
  filteredData: Creator[];
  getStatusColor: (status: string) => string;
};

export default function SectionAccordion({
  sectionNames,
  groupedBySection,
  selectedProjects,
  setSelectedProjects,
  setSelectAll,
  filteredData,
  getStatusColor
}: SectionAccordionProps) {
  return (
    <Accordion type="multiple" className="w-full">
      {sectionNames.map((sectionName) => (
        <AccordionItem key={sectionName} value={sectionName}>
          <AccordionTrigger className="px-4 py-2 bg-gray-100 rounded-t-md hover:bg-gray-200">
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center">
                <span className="font-bold text-xl text-gray-800">{sectionName}</span>
              </div>
              <Badge variant="outline" className="bg-blue-50 text-blue-800">
                {groupedBySection[sectionName].length} videos
              </Badge>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-4 pb-2 px-2">
            {/* Secondary grouping by creator name within each section */}
            <Accordion type="multiple" className="w-full">
              {/* Group all items within section by creator name */}
              {(() => {
                // Group by creator name within this section
                const creatorsByName: Record<string, Creator[]> = {};
                groupedBySection[sectionName].forEach(creator => {
                  const name = creator.name || 'Unnamed';
                  if (!creatorsByName[name]) {
                    creatorsByName[name] = [];
                  }
                  creatorsByName[name].push(creator);
                });
                
                // Render each creator group
                return Object.entries(creatorsByName).map(([creatorName, creators]) => (
                    <AccordionItem key={`${sectionName}-${creatorName}`} value={`${sectionName}-${creatorName}`}>
                      <AccordionTrigger className="px-4 py-2 bg-slate-50 rounded-t-md hover:bg-slate-100">
                        <div className="flex items-center justify-between w-full">
                          <div className="flex items-center">
                            <span className="font-semibold text-lg">{creatorName}</span>
                          {creators[0].mediaKit && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <a 
                                    href={creators[0].mediaKit} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="ml-2"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    📄
                                  </a>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>View Media Kit</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </div>
                        <Badge>{creators.length} videos</Badge>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="rounded-md border mt-1">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-10">
                                <div className="flex items-center">
                                  <input
                                    type="checkbox"
                                    className="rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                                    checked={creators.every(creator => selectedProjects.includes(creator.id))}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        const newSelectedProjects = [...selectedProjects];
                                        creators.forEach(creator => {
                                          if (!newSelectedProjects.includes(creator.id)) {
                                            newSelectedProjects.push(creator.id);
                                          }
                                        });
                                        setSelectedProjects(newSelectedProjects);
                                      } else {
                                        setSelectedProjects(selectedProjects.filter(id => 
                                          !creators.some(creator => creator.id === id)
                                        ));
                                      }
                                    }}
                                  />
                                </div>
                              </TableHead>
                              <TableHead>Title</TableHead>
                              <TableHead>Platform</TableHead>
                              <TableHead>Video Format</TableHead>
                              <TableHead>Publish Date</TableHead>
                              <TableHead>Post Date</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Brand Fit</TableHead>
                              <TableHead>Content Info</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {creators.map((creator) => (
                              <TableRow key={creator.id}>
                                <TableCell className="w-10">
                                  <div className="flex items-center">
                                    <input
                                      type="checkbox"
                                      className="rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                                      checked={selectedProjects.includes(creator.id)}
                                      onChange={(e) => {
                                        if (e.target.checked) {
                                          setSelectedProjects([...selectedProjects, creator.id]);
                                        } else {
                                          setSelectedProjects(selectedProjects.filter(id => id !== creator.id));
                                        }
                                        
                                        // Update selectAll state based on all items being selected
                                        if (!e.target.checked) {
                                          setSelectAll(false);
                                        } else if (selectedProjects.length + 1 === filteredData.length) {
                                          setSelectAll(true);
                                        }
                                      }}
                                    />
                                  </div>
                                </TableCell>
                                <TableCell className="font-medium">{creator.title}</TableCell>
                                <TableCell>{creator.platform}</TableCell>
                                <TableCell>{creator.videoFormat || "Standard"}</TableCell>
                                <TableCell>{new Date(creator.publishDate).toLocaleDateString()}</TableCell>
                                <TableCell>{creator.postDate ? new Date(creator.postDate).toLocaleDateString() : "Not set"}</TableCell>
                                <TableCell>
                                  <Badge variant="outline" className={getStatusColor(creator.status)}>
                                    {creator.status}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  {creator.brandLikeness ? (
                                    <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                                      {creator.brandLikeness}
                                    </Badge>
                                  ) : "Not specified"}
                                </TableCell>
                                <TableCell>
                                  {creator.contentInfo ? (
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <span className="cursor-help underline dotted">View Info</span>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <p className="max-w-sm">{creator.contentInfo}</p>
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  ) : "N/A"}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}