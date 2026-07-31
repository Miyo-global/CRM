import { quarterRangeYmd } from "@/lib/hr/attendance-summary";

export interface WorkLogWindowInput {
  year: number;
  quarter: number;
  month?: number;
  dateFrom?: string;
  dateTo?: string;
}

export interface WorkLogWindow {
  startDate: string;
  endDate: string;
}

function isoDate(year: number, monthIndex: number, day: number): string {
  return new Date(Date.UTC(year, monthIndex, day)).toISOString().slice(0, 10);
}

function isValidIso(d: string | undefined): d is string {
  return !!d && /^\d{4}-\d{2}-\d{2}$/.test(d);
}

function quarterWindow(year: number, quarter: number): WorkLogWindow {
  const startMonth = (quarter - 1) * 3;
  return {
    startDate: isoDate(year, startMonth, 1),
    endDate: isoDate(year, startMonth + 3, 0),
  };
}

function monthWindow(year: number, month: number): WorkLogWindow {
  return {
    startDate: isoDate(year, month, 1),
    endDate: isoDate(year, month + 1, 0),
  };
}

/** Quarter date bounds for constraining the advanced date-range pickers. */
export function workLogQuarterRange(year: number, quarter: number): WorkLogWindow {
  const { start, end } = quarterRangeYmd(year, quarter);
  return { startDate: start, endDate: end };
}

export interface WorkLogFilterShape {
  year: number;
  quarter: number;
  month?: number;
  dateFrom?: string;
  dateTo?: string;
}

/**
 * Drops incomplete custom ranges and redundant ranges that exactly match the
 * selected quarter (so quarter/month remain the source of truth in the URL).
 */
export function normalizeWorkLogFilters<T extends WorkLogFilterShape>(filters: T): T {
  const { dateFrom, dateTo, year, quarter, month } = filters;

  if (!dateFrom && !dateTo) return filters;

  if (!dateFrom || !dateTo) {
    return { ...filters, dateFrom: undefined, dateTo: undefined };
  }

  if (month == null) {
    const q = workLogQuarterRange(year, quarter);
    if (dateFrom === q.startDate && dateTo === q.endDate) {
      return { ...filters, dateFrom: undefined, dateTo: undefined };
    }
  }

  return filters;
}

export function resolveWorkLogWindow(input: WorkLogWindowInput): WorkLogWindow {
  const { year, quarter, month, dateFrom, dateTo } = input;

  const contextWindow =
    month != null && month >= 0 && month <= 11
      ? monthWindow(year, month)
      : quarterWindow(year, quarter);

  if (isValidIso(dateFrom) && isValidIso(dateTo)) {
    let start = dateFrom;
    let end = dateTo;
    if (start > end) [start, end] = [end, start];
    return { startDate: start, endDate: end };
  }

  if (isValidIso(dateFrom) || isValidIso(dateTo)) {
    let start = isValidIso(dateFrom) ? dateFrom : contextWindow.startDate;
    let end = isValidIso(dateTo) ? dateTo : contextWindow.endDate;
    if (start > end) [start, end] = [end, start];
    return { startDate: start, endDate: end };
  }

  return contextWindow;
}
