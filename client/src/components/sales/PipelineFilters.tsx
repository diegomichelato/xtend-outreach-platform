import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";

interface PipelineFiltersProps {
  filters: {
    assignedTo: string;
    product: string;
    source: string;
    status: string;
  };
  onFilterChange: (filters: any) => void;
  sortBy: "value" | "date" | "probability";
  onSortChange: (sort: "value" | "date" | "probability") => void;
}

export function PipelineFilters({
  filters,
  onFilterChange,
  sortBy,
  onSortChange,
}: PipelineFiltersProps) {
  // Fetch team members for the assignee filter
  const { data: teamMembers = [] } = useQuery({
    queryKey: ["team-members"],
    queryFn: async () => {
      const response = await fetch("/api/team-members");
      return response.json();
    },
  });

  // Fetch products for the product filter
  const { data: products = [] } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const response = await fetch("/api/products");
      return response.json();
    },
  });

  return (
    <div className="flex items-center gap-4">
      {/* Assignee Filter */}
      <Select
        value={filters.assignedTo}
        onValueChange={(value) =>
          onFilterChange({ ...filters, assignedTo: value })
        }
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Assigned To" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">All Team Members</SelectItem>
          {teamMembers.map((member: any) => (
            <SelectItem key={member.id} value={member.id}>
              {member.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Product Filter */}
      <Select
        value={filters.product}
        onValueChange={(value) =>
          onFilterChange({ ...filters, product: value })
        }
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Product" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">All Products</SelectItem>
          {products.map((product: any) => (
            <SelectItem key={product.id} value={product.id}>
              {product.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Source Filter */}
      <Select
        value={filters.source}
        onValueChange={(value) =>
          onFilterChange({ ...filters, source: value })
        }
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Source" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">All Sources</SelectItem>
          <SelectItem value="website">Website</SelectItem>
          <SelectItem value="referral">Referral</SelectItem>
          <SelectItem value="outreach">Outreach</SelectItem>
          <SelectItem value="event">Event</SelectItem>
        </SelectContent>
      </Select>

      {/* Status Filter */}
      <Select
        value={filters.status}
        onValueChange={(value) =>
          onFilterChange({ ...filters, status: value })
        }
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">All Statuses</SelectItem>
          <SelectItem value="active">Active</SelectItem>
          <SelectItem value="stalled">Stalled</SelectItem>
          <SelectItem value="archived">Archived</SelectItem>
        </SelectContent>
      </Select>

      {/* Sort By */}
      <Select value={sortBy} onValueChange={onSortChange}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Sort By" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="value">Deal Value</SelectItem>
          <SelectItem value="date">Last Updated</SelectItem>
          <SelectItem value="probability">Close Probability</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
} 