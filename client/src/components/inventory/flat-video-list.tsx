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
  creator: string;
  content: string;
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
  timeline?: string;
  postDate?: string;
  section?: string;
  sectionId?: string;
};

type FlatVideoListProps = {
  creators: Creator[];
  selectedProjects: string[];
  setSelectedProjects: React.Dispatch<React.SetStateAction<string[]>>;
  setSelectAll: React.Dispatch<React.SetStateAction<boolean>>;
  filteredData: Creator[];
  getStatusColor: (status: string) => string;
};

export default function FlatVideoList({
  creators,
  selectedProjects,
  setSelectedProjects,
  setSelectAll,
  filteredData,
  getStatusColor
}: FlatVideoListProps) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader className="bg-gray-50 sticky top-0">
          <TableRow>
            <TableHead className="w-[50px]"></TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Creator</TableHead>
            <TableHead>Content</TableHead>
            <TableHead>Platform</TableHead>
            <TableHead>Video Format</TableHead>
            <TableHead>Brand Likeness</TableHead>
            <TableHead>Timeline</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {creators.map((creator) => (
            <TableRow key={creator.id} className="hover:bg-gray-50">
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
              <TableCell>
                <div className="text-sm font-medium whitespace-nowrap">
                  {creator.creator || creator.name}
                </div>
              </TableCell>
              <TableCell>
                {creator.content ? (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="cursor-help truncate max-w-[200px] inline-block">
                          {creator.content.length > 30 ? `${creator.content.substring(0, 30)}...` : creator.content}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-md">
                        <p>{creator.content}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ) : "N/A"}
              </TableCell>
              <TableCell>
                <Badge variant="outline" className="bg-red-100 text-red-800">
                  {creator.platform || "Unknown"}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge variant="outline" className="bg-green-100 text-green-800">
                  {creator.videoFormat || "Standard"}
                </Badge>
              </TableCell>
              <TableCell>
                {creator.brandLikeness ? (
                  <Badge variant="outline" className="bg-yellow-100 text-yellow-800">
                    {creator.brandLikeness}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-gray-100 text-gray-800">
                    Entertainment
                  </Badge>
                )}
              </TableCell>
              <TableCell>
                {creator.timeline || (creator.publishDate ? new Date(creator.publishDate).toLocaleString('default', { month: 'long' }) : "Not set")}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}