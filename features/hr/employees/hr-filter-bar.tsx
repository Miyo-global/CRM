"use client";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { type StatusFilter, type RoleFilter } from "./hr-types";

const ROLE_OPTIONS = [
  { value: "All", label: "All Roles" },
  { value: "CEO", label: "Super Admin" },
  { value: "ADMIN", label: "Admin" },
  { value: "HR", label: "HR" },
  { value: "EMPLOYEE", label: "Employee" },
];

interface HrFilterBarProps {
  deptFilter: string;
  onDeptChange: (value: string) => void;
  departments: string[];
  statusFilter: StatusFilter;
  onStatusChange: (value: StatusFilter) => void;
  roleFilter: RoleFilter;
  onRoleChange: (value: RoleFilter) => void;
  onClearFilters: () => void;
  hasSearchFilter?: boolean;
  className?: string;
}

export function HrFilterBar({
  deptFilter,
  onDeptChange,
  departments,
  statusFilter,
  onStatusChange,
  roleFilter,
  onRoleChange,
  onClearFilters,
  hasSearchFilter = false,
  className,
}: HrFilterBarProps) {
  const hasActiveFilters =
    hasSearchFilter ||
    deptFilter !== "All" ||
    statusFilter !== "Active" ||
    roleFilter !== "All";

  const deptOptions = [
    { value: "All", label: "All Depts" },
    ...departments.map((d) => ({ value: d, label: d })),
  ];

  return (
    <div
      className={cn(
        "flex min-w-0 flex-wrap items-center gap-2",
        className,
      )}
    >
      <div className="shrink-0">
        <SearchableSelect
          options={deptOptions}
          value={deptFilter}
          onValueChange={onDeptChange}
          placeholder="Department"
          aria-label="Department"
          searchPlaceholder="Search department…"
          triggerClassName="h-9 w-44 text-sm"
          className="w-[220px]"
        />
      </div>

      <div className="shrink-0">
        <Select value={statusFilter} onValueChange={(v) => onStatusChange(v as StatusFilter)}>
          <SelectTrigger className="h-9 w-36" aria-label="Status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All Status</SelectItem>
            <SelectItem value="Active">Active</SelectItem>
            <SelectItem value="Inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="shrink-0">
        <SearchableSelect
          options={ROLE_OPTIONS}
          value={roleFilter}
          onValueChange={(v) => onRoleChange(v as RoleFilter)}
          placeholder="All Roles"
          aria-label="Role"
          searchPlaceholder="Search role…"
          triggerClassName="h-9 w-44 text-sm"
          className="w-[220px]"
        />
      </div>

      {hasActiveFilters && (
        <div className="shrink-0">
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
            onClick={onClearFilters}
            aria-label="Clear filters"
          >
            <X className="size-4" aria-hidden="true" />
            Clear
          </Button>
        </div>
      )}
    </div>
  );
}
