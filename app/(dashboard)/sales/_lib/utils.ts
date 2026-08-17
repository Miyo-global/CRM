import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  subMonths,
  startOfYear,
  endOfYear,
} from "date-fns";
import { formatDateOnly } from "@/lib/date-utils";
import { CURRENCY_SYMBOL } from "@/lib/constants/locale";

export const DEFAULT_BAR_COLOR = "bg-muted-foreground/40";

export const formatRevenueValue = (v: number) => `${CURRENCY_SYMBOL}${(v / 1000).toFixed(0)}K`;

export type DatePreset =
  | "all"
  | "today"
  | "this_week"
  | "this_month"
  | "last_month"
  | "q1"
  | "q2"
  | "q3"
  | "q4"
  | "ytd";

export const DATE_PRESET_LABELS: Record<DatePreset, string> = {
  all: "All Time",
  today: "Today",
  this_week: "This Week",
  this_month: "This Month",
  last_month: "Last Month",
  q1: "Q1",
  q2: "Q2",
  q3: "Q3",
  q4: "Q4",
  ytd: "Year to Date",
};

export function getPresetRange(preset: DatePreset): { from?: string; to?: string } {
  const now = new Date();
  const fmt = (d: Date) => formatDateOnly(d);
  const year = Number(fmt(now).slice(0, 4));

  switch (preset) {
    case "today":
      return { from: fmt(startOfDay(now)), to: fmt(endOfDay(now)) };
    case "this_week":
      return { from: fmt(startOfWeek(now, { weekStartsOn: 1 })), to: fmt(endOfWeek(now, { weekStartsOn: 1 })) };
    case "this_month":
      return { from: fmt(startOfMonth(now)), to: fmt(endOfMonth(now)) };
    case "last_month": {
      const lm = subMonths(now, 1);
      return { from: fmt(startOfMonth(lm)), to: fmt(endOfMonth(lm)) };
    }
    case "q1":
      return { from: `${year}-01-01`, to: `${year}-03-31` };
    case "q2":
      return { from: `${year}-04-01`, to: `${year}-06-30` };
    case "q3":
      return { from: `${year}-07-01`, to: `${year}-09-30` };
    case "q4":
      return { from: `${year}-10-01`, to: `${year}-12-31` };
    case "ytd":
      return { from: fmt(startOfYear(now)), to: fmt(endOfYear(now)) };
    default:
      return {};
  }
}
