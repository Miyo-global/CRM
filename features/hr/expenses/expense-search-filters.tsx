"use client";

import { useState, useCallback } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { formatEmployeeOptionLabel } from "@/lib/validations/expense";

interface EmployeeOption {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  name?: string | null;
  email?: string | null;
}

interface ExpenseSearchFiltersProps {
  search: string;
  minAmount?: number;
  maxAmount?: number;
  onSearchChange: (value: string) => void;
  onMinAmountChange: (value: number | undefined) => void;
  onMaxAmountChange: (value: number | undefined) => void;
  employees?: EmployeeOption[];
  selectedUserId?: string;
  onEmployeeChange?: (userId: string | undefined) => void;
  /** Hide employee / Spent by when it is shown elsewhere (e.g. admin status bar). */
  hideEmployeeFilter?: boolean;
}

const SEARCH_MIN_LENGTH = 3;
const AMOUNT_RE = /^\d{0,7}(\.\d{0,2})?$/;

export function ExpenseSearchFilters({
  search,
  minAmount,
  maxAmount,
  onSearchChange,
  onMinAmountChange,
  onMaxAmountChange,
  employees,
  selectedUserId,
  onEmployeeChange,
  hideEmployeeFilter = false,
}: ExpenseSearchFiltersProps) {
  const [minInput, setMinInput] = useState(minAmount != null ? String(minAmount) : "");
  const [maxInput, setMaxInput] = useState(maxAmount != null ? String(maxAmount) : "");

  const parse = (raw: string) => (raw.trim() === "" ? undefined : Number(raw));
  const minNum = parse(minInput);
  const maxNum = parse(maxInput);
  const minInvalid = minInput.trim() !== "" && (!Number.isFinite(minNum) || (minNum as number) < 0);
  const maxInvalid = maxInput.trim() !== "" && (!Number.isFinite(maxNum) || (maxNum as number) < 0);
  const rangeInvalid =
    !minInvalid && !maxInvalid && minNum != null && maxNum != null && minNum > maxNum;

  const commitMin = useCallback(
    (raw: string) => {
      if (raw !== "" && !AMOUNT_RE.test(raw)) return;
      setMinInput(raw);
      const n = parse(raw);
      if (raw.trim() === "") return onMinAmountChange(undefined);
      if (Number.isFinite(n) && (n as number) >= 0) onMinAmountChange(n);
    },
    [onMinAmountChange],
  );

  const commitMax = useCallback(
    (raw: string) => {
      if (raw !== "" && !AMOUNT_RE.test(raw)) return;
      setMaxInput(raw);
      const n = parse(raw);
      if (raw.trim() === "") return onMaxAmountChange(undefined);
      if (Number.isFinite(n) && (n as number) >= 0) onMaxAmountChange(n);
    },
    [onMaxAmountChange],
  );

  const searchTooShort = search.trim().length > 0 && search.trim().length < SEARCH_MIN_LENGTH;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[220px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search description, category, or merchant…"
              className="pl-9"
              aria-label="Search expenses"
            />
          </div>
        </div>
        {!hideEmployeeFilter && employees && onEmployeeChange && (
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Spent by</label>
            <Select
              value={selectedUserId ?? "all"}
              onValueChange={(v) => onEmployeeChange(v === "all" ? undefined : v)}
            >
              <SelectTrigger className="h-9 w-[180px] text-sm" aria-label="Filter by employee">
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
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Amount ≥ (₹)</label>
          <Input
            type="text"
            inputMode="decimal"
            value={minInput}
            onChange={(e) => commitMin(e.target.value)}
            placeholder="More than"
            className="w-32"
            aria-label="Minimum amount"
            aria-invalid={minInvalid || rangeInvalid}
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Amount ≤ (₹)</label>
          <Input
            type="text"
            inputMode="decimal"
            value={maxInput}
            onChange={(e) => commitMax(e.target.value)}
            placeholder="Less than"
            className="w-32"
            aria-label="Maximum amount"
            aria-invalid={maxInvalid || rangeInvalid}
          />
        </div>
      </div>
      {searchTooShort && (
        <p className="text-[11px] text-muted-foreground">
          Type at least {SEARCH_MIN_LENGTH} characters to search.
        </p>
      )}
      {(minInvalid || maxInvalid || rangeInvalid) && (
        <p className="text-[11px] text-destructive">
          {rangeInvalid
            ? "Minimum amount must be less than or equal to the maximum amount."
            : "Amount must be a positive number."}
        </p>
      )}
    </div>
  );
}
