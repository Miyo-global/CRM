"use client";

import { Filter, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ExpenseExportDialog } from "@/components/expenses/expense-export-dialog";
import { STATUS_LABELS, type StatusFilter } from "./expense-constants";
import type { ExpenseFilters, ExpenseCategory } from "@/server/actions/expense-query";
import type { DatePreset } from "@/hooks/use-expense-filters";
import { formatEmployeeOptionLabel } from "@/lib/validations/expense";

interface AdminExpenseFiltersProps {
  statusFilter: StatusFilter;
  pendingCount: number;
  onStatusChange: (status: StatusFilter) => void;
  /** When set, admin list filters to expenses submitted by this user (Spent by). */
  spentByUserId?: string;
  onSpentByChange?: (userId: string | undefined) => void;
  employees?: Array<{
    id: string;
    firstName?: string | null;
    lastName?: string | null;
    name?: string | null;
    email?: string | null;
  }>;
}

export function AdminExpenseFilters({
  statusFilter,
  pendingCount,
  onStatusChange,
  spentByUserId,
  onSpentByChange,
  employees,
}: AdminExpenseFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-3 justify-between">
      <div className="flex flex-wrap items-center gap-2">
      {([
        { key: "ALL" as StatusFilter, label: "All Claims", count: null },
        { key: "PENDING" as StatusFilter, label: "Pending", count: pendingCount },
        { key: "APPROVED" as StatusFilter, label: "Approved", count: null },
        { key: "REJECTED" as StatusFilter, label: "Rejected", count: null },
        { key: "PAID" as StatusFilter, label: "Paid", count: null },
      ]).map((item) => (
        <button
          key={item.key}
          onClick={() => onStatusChange(item.key)}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-all border ${
            statusFilter === item.key
              ? "bg-foreground text-background border-foreground"
              : "bg-white dark:bg-background text-muted-foreground border-border hover:border-foreground/20 hover:bg-muted/50"
          }`}
        >
          {item.label}
          {item.count !== null && (
            <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${
              statusFilter === item.key ? "bg-white/20 dark:bg-black/20" : "bg-muted"
            }`}>
              {item.count}
            </span>
          )}
        </button>
      ))}
      </div>
      {employees && onSpentByChange && (
        <div className="flex flex-col gap-1 min-w-[200px]">
          <span className="text-xs text-muted-foreground">Spent by</span>
          <Select
            value={spentByUserId ?? "all"}
            onValueChange={(v) => onSpentByChange(v === "all" ? undefined : v)}
          >
            <SelectTrigger className="h-9 w-full sm:w-[220px] text-sm" aria-label="Filter by employee who submitted the expense">
              <SelectValue placeholder="All employees" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All employees</SelectItem>
              {employees.map((e) => (
                <SelectItem key={e.id} value={e.id}>
                  {formatEmployeeOptionLabel(e)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}

interface MemberExpenseFiltersProps {
  statusFilter: StatusFilter;
  datePreset: string;
  filters: ExpenseFilters;
  categories: ExpenseCategory[];
  onStatusChange: (status: StatusFilter) => void;
  onDatePresetChange: (preset: DatePreset) => void;
}

export function MemberExpenseFilters({
  statusFilter,
  datePreset,
  filters,
  categories,
  onStatusChange,
  onDatePresetChange,
}: MemberExpenseFiltersProps) {
  const statuses = ["ALL", "PENDING", "APPROVED", "REJECTED", "PAID"] as const;

  return (
    <div className="flex flex-wrap gap-4 items-center justify-between">
      <div className="flex items-center gap-1 bg-muted p-1 rounded-lg" role="tablist" aria-label="Filter by status">
        {statuses.map((s, i, arr) => (
          <button
            key={s}
            role="tab"
            aria-selected={statusFilter === s}
            tabIndex={statusFilter === s ? 0 : -1}
            onClick={() => onStatusChange(s)}
            onKeyDown={(e) => {
              let nextIdx = i;
              if (e.key === "ArrowRight") nextIdx = (i + 1) % arr.length;
              else if (e.key === "ArrowLeft") nextIdx = (i - 1 + arr.length) % arr.length;
              else return;
              e.preventDefault();
              onStatusChange(arr[nextIdx]);
              (e.currentTarget.parentElement?.children[nextIdx] as HTMLElement)?.focus();
            }}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
              statusFilter === s
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {s === "ALL" ? "All Claims" : STATUS_LABELS[s]}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-3">
        <Select value={datePreset} onValueChange={(v) => onDatePresetChange(v as DatePreset)}>
          <SelectTrigger className="h-9 w-[160px] text-sm" aria-label="Filter expenses by date range">
            <Filter className="h-3.5 w-3.5 mr-1.5" />
            <SelectValue placeholder="Filter by Date" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Time</SelectItem>
            <SelectItem value="this_month">This Month</SelectItem>
            <SelectItem value="last_month">Last Month</SelectItem>
            <SelectItem value="last_3_months">Last 3 Months</SelectItem>
            <SelectItem value="this_year">This Year</SelectItem>
          </SelectContent>
        </Select>
        <ExpenseExportDialog
          filters={filters}
          categories={categories}
          trigger={
            <Button variant="outline" size="icon" className="h-9 w-9" aria-label="Download report">
              <Download className="h-4 w-4" />
            </Button>
          }
        />
      </div>
    </div>
  );
}
