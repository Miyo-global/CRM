"use client";

import { useCallback } from "react";
import { Search, LayoutGrid, TableIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { STATUSES, LEAD_PRIORITIES, LEAD_SOURCES } from "./leads-constants";
import { MinLengthHint } from "@/components/ui/min-length-hint";

interface LeadsToolbarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  view: "table" | "kanban";
  onViewChange: (view: "table" | "kanban") => void;
  statusFilter?: string;
  priorityFilter?: string;
  sourceFilter?: string;
  onStatusFilterChange: (value: string | undefined) => void;
  onPriorityFilterChange: (value: string | undefined) => void;
  onSourceFilterChange: (value: string | undefined) => void;
  onClearFilters: () => void;
}

export function LeadsToolbar({
  searchQuery, onSearchChange, view, onViewChange,
  statusFilter, priorityFilter, sourceFilter,
  onStatusFilterChange, onPriorityFilterChange, onSourceFilterChange,
  onClearFilters,
}: LeadsToolbarProps) {
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => onSearchChange(e.target.value), [onSearchChange]);
  const handleViewTable = useCallback(() => onViewChange("table"), [onViewChange]);
  const handleViewKanban = useCallback(() => onViewChange("kanban"), [onViewChange]);
  const handleStatusFilter = useCallback((v: string) => onStatusFilterChange(v === "all" ? undefined : v), [onStatusFilterChange]);
  const handlePriorityFilter = useCallback((v: string) => onPriorityFilterChange(v === "all" ? undefined : v), [onPriorityFilterChange]);
  const handleSourceFilter = useCallback((v: string) => onSourceFilterChange(v === "all" ? undefined : v), [onSourceFilterChange]);

  const hasFilters = !!(statusFilter || priorityFilter || sourceFilter);

  return (
    <div className="flex w-full flex-wrap items-center gap-2">

      <div className="relative w-full sm:w-56">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subtle-foreground" aria-hidden="true" />
        <Input
          type="search"
          data-page-search
          placeholder="Search leads"
          value={searchQuery}
          onChange={handleSearchChange}
          className="pl-9"
          aria-label="Search leads"
          aria-describedby="leads-search-hint"
        />
        <MinLengthHint id="leads-search-hint" value={searchQuery} />
      </div>

      <Select value={statusFilter || "all"} onValueChange={handleStatusFilter}>
        <SelectTrigger className="w-[110px] h-9 text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all" className="text-xs">All Status</SelectItem>
          {STATUSES.map(s => (
            <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={priorityFilter || "all"} onValueChange={handlePriorityFilter}>
        <SelectTrigger className="w-[100px] h-9 text-xs"><SelectValue placeholder="Priority" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all" className="text-xs">All Priority</SelectItem>
          {LEAD_PRIORITIES.map(p => (
            <SelectItem key={p} value={p} className="text-xs">{p}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={sourceFilter || "all"} onValueChange={handleSourceFilter}>
        <SelectTrigger className="w-[110px] h-9 text-xs"><SelectValue placeholder="Source" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all" className="text-xs">All Sources</SelectItem>
          {LEAD_SOURCES.map(s => (
            <SelectItem key={s} value={s} className="text-xs">{s.replace("_", " ")}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={onClearFilters}>
          <X />Clear
        </Button>
      )}
      <Tabs value={view} onValueChange={(v) => (v === "table" ? handleViewTable() : handleViewKanban())} className="ml-auto">
        <TabsList aria-label="View">
          <TabsTrigger value="table" aria-label="Table view"><TableIcon /></TabsTrigger>
          <TabsTrigger value="kanban" aria-label="Board view"><LayoutGrid /></TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  );
}
