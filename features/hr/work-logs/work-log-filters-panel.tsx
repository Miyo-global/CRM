"use client";

import { useCallback } from "react";
import { format } from "date-fns";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, X } from "lucide-react";
import type {
  WorkLogFilters,
  WorkLogFilterEmployee,
  WorkLogFilterDepartment,
} from "./work-log-filter-actions";

interface WorkLogFiltersPanelProps {
  filters: WorkLogFilters;
  setFilters: React.Dispatch<React.SetStateAction<WorkLogFilters>>;
  setDraftFilters: React.Dispatch<React.SetStateAction<WorkLogFilters>>;
  activeFilterCount: number;
  currentYear: number;
  currentQuarter: number;
  employees: WorkLogFilterEmployee[] | undefined;
  departments: WorkLogFilterDepartment[] | undefined;
  searchTerm: string;
  setSearchTerm: React.Dispatch<React.SetStateAction<string>>;
}

export function WorkLogFiltersPanel({
  filters,
  setFilters,
  setDraftFilters,
  activeFilterCount,
  currentYear,
  currentQuarter,
  employees,
  departments,
  searchTerm,
  setSearchTerm,
}: WorkLogFiltersPanelProps) {
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  }, [setSearchTerm]);

  const handleClearSearch = useCallback(() => setSearchTerm(""), [setSearchTerm]);

  const handleClearDepartment = useCallback(() => {
    setFilters((p) => ({ ...p, departmentId: undefined }));
    setDraftFilters((p) => ({ ...p, departmentId: undefined }));
  }, [setFilters, setDraftFilters]);

  const handleClearEmployee = useCallback(() => {
    setFilters((p) => ({
      ...p,
      selectedUserId: undefined,
      viewAllTeam: !!p.departmentId || p.viewAllTeam,
    }));
    setDraftFilters((p) => ({
      ...p,
      selectedUserId: undefined,
      viewAllTeam: !!p.departmentId || p.viewAllTeam,
    }));
  }, [setFilters, setDraftFilters]);

  const handleClearMonth = useCallback(() => {
    setFilters((p) => ({ ...p, month: undefined }));
    setDraftFilters((p) => ({ ...p, month: undefined }));
  }, [setFilters, setDraftFilters]);

  const handleClearDateRange = useCallback(() => {
    setFilters((p) => ({ ...p, dateFrom: undefined, dateTo: undefined }));
    setDraftFilters((p) => ({ ...p, dateFrom: undefined, dateTo: undefined }));
  }, [setFilters, setDraftFilters]);

  const handleClearAll = useCallback(() => {
    const reset: WorkLogFilters = { year: currentYear, quarter: currentQuarter };
    setFilters(reset);
    setDraftFilters(reset);
  }, [currentYear, currentQuarter, setFilters, setDraftFilters]);

  return (
    <div className="flex flex-wrap items-center gap-3 w-full">
      <div className="relative w-full sm:w-auto sm:max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
        <Input
          placeholder="Search by date or keyword..."
          value={searchTerm}
          onChange={handleSearchChange}
          className="pl-9 pr-9 h-9 border-border bg-muted/50 focus-visible:bg-background"
          aria-label="Search work logs"
        />
        {searchTerm && (
          <button
            onClick={handleClearSearch}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {activeFilterCount > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground font-medium">Active filters:</span>
          {filters.departmentId && departments && (
            <Badge variant="secondary" className="text-xs gap-1 pr-1">
              Dept: {departments.find((d) => d.id.toString() === filters.departmentId)?.name ?? "Unknown"}
              <button onClick={handleClearDepartment} className="ml-0.5 hover:text-foreground">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {filters.selectedUserId && employees && (
            <Badge variant="secondary" className="text-xs gap-1 pr-1">
              Employee: {employees.find((e) => e.id === filters.selectedUserId)?.firstName ?? "Selected"}
              <button onClick={handleClearEmployee} className="ml-0.5 hover:text-foreground">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {filters.month !== undefined && (
            <Badge variant="secondary" className="text-xs gap-1 pr-1">
              Month: {format(new Date(filters.year, filters.month, 1), "MMMM")}
              <button onClick={handleClearMonth} className="ml-0.5 hover:text-foreground">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {(filters.dateFrom || filters.dateTo) && (
            <Badge variant="secondary" className="text-xs gap-1 pr-1">
              {filters.dateFrom && filters.dateTo
                ? `${filters.dateFrom} — ${filters.dateTo}`
                : filters.dateFrom
                  ? `From ${filters.dateFrom}`
                  : `Until ${filters.dateTo}`}
              <button onClick={handleClearDateRange} className="ml-0.5 hover:text-foreground">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          <button onClick={handleClearAll} className="text-xs text-muted-foreground hover:text-foreground underline">
            Clear all
          </button>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        <span className="font-medium text-foreground">Status:</span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-green-500 shrink-0" />
          Logged
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-amber-500 shrink-0" />
          Unsaved Draft
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-slate-200 dark:bg-slate-700 shrink-0" />
          Empty
        </span>
      </div>
    </div>
  );
}
