"use client";

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
}: HrEmployeeListToolbarProps) {
  return (
    <div className="flex flex-col gap-3 border-b px-4 py-3 lg:flex-row lg:flex-nowrap lg:items-center">
      <HrEmployeeSearch value={searchTerm} onChange={onSearchChange} />
      <HrFilterBar
        className="min-w-0 flex-1"
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
        <p className="text-xs text-muted-foreground lg:ml-auto shrink-0">
          {totalCount} employee{totalCount !== 1 ? "s" : ""}
        </p>
      )}
    </div>
  );
}
