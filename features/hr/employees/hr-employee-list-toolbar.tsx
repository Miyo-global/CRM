"use client";

import { cn } from "@/lib/utils";
import { HrEmployeeSearch } from "./hr-employee-search";
import { HrFilterBar } from "./hr-filter-bar";
import type { StatusFilter, RoleFilter } from "./hr-types";

interface HrEmployeeListToolbarProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  deptFilter: string;
  onDeptChange: (value: string) => void;
  departments: string[];
  statusFilter: StatusFilter;
  onStatusChange: (value: StatusFilter) => void;
  roleFilter: RoleFilter;
  onRoleChange: (value: RoleFilter) => void;
  onClearFilters: () => void;
  hasSearchFilter?: boolean;
  totalCount?: number;
  className?: string;
}

export function HrEmployeeListToolbar({
  searchTerm,
  onSearchChange,
  deptFilter,
  onDeptChange,
  departments,
  statusFilter,
  onStatusChange,
  roleFilter,
  onRoleChange,
  onClearFilters,
  hasSearchFilter,
  totalCount,
  className,
}: HrEmployeeListToolbarProps) {
  return (
    <div className={cn("flex w-full flex-wrap items-center gap-2", className)}>
      <HrEmployeeSearch value={searchTerm} onChange={onSearchChange} />
      <HrFilterBar
        className="min-w-0"
        deptFilter={deptFilter}
        onDeptChange={onDeptChange}
        departments={departments}
        statusFilter={statusFilter}
        onStatusChange={onStatusChange}
        roleFilter={roleFilter}
        onRoleChange={onRoleChange}
        onClearFilters={onClearFilters}
        hasSearchFilter={hasSearchFilter}
      />
      {totalCount !== undefined && (
        <p className="shrink-0 text-xs tabular-nums text-muted-foreground lg:ml-auto">
          {totalCount} employee{totalCount !== 1 ? "s" : ""}
        </p>
      )}
    </div>
  );
}
