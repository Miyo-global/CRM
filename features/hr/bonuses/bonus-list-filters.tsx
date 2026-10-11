"use client";

import { useMemo } from "react";
import { Download, Mail, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import type { BonusListFilters } from "@/lib/hr/bonus-filters";
import type { Employee } from "@/types/hr";

const STATUS_OPTIONS = [
  { value: "ALL", label: "All statuses" },
  { value: "PENDING", label: "Pending" },
  { value: "APPROVED", label: "Approved" },
  { value: "PAID", label: "Paid" },
] as const;

interface BonusTypeOption {
  value: string;
  label: string;
}

interface BonusListFiltersBarProps {
  filters: BonusListFilters;
  employees: Employee[];
  bonusTypes: BonusTypeOption[];
  activeFilterCount: number;
  exportDisabled: boolean;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onTypeChange: (value: string) => void;
  onUserIdChange: (value: string) => void;
  onDateFromChange: (value: string) => void;
  onDateToChange: (value: string) => void;
  onExport: () => void;
  onMail: () => void;
  onClearFilters: () => void;
}

function employeeLabel(employee: Employee): string {
  const full = `${employee.firstName ?? ""} ${employee.lastName ?? ""}`.trim();
  return employee.name ?? (full || employee.email);
}

export function BonusListFiltersBar({
  filters,
  employees,
  bonusTypes,
  activeFilterCount,
  exportDisabled,
  onSearchChange,
  onStatusChange,
  onTypeChange,
  onUserIdChange,
  onDateFromChange,
  onDateToChange,
  onExport,
  onMail,
  onClearFilters,
}: BonusListFiltersBarProps) {
  const employeeOptions = useMemo(
    () => [
      { value: "ALL", label: "All employees" },
      ...employees.map((employee) => ({
        value: employee.id,
        label: employeeLabel(employee),
        keywords: `${employee.email} ${employee.employeeId ?? ""}`,
      })),
    ],
    [employees],
  );

  return (
    <div className="flex w-full flex-wrap items-center gap-2">
      <div className="relative w-full sm:w-64">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subtle-foreground" aria-hidden="true" />
        <Input
          placeholder="Search bonuses"
          value={filters.search}
          onChange={(e) => onSearchChange(e.target.value)}
          data-page-search
          className="h-9 pl-9"
          aria-label="Search bonuses"
        />
      </div>

      <Select value={filters.status} onValueChange={onStatusChange}>
        <SelectTrigger className="h-9 w-32 shrink-0">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          {STATUS_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={filters.type} onValueChange={onTypeChange}>
        <SelectTrigger className="h-9 w-32 shrink-0">
          <SelectValue placeholder="Type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">All types</SelectItem>
          {bonusTypes.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <SearchableSelect
        options={employeeOptions}
        value={filters.userId}
        onValueChange={onUserIdChange}
        placeholder="All employees"
        searchPlaceholder="Search employees…"
        triggerClassName="h-9 w-[min(180px,32vw)] shrink-0 text-xs"
        className="w-44 shrink-0"
        compact
        listMaxHeight="220px"
      />

      <Input
        type="date"
        value={filters.dateFrom}
        onChange={(e) => onDateFromChange(e.target.value)}
        className="h-9 w-36 shrink-0 tabular-nums"
        aria-label="From date"
      />
      <Input
        type="date"
        value={filters.dateTo}
        onChange={(e) => onDateToChange(e.target.value)}
        className="h-9 w-36 shrink-0 tabular-nums"
        aria-label="To date"
      />

      <Button
        size="sm"
        variant="outline"
        className="h-9 shrink-0 gap-1.5"
        disabled={exportDisabled}
        onClick={onExport}
      >
        <Download className="size-4" aria-hidden="true" />
        Export
      </Button>
      <Button
        size="sm"
        variant="outline"
        className="h-9 shrink-0 gap-1.5"
        disabled={exportDisabled}
        onClick={onMail}
      >
        <Mail className="size-4" aria-hidden="true" />
        Mail
      </Button>

      {activeFilterCount > 0 ? (
        <Button
          size="sm"
          variant="ghost"
          className="h-9 shrink-0 gap-1 text-muted-foreground"
          onClick={onClearFilters}
        >
          <X className="size-4" aria-hidden="true" />
          Clear
        </Button>
      ) : null}
    </div>
  );
}
