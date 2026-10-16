"use client";

import { useMemo } from "react";
import { useHrHolidaysForYear } from "./leaves-expenses";

/**
 * Declared holiday dates (YYYY-MM-DD) for this year and the next, so a leave
 * preview can exclude them the way the server does (QA-0019).
 */
export function useHolidayDates(): string[] {
  const thisYear = new Date().getFullYear();
  const { data: current } = useHrHolidaysForYear(thisYear);
  const { data: next } = useHrHolidaysForYear(thisYear + 1);

  return useMemo(
    () =>
      [...(current ?? []), ...(next ?? [])]
        .map((h) => String(h.date).slice(0, 10))
        .filter(Boolean),
    [current, next],
  );
}
