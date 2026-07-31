"use client";

import { useMemo } from "react";

export interface PaginatedArrayResult<T> {
  items: T[];
  total: number;
  totalPages: number;
  hasMore: boolean;
}

/**
 * Client-side pagination over an in-memory array.
 * Replaces inline useMemo pagination slices in timesheets pages.
 */
export function usePaginatedArray<T>(
  allItems: T[],
  page: number,
  pageSize: number,
): PaginatedArrayResult<T> {
  return useMemo(() => {
    const total = allItems.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const safePage = Math.min(Math.max(1, page), totalPages);
    const start = (safePage - 1) * pageSize;
    return {
      items: allItems.slice(start, start + pageSize),
      total,
      totalPages,
      hasMore: safePage < totalPages,
    };
  }, [allItems, page, pageSize]);
}
