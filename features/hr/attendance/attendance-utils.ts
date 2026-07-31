export const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

export interface CalendarDay {
  date: Date;
  status: "present" | "wfh" | "leave" | "absent" | "weekend" | "holiday" | "future" | "none";
  holidayName?: string;
}

export const statusConfig = {
  present: { label: "Present", bg: "bg-emerald-500", text: "text-white", dot: "bg-emerald-500" },
  wfh: { label: "WFH", bg: "bg-blue-500", text: "text-white", dot: "bg-blue-500" },
  leave: { label: "Leave", bg: "bg-amber-600", text: "text-white", dot: "bg-amber-600" },
  absent: { label: "Absent", bg: "bg-rose-500", text: "text-white", dot: "bg-rose-500" },
  weekend: { label: "Weekend", bg: "bg-muted", text: "text-muted-foreground", dot: "bg-muted-foreground/40" },
  holiday: { label: "Holiday", bg: "bg-gold", text: "text-white", dot: "bg-gold" },
  future: { label: "", bg: "", text: "", dot: "" },
  none: { label: "", bg: "", text: "", dot: "" },
} as const;

export const tableStatusBadge: Record<string, string> = {
  PRESENT: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
  ABSENT: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400",
  ON_BREAK: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
  CHECKED_OUT: "bg-slate-100 text-slate-700 dark:bg-slate-500/15 dark:text-slate-400",
};

export function formatDuration(hours: string | number | null | undefined): string {
  const h = typeof hours === "string" ? parseFloat(hours) : (hours ?? 0);
  if (h <= 0) return "0h 0m";
  const wholeHours = Math.floor(h);
  const minutes = Math.round((h - wholeHours) * 60);
  return `${wholeHours}h ${minutes}m`;
}

export function formatTimerSegment(val: number): string {
  return String(val).padStart(2, "0");
}
