"use client";

import { useState, useCallback, useMemo, useTransition, useEffect, useRef } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { ExpenseFilters } from "@/server/actions/expense-query";
import {
  EXPENSE_PAGE_SIZE_DEFAULT,
  clampExpensePageSize,
} from "@/features/hr/expenses/expense-constants";

export type DatePreset =
  | "today"
  | "this_week"
  | "this_month"
  | "last_month"
  | "last_3_months"
  | "last_6_months"
  | "this_year"
  | "custom"
  | "all";

export interface UseExpenseFiltersOptions {
  defaultPageSize?: number;
  syncToUrl?: boolean;
  onFiltersChange?: (filters: ExpenseFilters) => void;
}

export interface UseExpenseFiltersReturn {
  filters: ExpenseFilters;
  setFilter: <K extends keyof ExpenseFilters>(key: K, value: ExpenseFilters[K]) => void;
  setFilters: (filters: Partial<ExpenseFilters>) => void;
  resetFilters: () => void;
  datePreset: DatePreset;
  setDatePreset: (preset: DatePreset) => void;
  setCustomDateRange: (startDate: string, endDate: string) => void;
  hasActiveFilters: boolean;
  activeFilterCount: number;
  isPending: boolean;
}

const DEFAULT_FILTERS: ExpenseFilters = {
  page: 1,
  pageSize: EXPENSE_PAGE_SIZE_DEFAULT,
  sortBy: "date",
  sortOrder: "desc",
  includeStats: true,
  includePending: true,
  includeCategories: true,
};

function getDateRangeFromPreset(preset: DatePreset): { startDate?: string; endDate?: string } {
  const today = new Date();

  switch (preset) {
    case "today":
      const todayStr = format(today, "yyyy-MM-dd");
      return { startDate: todayStr, endDate: todayStr };

    case "this_week": {
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay());
      return {
        startDate: format(startOfWeek, "yyyy-MM-dd"),
        endDate: format(today, "yyyy-MM-dd"),
      };
    }

    case "this_month":
      return {
        startDate: format(startOfMonth(today), "yyyy-MM-dd"),
        endDate: format(endOfMonth(today), "yyyy-MM-dd"),
      };

    case "last_month": {
      const lastMonth = subMonths(today, 1);
      return {
        startDate: format(startOfMonth(lastMonth), "yyyy-MM-dd"),
        endDate: format(endOfMonth(lastMonth), "yyyy-MM-dd"),
      };
    }

    case "last_3_months":
      return {
        startDate: format(startOfMonth(subMonths(today, 3)), "yyyy-MM-dd"),
        endDate: format(today, "yyyy-MM-dd"),
      };

    case "last_6_months":
      return {
        startDate: format(startOfMonth(subMonths(today, 6)), "yyyy-MM-dd"),
        endDate: format(today, "yyyy-MM-dd"),
      };

    case "this_year":
      return {
        startDate: format(new Date(today.getFullYear(), 0, 1), "yyyy-MM-dd"),
        endDate: format(today, "yyyy-MM-dd"),
      };

    case "all":
    case "custom":
    default:
      return {};
  }
}

