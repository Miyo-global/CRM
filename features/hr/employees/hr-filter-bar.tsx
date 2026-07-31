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
import { ROLE_LABELS, type StatusFilter, type RoleFilter } from "./hr-types";

const ROLE_OPTIONS = [
  { value: "All", label: "All Roles" },
  { value: "CEO", label: "CEO" },
  { value: "HR", label: "HR" },
  { value: "SALES", label: "Sales" },
  { value: "CUSTOMER_SUPPORT", label: "Customer Support" },
  { value: "ENGINEERING", label: "Engineering" },
  { value: "DESIGN", label: "Design" },
  { value: "VIDEO_EDITOR", label: "Video Editor" },
  { value: "DIGITAL_MARKETING", label: "Digital Marketing" },
  { value: "BRANCH_MANAGER", label: "Branch Manager" },
  { value: "BRANCH_HR", label: "Branch HR" },
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
        "flex flex-nowrap items-center gap-2 min-w-0 overflow-x-auto overflow-y-visible [scrollbar-width:thin]",
        className,
      )}
    >
      <div className="shrink-0">
        <SearchableSelect
          options={deptOptions}
          value={deptFilter}
          onValueChange={onDeptChange}
          placeholder="Department"
          searchPlaceholder="Search department…"
          triggerClassName="h-9 w-[min(220px,70vw)] min-w-[9.5rem] max-w-[16rem] text-xs"
          className="w-[220px]"
        />
      </div>

      <div className="shrink-0">
        <Select value={statusFilter} onValueChange={(v) => onStatusChange(v as StatusFilter)}>
          <SelectTrigger className="h-9 w-auto min-w-[9.5rem] max-w-[16rem] text-xs [&_[data-slot=select-value]]:!line-clamp-none">
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
          searchPlaceholder="Search role…"
          triggerClassName="h-9 w-[min(220px,70vw)] min-w-[12.5rem] max-w-[16rem] text-xs"
          className="w-[220px]"
        />
      </div>

      {hasActiveFilters && (
        <div className="shrink-0">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-xs text-muted-foreground"
            onClick={onClearFilters}
            aria-label="Clear filters"
          >
            <X className="h-3.5 w-3.5 mr-1" />
            Clear
          </Button>
        </div>
      )}
    </div>
  );
}
