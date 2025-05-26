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

type CreatorVideoListProps = {
  sectionNames: string[];
  groupedBySection: Record<string, Creator[]>;
  selectedProjects: string[];
  setSelectedProjects: React.Dispatch<React.SetStateAction<string[]>>;
  setSelectAll: React.Dispatch<React.SetStateAction<boolean>>;
  filteredData: Creator[];
  getStatusColor: (status: string) => string;
};

export default function CreatorVideoList({
  sectionNames,
  groupedBySection,
  selectedProjects,
  setSelectedProjects,
  setSelectAll,
  filteredData,
  getStatusColor
}: CreatorVideoListProps) {
  // Helper function to render creator groups within a section
  function renderCreatorGroups(sectionName: string) {
    // Group by creator name within this section
    const creatorsByName: Record<string, Creator[]> = {};
    
    groupedBySection[sectionName].forEach(creator => {
      const name = creator.name || 'Unnamed';
      if (!creatorsByName[name]) {
        creatorsByName[name] = [];
      }
      creatorsByName[name].push(creator);
    });
    
    // Create array of elements for each creator group
    return Object.entries(creatorsByName).map(([creatorName, creatorsInGroup]) => (
      <div key={`${sectionName}-${creatorName}`} className="mb-6 border rounded-md overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 bg-slate-50">
          <div className="flex items-center">
            <h4 className="font-semibold">{creatorName}</h4>
            {creatorsInGroup[0].mediaKit && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <a 
                      href={creatorsInGroup[0].mediaKit} 
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
          <Badge className="bg-teal-100 text-teal-800 font-medium">
            {creatorsInGroup.length} videos
          </Badge>
        </div>
        
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]"></TableHead>
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
            {creatorsInGroup.map((creator) => (
              <TableRow key={creator.id}>
                <TableCell className="w-[50px]">
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
    ));
  }

  return (
    <div className="space-y-6">
      {sectionNames.map((sectionName) => (
        <div key={sectionName} className="bg-white rounded-lg shadow overflow-hidden">
          <div className="bg-gray-50 px-4 py-3 border-b">
            <h3 className="text-lg font-bold text-gray-800">{sectionName}</h3>
          </div>
          <div className="p-4">
            {renderCreatorGroups(sectionName)}
          </div>
        </div>
      ))}
    </div>
  );
}