export function useExpenseFilters(
  options: UseExpenseFiltersOptions = {}
): UseExpenseFiltersReturn {
  const { defaultPageSize = EXPENSE_PAGE_SIZE_DEFAULT, syncToUrl = false, onFiltersChange } =
    options;

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const initialFilters = useMemo(() => {
    const filters = {
      ...DEFAULT_FILTERS,
      pageSize: clampExpensePageSize(defaultPageSize),
    };

    if (syncToUrl && searchParams) {
      const status = searchParams.get("status");
      const category = searchParams.get("category");
      const startDate = searchParams.get("startDate");
      const endDate = searchParams.get("endDate");
      const search = searchParams.get("search");
      const page = searchParams.get("page");
      const paymentMethod = searchParams.get("paymentMethod");
      const minAmount = searchParams.get("minAmount");
      const maxAmount = searchParams.get("maxAmount");
      const pageSizeParam = searchParams.get("pageSize");
      const userIdParam = searchParams.get("userId");
      if (pageSizeParam) {
        const parsed = parseInt(pageSizeParam, 10);
        if (Number.isFinite(parsed)) filters.pageSize = clampExpensePageSize(parsed);
      }

      if (status) filters.status = status;
      if (category) filters.category = category;
      if (startDate) filters.startDate = startDate;
      if (endDate) filters.endDate = endDate;
      if (search) filters.search = search;
      if (page) filters.page = parseInt(page, 10);
      if (paymentMethod) filters.paymentMethod = paymentMethod;
      if (minAmount) filters.minAmount = parseFloat(minAmount);
      if (maxAmount) filters.maxAmount = parseFloat(maxAmount);
      if (userIdParam) filters.userId = userIdParam;
    }

    return filters;
  }, [searchParams, syncToUrl, defaultPageSize]);

  const [filters, setFiltersState] = useState<ExpenseFilters>(initialFilters);
  const [datePreset, setDatePresetState] = useState<DatePreset>("all");
  const lastSyncedInitial = useRef(JSON.stringify(initialFilters));
  useEffect(() => {
    const serialized = JSON.stringify(initialFilters);
    if (serialized !== lastSyncedInitial.current) {
      lastSyncedInitial.current = serialized;
      setFiltersState(initialFilters);
    }
  }, [initialFilters]);
  const syncFiltersToUrl = useCallback(
    (newFilters: ExpenseFilters) => {
      if (!syncToUrl) return;

      startTransition(() => {
        const params = new URLSearchParams();

        if (newFilters.status && newFilters.status !== "all") {
          params.set("status", String(newFilters.status));
        }
        if (newFilters.category) {
          params.set("category", newFilters.category);
        }
        if (newFilters.startDate) {
          params.set("startDate", newFilters.startDate);
        }
        if (newFilters.endDate) {
          params.set("endDate", newFilters.endDate);
        }
        if (newFilters.search) {
          params.set("search", newFilters.search);
        }
        if (newFilters.page && newFilters.page > 1) {
          params.set("page", String(newFilters.page));
        }
        if (newFilters.paymentMethod && newFilters.paymentMethod !== "all") {
          params.set("paymentMethod", newFilters.paymentMethod);
        }
        if (newFilters.minAmount) {
          params.set("minAmount", String(newFilters.minAmount));
        }
        if (newFilters.maxAmount) {
          params.set("maxAmount", String(newFilters.maxAmount));
        }
        if (newFilters.userId) {
          params.set("userId", newFilters.userId);
        }
        if (
          newFilters.pageSize &&
          newFilters.pageSize !== EXPENSE_PAGE_SIZE_DEFAULT
        ) {
          params.set("pageSize", String(newFilters.pageSize));
        }

        const queryString = params.toString();
        router.replace(`${pathname}${queryString ? `?${queryString}` : ""}`, {
          scroll: false,
        });
      });
    },
    [syncToUrl, pathname, router]
  );
  const setFilter = useCallback(
    <K extends keyof ExpenseFilters>(key: K, value: ExpenseFilters[K]) => {
      setFiltersState((prev) => {
        const newFilters = { ...prev, [key]: value };
        if (key !== "page") {
          newFilters.page = 1;
        }

        queueMicrotask(() => {
          syncFiltersToUrl(newFilters);
          onFiltersChange?.(newFilters);
        });
        return newFilters;
      });
    },
    [syncFiltersToUrl, onFiltersChange]
  );
  const setFilters = useCallback(
    (newFilters: Partial<ExpenseFilters>) => {
      setFiltersState((prev) => {
        const updated = { ...prev, ...newFilters };
        if (!("page" in newFilters)) {
          updated.page = 1;
        }
        queueMicrotask(() => {
          syncFiltersToUrl(updated);
          onFiltersChange?.(updated);
        });
        return updated;
      });
    },
    [syncFiltersToUrl, onFiltersChange]
  );
  const resetFilters = useCallback(() => {
    const resetState = {
      ...DEFAULT_FILTERS,
      pageSize: clampExpensePageSize(defaultPageSize),
    };
    setFiltersState(resetState);
    setDatePresetState("all");
    syncFiltersToUrl(resetState);
    onFiltersChange?.(resetState);
  }, [defaultPageSize, syncFiltersToUrl, onFiltersChange]);
  const setDatePreset = useCallback(
    (preset: DatePreset) => {
      setDatePresetState(preset);
      const dateRange = getDateRangeFromPreset(preset);
      setFilters({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      });
    },
    [setFilters]
  );
  const setCustomDateRange = useCallback(
    (startDate: string, endDate: string) => {
      setDatePresetState("custom");
      setFilters({ startDate, endDate });
    },
    [setFilters]
  );
  const { hasActiveFilters, activeFilterCount } = useMemo(() => {
    let count = 0;

    if (filters.status && filters.status !== "all") count++;
    if (filters.category) count++;
    if (filters.startDate || filters.endDate) count++;
    if (filters.search) count++;
    if (filters.paymentMethod && filters.paymentMethod !== "all") count++;
    if (filters.minAmount || filters.maxAmount) count++;
    if (filters.userId) count++;

    return {
      hasActiveFilters: count > 0,
      activeFilterCount: count,
    };
  }, [filters]);

  return {
    filters,
    setFilter,
    setFilters,
    resetFilters,
    datePreset,
    setDatePreset,
    setCustomDateRange,
    hasActiveFilters,
    activeFilterCount,
    isPending,
  };
}

export { useDebouncedValue } from "./use-debounce";
