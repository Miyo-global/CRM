"use client";

import { useCallback, useTransition } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import {
  type PageSizeOption,
  DEFAULT_PAGE_SIZE,
  parsePaginationFromSearchParams,
  buildPaginationQueryUpdates,
} from "@/lib/pagination-constants";

export function usePaginationParams(options?: { defaultPageSize?: PageSizeOption }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();

  const { page, pageSize } = parsePaginationFromSearchParams(searchParams, options);

  const updateParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === "") params.delete(key);
        else params.set(key, value);
      }
      startTransition(() => {
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
      });
    },
    [searchParams, router, pathname],
  );

  const setPage = useCallback(
    (p: number) => updateParams(buildPaginationQueryUpdates({ page: p })),
    [updateParams],
  );

  const setPageSize = useCallback(
    (size: PageSizeOption) =>
      updateParams(buildPaginationQueryUpdates({ page: 1, pageSize: size })),
    [updateParams],
  );

  const resetPage = useCallback(
    () => updateParams(buildPaginationQueryUpdates({ page: 1 })),
    [updateParams],
  );

  return {
    page,
    pageSize,
    setPage,
    setPageSize,
    resetPage,
    updateParams,
  };
}

export { DEFAULT_PAGE_SIZE };
