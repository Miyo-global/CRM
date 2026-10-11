"use client";

import { useCallback } from "react";
import { Search, LayoutGrid, TableIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
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
    <div className="flex items-center gap-2 flex-nowrap min-w-max">

      <div className="relative w-[140px] sm:w-[180px] sm:max-w-xs">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          placeholder="Search leads"
          value={searchQuery}
          onChange={handleSearchChange}
          className="pl-8 h-8 text-xs"
          aria-label="Search leads"
          aria-describedby="leads-search-hint"
        />
        <MinLengthHint id="leads-search-hint" value={searchQuery} />
      </div>

      <div className="flex items-center border border-border rounded-md">
        <Button variant={view === "table" ? "default" : "ghost"} size="sm"
          className={cn("rounded-r-none h-8 px-2.5", view === "table" && "bg-primary hover:bg-brand-soft text-primary-foreground")}
          onClick={handleViewTable}>
          <TableIcon className="h-3.5 w-3.5" />
        </Button>
        <Button variant={view === "kanban" ? "default" : "ghost"} size="sm"
          className={cn("rounded-l-none h-8 px-2.5", view === "kanban" && "bg-primary hover:bg-brand-soft text-primary-foreground")}
          onClick={handleViewKanban}>
          <LayoutGrid className="h-3.5 w-3.5" />
        </Button>
      </div>

      <Select value={statusFilter || "all"} onValueChange={handleStatusFilter}>
        <SelectTrigger className="w-[110px] h-8 text-2xs"><SelectValue placeholder="Status" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all" className="text-2xs">All Status</SelectItem>
          {STATUSES.map(s => (
            <SelectItem key={s} value={s} className="text-2xs">{s}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={priorityFilter || "all"} onValueChange={handlePriorityFilter}>
        <SelectTrigger className="w-[100px] h-8 text-2xs"><SelectValue placeholder="Priority" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all" className="text-2xs">All Priority</SelectItem>
          {LEAD_PRIORITIES.map(p => (
            <SelectItem key={p} value={p} className="text-2xs">{p}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={sourceFilter || "all"} onValueChange={handleSourceFilter}>
        <SelectTrigger className="w-[110px] h-8 text-2xs"><SelectValue placeholder="Source" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all" className="text-2xs">All Sources</SelectItem>
          {LEAD_SOURCES.map(s => (
            <SelectItem key={s} value={s} className="text-2xs">{s.replace("_", " ")}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {hasFilters && (
        <Button variant="ghost" size="sm" className="h-8 text-2xs px-2" onClick={onClearFilters}>
          <X className="h-3 w-3 mr-1" />Clear
        </Button>
      )}
    </div>
  );
}
