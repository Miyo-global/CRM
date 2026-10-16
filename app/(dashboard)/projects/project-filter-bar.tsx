"use client";

import { Search, X, LayoutGrid, List, Table2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Kbd } from "@/components/ui/kbd";
import { FilterChip } from "@/components/ui/filter-chip";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MinLengthHint } from "@/components/ui/min-length-hint";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  PROJECT_PRIORITY_OPTIONS,
  PROJECT_SORT_OPTIONS,
  type ProjectGroupBy,
} from "@/features/projects/project-list/project-options";

export type ViewMode = "grid" | "list" | "table";
const ALL = "all";
type StatusFilter = "ALL" | "ACTIVE" | "COMPLETED" | "ARCHIVED";

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "ACTIVE", label: "Active" },
  { value: "COMPLETED", label: "Completed" },
  { value: "ARCHIVED", label: "Archived" },
];

interface ProjectFilterBarProps {
  search: string;
  onSearchChange: (value: string) => void;
  status: StatusFilter;
  onStatusChange: (value: StatusFilter) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  priority: string | null;
  onPriorityChange: (value: string | null) => void;
  sort: string;
  onSortChange: (value: string) => void;
  groupBy: ProjectGroupBy;
  onGroupByChange: (value: ProjectGroupBy) => void;
}

/** ListToolbar layout (§6.3): search → status chips → spacer → view toggle. */
export function ProjectFilterBar({
  search,
  onSearchChange,
  status,
  onStatusChange,
  viewMode,
  onViewModeChange,
  priority,
  onPriorityChange,
  sort,
  onSortChange,
  groupBy,
  onGroupByChange,
}: ProjectFilterBarProps) {
  return (
    <div className="flex w-full flex-wrap items-center gap-2">
      <div className="relative w-full sm:w-64">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subtle-foreground"
          aria-hidden="true"
        />
        <Input
          type="search"
          data-page-search
          placeholder="Search projects"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9 pr-9"
          aria-label="Search projects"
          aria-describedby="projects-search-hint"
        />
        <MinLengthHint id="projects-search-hint" value={search} />
        {search ? (
          <button
            type="button"
            onClick={() => onSearchChange("")}
            className="absolute right-2 top-1/2 inline-flex size-6 -translate-y-1/2 items-center justify-center rounded-sm text-muted-foreground outline-none hover:text-foreground focus-visible:focus-ring"
            aria-label="Clear search"
          >
            <X className="size-3.5" aria-hidden="true" />
          </button>
        ) : (
          <Kbd className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2" aria-hidden="true">
            /
          </Kbd>
        )}
      </div>

      <div role="group" aria-label="Filter by status" className="flex flex-wrap items-center gap-2">
        {STATUS_OPTIONS.map((opt) => (
          <FilterChip
            key={opt.value}
            active={status === opt.value}
            onClick={() => onStatusChange(opt.value)}
          >
            {opt.label}
          </FilterChip>
        ))}
      </div>

      <Select value={priority ?? ALL} onValueChange={(v) => onPriorityChange(v === ALL ? null : v)}>
        <SelectTrigger className="h-10 w-36" aria-label="Filter by priority">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Any priority</SelectItem>
          {PROJECT_PRIORITY_OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={sort} onValueChange={onSortChange}>
        <SelectTrigger className="h-10 w-36" aria-label="Sort projects">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {PROJECT_SORT_OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value}>Sort: {o.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {viewMode === "table" && (
        <Select value={groupBy} onValueChange={(v) => onGroupByChange(v as ProjectGroupBy)}>
          <SelectTrigger className="hidden h-10 w-36 md:flex" aria-label="Group projects">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">No grouping</SelectItem>
            <SelectItem value="status">Group: status</SelectItem>
            <SelectItem value="priority">Group: priority</SelectItem>
          </SelectContent>
        </Select>
      )}

      <Tabs
        value={viewMode}
        onValueChange={(v) => onViewModeChange(v as ViewMode)}
        className="ml-auto shrink-0"
      >
        <TabsList className="w-fit">
          <TabsTrigger value="grid" aria-label="Grid view" className="px-2">
            <LayoutGrid aria-hidden="true" />
          </TabsTrigger>
          <TabsTrigger value="list" aria-label="List view" className="px-2">
            <List aria-hidden="true" />
          </TabsTrigger>
          <TabsTrigger value="table" aria-label="Table view" className="hidden px-2 md:inline-flex">
            <Table2 aria-hidden="true" />
          </TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  );
}
