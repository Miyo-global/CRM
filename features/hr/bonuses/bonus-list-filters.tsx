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
    <div className="flex min-w-max flex-nowrap items-center gap-2">
      <div className="relative w-[min(280px,42vw)] shrink-0">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search employee, type, amount…"
          value={filters.search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="h-9 pl-9 text-sm"
          aria-label="Search bonuses"
        />
      </div>

      <Select value={filters.status} onValueChange={onStatusChange}>
        <SelectTrigger className="h-9 w-[130px] shrink-0 text-xs">
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
        <SelectTrigger className="h-9 w-[130px] shrink-0 text-xs">
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
        className="w-[180px] shrink-0"
        compact
        listMaxHeight="220px"
      />

      <Input
        type="date"
        value={filters.dateFrom}
        onChange={(e) => onDateFromChange(e.target.value)}
        className="h-9 w-[140px] shrink-0 text-xs"
        aria-label="From date"
      />
      <Input
        type="date"
        value={filters.dateTo}
        onChange={(e) => onDateToChange(e.target.value)}
        className="h-9 w-[140px] shrink-0 text-xs"
        aria-label="To date"
      />

      <Button
        size="sm"
        variant="outline"
        className="h-9 shrink-0 gap-1.5 text-xs"
        disabled={exportDisabled}
        onClick={onExport}
      >
        <Download className="h-3.5 w-3.5" />
        Export
      </Button>
      <Button
        size="sm"
        variant="outline"
        className="h-9 shrink-0 gap-1.5 text-xs"
        disabled={exportDisabled}
        onClick={onMail}
      >
        <Mail className="h-3.5 w-3.5" />
        Mail
      </Button>

      {activeFilterCount > 0 ? (
        <Button
          size="sm"
          variant="ghost"
          className="h-9 shrink-0 gap-1 text-xs text-muted-foreground"
          onClick={onClearFilters}
        >
          <X className="h-3 w-3" />
          Clear
        </Button>
      ) : null}
    </div>
  );
}
